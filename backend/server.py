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

# ROTA Coaching Framework Integration
ROTA_FRAMEWORK = {
    "ETKİNLİK": {
        "Ürün Bilgisi": [
            "Ürünün tüm endikasyon, yan etki gibi etki mekanizmasının eğitim modüllerinden çalışılması",
            "Bölgede medikal eğitimi iyi olan bir TTS den destek alınması", 
            "Tüm bilgiler ürün, medikal ve rekabet bilgileri konsolide edilir ve bölge toplantısında paylaşılır"
        ],
        "Medikal Bilgi": [
            "Sorumlu olunan portföye yönelik medikal bilginin tamamının öğrenilmesi",
            "Ekipte medikal eğitimi iyi olan bir TTS ile çalışması sağlanır",
            "Farklı uzmanlık ve dr profillerine göre role playler yapılarak bilgilerin pekişitirilmesi"
        ],
        "Rekabet Bilgisi": [
            "Mevcut ürünlerin majör rakiplerinin bilinmesi, brick bazında pazar payı belirlenmesi",
            "Rakip bilgilerinin ve broşürlerinin toplanması, medikal içeriklerinin kıyaslanması",
            "Rekabetin stratejilerinin bilinmesi ve önlemler alınması"
        ],
        "Bölge/Pazar Bilgisi": [
            "Bölgenin üretim/tüketim odağının belirlenmesi ve çalışma prensipleri",
            "SWOT analizini doğru yapabilmesi ve aksiyon oluşturma",
            "IQVIA datasını analiz etme ve rapor oluşturma"
        ],
        "Hedefleme/Segmentasyon": [
            "Tüm müşterilerin havuzunun excel halinde alınması ve puanlanması",
            "Potansiyel sıralamasına göre doktor liste oluşturulması",
            "Frekans-Plan-Ziyaret oranlarında realizasyon sağlanması"
        ]
    },
    "VERİMLİLİK": {
        "Etkili giriş": [
            "İlgi oluşturacak 15 farklı giriş cümlesinin hazırlanması",
            "Her tanıtım sonrası ilgi durumunun değerlendirilmesi",
            "Role play çalışmaları ile gelişim sağlanması"
        ],
        "Etkili soru sorma": [
            "Açık ve kapalı uçlu sorular hazırlanması",
            "Müşteri ihtiyaçlarına yönelik bilgilendirici sorular",
            "Role play örneklerinin uygulanması"
        ],
        "Aktif dinleme": [
            "Müşteri söylediklerini farklı kelimelerle tekrar etme",
            "Düşüncelerin tekrar anlatılması ile doğrulama",
            "Aktif dinleme teknikleri geliştirme"
        ],
        "İhtiyaç ortaya çıkarma": [
            "Ürün tercih etmeme nedenlerinin tespit edilmesi",
            "Sebep analizinin yapılması ve taktik belirlenmesi",
            "Yanlış anlama, bilgi eksikliği veya önyargıların giderilmesi"
        ],
        "Kapanış teknikleri": [
            "Kapanış ve reçete isteme cümlelerinin hazırlanması",
            "Role play yöntemi ile test edilmesi",
            "Reçete sonuçlarının takip edilmesi"
        ]
    }
}


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
    model: str = "gpt-5"

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str  # ROTA category like "Ürün Bilgisi", "Etkili giriş"
    subcategory: str  # Specific area
    target_value: float
    current_value: float = 0
    deadline: datetime
    status: str = "active"
    action_steps: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    user_id: str
    title: str
    description: str
    category: str
    subcategory: str
    target_value: float
    deadline: str
    action_steps: List[str] = []

class CoachingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coach_id: str  # Bölge müdürü
    coachee_id: str  # Mümessil
    goal_id: Optional[str] = None
    session_type: str  # "hedef_belirleme", "rota_calisma", "role_play"
    notes: str
    feedback: str
    action_items: List[str] = []
    next_session_date: Optional[datetime] = None
    status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CoachingSessionCreate(BaseModel):
    coach_id: str
    coachee_id: str
    goal_id: Optional[str] = None
    session_type: str
    notes: str
    feedback: str
    action_items: List[str] = []
    next_session_date: Optional[str] = None

# AI Chat Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_chat(model: str, session_id: str, coaching_context: str = ""):
    """Initialize AI chat with ROTA coaching context"""
    system_message = f"""Sen uzman bir ilaç satış koçusun ve ROTA (Nasıllar Rehberi – Hedef Bazlı Koçluk) metodolojisini kullanıyorsun.

ROTA Framework:
{json.dumps(ROTA_FRAMEWORK, ensure_ascii=False, indent=2)}

{coaching_context}

Görevlerin:
- ROTA metodolojisine uygun koçluk yapmak
- Spesifik, ölçülebilir hedefler önermek
- ETKİNLİK ve VERİMLİLİK alanlarında rehberlik etmek
- Her gelişim alanı için NASIL 1, NASIL 2, NASIL 3 adımları önermek
- Türkçe ilaç satış terminolojisi kullanmak
- Pratik role play örnekleri vermek

Her zaman Türkçe cevap ver, profesyonel ve destekleyici bir ton kullan."""
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message
    )
    
    if model.startswith("gpt"):
        chat.with_model("openai", model)
    elif model.startswith("claude"):
        chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
    elif model.startswith("gemini"):
        chat.with_model("gemini", "gemini-2.0-flash")
    
    return chat

