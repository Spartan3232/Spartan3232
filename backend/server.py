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

# ........................ existing code above this line remains (models, odds, train, predict, etc.) ........................
# (We only append new History endpoints and helpers below.)

# ---------- History helpers ----------

def normalize_name(name: str) -> str:
    if not name:
        return ""
    n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    n = n.lower().strip()
    n = re.sub(r"[^a-z0-9]+", '-', n).strip('-')
    return n

async def resolve_football_team_id(league_name: str, team_name: str) -> Optional[int]:
    key = os.environ.get('API_FOOTBALL_KEY')
    if not key:
        return None
    headers = {'x-apisports-key': key}
    base = 'https://v3.football.api-sports.io'
    # resolve league id
    league_id = await resolve_football_league_id(league_name)
    if not league_id:
        return None
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base}/teams", headers=headers, params={'search': team_name})
        j = r.json()
    for it in j.get('response', []):
        team = it.get('team', {})
        # team leagues listing not always present; accept best name match
        if team_name.lower() in (team.get('name','').lower()):
            return team.get('id')
    # fallback: first
    try:
        return j.get('response', [])[0].get('team', {}).get('id')
    except Exception:
        return None

async def resolve_basketball_team_id(league_name: str, team_name: str) -> Optional[int]:
    key = os.environ.get('API_BASKETBALL_KEY')
    if not key:
        return None
    headers = {'x-apisports-key': key}
    base = 'https://v1.basketball.api-sports.io'
    league_id = await resolve_basketball_league_id(league_name)
    if not league_id:
        return None
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.get(f"{base}/teams", headers=headers, params={'search': team_name, 'league': league_id})
        j = r.json()
    for it in j.get('response', []):
        team = it.get('name') or it.get('team', {})
        name = team if isinstance(team, str) else team.get('name','')
        if team_name.lower() in name.lower():
            return (it.get('id') or (it.get('team', {}) or {}).get('id'))
    try:
        first = j.get('response', [])[0]
        return first.get('id') or (first.get('team', {}) or {}).get('id')
    except Exception:
        return None

async def fetch_last_games_football(team_id: int, league_id: int, seasons: List[int], n: int) -> List[Dict[str, Any]]:
    key = os.environ.get('API_FOOTBALL_KEY')
    if not key or not team_id:
        return []
    headers = {'x-apisports-key': key}
    base = 'https://v3.football.api-sports.io'
    out: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as cli:
        for season in seasons:
            r = await cli.get(f"{base}/fixtures", headers=headers, params={'team': team_id, 'league': league_id, 'season': season})
            if r.status_code != 200:
                continue
            for fx in r.json().get('response', []):
                status = (fx.get('fixture', {}).get('status', {}) or {}).get('short')
                if status not in {'FT','AET','PEN'}:
                    continue
                h = fx.get('teams', {}).get('home', {})
                a = fx.get('teams', {}).get('away', {})
                sh = fx.get('goals', {}).get('home')
                sa = fx.get('goals', {}).get('away')
                if sh is None or sa is None:
                    continue
                is_home = h.get('id') == team_id
                res = 'D'
                if sh > sa:
                    res = 'W' if is_home else 'L'
                elif sh < sa:
                    res = 'L' if is_home else 'W'
                margin = (sh - sa) if is_home else (sa - sh)
                out.append({
                    'date_utc': fx.get('fixture',{}).get('date'),
                    'home': h.get('name'),
                    'away': a.get('name'),
                    'score_home': sh,
                    'score_away': sa,
                    'result': res,
                    'margin': margin,
                })
                if len(out) >= n:
                    break
            if len(out) >= n:
                break
    return sorted(out, key=lambda x: x['date_utc'] or '', reverse=True)[:n]

