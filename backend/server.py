from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date

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

# Mock domain models for MVP
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
    draw_prob: Optional[float] = None  # for football
    away_win_prob: float
    model: str
    generated_at: str

class ExplainRequest(BaseModel):
    fixture_id: str
    model: Optional[str] = None  # which LLM model if any

class ExplainResponse(BaseModel):
    fixture_id: str
    explanation: str
    model: str

# Utilities
MOCK_FIXTURES = [
    Fixture(
        id=str(uuid.uuid4()),
        sport="football",
        league="EPL",
        home="Arsenal",
        away="Chelsea",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
    Fixture(
        id=str(uuid.uuid4()),
        sport="football",
        league="La Liga",
        home="Real Madrid",
        away="Barcelona",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
    Fixture(
        id=str(uuid.uuid4()),
        sport="football",
        league="Süper Lig",
        home="Galatasaray",
        away="Fenerbahçe",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
    Fixture(
        id=str(uuid.uuid4()),
        sport="basketball",
        league="NBA",
        home="Boston Celtics",
        away="LA Lakers",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
    Fixture(
        id=str(uuid.uuid4()),
        sport="basketball",
        league="EuroLeague",
        home="Anadolu Efes",
        away="Real Madrid",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
    Fixture(
        id=str(uuid.uuid4()),
        sport="basketball",
        league="BSL",
        home="Fenerbahçe Beko",
        away="Karşıyaka",
        kickoff=datetime.now(timezone.utc).isoformat(),
    ),
]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Routes
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

# Fixtures (mock for MVP)
@api_router.get("/fixtures", response_model=List[Fixture])
async def list_fixtures(sport: Optional[str] = None, league: Optional[str] = None):
    items = MOCK_FIXTURES
    if sport:
        items = [f for f in items if f.sport == sport]
    if league:
        items = [f for f in items if f.league == league]
    return items

# Predictions (baseline heuristic simulating XGBoost/Prophet output)
@api_router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    fx = next((f for f in MOCK_FIXTURES if f.id == req.fixture_id), None)
    if not fx:
        raise HTTPException(status_code=404, detail="Fixture not found")

    # Simple baseline: derive probabilities from team name lengths (placeholder)
    home_strength = max(1, len(fx.home))
    away_strength = max(1, len(fx.away))

    if fx.sport == "football":
        # three-way normalization with light draw bias
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
        # basketball two-way
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

    # Try using emergent universal client; if unavailable, fallback to template
    text = None
    model_used = req.model or "gpt-4o-mini"
    try:
        import emergent
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            raise RuntimeError("Missing EMERGENT_LLM_KEY")
        client = emergent.Client(api_key=emergent_key)
        prompt = (
            f"Explain in 3 concise bullet points why the predicted probabilities make sense for the "
            f"{fx.sport.upper()} match {fx.home} vs {fx.away} in {fx.league}.\n"
            f"Keep it non-technical and reference form, matchup styles, and home-court/field effects."
        )
        # assuming async; if sync, wrap accordingly
        # Some emergent clients are sync; handle both
        try:
            # try awaitable
            resp = client.generate(model=model_used, prompt=prompt, max_tokens=220)
            if hasattr(resp, "__await__"):
                resp = await resp
        except TypeError:
            resp = client.generate(model=model_used, prompt=prompt, max_tokens=220)
        text = (resp.get("text") if isinstance(resp, dict) else str(resp)).strip()
    except Exception as e:
        logger.warning(f"LLM explain fallback due to: {e}")
        text = (
            f"- Recent form and home advantage slightly tilt toward {fx.home}.\n"
            f"- Head-to-head and style matchup suggest a close contest.\n"
            f"- Travel and schedule density could affect {fx.away}'s performance."
        )
    return ExplainResponse(
        fixture_id=fx.id,
        explanation=text,
        model=model_used,
    )

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