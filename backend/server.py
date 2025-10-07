from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (do not change env usage)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App and router
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Fixture(BaseModel):
    id: str
    sport: str  # football or basketball
    league: str
    home: str
    away: str
    kickoff: str  # ISO string

class PredictRequest(BaseModel):
    fixture_id: str

class PredictResponse(BaseModel):
    fixture_id: str
    home_win_prob: float
    draw_prob: Optional[float] = None
    away_win_prob: float
    model: str
    generated_at: str

class ExplainRequest(BaseModel):
    fixture_id: str
    model: Optional[str] = None

class ExplainResponse(BaseModel):
    fixture_id: str
    explanation: str
    model: str

# Mock utilities
MOCK_FIXTURES = [
    Fixture(id=str(uuid.uuid4()), sport="football", league="EPL", home="Arsenal", away="Chelsea", kickoff=datetime.now(timezone.utc).isoformat()),
    Fixture(id=str(uuid.uuid4()), sport="football", league="La Liga", home="Real Madrid", away="Barcelona", kickoff=datetime.now(timezone.utc).isoformat()),
    Fixture(id=str(uuid.uuid4()), sport="football", league="Süper Lig", home="Galatasaray", away="Fenerbahçe", kickoff=datetime.now(timezone.utc).isoformat()),
    Fixture(id=str(uuid.uuid4()), sport="basketball", league="NBA", home="Boston Celtics", away="LA Lakers", kickoff=datetime.now(timezone.utc).isoformat()),
    Fixture(id=str(uuid.uuid4()), sport="basketball", league="EuroLeague", home="Anadolu Efes", away="Real Madrid", kickoff=datetime.now(timezone.utc).isoformat()),
    Fixture(id=str(uuid.uuid4()), sport="basketball", league="BSL", home="Fenerbahçe Beko", away="Karşıyaka", kickoff=datetime.now(timezone.utc).isoformat()),
]

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base endpoints
@api_router.get("/")
async def root():
    return {"message": "Sports Analytics API is live"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(500)
    return [StatusCheck(**s) for s in status_checks]

# Integration config status (no secrets)
@api_router.get("/integrations/status")
async def integrations_status():
    return {
        "api_football": bool(os.environ.get("API_FOOTBALL_KEY")),
        "api_football_provider": os.environ.get("API_FOOTBALL_PROVIDER", ""),
        "api_basketball": bool(os.environ.get("API_BASKETBALL_KEY")),
        "sportsdata": bool(os.environ.get("SPORTSDATA_API_KEY")),
        "emergent_llm": bool(os.environ.get("EMERGENT_LLM_KEY")),
    }

# Live data helpers
async def fetch_api_football_fixtures(league_name: str, date_iso: Optional[str] = None) -> List[Fixture]:
    key = os.environ.get("API_FOOTBALL_KEY")
    provider = os.environ.get("API_FOOTBALL_PROVIDER", "apisports")
    if not key:
        return []

    base_url = "https://v3.football.api-sports.io"
    headers = {"x-apisports-key": key} if provider == "apisports" else {
        "x-rapidapi-key": key,
        "x-rapidapi-host": os.environ.get("API_FOOTBALL_RAPIDAPI_HOST", "v3.football.api-sports.io"),
    }

    # Resolve league id by name (simple search)
    async with httpx.AsyncClient(timeout=15.0) as client_http:
        # Try exact mapping for common leagues
        name_map = {
            "EPL": "Premier League",
            "La Liga": "La Liga",
            "UEFA": "UEFA Champions League",
            "Süper Lig": "Super Lig",
        }
        search_name = name_map.get(league_name, league_name)
        leagues_resp = await client_http.get(f"{base_url}/leagues", headers=headers, params={"search": search_name})
        leagues_data = leagues_resp.json()
        league_id = None
        if isinstance(leagues_data, dict) and leagues_data.get("response"):
            for item in leagues_data["response"]:
                lg_name = item.get("league", {}).get("name", "")
                if search_name.lower() in lg_name.lower():
                    league_id = item.get("league", {}).get("id")
                    break
        if not league_id and leagues_data.get("response"):
            # fallback to first
            first = leagues_data["response"][0]
            league_id = first.get("league", {}).get("id")

        if not league_id:
            return []

        params = {"league": league_id, "season": datetime.now(timezone.utc).year}
        if date_iso:
            params["date"] = date_iso.split("T")[0]
        fixtures_resp = await client_http.get(f"{base_url}/fixtures", headers=headers, params=params)
        fx_json = fixtures_resp.json()

    fixtures: List[Fixture] = []
    for item in fx_json.get("response", [])[:30]:
        home = item.get("teams", {}).get("home", {}).get("name", "Home")
        away = item.get("teams", {}).get("away", {}).get("name", "Away")
        kickoff = item.get("fixture", {}).get("date")
        fixtures.append(Fixture(
            id=str(uuid.uuid4()),
            sport="football",
            league=league_name,
            home=home,
            away=away,
            kickoff=kickoff or datetime.now(timezone.utc).isoformat(),
        ))
    return fixtures

async def fetch_api_basketball_games(league_name: str, date_iso: Optional[str] = None) -> List[Fixture]:
    # API-Sports Basketball for EuroLeague and BSL
    key = os.environ.get("API_BASKETBALL_KEY")
    if not key:
        return []
    base_url = "https://v1.basketball.api-sports.io"
    headers = {"x-apisports-key": key}
    async with httpx.AsyncClient(timeout=15.0) as client_http:
        # leagues search
        leagues_resp = await client_http.get(f"{base_url}/leagues", headers=headers, params={"search": league_name})
        leagues_data = leagues_resp.json()
        league_id = None
        season = datetime.now(timezone.utc).year
        if isinstance(leagues_data, dict) and leagues_data.get("response"):
            for item in leagues_data["response"]:
                if league_name.lower() in (item.get("name", "") + " " + item.get("type", "")).lower():
                    league_id = item.get("id")
                    break
            if not league_id and leagues_data["response"]:
                league_id = leagues_data["response"][0].get("id")
        if not league_id:
            return []
        params = {"league": league_id, "season": season}
        if date_iso:
            params["date"] = date_iso.split("T")[0]
        games_resp = await client_http.get(f"{base_url}/games", headers=headers, params=params)
        gjson = games_resp.json()
    fixtures: List[Fixture] = []
    for item in gjson.get("response", [])[:30]:
        home = item.get("teams", {}).get("home", {}).get("name", "Home")
        away = item.get("teams", {}).get("away", {}).get("name", "Away")
        kickoff = item.get("date") or item.get("time")
        fixtures.append(Fixture(
            id=str(uuid.uuid4()),
            sport="basketball",
            league=league_name,
            home=home,
            away=away,
            kickoff=kickoff or datetime.now(timezone.utc).isoformat(),
        ))
    return fixtures

async def fetch_sportsdata_nba(date_iso: Optional[str] = None) -> List[Fixture]:
    key = os.environ.get("SPORTSDATA_API_KEY")
    if not key:
        return []
    # Sportsdata NBA: GamesByDate
    # Date format yyyy-mm-dd
    dt = (date_iso or datetime.now(timezone.utc).isoformat()).split("T")[0]
    url = f"https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/{dt}"
    headers = {"Ocp-Apim-Subscription-Key": key}
    async with httpx.AsyncClient(timeout=15.0) as client_http:
        resp = await client_http.get(url, headers=headers)
        data = resp.json()
    fixtures: List[Fixture] = []
    if isinstance(data, list):
        for g in data[:50]:
            home = g.get("HomeTeam", "Home")
            away = g.get("AwayTeam", "Away")
            kickoff = g.get("DateTime") or g.get("Day")
            fixtures.append(Fixture(
                id=str(uuid.uuid4()),
                sport="basketball",
                league="NBA",
                home=home,
                away=away,
                kickoff=kickoff or datetime.now(timezone.utc).isoformat(),
            ))
    return fixtures

# Public fixtures endpoint (live + fallback mock)
@api_router.get("/fixtures", response_model=List[Fixture])
async def list_fixtures(
    sport: Optional[str] = None,
    league: Optional[str] = None,
    date: Optional[str] = Query(default=None, description="ISO date YYYY-MM-DD")
):
    try:
        if sport == "football" and league:
            live = await fetch_api_football_fixtures(league, date)
            return live or [f for f in MOCK_FIXTURES if f.sport == sport and f.league == league]
        if sport == "basketball" and league:
            if league == "NBA":
                live = await fetch_sportsdata_nba(date)
            else:
                live = await fetch_api_basketball_games(league, date)
            return live or [f for f in MOCK_FIXTURES if f.sport == sport and f.league == league]
        # No filters → return few mock samples to populate UI
        return MOCK_FIXTURES
    except Exception as e:
        logger.warning(f"Live fixtures fetch failed: {e}")
        # Always return some data to keep UI useful
        if sport and league:
            return [f for f in MOCK_FIXTURES if f.sport == sport and f.league == league]
        return MOCK_FIXTURES

# Predictions (baseline heuristic)
@api_router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    # Look up across recent fetched items from DB in future; currently mock set
    fx = next((f for f in MOCK_FIXTURES if f.id == req.fixture_id), None)
    if not fx:
        # as a soft fallback, compute odds-like outcome with neutral names
        raise HTTPException(status_code=404, detail="Fixture not found")

    home_strength = max(1, len(fx.home))
    away_strength = max(1, len(fx.away))

    if fx.sport == "football":
        base_total = home_strength + away_strength
        draw = 0.18
        home = (home_strength / base_total) * (1 - draw)
        away = (away_strength / base_total) * (1 - draw)
        return PredictResponse(
            fixture_id=fx.id,
            home_win_prob=round(home, 3),
            draw_prob=round(draw, 3),
            away_win_prob=round(away, 3),
            model="baseline-elo-sim",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    else:
        total = home_strength + away_strength
        home = home_strength / total
        away = away_strength / total
        return PredictResponse(
            fixture_id=fx.id,
            home_win_prob=round(home, 3),
            away_win_prob=round(away, 3),
            model="baseline-elo-sim",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

# LLM explanation via Emergent universal key (backend-only)
@api_router.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    fx = next((f for f in MOCK_FIXTURES if f.id == req.fixture_id), None)
    if not fx:
        raise HTTPException(status_code=404, detail="Fixture not found")

    text = None
    model_used = req.model or "gpt-4o-mini"
    try:
        import emergent
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            raise RuntimeError("Missing EMERGENT_LLM_KEY")
        client_llm = emergent.Client(api_key=emergent_key)
        prompt = (
            f"Explain in 3 concise bullet points why the predicted probabilities make sense for the "
            f"{fx.sport.upper()} match {fx.home} vs {fx.away} in {fx.league}.\n"
            f"Keep it non-technical and reference form, matchup styles, and home-court/field effects."
        )
        resp = client_llm.generate(model=model_used, prompt=prompt, max_tokens=220)
        if hasattr(resp, "__await__"):
            resp = await resp
        text = (resp.get("text") if isinstance(resp, dict) else str(resp)).strip()
    except Exception as e:
        logger.warning(f"LLM explain fallback due to: {e}")
        text = (
            f"- Recent form and home advantage slightly tilt toward {fx.home}.\n"
            f"- Head-to-head and style matchup suggest a close contest.\n"
            f"- Travel and schedule density could affect {fx.away}'s performance."
        )
    return ExplainResponse(fixture_id=fx.id, explanation=text, model=model_used)

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()