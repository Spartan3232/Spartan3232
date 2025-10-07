from fastapi import FastAPI, APIRouter, HTTPException, Query, Path
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date as date_cls
import base64
import pickle
import re
import unicodedata
import asyncio
from collections import defaultdict, deque

import httpx
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from prophet import Prophet

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

# ----- Utility: normalization -----
_slugify_re = re.compile(r"[^a-z0-9]+")

def normalize_name(name: str) -> str:
    if not name:
        return ""
    n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    n = n.lower().strip()
    n = _slugify_re.sub('-', n).strip('-')
    return n

async def upsert_team_alias(sport: str, canonical: str):
    norm = normalize_name(canonical)
    existing = await db.teams.find_one({'sport': sport, 'canonical': canonical})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        aliases = set(existing.get('aliases', []))
        if norm not in aliases:
            aliases.add(norm)
            await db.teams.update_one({'sport': sport, 'canonical': canonical}, {'$set': {'aliases': list(aliases), 'updated_at': now}}, upsert=True)
        return
    alias_hit = await db.teams.find_one({'sport': sport, 'aliases': {'$in': [norm]}})
    if alias_hit:
        return
    await db.teams.insert_one({
        'id': str(uuid.uuid4()),
        'sport': sport,
        'canonical': canonical,
        'aliases': [norm],
        'created_at': now,
        'updated_at': now,
    })

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
    source: Optional[str] = None
    model_id: Optional[str] = None
    version: Optional[str] = None
    metric: Optional[float] = None
    trained_at: Optional[str] = None

class ExplainRequest(BaseModel):
    fixture_id: str
    model: Optional[str] = None

class ExplainResponse(BaseModel):
    fixture_id: str
    explanation: str
    model: str

class TrainRequest(BaseModel):
    sport: str
    league: str
    horizon_days: int = 14

class TrainResponse(BaseModel):
    id: str
    sport: str
    league: str
    samples: int
    features: List[str]
    metrics: Dict[str, Any]
    created_at: str

class ModelPredictRequest(BaseModel):
    sport: Optional[str] = None
    league: Optional[str] = None
    home: Optional[str] = None
    away: Optional[str] = None
    fixture_id: Optional[str] = None
    fixture_uuid: Optional[str] = None

class ModelStatusResponse(BaseModel):
    trained: bool
    model_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    version: Optional[str] = None
    samples: Optional[int] = None
    seasons: Optional[List[int]] = None
    features_top: Optional[List[Dict[str, float]]] = None

PERSIST_SCHEMA_KEYS = [
    'uuid','provider_id','league','season','date_utc','home','away','status','odds','odds_snapshots','created_at','updated_at'
]

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Integration status ----------
@api_router.get("/")
async def root():
    return {"message": "Sports Analytics API is live"}

@api_router.get("/integrations/status")
async def integrations_status():
    return {
        "api_football": bool(os.environ.get("API_FOOTBALL_KEY")),
        "api_football_provider": os.environ.get("API_FOOTBALL_PROVIDER", ""),
        "api_basketball": bool(os.environ.get("API_BASKETBALL_KEY")),
        "emergent_llm": bool(os.environ.get("EMERGENT_LLM_KEY")),
    }

# ---------- Provider helpers ----------
async def resolve_football_league_id(league_name: str) -> Optional[int]:
    key = os.environ.get("API_FOOTBALL_KEY")
    if not key:
        return None
    headers = {"x-apisports-key": key}
    base_url = "https://v3.football.api-sports.io"
    name_map = {
        "EPL": "Premier League",
        "La Liga": "La Liga",
        "UEFA": "UEFA Champions League",
        "Süper Lig": "Super Lig",
    }
    search_name = name_map.get(league_name, league_name)
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/leagues", headers=headers, params={"search": search_name})
        j = r.json()
    if isinstance(j, dict) and j.get("response"):
        for item in j["response"]:
            lg = item.get("league", {})
            if search_name.lower() in lg.get("name", "").lower():
                return lg.get("id")
        return j["response"][0].get("league", {}).get("id")
    return None

