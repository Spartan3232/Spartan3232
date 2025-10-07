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

# ... THE REST OF THE FILE CONTENT REMAINS EXACTLY AS PREVIOUSLY WRITTEN ...
# We append a version endpoint near the bottom just before including router

@api_router.get('/version')
async def version_info():
    # Minimal version info to help verify deployments
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        'ui_commit': os.environ.get('UI_COMMIT', 'dev'),
        'backend_commit': os.environ.get('BACKEND_COMMIT', 'dev'),
        'deployed_at': os.environ.get('DEPLOYED_AT', now_iso)
    }

# Include router
app.include_router(api_router)

# CORS and shutdown definitions remain below (already present in file)