# Helper functions for MongoDB serialization
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if key.endswith('_at') or key == 'deadline' or key == 'next_session_date':
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value)
                    except:
                        pass
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "ROTA İlaç Satış Koçluk Uygulaması API v2.0"}

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
        # Get user info for context
        user = await db.users.find_one({"id": chat_request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get user's recent goals for context
        goals = await db.goals.find({"user_id": chat_request.user_id}).sort("created_at", -1).limit(3).to_list(3)
        
        coaching_context = f"""
Kullanıcı Profili:
- İsim: {user['name']}
- Rol: {'Bölge Müdürü' if user['role'] == 'bolge_muduru' else 'Tıbbi Satış Temsilcisi'}

Aktif Hedefleri:
{chr(10).join([f"- {goal.get('title', '')}: {goal.get('description', '')}" for goal in goals]) if goals else "Henüz hedef belirlenmemiş"}
"""
        
        # Get AI chat instance with coaching context
        chat = await get_ai_chat(chat_request.model, f"user_{chat_request.user_id}", coaching_context)
        
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
    goal = await db.goals.find_one({"id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    
    # Check if goal is completed
    status = "completed" if current_value >= goal["target_value"] else "active"
    
    result = await db.goals.update_one(
        {"id": goal_id},
        {"$set": {"current_value": current_value, "status": status}}
    )
    return {"message": "Hedef güncellendi", "status": status}

@api_router.get("/rota/framework")
async def get_rota_framework():
    return {"framework": ROTA_FRAMEWORK}

@api_router.get("/rota/suggestions/{category}")
async def get_rota_suggestions(category: str):
    if category not in ROTA_FRAMEWORK:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    return {"category": category, "areas": ROTA_FRAMEWORK[category]}

@api_router.post("/coaching/sessions", response_model=CoachingSession)
async def create_coaching_session(session_data: CoachingSessionCreate):
    session_dict = session_data.dict()
    if session_dict.get('next_session_date'):
        session_dict['next_session_date'] = datetime.fromisoformat(session_dict['next_session_date'])
    
    session_obj = CoachingSession(**session_dict)
    session_doc = prepare_for_mongo(session_obj.dict())
    await db.coaching_sessions.insert_one(session_doc)
    return session_obj

@api_router.get("/coaching/sessions/{user_id}", response_model=List[CoachingSession])
async def get_coaching_sessions(user_id: str):
    sessions = await db.coaching_sessions.find({
        "$or": [{"coach_id": user_id}, {"coachee_id": user_id}]
    }).sort("created_at", -1).to_list(100)
    
    return [CoachingSession(**parse_from_mongo(session)) for session in sessions]

@api_router.post("/ai/suggest-goal")
async def suggest_goal_with_rota(user_id: str, focus_area: str = "", experience_level: str = ""):
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        chat = await get_ai_chat("gpt-5", f"goal_suggestion_{user_id}")
        
        prompt = f"""ROTA metodolojisine uygun bir gelişim hedefi öner.

Kullanıcı Bilgileri:
- İsim: {user['name']}
- Rol: {'Bölge Müdürü' if user['role'] == 'bolge_muduru' else 'Tıbbi Satış Temsilcisi'}
- Odaklanmak istediği alan: {focus_area or 'Genel gelişim'}
- Deneyim seviyesi: {experience_level or 'Orta seviye'}

Lütfen şu formatta bir JSON cevap ver:
{{
    "title": "Hedef başlığı",
    "description": "ROTA metodolojisine uygun detaylı açıklama",
    "category": "ETKİNLİK veya VERİMLİLİK",
    "subcategory": "Alt alan (örn: Ürün Bilgisi, Etkili giriş)",
    "target_value": 100,
    "suggested_deadline": "2024-12-31",
    "action_steps": [
        "NASIL 1: İlk adım açıklaması",
        "NASIL 2: İkinci adım açıklaması", 
        "NASIL 3: Üçüncü adım açıklaması"
    ],
    "success_metrics": ["Ölçüm kriteri 1", "Ölçüm kriteri 2"],
    "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
}}"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            suggestion = json.loads(response)
            return {"suggestion": suggestion}
        except json.JSONDecodeError:
            return {"suggestion": {"title": "AI Önerisi", "description": response}}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hedef önerisi hatası: {str(e)}")

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get user's goals
        goals = await db.goals.find({"user_id": user_id}).to_list(100)
        goals_parsed = [Goal(**parse_from_mongo(goal)) for goal in goals]
        
        # Get coaching sessions
        sessions = await db.coaching_sessions.find({
            "$or": [{"coach_id": user_id}, {"coachee_id": user_id}]
        }).to_list(100)
        
        # Calculate statistics
        total_goals = len(goals_parsed)
        completed_goals = len([g for g in goals_parsed if g.status == "completed"])
        active_goals = len([g for g in goals_parsed if g.status == "active"])
        
        # ROTA category breakdown
        category_stats = {}
        for goal in goals_parsed:
            cat = goal.category
            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "completed": 0}
            category_stats[cat]["total"] += 1
            if goal.status == "completed":
                category_stats[cat]["completed"] += 1
        
        return {
            "user": User(**parse_from_mongo(user)),
            "stats": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "active_goals": active_goals,
                "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0,
                "total_sessions": len(sessions),
                "category_breakdown": category_stats
            },
            "recent_goals": goals_parsed[:5],
            "rota_areas": list(ROTA_FRAMEWORK.keys())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard verisi alınamadı: {str(e)}")

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