async def resolve_basketball_league_id(league_name: str) -> Optional[int]:
    key = os.environ.get("API_BASKETBALL_KEY")
    if not key:
        return None
    headers = {"x-apisports-key": key}
    base_url = "https://v1.basketball.api-sports.io"
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/leagues", headers=headers, params={"search": league_name})
        j = r.json()
    if isinstance(j, dict) and j.get("response"):
        for item in j["response"]:
            if league_name.lower() in (item.get("name", "") + " " + item.get("type", "")).lower():
                return item.get("id")
        return j["response"][0].get("id")
    return None

async def get_last_seasons_football(league_name: str, n: int = 4) -> List[int]:
    key = os.environ.get("API_FOOTBALL_KEY")
    headers = {"x-apisports-key": key}
    base_url = "https://v3.football.api-sports.io"
    league_id = await resolve_football_league_id(league_name)
    if not league_id:
        y = datetime.now(timezone.utc).year
        return [y-1, y-2, y-3, y-4][:n]
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/leagues", headers=headers, params={"id": league_id})
        j = r.json()
    years: List[int] = []
    try:
        resp = j.get("response", [])[0]
        seasons = resp.get("seasons", [])
        years = sorted([int(s.get("year")) for s in seasons if s.get("year")], reverse=True)
    except Exception:
        pass
    if not years:
        y = datetime.now(timezone.utc).year
        return [y-1, y-2, y-3, y-4][:n]
    return years[:n]

async def get_last_seasons_basketball(league_name: str, n: int = 4) -> List[int]:
    key = os.environ.get("API_BASKETBALL_KEY")
    headers = {"x-apisports-key": key}
    base_url = "https://v1.basketball.api-sports.io"
    league_id = await resolve_basketball_league_id(league_name)
    if not league_id:
        y = datetime.now(timezone.utc).year
        return [y-1, y-2, y-3, y-4][:n]
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/leagues", headers=headers, params={"id": league_id})
        j = r.json()
    years: List[int] = []
    try:
        resp = j.get("response", [])[0]
        seasons = resp.get("seasons", [])
        years = sorted([int(s.get("season")) if isinstance(s, dict) and s.get("season") else int(s) for s in seasons], reverse=True)
    except Exception:
        pass
    if not years:
        y = datetime.now(timezone.utc).year
        return [y-1, y-2, y-3, y-4][:n]
    return years[:n]

# ---------- Rate limiting (simple in-memory) ----------
train_calls: Dict[str, deque] = defaultdict(deque)

snap_calls: deque = deque()

def allow_train(sport: str, league: str, max_calls: int = 2, window_sec: int = 60) -> bool:
    key = f"{sport}:{league}"
    q = train_calls[key]
    now = datetime.now(timezone.utc).timestamp()
    while q and now - q[0] > window_sec:
        q.popleft()
    if len(q) >= max_calls:
        return False
    q.append(now)
    return True

def allow_snapshot(max_calls: int = 6, window_sec: int = 60) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    while snap_calls and now - snap_calls[0] > window_sec:
        snap_calls.popleft()
    if len(snap_calls) >= max_calls:
        return False
    snap_calls.append(now)
    return True

