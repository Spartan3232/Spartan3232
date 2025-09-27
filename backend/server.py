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
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AI Koçluk Sistemi API")
api_router = APIRouter(prefix="/api")

# AI Coaching Framework - Simplified and Focused
COACHING_AREAS = {
    "Satış Teknikleri": {
        "description": "Etkili satış yaklaşımları ve müşteri etkileşimi",
        "key_skills": ["Ürün sunumu", "İhtiyaç analizi", "Kapanış teknikleri", "İtiraz yönetimi"],
        "evaluation_criteria": ["Müşteri tepkisi", "Reçete artışı", "İlişki kalitesi", "Sunum etkisi"]
    },
    "Müşteri İlişkileri": {
        "description": "Doktor ve eczane ile güçlü bağlar kurma",
        "key_skills": ["Aktif dinleme", "Empati kurma", "Güven oluşturma", "Uzun vadeli planlama"],
        "evaluation_criteria": ["Müşteri sadakati", "Referans sayısı", "Geri bildirim kalitesi", "İlişki derinliği"]
    },
    "Ürün Bilgisi": {
        "description": "İlaç ve medikal bilgi uzmanlığı",
        "key_skills": ["Etken madde bilgisi", "Yan etki yönetimi", "Rakip analizi", "Klinik kanıt sunumu"],
        "evaluation_criteria": ["Bilgi doğruluğu", "Güven verme", "Sorulara cevap verme", "Profesyonel yaklaşım"]
    },
    "Zaman Yönetimi": {
        "description": "Verimli çalışma ve organizasyon",
        "key_skills": ["Önceliklendirme", "Planlama", "Takip sistemi", "Raporlama"],
        "evaluation_criteria": ["Hedef tutturma", "Ziyaret sayısı", "Kalite skoru", "Organizasyon düzeyi"]
    },
    "İletişim Becerileri": {
        "description": "Etkili konuşma ve sunum teknikleri",
        "key_skills": ["Net anlatım", "Beden dili", "Sunum yapısı", "Geri bildirim alma"],
        "evaluation_criteria": ["Anlaşılırlık", "Etki yaratma", "Profesyonellik", "Güven inspirasyonu"]
    }
}

PERFORMANCE_LEVELS = {
    "excellent": {
        "name": "Mükemmel",
        "description": "Rol model seviyesi, diğerlerine örnek",
        "color": "#10B981",
        "score_range": [90, 100]
    },
    "good": {
        "name": "İyi",
        "description": "Hedefleri karşılıyor, tutarlı performans",
        "color": "#3B82F6",
        "score_range": [75, 89]
    },
    "developing": {
        "name": "Gelişiyor",
        "description": "İlerleme kaydediyor, destek gerekli",
        "color": "#F59E0B",
        "score_range": [60, 74]
    },
    "needs_support": {
        "name": "Destek Gerekli",
        "description": "Yoğun koçluk ve rehberlik gerekli",
        "color": "#EF4444",
        "score_range": [0, 59]
    }
}

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str  # "coach" or "sales_rep"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    role: str

class QuickAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    coach_id: str
    coaching_area: str
    performance_score: int
    strengths: List[str]
    improvement_areas: List[str]
    ai_feedback: str
    action_plan: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuickAssessmentCreate(BaseModel):
    user_id: str
    coach_id: str
    coaching_area: str
    performance_score: int
    strengths: List[str]
    improvement_areas: List[str]

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    coaching_area: str
    target_score: int
    current_score: int = 0
    deadline: datetime
    status: str = "active"
    ai_suggestions: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    user_id: str
    coaching_area: str
    target_score: int
    deadline: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    context: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: str = ""

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_coach(user_id: str, coaching_context: str = ""):
    """Get AI coach with pharmaceutical sales expertise"""
    system_message = f"""Sen uzman bir ilaç satış koçusun. Türkiye'deki tıbbi satış temsilcilerine özel koçluk yapıyorsun.

Koçluk Alanların:
{json.dumps(COACHING_AREAS, ensure_ascii=False, indent=2)}

Performans Seviyeleri:
{json.dumps(PERFORMANCE_LEVELS, ensure_ascii=False, indent=2)}

{coaching_context}

Görevlerin:
- Kısa ve net geri bildirim ver
- Spesifik, uygulanabilir öneriler sun
- Pozitif ve motive edici yaklaş
- İlaç sektörüne özel örnekler ver
- SMART hedefler öner
- Maksimum 3 aksiyon adımı ver

Her zaman Türkçe cevap ver ve profesyonel ton kullan."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"coach_{user_id}",
        system_message=system_message
    )
    
    chat.with_model("openai", "gpt-5")
    return chat

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        # Remove MongoDB ObjectId
        if '_id' in item:
            del item['_id']
        
        # Parse datetime fields
        for key, value in item.items():
            if key.endswith('_at') or key == 'deadline':
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value)
                    except:
                        pass
    return item

def get_performance_level(score):
    for level_key, level_data in PERFORMANCE_LEVELS.items():
        if level_data["score_range"][0] <= score <= level_data["score_range"][1]:
            return level_key, level_data
    return "needs_support", PERFORMANCE_LEVELS["needs_support"]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "AI Koçluk Sistemi API v1.0 - Hazır"}

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(**user_data.dict())
    user_doc = prepare_for_mongo(user.dict())
    await db.users.insert_one(user_doc)
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return User(**parse_from_mongo(user))

@api_router.get("/coaching-areas")
async def get_coaching_areas():
    return {"areas": COACHING_AREAS}

@api_router.get("/performance-levels")
async def get_performance_levels():
    return {"levels": PERFORMANCE_LEVELS}

@api_router.post("/assessment", response_model=QuickAssessment)
async def create_quick_assessment(assessment_data: QuickAssessmentCreate):
    try:
        # Get performance level
        level_key, level_data = get_performance_level(assessment_data.performance_score)
        
        # Get user and coach info
        user = await db.users.find_one({"id": assessment_data.user_id})
        coach = await db.users.find_one({"id": assessment_data.coach_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Prepare AI context
        context = f"""
Değerlendirme Bağlamı:
- Kullanıcı: {user['name']} ({user['role']})
- Koç: {coach['name'] if coach else 'Bilinmiyor'}
- Alan: {assessment_data.coaching_area}
- Puan: {assessment_data.performance_score}/100
- Seviye: {level_data['name']} ({level_data['description']})
- Güçlü Yönler: {', '.join(assessment_data.strengths)}
- Gelişim Alanları: {', '.join(assessment_data.improvement_areas)}

