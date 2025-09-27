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
app = FastAPI(title="İlaç Satış AI Koçluk Sistemi API")
api_router = APIRouter(prefix="/api")

# Spesifik Ürün ve Branş Yapısı
PRODUCTS = {
    "Sidefer": {
        "name": "Sidefer",
        "category": "Demir Preparatı", 
        "target_branches": ["Pediatri", "Kadın Doğum"],
        "key_features": ["Yan etki profili düşük", "Ağızda renk oluşturma minimal", "Konvansiyonel demir preparatlarından farklı"],
        "coaching_focus": ["Giriş cümleleri", "Yan etki yönetimi", "Pediatrist ve kadın doğum doktorları ile çalışma"]
    },
    "Tümformlar": {
        "name": "Tümformlar", 
        "category": "Multivitamin",
        "target_branches": ["Pediatri", "Dermatoloji", "Kadın Doğum"],
        "key_features": ["Geniş spektrum vitamin", "Güvenli formül", "Çocuk uyumlu"],
        "coaching_focus": ["Çoklu branş çalışması", "Vitamin önerisi teknikleri", "Aile hekimliği yaklaşımı"]
    },
    "Cistus Antivirüs Pastil": {
        "name": "Cistus Antivirüs Pastil",
        "category": "Bitkisel Antivirüs",
        "target_branches": ["Pediatri", "Dermatoloji"],
        "key_features": ["Doğal antivirüs", "Pastil formu", "Güvenli kullanım"],
        "coaching_focus": ["Aktif dinleme örnekleri", "Doğal ürün sunumu", "Güven oluşturma"]
    },
    "Dalincare Atocure": {
        "name": "Dalincare Atocure",
        "category": "Dermatoloji Bakım",
        "target_branches": ["Dermatoloji", "Pediatri"],
        "key_features": ["Atopik dermatit", "Cilt bakımı", "Güvenli formül"],
        "coaching_focus": ["Dermatoloji materyali kullanımı", "Cilt bakım önerisi", "Anne-çocuk yaklaşımı"]
    }
}

BRANCHES = {
    "Pediatri": {
        "name": "Pediatri",
        "description": "Çocuk sağlığı ve hastalıkları",
        "key_doctors": ["Pediatrist", "Çocuk Doktoru"],
        "approach": "Güven temelli, aile odaklı, güvenlik vurgusu",
        "products": ["Sidefer", "Tümformlar", "Cistus Antivirüs Pastil", "Dalincare Atocure"]
    },
    "Dermatoloji": {
        "name": "Dermatoloji", 
        "description": "Cilt hastalıkları ve estetik",
        "key_doctors": ["Dermatolog", "Cilt Doktoru"],
        "approach": "Görsel kanıt odaklı, sonuç temelli, estetik değer",
        "products": ["Dalincare Atocure", "Cistus Antivirüs Pastil", "Tümformlar"]
    },
    "Kadın Doğum": {
        "name": "Kadın Doğum",
        "description": "Kadın sağlığı ve obstetrik",
        "key_doctors": ["Jinekolog", "Kadın Doğum Uzmanı"],
        "approach": "Kanıt temelli, güvenlik odaklı, hormonal yaklaşım",
        "products": ["Sidefer", "Tümformlar"]
    }
}

# Mümessil ve Brick Yapısı
REGIONS = {
    "İstanbul Anadolu": ["Kadıköy", "Üsküdar", "Kartal", "Maltepe", "Pendik"],
    "İstanbul Avrupa": ["Beyoğlu", "Şişli", "Beşiktaş", "Bakırköy", "Zeytinburnu"],
    "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Sincan"],
    "İzmir": ["Konak", "Karşıyaka", "Bornova", "Bayraklı", "Buca"],
    "Bursa": ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "Gemlik"]
}