# ---------- Persistence helpers ----------
async def upsert_fixture_doc(collection_name: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    coll = db[collection_name]
    now = datetime.now(timezone.utc).isoformat()
    doc['updated_at'] = now
    if not doc.get('uuid'):
        doc['uuid'] = str(uuid.uuid4())
        doc['created_at'] = now
    qry = {'provider_id': doc.get('provider_id')} if doc.get('provider_id') else {
        'league': doc['league'], 'season': doc.get('season'), 'date_utc': doc['date_utc'], 'home': doc['home'], 'away': doc['away']
    }
    existing = await coll.find_one(qry)
    if existing:
        doc['uuid'] = existing.get('uuid', doc['uuid'])
        await coll.update_one({'uuid': doc['uuid']}, {'$set': doc}, upsert=True)
        return doc
    await coll.insert_one(doc)
    return doc

async def get_fixture_by_uuid(uuid_str: str) -> Optional[Dict[str, Any]]:
    for name in ['football_fixtures', 'basketball_fixtures']:
        doc = await db[name].find_one({'uuid': uuid_str})
        if doc:
            return doc
    return None

# ---------- Live fixtures (and persist) ----------
async def fetch_api_football_fixtures(league_name: str, date_iso: Optional[str] = None) -> List[Fixture]:
    key = os.environ.get("API_FOOTBALL_KEY")
    if not key:
        return []
    headers = {"x-apisports-key": key}
    base_url = "https://v3.football.api-sports.io"
    league_id = await resolve_football_league_id(league_name)
    if not league_id:
        return []
    season = datetime.now(timezone.utc).year
    params = {"league": league_id, "season": season}
    if date_iso:
        params["date"] = date_iso.split("T")[0]
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/fixtures", headers=headers, params=params)
        j = r.json()
    fixtures: List[Fixture] = []
    for item in j.get("response", [])[:60]:
        home = item.get("teams", {}).get("home", {}).get("name", "Home")
        away = item.get("teams", {}).get("away", {}).get("name", "Away")
        kickoff = item.get("fixture", {}).get("date")
        provider_id = item.get("fixture", {}).get("id")
        status_obj = item.get("fixture", {}).get("status", {})
        status = status_obj.get('short') or status_obj.get('long') or ""
        fixtures.append(Fixture(id=str(uuid.uuid4()), sport="football", league=league_name, home=home, away=away, kickoff=kickoff or datetime.now(timezone.utc).isoformat()))
        await upsert_team_alias('football', home)
        await upsert_team_alias('football', away)
        await upsert_fixture_doc('football_fixtures', {
            'uuid': None,
            'provider_id': provider_id,
            'league': league_name,
            'season': season,
            'date_utc': kickoff or datetime.now(timezone.utc).isoformat(),
            'home': home,
            'away': away,
            'status': status,
            'odds': None,
            'odds_snapshots': [],
        })
    return fixtures

async def fetch_api_basketball_games(league_name: str, date_iso: Optional[str] = None) -> List[Fixture]:
    key = os.environ.get("API_BASKETBALL_KEY")
    if not key:
        return []
    headers = {"x-apisports-key": key}
    base_url = "https://v1.basketball.api-sports.io"
    league_id = await resolve_basketball_league_id(league_name)
    if not league_id:
        return []
    season = datetime.now(timezone.utc).year
    params = {"league": league_id, "season": season}
    if date_iso:
        params["date"] = date_iso.split("T")[0]
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base_url}/games", headers=headers, params=params)
        j = r.json()
    fixtures: List[Fixture] = []
    for item in j.get("response", [])[:60]:
        home = item.get("teams", {}).get("home", {}).get("name", "Home")
        away = item.get("teams", {}).get("away", {}).get("name", "Away")
        kickoff = item.get("date") or item.get("time")
        provider_id = item.get("id")
        status_obj = item.get("status", {}) if isinstance(item.get('status'), dict) else {}
        status = status_obj.get('long') or status_obj.get('short') or (item.get('status') if isinstance(item.get('status'), str) else "")
        fixtures.append(Fixture(id=str(uuid.uuid4()), sport="basketball", league=league_name, home=home, away=away, kickoff=kickoff or datetime.now(timezone.utc).isoformat()))
        await upsert_team_alias('basketball', home)
        await upsert_team_alias('basketball', away)
        await upsert_fixture_doc('basketball_fixtures', {
            'uuid': None,
            'provider_id': provider_id,
            'league': league_name,
            'season': season,
            'date_utc': kickoff or datetime.now(timezone.utc).isoformat(),
            'home': home,
            'away': away,
            'status': status,
            'odds': None,
            'odds_snapshots': [],
        })
    return fixtures

