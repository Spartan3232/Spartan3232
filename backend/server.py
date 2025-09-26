from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.gemeni.image_generation import GeminiImageGeneration
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="İlaç Satış Koçluk Uygulaması API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str  # "bolge_muduru" or "mumessil"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    role: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    model_used: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    user_id: str
    message: str
    model: str = "gpt-5"  # Default to GPT-5

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    target_value: float
    current_value: float = 0
    deadline: datetime
    status: str = "active"  # active, completed, paused
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    user_id: str
    title: str
    description: str
    target_value: float
    deadline: str  # Will be parsed to datetime

class AIModelConfig(BaseModel):
    openai_enabled: bool = True
    gemini_enabled: bool = True
    claude_enabled: bool = True
    current_model: str = "gpt-5"

# AI Chat Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_chat(model: str, session_id: str):
    """Initialize AI chat with specified model"""
    system_message = """Sen bir ilaç satış koçusun. Türkiye'deki tıbbi satış temsilcilerine yardım ediyorsun. 
    Görevin:
    - Satış tekniklerini geliştirmek
    - Müşteri ilişkileri konusunda tavsiyelerde bulunmak
    - Ürün bilgisi konusunda rehberlik etmek
    - Motivasyonel destek sağlamak
    - Etik satış uygulamalarını teşvik etmek
    
    Her zaman Türkçe cevap ver ve profesyonel bir ton kullan."""
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message
    )
    
    # Set model based on selection
    if model.startswith("gpt"):
        chat.with_model("openai", model)
    elif model.startswith("claude"):
        chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
    elif model.startswith("gemini"):
        chat.with_model("gemini", "gemini-2.0-flash")
    
    return chat

# Helper functions for MongoDB serialization
def prepare_for_mongo(data):
    """Prepare data for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Parse data from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if key.endswith('_at') or key == 'deadline':
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value)
                    except:
                        pass
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "İlaç Satış Koçluk Uygulaması API v1.0"}

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    user_doc = prepare_for_mongo(user_obj.dict())
    await db.users.insert_one(user_doc)
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**parse_from_mongo(user)) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return User(**parse_from_mongo(user))

@api_router.post("/chat", response_model=Dict[str, Any])
async def chat_with_ai(chat_request: ChatRequest):
    try:
        # Get AI chat instance
        chat = await get_ai_chat(chat_request.model, f"user_{chat_request.user_id}")
        
        # Create user message
        user_message = UserMessage(text=chat_request.message)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Save to database
        chat_message = ChatMessage(
            user_id=chat_request.user_id,
            message=chat_request.message,
            response=response,
            model_used=chat_request.model
        )
        
        chat_doc = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_doc)
        
        return {
            "response": response,
            "model_used": chat_request.model,
            "message_id": chat_message.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI sohbet hatası: {str(e)}")

@api_router.get("/chat/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str, limit: int = 50):
    messages = await db.chat_messages.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [ChatMessage(**parse_from_mongo(msg)) for msg in messages]

@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate):
    goal_dict = goal_data.dict()
    # Parse deadline string to datetime
    goal_dict['deadline'] = datetime.fromisoformat(goal_dict['deadline'])
    
    goal_obj = Goal(**goal_dict)
    goal_doc = prepare_for_mongo(goal_obj.dict())
    await db.goals.insert_one(goal_doc)
    return goal_obj

@api_router.get("/goals/{user_id}", response_model=List[Goal])
async def get_user_goals(user_id: str):
    goals = await db.goals.find({"user_id": user_id}).to_list(1000)
    return [Goal(**parse_from_mongo(goal)) for goal in goals]

@api_router.put("/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, current_value: float):
    result = await db.goals.update_one(
        {"id": goal_id},
        {"$set": {"current_value": current_value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    return {"message": "Hedef güncellendi"}

@api_router.get("/ai/models")
async def get_ai_models():
    return {
        "available_models": [
            {"id": "gpt-5", "name": "GPT-5", "provider": "OpenAI"},
            {"id": "claude-3-7-sonnet", "name": "Claude 3.7 Sonnet", "provider": "Anthropic"},
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "Google"}
        ],
        "current_model": "gpt-5"
    }

@api_router.post("/ai/suggest-goal")
async def suggest_goal(user_id: str, context: str = ""):
    try:
        chat = await get_ai_chat("gpt-5", f"goal_suggestion_{user_id}")
        
        prompt = f"""Bir ilaç satış temsilcisi için SMART hedef önerisi oluştur.
        Kullanıcı bağlamı: {context}
        
        Lütfen şu formatta bir JSON cevap ver:
        {{
            "title": "Hedef başlığı",
            "description": "Detaylı açıklama",
            "target_value": "Sayısal hedef",
            "suggested_deadline": "YYYY-MM-DD",
            "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
        }}"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"suggestion": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hedef önerisi hatası: {str(e)}")

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    try:
        # Get user info
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get user's goals
        goals = await db.goals.find({"user_id": user_id}).to_list(100)
        goals_parsed = [Goal(**parse_from_mongo(goal)) for goal in goals]
        
        # Calculate progress statistics
        total_goals = len(goals_parsed)
        completed_goals = len([g for g in goals_parsed if g.status == "completed"])
        active_goals = len([g for g in goals_parsed if g.status == "active"])
        
        # Get recent chat messages
        recent_messages = await db.chat_messages.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(5).to_list(5)
        
        return {
            "user": User(**parse_from_mongo(user)),
            "stats": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "active_goals": active_goals,
                "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0
            },
            "recent_goals": goals_parsed[:5],
            "recent_messages": len(recent_messages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard verisi alınamadı: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()