Bu bilgilere dayanarak:
1. Kısa ve öz geri bildirim (2-3 cümle)
2. 3 spesifik aksiyon adımı
sunmalısın.
"""

        # Get AI feedback
        ai_coach = await get_ai_coach(assessment_data.user_id, context)
        user_message = UserMessage(
            text=f"{assessment_data.coaching_area} alanında {assessment_data.performance_score} puan alan {user['name']} için koçluk geri bildirimi ve aksiyon planı oluştur."
        )
        
        ai_response = await ai_coach.send_message(user_message)
        
        # Extract action plan from AI response (simple parsing)
        action_plan = []
        lines = ai_response.split('\n')
        for line in lines:
            if any(keyword in line.lower() for keyword in ['1.', '2.', '3.', '-', '•', 'aksiyon', 'adım']):
                cleaned = line.strip().lstrip('123.-•').strip()
                if len(cleaned) > 10:  # Meaningful action items
                    action_plan.append(cleaned)
        
        if not action_plan:
            action_plan = [
                "Haftalık koçluk seansı planla",
                "Spesifik becerileri pratik et", 
                "İlerlemeyi takip et ve değerlendir"
            ]
        
        # Create assessment
        assessment = QuickAssessment(
            user_id=assessment_data.user_id,
            coach_id=assessment_data.coach_id,
            coaching_area=assessment_data.coaching_area,
            performance_score=assessment_data.performance_score,
            strengths=assessment_data.strengths,
            improvement_areas=assessment_data.improvement_areas,
            ai_feedback=ai_response,
            action_plan=action_plan[:3]  # Max 3 actions
        )
        
        assessment_doc = prepare_for_mongo(assessment.dict())
        await db.assessments.insert_one(assessment_doc)
        
        return assessment
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Değerlendirme hatası: {str(e)}")

@api_router.get("/assessments/{user_id}")
async def get_user_assessments(user_id: str, limit: int = 10):
    assessments = await db.assessments.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [QuickAssessment(**parse_from_mongo(assessment)) for assessment in assessments]

@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate):
    try:
        # Get AI suggestions for the goal
        user = await db.users.find_one({"id": goal_data.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        ai_coach = await get_ai_coach(goal_data.user_id)
        user_message = UserMessage(
            text=f"{goal_data.coaching_area} alanında {goal_data.target_score} puan hedefi için {user['name']} adlı kişiye 3 spesifik öneri ver."
        )
        
        ai_response = await ai_coach.send_message(user_message)
        
        # Extract suggestions
        suggestions = []
        lines = ai_response.split('\n')
        for line in lines:
            if any(keyword in line.lower() for keyword in ['1.', '2.', '3.', '-', '•']):
                cleaned = line.strip().lstrip('123.-•').strip()
                if len(cleaned) > 10:
                    suggestions.append(cleaned)
        
        # Create goal
        goal = Goal(
            user_id=goal_data.user_id,
            title=f"{goal_data.coaching_area} Gelişim Hedefi",
            description=f"{goal_data.coaching_area} alanında {goal_data.target_score} puan hedefine ulaşma",
            coaching_area=goal_data.coaching_area,
            target_score=goal_data.target_score,
            deadline=datetime.fromisoformat(goal_data.deadline),
            ai_suggestions=suggestions[:3]
        )
        
        goal_doc = prepare_for_mongo(goal.dict())
        await db.goals.insert_one(goal_doc)
        
        return goal
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hedef oluşturma hatası: {str(e)}")

@api_router.get("/goals/{user_id}")
async def get_user_goals(user_id: str):
    goals = await db.goals.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [Goal(**parse_from_mongo(goal)) for goal in goals]

@api_router.put("/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, current_score: int):
    goal = await db.goals.find_one({"id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    
    status = "completed" if current_score >= goal["target_score"] else "active"
    
    await db.goals.update_one(
        {"id": goal_id},
        {"$set": {"current_score": current_score, "status": status}}
    )
    
    return {"message": "Hedef güncellendi", "status": status}

@api_router.post("/chat")
async def chat_with_ai_coach(chat_request: ChatRequest):
    try:
        user = await db.users.find_one({"id": chat_request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get user's recent assessments for context
        recent_assessments = await db.assessments.find(
            {"user_id": chat_request.user_id}
        ).sort("created_at", -1).limit(3).to_list(3)
        
        context = f"""
Kullanıcı: {user['name']} ({user['role']})
{chat_request.context}

Son Değerlendirmeler:
{chr(10).join([f"- {a.get('coaching_area', '')}: {a.get('performance_score', 0)}/100" for a in recent_assessments]) if recent_assessments else "Henüz değerlendirme yapılmamış"}
"""
        
        ai_coach = await get_ai_coach(chat_request.user_id, context)
        user_message = UserMessage(text=chat_request.message)
        response = await ai_coach.send_message(user_message)
        
        # Save chat
        chat_message = ChatMessage(
            user_id=chat_request.user_id,
            message=chat_request.message,
            response=response,
            context=chat_request.context
        )
        
        chat_doc = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_doc)
        
        return {"response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sohbet hatası: {str(e)}")

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get assessments and goals
        assessments = await db.assessments.find({"user_id": user_id}).to_list(100)
        goals = await db.goals.find({"user_id": user_id}).to_list(100)
        
        # Calculate stats
        avg_score = 0
        if assessments:
            avg_score = sum(a["performance_score"] for a in assessments) / len(assessments)
        
        level_key, level_data = get_performance_level(avg_score)
        
        active_goals = len([g for g in goals if g["status"] == "active"])
        completed_goals = len([g for g in goals if g["status"] == "completed"])
        
        # Area breakdown
        area_scores = {}
        for assessment in assessments:
            area = assessment["coaching_area"]
            if area not in area_scores:
                area_scores[area] = []
            area_scores[area].append(assessment["performance_score"])
        
        area_averages = {area: sum(scores)/len(scores) for area, scores in area_scores.items()}
        
        return {
            "user": User(**parse_from_mongo(user)),
            "overall_score": round(avg_score, 1),
            "performance_level": level_data,
            "total_assessments": len(assessments),
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "area_scores": area_averages,
            "recent_assessments": assessments[-5:] if assessments else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard hatası: {str(e)}")

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

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()