@api_router.get("/fixtures", response_model=List[Fixture])
async def list_fixtures(sport: Optional[str] = None, league: Optional[str] = None, date: Optional[str] = Query(default=None, description="ISO YYYY-MM-DD")):
    try:
        if sport == "football" and league:
            live = await fetch_api_football_fixtures(league, date)
            return live or []
        if sport == "basketball" and league:
            live = await fetch_api_basketball_games(league, date)
            return live or []
        return []
    except Exception as e:
        logger.warning(f"Live fixtures fetch failed: {e}")
        return []

# ---------- DB fixtures endpoints ----------
@api_router.get("/fixtures/db")
async def fixtures_from_db(sport: str, league: str, date: Optional[str] = Query(default=None, description="YYYY-MM-DD")):
    coll = 'football_fixtures' if sport == 'football' else 'basketball_fixtures'
    qry: Dict[str, Any] = {'league': league}
    if date:
        qry['date_utc'] = {'$regex': f"^{date}"}
    docs = await db[coll].find(qry).sort('date_utc', 1).limit(300).to_list(300)
    def project(d):
        out = {k: d.get(k) for k in PERSIST_SCHEMA_KEYS}
        out['sport'] = sport
        return out
    return [project(d) for d in docs]

@api_router.get('/fixture/{uuid_str}')
async def get_fixture(uuid_str: str = Path(..., description='fixture uuid')):
    doc = await get_fixture_by_uuid(uuid_str)
    if not doc:
        raise HTTPException(status_code=404, detail='Fixture not found')
    return doc

# ---------- Odds ingestion (API-Sports) ----------
async def _with_backoff(request_fn, max_attempts=3):
    delay = 0.5
    last_exc = None
    for _ in range(max_attempts):
        try:
            return await request_fn()
        except Exception as e:
            last_exc = e
            await asyncio.sleep(delay)
            delay *= 2
    if last_exc:
        raise last_exc

async def _parse_markets(bookmakers: List[Dict[str, Any]]) -> Dict[str, Any]:
    markets: Dict[str, Any] = {}
    if not bookmakers:
        return markets
    bets = bookmakers[0].get('bets', [])
    for bet in bets:
        name = (bet.get('name') or '').lower()
        values = bet.get('values', [])
        if 'winner' in name or 'moneyline' in name or '1x2' in name:
            m = markets.setdefault('moneyline', {})
            for v in values:
                label = (v.get('value') or '').lower()
                odd = v.get('odd')
                try:
                    oddf = float(odd) if odd is not None else None
                except Exception:
                    oddf = None
                if 'home' in label or label == '1':
                    m['home'] = oddf
                elif 'draw' in label or label == 'x':
                    m['draw'] = oddf
                elif 'away' in label or label == '2':
                    m['away'] = oddf
        if 'over/under' in name or 'total' in name:
            t = markets.setdefault('totals', {})
            over = next((v for v in values if (v.get('value') or '').lower().startswith('over')), None)
            under = next((v for v in values if (v.get('value') or '').lower().startswith('under')), None)
            def _parse_line(v):
                if not v:
                    return None
                val = v.get('value') or ''
                m = re.search(r"([0-9]+\.?[0-9]*)", val)
                return float(m.group(1)) if m else None
            t['line'] = _parse_line(over) or _parse_line(under)
            try:
                t['over'] = float(over.get('odd')) if over and over.get('odd') else None
            except Exception:
                pass
            try:
                t['under'] = float(under.get('odd')) if under and under.get('odd') else None
            except Exception:
                pass
        if 'handicap' in name or 'spread' in name:
            s = markets.setdefault('spread', {})
            line = None
            for v in values:
                mline = re.search(r"([+-]?[0-9]+\.?[0-9]*)", (v.get('handicap') or v.get('value') or ''))
                if mline:
                    try:
                        line = float(mline.group(1))
                        break
                    except Exception:
                        pass
            s['line'] = line
            for v in values:
                label = (v.get('value') or '').lower()
                try:
                    oddf = float(v.get('odd')) if v.get('odd') else None
                except Exception:
                    oddf = None
                if 'home' in label or label == '1':
                    s['home'] = oddf
                elif 'away' in label or label == '2':
                    s['away'] = oddf
    return markets