# AI Koçluk Framework - Ürün ve Branş Odaklı
COACHING_AREAS = {
    "Ürün Bilgisi ve Sunum": {
        "description": "Ürün spesifik bilgi ve etkili sunum teknikleri",
        "product_specific": True,
        "branch_specific": True,
        "key_skills": ["Ürün özellikleri", "Klinik kanıtlar", "Rakip karşılaştırması", "Dozaj ve kullanım"],
        "rota_methods": ["Ürün eğitim modüllerinden çalışma", "TTS desteği alma", "Role play yapma"]
    },
    "Branş Spesifik İletişim": {
        "description": "Pediatri, Dermatoloji, Kadın Doğum doktorları ile özel iletişim",
        "product_specific": False, 
        "branch_specific": True,
        "key_skills": ["Branş dili", "Hasta profili anlama", "Profesyonel yaklaşım", "Güven oluşturma"],
        "rota_methods": ["Doktor profil analizi", "Sosyal stil belirleme", "Branş özel giriş teknikleri"]
    },
    "Eczane Çalışmaları": {
        "description": "Eczane ile etkili çalışma ve stok yönetimi",
        "product_specific": True,
        "branch_specific": False,
        "key_skills": ["Stok analizi", "Reçete takibi", "Eczacı ilişkileri", "Kampanya yönetimi"],
        "rota_methods": ["Stok excel analizi", "Devir hızı hesaplama", "Eczane özel etkinlik planlama"]
    },
    "Brick Yönetimi": {
        "description": "Bölge bazlı hedefleme ve ziyaret optimizasyonu",
        "product_specific": False,
        "branch_specific": True,
        "key_skills": ["Hedef belirleme", "Ziyaret planlaması", "Potansiyel analizi", "Rakip takibi"],
        "rota_methods": ["Brick potansiyel belirleme", "IQVIA analizi", "Ziyaret frekans optimizasyonu"]
    },
    "Giriş ve İlgi Oluşturma": {
        "description": "Etkili ziyaret başlangıcı ve doktor ilgisi çekme",
        "product_specific": True,
        "branch_specific": True, 
        "key_skills": ["İlgi çekici girişler", "Branş uygun dil", "Merak uyandırma", "Profesyonel yaklaşım"],
        "rota_methods": ["15 farklı giriş cümlesi hazırlama", "Branş spesifik örnekler", "Role play test"]
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
    region: str = ""
    brick: str = ""
    responsible_products: List[str] = []
    target_branches: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    region: str = ""
    brick: str = ""
    responsible_products: List[str] = []
    target_branches: List[str] = []

class ProductBranchAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    coach_id: str
    coaching_area: str
    selected_product: str
    selected_branch: str
    performance_score: int
    strengths: List[str]
    improvement_areas: List[str]
    ai_feedback: str
    action_plan: List[str]
    rota_recommendations: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductBranchAssessmentCreate(BaseModel):
    user_id: str
    coach_id: str
    coaching_area: str
    selected_product: str = ""
    selected_branch: str = ""
    performance_score: int
    strengths: List[str]
    improvement_areas: List[str]

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    context: str = ""
    product_context: str = ""
    branch_context: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: str = ""
    product_focus: str = ""
    branch_focus: str = ""

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_coach(user_id: str, coaching_context: str = ""):
    """Get AI coach with pharmaceutical sales expertise"""
    system_message = f"""Sen uzman bir ilaç satış koçusun. Türkiye'deki tıbbi satış temsilcilerine özel koçluk yapıyorsun.

Sorumlu Olduğun Ürünler:
{json.dumps(PRODUCTS, ensure_ascii=False, indent=2)}

Çalıştığın Branşlar:
{json.dumps(BRANCHES, ensure_ascii=False, indent=2)}

Koçluk Alanları:
{json.dumps(COACHING_AREAS, ensure_ascii=False, indent=2)}

Performans Seviyeleri:
{json.dumps(PERFORMANCE_LEVELS, ensure_ascii=False, indent=2)}

Bölge Yapısı:
{json.dumps(REGIONS, ensure_ascii=False, indent=2)}

{coaching_context}

Özel Görevlerin:
- Ürün-branş kombinasyonuna özel koçluk yap
- ROTA metodolojisi kullan (NASIL 1-2-3)
- Sidefer, Cistus, Dalincare, Tümformlar ürünlerine özel örnekler ver
- Pediatri, Dermatoloji, Kadın Doğum branş yaklaşımları kullan
- Brick ve eczane bazlı stratejiler öner
- Türkiye ilaç sektörüne uygun dil kullan
- Spesifik, uygulanabilir ve ölçülebilir öneriler sun

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
    return {"message": "İlaç Satış AI Koçluk Sistemi API v2.0 - Ürün & Branş Odaklı"}

@api_router.get("/products")
async def get_products():
    return {"products": PRODUCTS}

@api_router.get("/branches") 
async def get_branches():
    return {"branches": BRANCHES}

@api_router.get("/regions")
async def get_regions():
    return {"regions": REGIONS}

@api_router.get("/coaching-areas")
async def get_coaching_areas():
    return {"areas": COACHING_AREAS}

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

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: Dict[str, Any]):
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": user_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user = await db.users.find_one({"id": user_id})
    return User(**parse_from_mongo(user))

@api_router.post("/assessment/product-branch", response_model=ProductBranchAssessment)
async def create_product_branch_assessment(assessment_data: ProductBranchAssessmentCreate):
    try:
        # Get performance level
        level_key, level_data = get_performance_level(assessment_data.performance_score)
        
        # Get user info
        user = await db.users.find_one({"id": assessment_data.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get product and branch context
        product_info = PRODUCTS.get(assessment_data.selected_product, {})
        branch_info = BRANCHES.get(assessment_data.selected_branch, {})
        
        # Prepare AI context
        context = f"""
Değerlendirme Bağlamı:
- Kullanıcı: {user['name']} ({user['role']})
- Ürün: {assessment_data.selected_product} - {product_info.get('category', '')}
- Branş: {assessment_data.selected_branch} - {branch_info.get('description', '')}
- Alan: {assessment_data.coaching_area}
- Puan: {assessment_data.performance_score}/100
- Seviye: {level_data['name']} ({level_data['description']})
- Güçlü Yönler: {', '.join(assessment_data.strengths)}
- Gelişim Alanları: {', '.join(assessment_data.improvement_areas)}

Ürün Özellikleri: {', '.join(product_info.get('key_features', []))}
Branş Yaklaşımı: {branch_info.get('approach', '')}

ROTA metodolojisine uygun olarak:
1. Bu ürün-branş kombinasyonu için spesifik geri bildirim ver
2. 3 ROTA aksiyon adımı (NASIL 1-2-3) öner
3. Ölçülebilir hedefler belirle
"""

        # Get AI feedback
        ai_coach = await get_ai_coach(assessment_data.user_id, context)
        user_message = UserMessage(
            text=f"{assessment_data.selected_product} ürünü ile {assessment_data.selected_branch} branşında {assessment_data.coaching_area} alanında {assessment_data.performance_score} puan alan {user['name']} için ROTA koçluk geri bildirimi ve aksiyon planı oluştur."
        )
        
        ai_response = await ai_coach.send_message(user_message)
        
        # Extract action plan and ROTA recommendations
        action_plan = []
        rota_recommendations = []
        lines = ai_response.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in ['1.', '2.', '3.', 'nasıl 1', 'nasıl 2', 'nasıl 3']):
                cleaned = line.strip().lstrip('123.-•').strip()
                if len(cleaned) > 10:
                    if 'nasıl' in line.lower():
                        rota_recommendations.append(cleaned)
                    else:
                        action_plan.append(cleaned)
        
        if not action_plan:
            action_plan = [
                f"{assessment_data.selected_product} ürün bilgisini derinleştir",
                f"{assessment_data.selected_branch} branş yaklaşımını pratik et",
                "Haftalık koçluk seansı planla"
            ]
        
        if not rota_recommendations:
            coaching_methods = COACHING_AREAS.get(assessment_data.coaching_area, {}).get('rota_methods', [])
            rota_recommendations = coaching_methods[:3] if coaching_methods else [
                "NASIL 1: Eğitim modüllerinden çalış",
                "NASIL 2: Deneyimli TTS desteği al", 
                "NASIL 3: Role play ile pratik yap"
            ]
        
        # Create assessment
        assessment = ProductBranchAssessment(
            user_id=assessment_data.user_id,
            coach_id=assessment_data.coach_id,
            coaching_area=assessment_data.coaching_area,
            selected_product=assessment_data.selected_product,
            selected_branch=assessment_data.selected_branch,
            performance_score=assessment_data.performance_score,
            strengths=assessment_data.strengths,
            improvement_areas=assessment_data.improvement_areas,
            ai_feedback=ai_response,
            action_plan=action_plan[:3],
            rota_recommendations=rota_recommendations[:3]
        )
        
        assessment_doc = prepare_for_mongo(assessment.dict())
        await db.product_branch_assessments.insert_one(assessment_doc)
        
        return assessment
        
    except Exception as e:
        logging.error(f"Product-branch assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Değerlendirme hatası: {str(e)}")

@api_router.get("/assessments/{user_id}")
async def get_user_assessments(user_id: str, limit: int = 10):
    assessments_raw = await db.product_branch_assessments.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    assessments = []
    for assessment in assessments_raw:
        clean_assessment = parse_from_mongo(assessment)
        assessments.append(clean_assessment)
    
    return assessments

@api_router.post("/chat")
async def chat_with_ai_coach(chat_request: ChatRequest):
    try:
        user = await db.users.find_one({"id": chat_request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get user's recent assessments for context
        recent_assessments = await db.product_branch_assessments.find(
            {"user_id": chat_request.user_id}
        ).sort("created_at", -1).limit(3).to_list(3)
        
        # Get product and branch context
        product_info = ""
        branch_info = ""
        
        if chat_request.product_focus:
            product_data = PRODUCTS.get(chat_request.product_focus, {})
            product_info = f"\nOdak Ürün: {chat_request.product_focus} - {product_data.get('description', '')}"
        
        if chat_request.branch_focus:
            branch_data = BRANCHES.get(chat_request.branch_focus, {}) 
            branch_info = f"\nOdak Branş: {chat_request.branch_focus} - {branch_data.get('description', '')}"
        
        context = f"""
Kullanıcı: {user['name']} ({user['role']})
Bölge: {user.get('region', 'Belirtilmemiş')}
Brick: {user.get('brick', 'Belirtilmemiş')}
Sorumlu Ürünler: {', '.join(user.get('responsible_products', []))}
Hedef Branşlar: {', '.join(user.get('target_branches', []))}
{product_info}
{branch_info}
{chat_request.context}

Son Değerlendirmeler:
{chr(10).join([f"- {a.get('selected_product', '')}/{a.get('selected_branch', '')} - {a.get('coaching_area', '')}: {a.get('performance_score', 0)}/100" for a in recent_assessments]) if recent_assessments else "Henüz değerlendirme yapılmamış"}
"""
        
        ai_coach = await get_ai_coach(chat_request.user_id, context)
        user_message = UserMessage(text=chat_request.message)
        response = await ai_coach.send_message(user_message)
        
        # Save chat
        chat_message = ChatMessage(
            user_id=chat_request.user_id,
            message=chat_request.message,
            response=response,
            context=chat_request.context,
            product_context=chat_request.product_focus,
            branch_context=chat_request.branch_focus
        )
        
        chat_doc = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_doc)
        
        return {"response": response}
        
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sohbet hatası: {str(e)}")

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        user_clean = parse_from_mongo(user)
        
        # Get assessments
        assessments_raw = await db.product_branch_assessments.find({"user_id": user_id}).to_list(100)
        assessments = [parse_from_mongo(assessment) for assessment in assessments_raw]
        
        # Calculate stats
        avg_score = 0
        if assessments:
            scores = [a.get("performance_score", 0) for a in assessments]
            avg_score = sum(scores) / len(scores) if scores else 0
        
        level_key, level_data = get_performance_level(avg_score)
        
        # Product-Branch breakdown
        product_scores = {}
        branch_scores = {}
        
        for assessment in assessments:
            product = assessment.get("selected_product")
            branch = assessment.get("selected_branch")
            score = assessment.get("performance_score", 0)
            
            if product:
                if product not in product_scores:
                    product_scores[product] = []
                product_scores[product].append(score)
            
            if branch:
                if branch not in branch_scores:
                    branch_scores[branch] = []
                branch_scores[branch].append(score)
        
        product_averages = {product: sum(scores)/len(scores) for product, scores in product_scores.items()}
        branch_averages = {branch: sum(scores)/len(scores) for branch, scores in branch_scores.items()}
        
        return {
            "user": user_clean,
            "overall_score": round(avg_score, 1),
            "performance_level": level_data,
            "total_assessments": len(assessments),
            "product_scores": product_averages,
            "branch_scores": branch_averages,
            "recent_assessments": assessments[-5:] if assessments else [],
            "available_products": list(PRODUCTS.keys()),
            "available_branches": list(BRANCHES.keys())
        }
        
    except Exception as e:
        logging.error(f"Dashboard error for user {user_id}: {str(e)}")
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