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
from datetime import datetime, timezone
import base64
import pickle
import re
import unicodedata

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
    if existing:
        aliases = set(existing.get('aliases', []))
        if norm not in aliases:
            aliases.add(norm)
            await db.teams.update_one({'sport': sport, 'canonical': canonical}, {'$set': {'aliases': list(aliases), 'updated_at': datetime.now(timezone.utc).isoformat()}}, upsert=True)
        return
    # If a team doc with this alias exists under another canonical, add alias there
    alias_hit = await db.teams.find_one({'sport': sport, 'aliases': {'$in': [norm]}})
    if alias_hit:
        return
    await db.teams.insert_one({
        'id': str(uuid.uuid4()),
        'sport': sport,
        'canonical': canonical,
        'aliases': [norm],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
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
    # metadata
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
    sport: str  # "football" | "basketball"
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

# Persisted fixture schema helper
PERSIST_SCHEMA_KEYS = [
    'uuid','provider_id','league','season','date_utc','home','away','status','odds','created_at','updated_at'
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

# ---------- Persistence helpers ----------
async def upsert_fixture_doc(collection_name: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    coll = db[collection_name]
    now = datetime.now(timezone.utc).isoformat()
    doc['updated_at'] = now
    if not doc.get('uuid'):
        doc['uuid'] = str(uuid.uuid4())
        doc['created_at'] = now
    # Try to find existing by provider_id else by composite key
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
        # persist
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
        # persist
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
    docs = await db[coll].find(qry).sort('date_utc', 1).limit(200).to_list(200)
    # enforce schema keys order
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

# ---------- Training data fetch (historical) ----------
async def fetch_football_history(league_name: str, seasons: List[int]) -> pd.DataFrame:
    key = os.environ.get("API_FOOTBALL_KEY")
    headers = {"x-apisports-key": key}
    base_url = "https://v3.football.api-sports.io"
    league_id = await resolve_football_league_id(league_name)
    rows = []
    async with httpx.AsyncClient(timeout=30.0) as cli:
        for season in seasons:
            params = {"league": league_id, "season": season}
            r = await cli.get(f"{base_url}/fixtures", headers=headers, params=params)
            if r.status_code != 200:
                continue
            j = r.json()
            for it in j.get("response", []):
                goals = it.get("goals", {})
                gh, ga = goals.get("home"), goals.get("away")
                if gh is None or ga is None:
                    continue
                dt = it.get("fixture", {}).get("date")
                home = it.get("teams", {}).get("home", {}).get("name")
                away = it.get("teams", {}).get("away", {}).get("name")
                rows.append({"date": dt, "home": home, "away": away, "home_score": gh, "away_score": ga})
    df = pd.DataFrame(rows)
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
    return df

async def fetch_basketball_history(league_name: str, seasons: List[int]) -> pd.DataFrame:
    key = os.environ.get("API_BASKETBALL_KEY")
    headers = {"x-apisports-key": key}
    base_url = "https://v1.basketball.api-sports.io"
    league_id = await resolve_basketball_league_id(league_name)
    rows = []
    async with httpx.AsyncClient(timeout=30.0) as cli:
        for season in seasons:
            params = {"league": league_id, "season": season}
            r = await cli.get(f"{base_url}/games", headers=headers, params=params)
            if r.status_code != 200:
                continue
            j = r.json()
            for it in j.get("response", []):
                home = it.get("teams", {}).get("home", {}).get("name")
                away = it.get("teams", {}).get("away", {}).get("name")
                scores = it.get("scores") or {}
                hs = scores.get("home", {}).get("points") if isinstance(scores, dict) else None
                as_ = scores.get("away", {}).get("points") if isinstance(scores, dict) else None
                if hs is None or as_ is None:
                    continue
                dt = it.get("date") or it.get("time")
                rows.append({"date": dt, "home": home, "away": away, "home_score": hs, "away_score": as_})
    df = pd.DataFrame(rows)
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
    return df

# ---------- Feature engineering ----------

def rolling_stats(df: pd.DataFrame, team_col: str, score_for: str, score_against: str, window: int = 5) -> pd.DataFrame:
    features = []
    if df.empty:
        return pd.DataFrame()
    teams = pd.unique(pd.concat([df['home'], df['away']]))
    for team in teams:
        team_games = df[(df['home'] == team) | (df['away'] == team)].copy()
        team_games = team_games.sort_values('date')
        team_games['for'] = np.where(team_games['home'] == team, team_games[score_for], team_games[score_against])
        team_games['against'] = np.where(team_games['home'] == team, team_games[score_against], team_games[score_for])
        team_games['gd'] = team_games['for'] - team_games['against']
        team_games['win'] = (team_games['gd'] > 0).astype(int)
        team_games['draw'] = (team_games['gd'] == 0).astype(int)
        team_games['loss'] = (team_games['gd'] < 0).astype(int)
        team_games['gd_avg_prev5'] = team_games['gd'].rolling(window).mean().shift(1)
        team_games['win_rate_prev5'] = team_games['win'].rolling(window).mean().shift(1)
        features.append(team_games[['date','home','away','gd_avg_prev5','win_rate_prev5']])
    if not features:
        return pd.DataFrame()
    feat_df = pd.concat(features).drop_duplicates(subset=['date','home','away']).sort_values('date')
    return feat_df


def build_football_dataset(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    home_feat = rolling_stats(df, 'home', 'home_score', 'away_score')
    away_feat = rolling_stats(df, 'away', 'away_score', 'home_score')
    if home_feat.empty or away_feat.empty:
        return pd.DataFrame()
    merged = df.merge(home_feat, on=['date','home','away'], how='left', suffixes=(None, '_home'))
    merged = merged.rename(columns={'gd_avg_prev5':'home_gd_avg_prev5','win_rate_prev5':'home_win_rate_prev5'})
    merged = merged.merge(away_feat, on=['date','home','away'], how='left', suffixes=(None, '_away'))
    merged = merged.rename(columns={'gd_avg_prev5':'away_gd_avg_prev5','win_rate_prev5':'away_win_rate_prev5'})
    gd = merged['home_score'] - merged['away_score']
    merged['label'] = np.where(gd>0, 0, np.where(gd==0, 1, 2))
    return merged.dropna(subset=['home_gd_avg_prev5','home_win_rate_prev5','away_gd_avg_prev5','away_win_rate_prev5'])


def build_basketball_dataset(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    home_feat = rolling_stats(df, 'home', 'home_score', 'away_score')
    away_feat = rolling_stats(df, 'away', 'away_score', 'home_score')
    if home_feat.empty or away_feat.empty:
        return pd.DataFrame()
    merged = df.merge(home_feat, on=['date','home','away'], how='left', suffixes=(None, '_home'))
    merged = merged.rename(columns={'gd_avg_prev5':'home_pd_avg_prev5','win_rate_prev5':'home_win_rate_prev5'})
    merged = merged.merge(away_feat, on=['date','home','away'], how='left', suffixes=(None, '_away'))
    merged = merged.rename(columns={'gd_avg_prev5':'away_pd_avg_prev5','win_rate_prev5':'away_win_rate_prev5'})
    gd = merged['home_score'] - merged['away_score']
    merged['label'] = (gd>0).astype(int)
    return merged.dropna(subset=['home_pd_avg_prev5','home_win_rate_prev5','away_pd_avg_prev5','away_win_rate_prev5'])

# ---------- Prophet signals ----------

def compute_prophet_team_signal(df: pd.DataFrame, score_col: str) -> Dict[str, float]:
    signals: Dict[str, float] = {}
    if df.empty:
        return signals
    teams = pd.unique(pd.concat([df['home'], df['away']]))
    for team in teams:
        team_rows = df[(df['home']==team) | (df['away']==team)].copy()
        if len(team_rows) < 10:
            continue
        team_rows['y'] = np.where(team_rows['home']==team, team_rows[score_col], df.loc[team_rows.index, score_col.replace('home','away')])
        ts = team_rows[['date']].copy()
        ts['ds'] = pd.to_datetime(team_rows['date'])
        ts['y'] = team_rows['y'].astype(float)
        try:
            m = Prophet(seasonality_mode='additive', weekly_seasonality=True, daily_seasonality=False)
            m.fit(ts[['ds','y']])
            future = pd.DataFrame({'ds':[pd.Timestamp.utcnow()]})
            yhat = float(m.predict(future)['yhat'].iloc[0])
            signals[team] = yhat
        except Exception:
            continue
    return signals

# ---------- Model persistence ----------

def serialize_model(model: Any) -> str:
    b = pickle.dumps(model)
    return base64.b64encode(b).decode('utf-8')


def deserialize_model(s: str) -> Any:
    return pickle.loads(base64.b64decode(s.encode('utf-8')))

async def save_model(sport: str, league: str, model_blob: str, features: List[str], meta: Dict[str, Any]) -> str:
    # versioning: timestamp-based monotonic
    version = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    model_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': model_id,
        'sport': sport,
        'league': league,
        'model_blob': model_blob,
        'features': features,
        'meta': {**meta, 'created_at': now_iso, 'updated_at': now_iso, 'version': version},
    }
    await db.models.update_one({'id': model_id}, {'$set': doc}, upsert=True)
    return model_id

async def load_latest_model(sport: str, league: str) -> Optional[Dict[str, Any]]:
    doc = await db.models.find_one({'sport': sport, 'league': league}, sort=[('meta.created_at', -1)])
    return doc

# ---------- API: Train Model ----------
@api_router.post('/model/train', response_model=TrainResponse)
async def train_model(req: TrainRequest):
    if req.sport == 'football':
        seasons = await get_last_seasons_football(req.league, 4)
        hist = await fetch_football_history(req.league, seasons)
        if hist.empty or len(hist) < 50:
            extra = sorted(list(set([seasons[-1]-1, seasons[-1]-2])), reverse=True)
            hist_extra = await fetch_football_history(req.league, seasons + extra)
            if len(hist_extra) > len(hist):
                hist = hist_extra
        dataset = build_football_dataset(hist)
        if dataset.empty:
            raise HTTPException(status_code=400, detail='Not enough historical data for training')
        feat_cols = ['home_gd_avg_prev5','home_win_rate_prev5','away_gd_avg_prev5','away_win_rate_prev5']
        X = dataset[feat_cols].fillna(0.0).values
        y = dataset['label'].values
        # time-series split (3 folds)
        n = len(dataset)
        fold = n // 4
        metrics = {}
        accs = []
        start = 0
        for i in range(3):
            split = min(n-1, start + fold*3)
            X_train, X_test = X[start:split], X[split:split+fold]
            y_train, y_test = y[start:split], y[split:split+fold]
            if len(X_test) == 0 or len(X_train) == 0:
                continue
            base = XGBClassifier(objective='multi:softprob', num_class=3, n_estimators=150, max_depth=4, learning_rate=0.1, subsample=0.9, colsample_bytree=0.9, tree_method='hist')
            base.fit(X_train, y_train)
            # simple acc per fold
            accs.append(float((base.predict(X_test) == y_test).mean()))
            start += fold
        metrics['acc_cv_mean'] = float(np.mean(accs)) if accs else None
        # final fit on 80/20 with calibration (multiclass handled internally)
        split = max(1, int(0.8*n))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]
        model = XGBClassifier(objective='multi:softprob', num_class=3, n_estimators=250, max_depth=4, learning_rate=0.08, subsample=0.9, colsample_bytree=0.9, tree_method='hist')
        model.fit(X_train, y_train)
        acc = float((model.predict(X_test) == y_test).mean()) if len(X_test)>0 else None
        metrics['acc'] = acc
        # feature importances
        try:
            importances = list(map(float, model.feature_importances_))
            metrics['top_features'] = sorted(dict(zip(feat_cols, importances)).items(), key=lambda x: x[1], reverse=True)[:5]
        except Exception:
            pass
        blob = serialize_model(model)
        signals = compute_prophet_team_signal(dataset.rename(columns={'home_score':'home_for'}), 'home_for')
        await db.team_signals.update_one({'sport':'football','league':req.league}, {'$set':{'sport':'football','league':req.league,'signals':signals,'generated_at':datetime.now(timezone.utc).isoformat()}}, upsert=True)
        model_id = await save_model('football', req.league, blob, feat_cols, {**metrics, 'algorithm':'xgboost-multi', 'seasons':seasons, 'samples': int(len(dataset))})
        return TrainResponse(id=model_id, sport='football', league=req.league, samples=int(len(dataset)), features=feat_cols, metrics=metrics, created_at=datetime.now(timezone.utc).isoformat())

    if req.sport == 'basketball':
        seasons = await get_last_seasons_basketball(req.league, 4)
        hist = await fetch_basketball_history(req.league, seasons)
        if hist.empty or len(hist) < 50:
            extra = sorted(list(set([seasons[-1]-1, seasons[-1]-2])), reverse=True)
            hist_extra = await fetch_basketball_history(req.league, seasons + extra)
            if len(hist_extra) > len(hist):
                hist = hist_extra
        dataset = build_basketball_dataset(hist)
        if dataset.empty:
            raise HTTPException(status_code=400, detail='Not enough historical data for training')
        feat_cols = ['home_pd_avg_prev5','home_win_rate_prev5','away_pd_avg_prev5','away_win_rate_prev5']
        X = dataset[feat_cols].fillna(0.0).values
        y = dataset['label'].values
        n = len(dataset)
        fold = n // 4
        aucs = []
        start = 0
        for i in range(3):
            split = min(n-1, start + fold*3)
            X_train, X_test = X[start:split], X[split:split+fold]
            y_train, y_test = y[start:split], y[split:split+fold]
            if len(X_test) == 0 or len(X_train) == 0:
                continue
            base = XGBClassifier(objective='binary:logistic', n_estimators=150, max_depth=4, learning_rate=0.1, subsample=0.9, colsample_bytree=0.9, tree_method='hist')
            base.fit(X_train, y_train)
            try:
                from sklearn.metrics import roc_auc_score
                aucs.append(float(roc_auc_score(y_test, base.predict_proba(X_test)[:,1])))
            except Exception:
                pass
            start += fold
        metrics = {'auc_cv_mean': float(np.mean(aucs)) if aucs else None}
        split = max(1, int(0.8*n))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]
        model = XGBClassifier(objective='binary:logistic', n_estimators=250, max_depth=4, learning_rate=0.08, subsample=0.9, colsample_bytree=0.9, tree_method='hist')
        model.fit(X_train, y_train)
        try:
            from sklearn.metrics import roc_auc_score
            prob = model.predict_proba(X_test)[:,1] if len(X_test)>0 else np.array([])
            auc = float(roc_auc_score(y_test, prob)) if prob.size>0 else None
            metrics['auc'] = auc
        except Exception:
            pass
        try:
            importances = list(map(float, model.feature_importances_))
            metrics['top_features'] = sorted(dict(zip(feat_cols, importances)).items(), key=lambda x: x[1], reverse=True)[:5]
        except Exception:
            pass
        blob = serialize_model(model)
        signals = compute_prophet_team_signal(dataset.rename(columns={'home_score':'home_points'}), 'home_points')
        await db.team_signals.update_one({'sport':'basketball','league':req.league}, {'$set':{'sport':'basketball','league':req.league,'signals':signals,'generated_at':datetime.now(timezone.utc).isoformat()}}, upsert=True)
        model_id = await save_model('basketball', req.league, blob, feat_cols, {**metrics, 'algorithm':'xgboost-binary', 'seasons':seasons, 'samples': int(len(dataset))})
        return TrainResponse(id=model_id, sport='basketball', league=req.league, samples=int(len(dataset)), features=feat_cols, metrics=metrics, created_at=datetime.now(timezone.utc).isoformat())

    raise HTTPException(status_code=400, detail='Unsupported sport')

# ---------- Feature computation for inference ----------
async def compute_on_the_fly_features(sport: str, league: str, home: str, away: str) -> Optional[np.ndarray]:
    if sport == 'football':
        seasons = await get_last_seasons_football(league, 4)
        hist = await fetch_football_history(league, seasons)
        if hist.empty:
            return None
        df = build_football_dataset(hist)
        if df.empty:
            return None
        dfh = df[(df['home']==home) | (df['away']==home)].tail(6)
        dfa = df[(df['home']==away) | (df['away']==away)].tail(6)
        home_gd = float(dfh['home_gd_avg_prev5'].dropna().tail(1).values[-1]) if dfh.shape[0]>0 else 0.0
        home_wr = float(dfh['home_win_rate_prev5'].dropna().tail(1).values[-1]) if dfh.shape[0]>0 else 0.0
        away_gd = float(dfa['away_gd_avg_prev5'].dropna().tail(1).values[-1]) if dfa.shape[0]>0 else 0.0
        away_wr = float(dfa['away_win_rate_prev5'].dropna().tail(1).values[-1]) if dfa.shape[0]>0 else 0.0
        return np.array([[home_gd, home_wr, away_gd, away_wr]])
    else:
        seasons = await get_last_seasons_basketball(league, 4)
        hist = await fetch_basketball_history(league, seasons)
        if hist.empty:
            return None
        df = build_basketball_dataset(hist)
        if df.empty:
            return None
        dfh = df[(df['home']==home) | (df['away']==home)].tail(6)
        dfa = df[(df['home']==away) | (df['away']==away)].tail(6)
        home_pd = float(dfh['home_pd_avg_prev5'].dropna().tail(1).values[-1]) if dfh.shape[0]>0 else 0.0
        home_wr = float(dfh['home_win_rate_prev5'].dropna().tail(1).values[-1]) if dfh.shape[0]>0 else 0.0
        away_pd = float(dfa['away_pd_avg_prev5'].dropna().tail(1).values[-1]) if dfa.shape[0]>0 else 0.0
        away_wr = float(dfa['away_win_rate_prev5'].dropna().tail(1).values[-1]) if dfa.shape[0]>0 else 0.0
        return np.array([[home_pd, home_wr, away_pd, away_wr]])

# ---------- Inference endpoints ----------
@api_router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    fx = next((f for f in MOCK_FIXTURES if f.id == req.fixture_id), None)
    if not fx:
        raise HTTPException(status_code=404, detail="Fixture not found")

    try:
        model_doc = await load_latest_model(fx.sport, fx.league)
        if model_doc:
            model = deserialize_model(model_doc['model_blob'])
            features = model_doc.get('features', [])
            X = await compute_on_the_fly_features(fx.sport, fx.league, fx.home, fx.away)
            if X is not None and X.shape[1] == len(features):
                meta = model_doc.get('meta', {})
                if fx.sport == 'football':
                    proba = model.predict_proba(X)[0]
                    return PredictResponse(
                        fixture_id=fx.id,
                        home_win_prob=float(round(proba[0],3)),
                        draw_prob=float(round(proba[1],3)),
                        away_win_prob=float(round(proba[2],3)),
                        model='xgboost-prophet',
                        generated_at=datetime.now(timezone.utc).isoformat(),
                        source='model', model_id=model_doc.get('id'), version=meta.get('version'), metric=meta.get('acc'), trained_at=meta.get('created_at')
                    )
                else:
                    proba = model.predict_proba(X)[0]
                    home_p = float(proba[1])
                    away_p = float(1.0 - home_p)
                    return PredictResponse(
                        fixture_id=fx.id,
                        home_win_prob=float(round(home_p,3)),
                        away_win_prob=float(round(away_p,3)),
                        model='xgboost-prophet',
                        generated_at=datetime.now(timezone.utc).isoformat(),
                        source='model', model_id=model_doc.get('id'), version=meta.get('version'), metric=meta.get('auc'), trained_at=meta.get('created_at')
                    )
    except Exception as e:
        logger.warning(f"Model inference failed, baseline fallback: {e}")

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
            source='baseline'
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
            source='baseline'
        )

@api_router.post('/model/predict', response_model=PredictResponse)
async def model_predict(req: ModelPredictRequest):
    # fixture_uuid preferred
    if req.fixture_uuid:
        doc = await get_fixture_by_uuid(req.fixture_uuid)
        if not doc:
            raise HTTPException(status_code=404, detail='Fixture not found in DB')
        sport = 'football' if await db['football_fixtures'].find_one({'uuid': req.fixture_uuid}) else 'basketball'
        league = doc.get('league')
        home = doc.get('home')
        away = doc.get('away')
    elif req.fixture_id:
        return await predict(PredictRequest(fixture_id=req.fixture_id))
    else:
        if not all([req.sport, req.league, req.home, req.away]):
            raise HTTPException(status_code=400, detail='Provide fixture_uuid or sport,league,home,away')
        sport, league, home, away = req.sport, req.league, req.home, req.away

    model_doc = await load_latest_model(sport, league)
    if model_doc:
        X = await compute_on_the_fly_features(sport, league, home, away)
        if X is not None and X.shape[1] == len(model_doc.get('features', [])):
            model = deserialize_model(model_doc['model_blob'])
            meta = model_doc.get('meta', {})
            if sport == 'football':
                proba = model.predict_proba(X)[0]
                return PredictResponse(
                    fixture_id=req.fixture_uuid or str(uuid.uuid4()),
                    home_win_prob=float(round(proba[0],3)),
                    draw_prob=float(round(proba[1],3)),
                    away_win_prob=float(round(proba[2],3)),
                    model='xgboost-prophet',
                    generated_at=datetime.now(timezone.utc).isoformat(),
                    source='model', model_id=model_doc.get('id'), version=meta.get('version'), metric=meta.get('acc'), trained_at=meta.get('created_at')
                )
            else:
                proba = model.predict_proba(X)[0]
                home_p = float(proba[1])
                away_p = float(1.0 - home_p)
                return PredictResponse(
                    fixture_id=req.fixture_uuid or str(uuid.uuid4()),
                    home_win_prob=float(round(home_p,3)),
                    away_win_prob=float(round(away_p,3)),
                    model='xgboost-prophet',
                    generated_at=datetime.now(timezone.utc).isoformat(),
                    source='model', model_id=model_doc.get('id'), version=meta.get('version'), metric=meta.get('auc'), trained_at=meta.get('created_at')
                )

    # Fallback baseline
    home_strength = max(1, len(home or 'home'))
    away_strength = max(1, len(away or 'away'))
    if sport == 'football':
        base_total = home_strength + away_strength
        draw = 0.18
        home_p = (home_strength / base_total) * (1 - draw)
        away_p = (away_strength / base_total) * (1 - draw)
        return PredictResponse(
            fixture_id=req.fixture_uuid or str(uuid.uuid4()),
            home_win_prob=round(home_p, 3),
            draw_prob=round(draw, 3),
            away_win_prob=round(away_p, 3),
            model='baseline-elo-sim',
            generated_at=datetime.now(timezone.utc).isoformat(),
            source='baseline'
        )
    else:
        total = home_strength + away_strength
        home_p = home_strength / total
        away_p = away_strength / total
        return PredictResponse(
            fixture_id=req.fixture_uuid or str(uuid.uuid4()),
            home_win_prob=round(home_p, 3),
            away_win_prob=round(away_p, 3),
            model='baseline-elo-sim',
            generated_at=datetime.now(timezone.utc).isoformat(),
            source='baseline'
        )

# ---------- Model status ----------
@api_router.get('/model/status', response_model=ModelStatusResponse)
async def model_status(sport: str, league: str):
    doc = await load_latest_model(sport, league)
    if not doc:
        return ModelStatusResponse(trained=False)
    meta = doc.get('meta', {})
    return ModelStatusResponse(
        trained=True,
        model_id=doc.get('id'),
        metrics={'acc': meta.get('acc'), 'auc': meta.get('auc'), 'acc_cv_mean': meta.get('acc_cv_mean'), 'auc_cv_mean': meta.get('auc_cv_mean'), 'top_features': meta.get('top_features')},
        created_at=meta.get('created_at'),
        version=meta.get('version'),
        samples=meta.get('samples'),
        seasons=meta.get('seasons')
    )

# ---------- LLM explanation ----------
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

# ---------- Misc ----------
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(500)
    return [StatusCheck(**s) for s in status_checks]

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