async def _append_snapshot(coll_name: str, uuid_val: str, odds_payload: Dict[str, Any]):
    # Keep last 50 snapshots
    await db[coll_name].update_one({'uuid': uuid_val}, {'$push': {'odds_snapshots': {'$each':[odds_payload], '$slice': -50}}, '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}})

@api_router.post('/fixtures/odds/fetch')
async def fetch_odds(sport: str, league: str, date: str):
    collected_at = datetime.now(timezone.utc).isoformat()
    if sport not in ['football','basketball']:
        raise HTTPException(status_code=400, detail='Unsupported sport')

    if sport == 'football':
        key = os.environ.get('API_FOOTBALL_KEY')
        headers = {'x-apisports-key': key}
        base = 'https://v3.football.api-sports.io'
        league_id = await resolve_football_league_id(league)
        season = datetime.now(timezone.utc).year
        async with httpx.AsyncClient(timeout=25.0) as cli:
            async def do_req():
                return await cli.get(f"{base}/odds", headers=headers, params={'league': league_id, 'season': season, 'date': date})
            r = await _with_backoff(do_req)
            j = r.json()
        updated = 0
        for it in j.get('response', []):
            fixture_id = it.get('fixture', {}).get('id')
            markets = await _parse_markets(it.get('bookmakers', []))
            if not markets:
                continue
            odds_payload = {'provider': 'apisports','collected_at': collected_at,'markets': markets}
            doc = await db['football_fixtures'].find_one({'provider_id': fixture_id})
            if not doc:
                home = it.get('teams', {}).get('home', {}).get('name')
                away = it.get('teams', {}).get('away', {}).get('name')
                doc = await db['football_fixtures'].find_one({'league': league, 'date_utc': {'$regex': f'^{date}'}, 'home': home, 'away': away})
            if doc:
                await db['football_fixtures'].update_one({'uuid': doc['uuid']}, {'$set': {'odds': odds_payload, 'updated_at': collected_at}})
                await _append_snapshot('football_fixtures', doc['uuid'], odds_payload)
                updated += 1
        return {'updated': updated, 'count': len(j.get('response', []))}

    else:
        key = os.environ.get('API_BASKETBALL_KEY')
        headers = {'x-apisports-key': key}
        base = 'https://v1.basketball.api-sports.io'
        league_id = await resolve_basketball_league_id(league)
        season = datetime.now(timezone.utc).year
        async with httpx.AsyncClient(timeout=25.0) as cli:
            async def do_req():
                return await cli.get(f"{base}/odds", headers=headers, params={'league': league_id, 'season': season, 'date': date})
            r = await _with_backoff(do_req)
            j = r.json()
        updated = 0
        for it in j.get('response', []):
            game_id = it.get('id') or it.get('game', {}).get('id')
            markets = await _parse_markets(it.get('bookmakers', []))
            if not markets:
                continue
            odds_payload = {'provider': 'apisports','collected_at': collected_at,'markets': markets}
            doc = await db['basketball_fixtures'].find_one({'provider_id': game_id})
            if not doc:
                try:
                    home = it.get('teams', {}).get('home', {}).get('name')
                    away = it.get('teams', {}).get('away', {}).get('name')
                except Exception:
                    home = away = None
                if home and away:
                    doc = await db['basketball_fixtures'].find_one({'league': league, 'date_utc': {'$regex': f'^{date}'}, 'home': home, 'away': away})
            if doc:
                await db['basketball_fixtures'].update_one({'uuid': doc['uuid']}, {'$set': {'odds': odds_payload, 'updated_at': collected_at}})
                await _append_snapshot('basketball_fixtures', doc['uuid'], odds_payload)
                updated += 1
        return {'updated': updated, 'count': len(j.get('response', []))}

@api_router.get('/odds/live-window')
async def odds_live_window(fixture_uuid: str, limit: int = 50):
    doc = await get_fixture_by_uuid(fixture_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail='Fixture not found')
    snaps = doc.get('odds_snapshots') or []
    return snaps[-limit:]

# ---------- Training data fetch (historical) ----------
# (unchanged below except for imports above)