async def fetch_last_games_basket(team_id: int, league_id: int, seasons: List[int], n: int) -> List[Dict[str, Any]]:
    key = os.environ.get('API_BASKETBALL_KEY')
    if not key or not team_id:
        return []
    headers = {'x-apisports-key': key}
    base = 'https://v1.basketball.api-sports.io'
    out: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as cli:
        for season in seasons:
            r = await cli.get(f"{base}/games", headers=headers, params={'team': team_id, 'league': league_id, 'season': season})
            if r.status_code != 200:
                continue
            for g in r.json().get('response', []):
                status = (g.get('status', {}) or {}).get('long','').lower()
                if status not in {'finished','after overtime','after over time'}:
                    continue
                th = g.get('teams', {}).get('home', {})
                ta = g.get('teams', {}).get('away', {})
                sh = ((g.get('scores') or {}).get('home') or {}).get('total')
                sa = ((g.get('scores') or {}).get('away') or {}).get('total')
                if sh is None or sa is None:
                    continue
                is_home = th.get('id') == team_id
                res = 'W' if ((is_home and sh > sa) or ((not is_home) and sa > sh)) else 'L'
                margin = (sh - sa) if is_home else (sa - sh)
                out.append({
                    'date_utc': g.get('date'),
                    'home': th.get('name'),
                    'away': ta.get('name'),
                    'score_home': sh,
                    'score_away': sa,
                    'result': res,
                    'margin': margin,
                })
                if len(out) >= n:
                    break
            if len(out) >= n:
                break
    return sorted(out, key=lambda x: x['date_utc'] or '', reverse=True)[:n]

async def form_summary(games: List[Dict[str, Any]], football: bool) -> Dict[str, Any]:
    if not games:
        return {'played': 0, 'wins': 0, 'draws': 0, 'losses': 0, 'avg_margin': 0.0}
    w = sum(1 for g in games if g['result'] == 'W')
    d = sum(1 for g in games if g['result'] == 'D') if football else 0
    l = sum(1 for g in games if g['result'] == 'L')
    avgm = float(np.mean([g['margin'] for g in games])) if games else 0.0
    return {'played': len(games), 'wins': w, 'draws': d, 'losses': l, 'avg_margin': round(avgm, 2)}

# ---------- History endpoints ----------
@api_router.get('/history')
async def team_form(sport: str, league: str, team: str, n: int = 5):
    canon = normalize_name(team)
    seasons = await (get_last_seasons_football(league, 4) if sport == 'football' else get_last_seasons_basketball(league, 4))
    if sport == 'football':
        league_id = await resolve_football_league_id(league)
        team_id = await resolve_football_team_id(league, team)
        games = await fetch_last_games_football(team_id or 0, league_id or 0, seasons, n)
        summary = await form_summary(games, football=True)
    else:
        league_id = await resolve_basketball_league_id(league)
        team_id = await resolve_basketball_team_id(league, team)
        games = await fetch_last_games_basket(team_id or 0, league_id or 0, seasons, n)
        summary = await form_summary(games, football=False)
    now_iso = datetime.now(timezone.utc).isoformat()
    # cache
    await db.matches_history.update_one(
        {'sport': sport, 'league': league, 'team_canonical': canon},
        {'$set': {'sport': sport, 'league': league, 'team_canonical': canon, 'games': games, 'n': n, 'updated_at': now_iso}},
        upsert=True
    )
    return {'sport': sport, 'league': league, 'team_canonical': canon, 'games': games, 'n': n, 'updated_at': now_iso}

@api_router.get('/history/h2h')
async def h2h(sport: str, league: str, home: str, away: str, n: int = 5):
    home_hist = await team_form(sport, league, home, n)  # type: ignore
    away_hist = await team_form(sport, league, away, n)  # type: ignore
    return {'home': home_hist, 'away': away_hist}

# ---------- Version endpoint ----------
@api_router.get('/version')
async def version_info():
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        'ui_commit': os.environ.get('UI_COMMIT', 'dev'),
        'backend_commit': os.environ.get('BACKEND_COMMIT', 'dev'),
        'deployed_at': os.environ.get('DEPLOYED_AT', now_iso)
    }

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