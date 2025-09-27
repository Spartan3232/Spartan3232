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
app = FastAPI(title="ROTA İlaç Satış Koçluk Uygulaması API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Comprehensive ROTA VERİMLİLİK Framework
ROTA_VERIMLILIK_FRAMEWORK = {
    "VERİMLİLİK": {
        "Etkili giriş (İlgi oluşturma)": {
            "nasil_1": "Ürün/branş-spesifik 15 farklı giriş cümlesi hazırlayın (örneğin, 'Doktor Bey, son klinik çalışmalarda X ilacının kardiyolojideki etkisi hakkında ne düşünüyorsunuz?')",
            "nasil_2": "Sahada uygulayın ve rol yapma ile test edin. Her tanıtım sonrasında ilgi durumunu birlikte değerlendirip arşivleyin",
            "nasil_3": "İstenilen duruma ulaşıldığında aksiyonu birlikte tamamlayın. Role play çalışmaları ile pratik yapın",
            "olcum_kriterleri": "Ziyaret başlangıcında doktor/eczacı ilgisi (jest/mimik, devam etme isteği), Ziyaret başarı oranı (%80+ ilgi sağlama)",
            "rota_seviyeleri": {
                "ustun": "Rol model giriş, spontan ilgi yaratma",
                "basarili": "Planlı girişlerle %70+ başarı",
                "gelismeli": "Dikkat dağılması, %50 altı başarı"
            },
            "beklenen_sonuc": "Ziyaret süresi uzar, reçete dönüşümü %15-20 artar, mümessil güven kazanır"
        },
        "Etkili soru sorma becerisi": {
            "nasil_1": "Ürün-spesifik 5 açık/5 kapalı soru hazırlayın (örneğin, 'Bu ilacın yan etkilerini nasıl yönetiyorsunuz?')",
            "nasil_2": "Ziyaretlerde itiraz/ihtiyaç için kullanın, rol yapma ile pratik edin",
            "nasil_3": "AI ile soru seti kişiselleştirin, her soru sorma örneğini arşivleyip değerlendirin",
            "olcum_kriterleri": "Soruların doktor tepkisi (cevap kalitesi, diyalog akışı), Ziyaret başına soru sayısı (min 3), dönüşüm oranı (%50+ ihtiyaç tespiti)",
            "rota_seviyeleri": {
                "ustun": "Yeni fırsat yaratma, derin ihtiyaç tespiti",
                "basarili": "İhtiyaçları açığa çıkarma, %60+ tepki",
                "gelismeli": "Yüzeysel sorular, %40 altı tepki"
            },
            "beklenen_sonuc": "İhtiyaçlar netleşir, satış kapanışı %25 artar, diyalog derinleşir"
        },
        "Aktif dinleme": {
            "nasil_1": "Dinlediğinizi farklı kelimelerle tekrar edin (örneğin, 'Yani, yan etki endişeniz bu mu?')",
            "nasil_2": "4 eczacı/doktor görüşmesini kaydedip değerlendirin",
            "nasil_3": "YouTube videoları izleyin ve ekip sunumu yapın, empati kurma pratiği",
            "olcum_kriterleri": "Tekrarlama doğruluğu, doktor memnuniyeti (jestler), Ziyaret sonrası not kalitesi (min %90 doğru anlama)",
            "rota_seviyeleri": {
                "ustun": "Empati yaratma, derin anlayış",
                "basarili": "Doğru anlama, %80+ memnuniyet",
                "gelismeli": "Kesintiler, %60 altı doğruluk"
            },
            "beklenen_sonuc": "İlişkiler güçlenir, itirazlar %30 azalır, güven artar"
        },
        "İhtiyaçların ortaya çıkarılması ve giderilmesi": {
            "nasil_1": "5 doktorun tercih etmeme nedenlerini tespit edin, taktik belirleyin",
            "nasil_2": "Yanlış anlama/önyargı kaynaklarını değerlendirip arşivleyin",
            "nasil_3": "Sahada ROTA ile test edin, karşılıklı mütabakat sağlayın",
            "olcum_kriterleri": "İhtiyaç tespiti doğruluğu (doktor onayı), Çözüm oranı (%70+ giderim)",
            "rota_seviyeleri": {
                "ustun": "Yeni reçete yaratma, proaktif çözüm",
                "basarili": "İhtiyaç-çözüm uyumu, %60+ başarı",
                "gelismeli": "Yüzeysel tespit, %40 altı giderim"
            },
            "beklenen_sonuc": "Satış dönüşümü %20 artar, müşteri sadakati yükselir"
        },
        "İtirazları anlama ve karşılama": {
            "nasil_1": "5 doktorun itiraz nedenlerini soruyla ortaya çıkarın",
            "nasil_2": "Ürün avantajlarını karşılaştırmalı yanıt verin",
            "nasil_3": "Rol yapma ile pratik edin, empatiyle yaklaşın",
            "olcum_kriterleri": "Yanıt etkinliği (doktor ikna), İtiraz dönüşüm oranı (%60+)",
            "rota_seviyeleri": {
                "ustun": "Önleyici itiraz, çözüm odaklı",
                "basarili": "Empatik yanıt, %50+ ikna",
                "gelismeli": "Kaçınma, %30 altı dönüşüm"
            },
            "beklenen_sonuc": "Reçete kaybı %25 azalır, profesyonel güven artar"
        },
        "Özellik - Avantaj/Fayda": {
            "nasil_1": "5 özellik-avantaj-fayda cümlesi hazırlayın",
            "nasil_2": "Rol yapma ve doktor ziyaretiyle test edin",
            "nasil_3": "Başarıları ekip ile paylaşın, sürekli geliştirin",
            "olcum_kriterleri": "Fayda vurgusu (doktor tepkisi), Ziyaret dönüşümü (%50+)",
            "rota_seviyeleri": {
                "ustun": "Kişiselleştirme, branş uyarlaması",
                "basarili": "Net FAB zinciri, %40+ onay",
                "gelismeli": "Sadece özellik, %25 altı etki"
            },
            "beklenen_sonuc": "Ürün algısı iyileşir, satış %15 artar"
        },
        "Tanıtım malzemesinin etkin kullanımı": {
            "nasil_1": "Malzeme akılda kalıcılığını 10 doktorla test edin",
            "nasil_2": "3 uygulama gösterin, ROTA'da değerlendirin",
            "nasil_3": "Kampanya entegrasyonu ekleyin, interaktif yapın",
            "olcum_kriterleri": "Malzeme etkisi (hatırlama), Ziyaret sonrası anket (%70+ etki)",
            "rota_seviyeleri": {
                "ustun": "Yaratıcı kullanım, kalıcı etki",
                "basarili": "Etkili sunum, %60+ hatırlama",
                "gelismeli": "Statik sunum, %40 altı etki"
            },
            "beklenen_sonuc": "Reçete hatırlatma %20 artar, marka sadakati yükselir"
        },
        "Olumlu davranışları destekleme": {
            "nasil_1": "Haftalık olumlu ifade/jest/mimik excel'i tutun",
            "nasil_2": "Farklılıkları değerlendirip arşivleyin",
            "nasil_3": "Ekip üzerinde gözlemleyin, pozitif pekiştirme yapın",
            "olcum_kriterleri": "Davranış tekrarı (teşekkür oranı), Aylık olumlu log (%50+ artış)",
            "rota_seviyeleri": {
                "ustun": "Motivasyon artışı, takım sinergisi",
                "basarili": "Düzenli teşvik, %40+ artış",
                "gelismeli": "Gözden kaçırma, %20 altı artış"
            },
            "beklenen_sonuc": "Ekip motivasyonu yükselir, performans %10 artar"
        },
        "Çoklu ürün çalışma becerisi": {
            "nasil_1": "5 doktor için ürün geçişi planlayın, rol yapmayla test edin",
            "nasil_2": "Ziyaretlerde uygulayın, portföy stratejisi geliştirin",
            "nasil_3": "Sonuçları ROTA'da kontrol edin, sinerji yaratın",
            "olcum_kriterleri": "Geçiş akıcılığı (doktor kabulü), Çoklu reçete oranı (%40+)",
            "rota_seviyeleri": {
                "ustun": "Sinerji yaratma, portföy optimizasyonu",
                "basarili": "Akıcı geçiş, %30+ çoklu",
                "gelismeli": "Karışıklık, %15 altı başarı"
            },
            "beklenen_sonuc": "Portföy satışları %15 artar, verimlilik yükselir"
        },
        "Kısa tanıtım becerisi": {
            "nasil_1": "Potansiyel 10 doktor belirleyin, 1-3 dk içerik planlayın",
            "nasil_2": "Rol yapma ve sahada test edin, zaman yönetimi",
            "nasil_3": "Reçete dönüşümünü kontrol edin, hızlı ikna teknikleri",
            "olcum_kriterleri": "Süre ve ikna (doktor tepkisi), Tanıtım süresi (min 3 dk başarı %70)",
            "rota_seviyeleri": {
                "ustun": "Hızlı ikna, ana fayda odağı",
                "basarili": "Etkili özet, %50+ dönüşüm",
                "gelismeli": "Uzatma, %30 altı etkinlik"
            },
            "beklenen_sonuc": "Zaman tasarrufu %20, reçete artışı %10"
        },
        "Kapanış teknikleri (Özetleme ve talepte bulunmak)": {
            "nasil_1": "7+ doktor için kapanış cümlesi hazırlayın",
            "nasil_2": "Rol yapma ve sahada test edin, doğrudan talep",
            "nasil_3": "Reçete kontrolü yapın, gelişim döngüsü sürdürün",
            "olcum_kriterleri": "Talep kabulü (reçete isteme), Kapanış başarı oranı (%60+)",
            "rota_seviyeleri": {
                "ustun": "Talep yaratma, özet + aksiyon",
                "basarili": "Net kapanış, %45+ başarı",
                "gelismeli": "Kaçınma, %25 altı dönüşüm"
            },
            "beklenen_sonuc": "Satış kapanışı %25 artar, hedef tutturma yükselir"
        },
        "Toplantı planlama ve sunum becerileri analizi / takibi": {
            "nasil_1": "Toplantı amacı/lojistik planlayın, davet hatırlatın",
            "nasil_2": "Sunum sonrası davranış değişikliğini raporlayın",
            "nasil_3": "Değerlendirme yapın, ROI analizi ekleyin",
            "olcum_kriterleri": "Katılım ve etki (davet oranı), Toplantı başarı (%80+ davranış değişikliği)",
            "rota_seviyeleri": {
                "ustun": "Etki analizi, uzun vadeli değişim",
                "basarili": "İyi planlama, %60+ katılım",
                "gelismeli": "Plan eksikliği, %40 altı etki"
            },
            "beklenen_sonuc": "Etkinlik etkisi %30 artar, profesyonel ağ genişler"
        },
        "Sosyal kabul düzeyi": {
            "nasil_1": "Günlük talep excel'i tutun, ilişki kalitesini ölçün",
            "nasil_2": "Oranlara göre sosyal stiller eğitimi alın",
            "nasil_3": "Farklılıkları karşılaştırın, adaptasyon geliştirin",
            "olcum_kriterleri": "Talep niteliği (pozitif etkileşim), Aylık talep artışı (%50+)",
            "rota_seviyeleri": {
                "ustun": "Sadakat yaratma, çeşitli stiller",
                "basarili": "Yüksek kabul, %35+ artış",
                "gelismeli": "Düşük oran, %15 altı gelişim"
            },
            "beklenen_sonuc": "İlişkiler güçlenir, referans ve tavsiye artar"
        },
        "Eczane özel etkinlik planlama, gerçekleştirme ve takip": {
            "nasil_1": "Eczane verilerini (reçete kaynağı, depolar) excel'e toplayın",
            "nasil_2": "Güncelle ve değişiklikleri belirtin, kampanya katkı ekleyin",
            "nasil_3": "Etkinlik sonuçlarını takip edin, otomatikleştirin",
            "olcum_kriterleri": "Etkinlik katılımı (vitrin etkisi), Etkinlik sonrası satış artışı (%20+)",
            "rota_seviyeleri": {
                "ustun": "Sürekli güncelleme, yüksek ROI",
                "basarili": "Düzenli takip, %15+ artış",
                "gelismeli": "Takip eksikliği, %5 altı etki"
            },
            "beklenen_sonuc": "Eczane satışları %15 artar, stok optimizasyonu sağlanır"
        },
        "Reçete analizi ve stok takibi": {
            "nasil_1": "Eczane stoklarını excel'e işleyin, devir hızı hesaplayın",
            "nasil_2": "Strateji belirleyin, trend analizi yapın",
            "nasil_3": "ROTA ile kontrol edin, öngörü geliştirin",
            "olcum_kriterleri": "Analiz doğruluğu (stok devri), Stok dönüşüm oranı (%50+)",
            "rota_seviyeleri": {
                "ustun": "Strateji uygulama, trend öngörüsü",
                "basarili": "Doğru analiz, %35+ devir",
                "gelismeli": "Veri hatası, %20 altı verimlilik"
            },
            "beklenen_sonuc": "Stok kayıpları azalır, satış %10 artar"
        },
        "Tablet ile tanıtım": {
            "nasil_1": "İçeriğe 5 sn'de ulaşın, soru/itirazlara hazır olun",
            "nasil_2": "Rol yapma ve sahada test edin, interaktif yapın",
            "nasil_3": "Farklılıkları kaydedin, dijital sinerji yaratın",
            "olcum_kriterleri": "Kullanım hızı (etkileşim), Tanıtım süresi (%80+ verimlilik)",
            "rota_seviyeleri": {
                "ustun": "Dijital sinerji, dinamik etkileşim",
                "basarili": "Hızlı kullanım, %60+ verimlilik",
                "gelismeli": "Gecikme, %40 altı etkinlik"
            },
            "beklenen_sonuc": "Dijital etki %20 artar, ziyaret verimliliği yükselir"
        }
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

class CoachingAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    coach_id: str
    selected_topics: List[str]
    assessment_results: Dict[str, Any]
    ai_feedback: Dict[str, Any]
    action_plan: List[str]
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class CoachingAssessmentCreate(BaseModel):
    user_id: str
    coach_id: str
    selected_topics: List[str]
    performance_levels: Dict[str, str]  # topic -> "ustun"/"basarili"/"gelismeli"

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str  # ROTA category like "ETKİNLİK", "VERİMLİLİK"
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

# AI Chat Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_chat(model: str, session_id: str, coaching_context: str = ""):
    """Initialize AI chat with enhanced ROTA coaching context"""
    system_message = f"""Sen uzman bir ilaç satış koçusun ve ROTA (Nasıllar Rehberi – Hedef Bazlı Koçluk) metodolojisini kullanıyorsun.

ROTA VERİMLİLİK Framework:
{json.dumps(ROTA_VERIMLILIK_FRAMEWORK, ensure_ascii=False, indent=2)}

{coaching_context}

KOÇLUK GERİ BİLDİRİM FORMATIN:
Her koçluk değerlendirmesi için şu yapıyı kullan:

**KONU BAŞLIĞI**: [Seçilen başlık]
**NASIL YAPILACAK**:
- NASIL 1: [İlk adım detayları]
- NASIL 2: [İkinci adım detayları]  
- NASIL 3: [Üçüncü adım detayları]

**NE İLE ÖLÇÜLECEK/GÖZLEMLENECEKe**:
- Gözlem kriterleri: [Observable behaviors]
- Ölçüm metrikleri: [Quantifiable metrics]
- ROTA Seviyeleri: Üstün/Başarılı/Gelişmeli

**SONUÇ NE OLACAK**:
- Kısa vadeli etkiler
- Uzun vadeli ROI

**KOÇLUK GERİ BİLDİRİMİ**:
"[Kişiselleştirilmiş geri bildirim]" ([Seviye] seviye)

**GELİŞİM ALANI**:
- Aksiyon 1: [Spesifik, ölçülebilir]
- Aksiyon 2: [Maksimum 2 aksiyon]

Görevlerin:
- ROTA VERİMLİLİK metodolojisine uygun koçluk yapmak
- Seçilen konularda bu format ile geri bildirim üretmek
- Seviyeye göre (Üstün/Başarılı/Gelişmeli) kişiselleştirmek
- Maksimum 2 aksiyon adımı önermek
- İlaç sektörüne özel örnekler vermek

Her zaman Türkçe cevap ver ve profesyonel koçluk tonu kullan."""
    
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
            if key.endswith('_at') or key == 'deadline' or key == 'assessment_date':
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value)
                    except:
                        pass
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "ROTA VERİMLİLİK İlaç Satış Koçluk Uygulaması API v3.0"}

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
        
        # Get user's recent goals and assessments for context
        goals = await db.goals.find({"user_id": chat_request.user_id}).sort("created_at", -1).limit(3).to_list(3)
        assessments = await db.coaching_assessments.find({"user_id": chat_request.user_id}).sort("assessment_date", -1).limit(2).to_list(2)
        
        coaching_context = f"""
Kullanıcı Profili:
- İsim: {user['name']}
- Rol: {'Bölge Müdürü' if user['role'] == 'bolge_muduru' else 'Tıbbi Satış Temsilcisi'}

Aktif Hedefleri:
{chr(10).join([f"- {goal.get('title', '')}: {goal.get('description', '')}" for goal in goals]) if goals else "Henüz hedef belirlenmemiş"}

Son Koçluk Değerlendirmeleri:
{chr(10).join([f"- {', '.join(assessment.get('selected_topics', []))}" for assessment in assessments]) if assessments else "Henüz koçluk değerlendirmesi yapılmamış"}
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

@api_router.get("/rota/framework")
async def get_rota_framework():
    """Get the original ROTA framework for goal creation (backward compatibility)"""
    original_framework = {
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
        "VERİMLİLİK": dict(ROTA_VERIMLILIK_FRAMEWORK["VERİMLİLİK"])
    }
    return {"framework": original_framework}

@api_router.get("/rota/verimlilik")
async def get_verimlilik_framework():
    """Get the complete ROTA VERİMLİLİK framework"""
    return {"framework": ROTA_VERIMLILIK_FRAMEWORK}

@api_router.get("/rota/verimlilik/topics")
async def get_verimlilik_topics():
    """Get all VERİMLİLİK topic titles for multi-select"""
    topics = list(ROTA_VERIMLILIK_FRAMEWORK["VERİMLİLİK"].keys())
    return {"topics": topics}

@api_router.post("/coaching/assessment", response_model=CoachingAssessment)
async def create_coaching_assessment(assessment_data: CoachingAssessmentCreate):
    try:
        # Generate AI feedback for selected topics
        user = await db.users.find_one({"id": assessment_data.user_id})
        coach = await db.users.find_one({"id": assessment_data.coach_id})
        
        if not user or not coach:
            raise HTTPException(status_code=404, detail="Kullanıcı veya koç bulunamadı")
        
        # Prepare coaching context
        coaching_context = f"""
Koçluk Değerlendirme Bağlamı:
- Koçlanan: {user['name']} ({'Bölge Müdürü' if user['role'] == 'bolge_muduru' else 'Tıbbi Satış Temsilcisi'})
- Koç: {coach['name']} ({'Bölge Müdürü' if coach['role'] == 'bolge_muduru' else 'Tıbbi Satış Temsilcisi'})
- Seçilen Konular: {', '.join(assessment_data.selected_topics)}
- Performans Seviyeleri: {assessment_data.performance_levels}

Lütfen seçilen her konu için ROTA VERİMLİLİK formatında koçluk geri bildirimi üret.
"""
        
        # Get AI assessment for each selected topic
        chat = await get_ai_chat("gpt-5", f"assessment_{assessment_data.user_id}_{datetime.now().timestamp()}", coaching_context)
        
        prompt = f"""
Seçilen VERİMLİLİK konuları için koçluk değerlendirmesi yap:

Konular: {', '.join(assessment_data.selected_topics)}
Performans Seviyeleri: {json.dumps(assessment_data.performance_levels, ensure_ascii=False)}

Her konu için:
1. ROTA formatında nasıl yapılacak adımları
2. Ölçüm kriterleri  
3. Beklenen sonuçlar
4. Seviyeye göre kişiselleştirilmiş geri bildirim
5. Maksimum 2 aksiyon adımı

JSON formatında döndür:
{{
    "topic_feedbacks": {{
        "konu_adı": {{
            "nasil_yapilacak": ["adım1", "adım2", "adım3"],
            "olcum_kriterleri": "kriterler",
            "beklenen_sonuc": "sonuçlar", 
            "geri_bildirim": "kişiselleştirilmiş feedback",
            "gelisim_alani": ["aksiyon1", "aksiyon2"]
        }}
    }},
    "genel_aksiyon_plani": ["öncelik1", "öncelik2"]
}}
"""
        
        user_message = UserMessage(text=prompt)
        ai_response = await chat.send_message(user_message)
        
        try:
            ai_feedback = json.loads(ai_response)
        except json.JSONDecodeError:
            ai_feedback = {"raw_response": ai_response}
        
        # Create assessment
        assessment = CoachingAssessment(
            user_id=assessment_data.user_id,
            coach_id=assessment_data.coach_id,
            selected_topics=assessment_data.selected_topics,
            assessment_results=assessment_data.performance_levels,
            ai_feedback=ai_feedback,
            action_plan=ai_feedback.get("genel_aksiyon_plani", [])
        )
        
        assessment_doc = prepare_for_mongo(assessment.dict())
        await db.coaching_assessments.insert_one(assessment_doc)
        
        return assessment
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Koçluk değerlendirmesi hatası: {str(e)}")

@api_router.get("/coaching/assessments/{user_id}", response_model=List[CoachingAssessment])
async def get_user_assessments(user_id: str):
    assessments = await db.coaching_assessments.find({
        "$or": [{"user_id": user_id}, {"coach_id": user_id}]
    }).sort("assessment_date", -1).to_list(100)
    
    return [CoachingAssessment(**parse_from_mongo(assessment)) for assessment in assessments]

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

class AIGoalRequest(BaseModel):
    user_id: str
    focus_area: str = ""
    experience_level: str = "orta"

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
        
        # Get user's goals and assessments
        goals = await db.goals.find({"user_id": user_id}).to_list(100)
        assessments = await db.coaching_assessments.find({
            "$or": [{"user_id": user_id}, {"coach_id": user_id}]
        }).to_list(100)
        
        goals_parsed = [Goal(**parse_from_mongo(goal)) for goal in goals]
        
        # Calculate statistics
        total_goals = len(goals_parsed)
        completed_goals = len([g for g in goals_parsed if g.status == "completed"])
        active_goals = len([g for g in goals_parsed if g.status == "active"])
        total_assessments = len(assessments)
        
        # VERİMLİLİK category breakdown from assessments
        verimlilik_topics = {}
        for assessment in assessments:
            for topic in assessment.get("selected_topics", []):
                if topic not in verimlilik_topics:
                    verimlilik_topics[topic] = 0
                verimlilik_topics[topic] += 1
        
        return {
            "user": User(**parse_from_mongo(user)),
            "stats": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "active_goals": active_goals,
                "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0,
                "total_assessments": total_assessments,
                "verimlilik_topics": verimlilik_topics
            },
            "recent_goals": goals_parsed[:5],
            "recent_assessments": assessments[:3]
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