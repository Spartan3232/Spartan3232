from fastapi import FastAPI, APIRouter, HTTPException
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

app = FastAPI(title="ROTA Koçluk Chat API")
api_router = APIRouter(prefix="/api")

# ROTA Verimlilik Başlıkları ve NASIL Metodolojisi
ROTA_BASLIKLAR = {
    "Etkili giriş (İlgi oluşturma)": {
        "nasil_1": "Sideferle ilgili ilgi oluşturacağını düşündüğün 15 farklı giriş cümlesini hazırlayıp benimle paylaşmanı bekliyorum (branş detayı da verilebilir). Hazırladığın bu giriş cümlelerini sahada bizzat uygulayacağız.",
        "nasil_2": "Her tanıtım sonrasında ilgi durumunu birlikte değerlendirip arşivleyeceğiz. Belirlediğimiz gelişim alanları için role play çalışmaları yapacağız. Bir sonraki ROTA çalışmamızda bu role play çalışmalarını uygulayacağız.",
        "nasil_3": "İstenilen duruma ulaşıldığında aksiyonu birlikte tamamlayacağız.",
        "olcum": "Ziyaret başlangıcında doktor/eczacı ilgisi, ziyaret başarı oranı",
        "hedef_ornek": "15 farklı giriş cümlesi hazırla ve 2 hafta içinde 10 ziyarette uygula"
    },
    "Etkili soru sorma becerisi": {
        "nasil_1": "Modiwake ile ilgili 5'er adet açık ve kapalı uçlu soru hazırlamanı ve benimle bir hafta içinde paylaşmanı bekliyorum.",
        "nasil_2": "Hazırladığın bu soruları, ilk saha çalışmamızda, müşterilerinin itiraz veya ihtiyaçlarına yönelik rahatlatıcı ve bilgilendirici bir şekilde kullanmanı bekliyorum. Her soru sorma örneğini birlikte arşivleyip değerlendireceğiz.",
        "nasil_3": "Gerekirse 3 adet örneği ben uygulayacağım.",
        "olcum": "Soru etkinliği, müşteri tepkisi, diyalog kalitesi",
        "hedef_ornek": "5 açık + 5 kapalı soru hazırla ve 1 hafta içinde 8 ziyarette test et"
    },
    "Aktif dinleme": {
        "nasil_1": "Cistusla ilgili 5 adet aktif dinleme örneği yapacağız. Her örnekte Cistus için benim söylediklerimi bana farklı kelimelerle anlatmanı bekliyorum. Bu role play çalışmalarını kaydedip birlikte yorumlayalım.",
        "nasil_2": "Cistus için 4 eczacının düşüncelerini tekrar onlara farklı örneklerle anlatacağız. Her tanıtımı ziyaret sonrasında birlikte değerlendirip arşivleyeceğiz.",
        "nasil_3": "Aktif dinleme ile ilgili 4 youtube videosunu araştırıp benimle paylaşmanı bekliyorum. Bu videoların yorumlarını ekip arkadaşlarına sunum halinde paylaşmanı bekliyorum.",
        "olcum": "Tekrar doğruluğu, empati kurma, müşteri memnuniyeti",
        "hedef_ornek": "5 aktif dinleme örneği uygula ve 2 hafta içinde 4 eczacı ile test et"
    },
    "İhtiyaçların ortaya çıkarılması ve giderilmesi": {
        "nasil_1": "Clasem tabletle ilgili en önemli 5 KBB doktorunun Clasemi tercih etmeme nedenlerini tespit etmeni bekliyorum. Bu nedenlerin sebeplerini gidermek için taktiklerini belirlemeni ve benimle tartışmanı rica ediyorum.",
        "nasil_2": "Bu sebepler; yanlış anlamadan mı, bilgi eksikliğinden mi yoksa ürünle ilgili önyargılardan mı kaynaklanıyor? Birlikte değerlendirip her biriyle ilgili taktiklerimizi arşivleyelim.",
        "nasil_3": "Sahada yapacağımız ilk ROTA çalışmasında belirlediğimiz taktikleri uygulayacağız. Karşılıklı olarak mütabık kaldığımızda bu aksiyonu tamamlayacağız.",
        "olcum": "İhtiyaç tespit doğruluğu, çözüm etkinliği, müşteri onayı",
        "hedef_ornek": "5 KBB doktoruyla ihtiyaç analizi yap ve 3 hafta içinde çözüm taktikleri geliştir"
    },
    "İtirazları anlama ve karşılama": {
        "nasil_1": "En önemli 5 pediatrist ve kadın doğum doktorunun Sidefer tercih etmeme sebepleri neler olduğunu ortaya çıkarmak önemlidir. Bunun için konuya özel etkili sorular sorarak itirazın ortaya çıkartılması sağlanmalıdır.",
        "nasil_2": "Demir ürünleri ağızda renkler oluşturur, fakat Sidefer konvansiyonel demir preparatlarından daha az yan etkiler göstermektedir.",
        "nasil_3": "İtiraz yönetimi role play çalışmaları ile pratik yapılır ve gerçek ziyaretlerde test edilir.",
        "olcum": "İtiraz dönüşüm oranı, müşteri ikna seviyesi",
        "hedef_ornek": "5 doktorda itiraz tespiti yap ve 2 hafta içinde karşılama teknikleri geliştir"
    },
    "Özellik - Avantaj/Fayda": {
        "nasil_1": "Solopina ilgili 5 adet özellik - avantaj - fayda cümleni hazırlayıp 3 gün içinde benimle paylaşmanı bekliyorum.",
        "nasil_2": "Bu 5 özellikle ilgili seninle role play çalışmaları yapacağız. Bu role play çalışmalarını 5 dahiliye doktorumuzda kullanıp sonuçlarını birlikte yorumlayıp arşivleyeceğiz.",
        "nasil_3": "Başarılı örnekleri ekip arkadaşlarımızla veya merkez yöneticilerimle paylaşacağız.",
        "olcum": "Fayda algısı, ürün değer proposition anlaşılması",
        "hedef_ornek": "5 özellik-avantaj-fayda cümlesi hazırla ve 1 hafta içinde 5 doktorda test et"
    },
    "Tanıtım malzemesinin etkin kullanımı": {
        "nasil_1": "Geçen ay dağıttığımız Dalin malzemesi/materyali dermatoloğun aklında kaldı mı (iz bıraktı mı)? 10 doktorumuzun geri bildirimini alıp raporlayacağız.",
        "nasil_2": "Bu malzemelerin akılda kalıcıya ilgili 3 uygulamayı bizzat ben göstereceğim. İlk ROTA çalışmamızda yapacağın 5 adet tanıtımı birlikte değerlendirip aksiyonun tamamlanıp tamamlanmadığına birlikte karar vereceğiz.",
        "nasil_3": "Malzeme etkisini maksimize etmek için kreatif kullanım teknikleri geliştirilir.",
        "olcum": "Malzeme hatırlama oranı, görsel etki, satış artışı",
        "hedef_ornek": "10 doktorla malzeme etkisi testi yap ve 2 hafta içinde iyileştirme planı oluştur"
    },
    "Olumlu davranışları destekleme": {
        "nasil_1": "3 günlük saha çalışmanda yapacağın 40 tanıtımda müşterilerinin şirketimiz - ürünlerimiz - senin hakkındaki onurlandırıcı, olumlu, pozitif ifade - jest - mimiklerini not almanı ve benimle paylaşmanı bekliyorum.",
        "nasil_2": "İlk ROTA çalışmamızda tanıtımlarımızı yine aynı doktorlarda yapıp birlikte yorumlayacağız. Farklılıkları birlikte değerlendireceğiz.",
        "nasil_3": "3 adet olumlu izi, çalışma arkadaşların üzerinde gözlemleyeceğim. Geri bildirimlere göre aksiyonu tamamlayacağız.",
        "olcum": "Pozitif geri bildirim sayısı, müşteri sadakati, motivasyon artışı",
        "hedef_ornek": "40 ziyarette pozitif davranış kaydı tut ve 1 hafta içinde analiz et"
    },
    "Çoklu ürün çalışma becerisi": {
        "nasil_1": "Belirlediğimiz 5 KBB doktorumuza Clasem tablet ve Montairi birlikte çalışıp gözlemlerimizi yorumlayacağız.",
        "nasil_2": "Ürün geçişlerini role playlerle pratik haline getirmeyi planlıyoruz.",
        "nasil_3": "İlk ROTA çalışmamızda yine aynı 5 KBB doktorumuza tanıtım yaparak çoklu ürün çalışma becerisini test edeceğiz.",
        "olcum": "Ürün geçiş akıcılığı, çoklu satış başarısı, portföy yönetimi",
        "hedef_ornek": "5 doktorda 2 ürün kombinasyonu test et ve 2 hafta içinde geçiş tekniği geliştir"
    },
    "Kısa tanıtım becerisi": {
        "nasil_1": "Kısa tanıtım yaparak ikna edilecek ve reçetesine girilecek potansiyeli 4 üzeri olan 10 önemli doktorun belirlenecek. Bu 10 doktarla ilgili ürün sırası ve tanıtım içeriği planlanacak.",
        "nasil_2": "Bu tanıtımlar öncelikle bana yapılacak ve geri bildirimlerle son haline verilerek, tanıtımın toplam süresi 1-3 dk. olarak belirlenmiştir.",
        "nasil_3": "Önceden anlaşılan tanıtımlar aynı doktorlara uygulanacak. Sonuçların reçeteye dönüp dönmediği kontrol edilecek.",
        "olcum": "Tanıtım süresi, ikna oranı, reçete dönüşümü",
        "hedef_ornek": "10 doktor için 1-3 dk tanıtım hazırla ve 2 hafta içinde test et"
    },
    "Kapanış teknikleri (Özetleme ve talepte bulunmak)": {
        "nasil_1": "Dapgeon ve Liniga ile ilgili belirlenen 7 dahiliye ve 3 endokrinoloji doktoru için kapanış ve reçete isteme cümlesi hazırlanıp benimle paylaşmanı planladık.",
        "nasil_2": "Bu cümleler önce benimle roleplay yöntemi ile test edilecek, geri bildirimlerimiz arşivlenecek.",
        "nasil_3": "Reçetelerde ürünler yer aldıkça aksiyon tamamlandı olarak kaydedilecek.",
        "olcum": "Kapanış başarı oranı, reçete isteme etkinliği",
        "hedef_ornek": "7+3 doktor için kapanış cümlesi hazırla ve 2 hafta içinde sahada test et"
    },
    "Toplantı planlama ve sunum becerileri analizi / takibi": {
        "nasil_1": "Toplantı amacı ve lojistik planı doktorlarla paylaşılacak. Davetiyeler zamanında verildi mi, hatırlatma yapıldı mı kontrol edilecek.",
        "nasil_2": "Toplantı sonrasında değerlendirmeler birlikte yapılacak ve arşivlenecek.",
        "nasil_3": "Davranış değişikliği gerçekleşip gerçekleşmediği takip edilecek.",
        "olcum": "Katılım oranı, davranış değişikliği, etkinlik ROI",
        "hedef_ornek": "1 aylık toplantı planı hazırla ve etki değerlendirmesi yap"
    },
    "Sosyal kabul düzeyi": {
        "nasil_1": "Her gününü içeren tek bir excel dosyası hazırlanacak. Bu dosyaya, hergün müşterilerden gelen talep adedi ve içeriği kaydedilecek.",
        "nasil_2": "Gelen talepler niteliklerine göre oranlanacak. Bu oranlara göre sosyal stiller eğitimi tekrarlanacak.",
        "nasil_3": "Farklılıklar belirlenecek ve istenilen duruma ulaşılması takip edilecek.",
        "olcum": "Günlük talep sayısı, sosyal kabul oranı, ilişki kalitesi",
        "hedef_ornek": "1 aylık günlük talep excel'i tut ve sosyal kabul analizi yap"
    },
    "Eczane özel etkinlik planlama, gerçekleştirme ve takip": {
        "nasil_1": "53 eczanenin her biri için reçete kaynağı, çalıştığı depolar, rakip durumu, vitrin tanzimi sorularının cevapları excel'de toplanacak.",
        "nasil_2": "Bu liste iki ayda bir güncellenerek paylaşılacak. Önemli değişiklikler belirtilecek.",
        "nasil_3": "Liste yaşayan halde güncel tutulacak ve etkinlik planlaması buna göre yapılacak.",
        "olcum": "Eczane veri güncellik oranı, etkinlik başarısı, satış artışı",
        "hedef_ornek": "53 eczane için veri toplama ve 2 aylık güncelleme planı oluştur"
    },
    "Reçete analizi ve stok takibi": {
        "nasil_1": "62 eczanenin Etna Combo stokları belirlenecek ve excel dosyasına işlenecek.",
        "nasil_2": "Aylık çıkışlar aynı dosyaya eklenerek stok devir hızları hesaplanacak. Çıkan verilere göre tanıtım stratejileri belirlenecek.",
        "nasil_3": "Bu stratejiler ROTA çalışmaları ile kontrol edilecek.",
        "olcum": "Stok devir hızı, satış artışı, reçete analiz doğruluğu",
        "hedef_ornek": "62 eczane için stok analizi yap ve 1 aylık strateji geliştir"
    },
    "Tablet ile tanıtım": {
        "nasil_1": "Ziyaret sırasında ilgili ürün içeriğine en fazla 5 saniye içinde ulaşmanı bekliyorum. Gelebilecek soru ve itirazlara zamanında cevap verebilmeli, 10 adet role play çalışması yapacağız.",
        "nasil_2": "Hastanelerin ortopedi ve FTR kliniklerinde tablet kullanarak tanıtımları birlikte değerlendirip arşivleyeceğiz.",
        "nasil_3": "Aynı ünite ve branşlarda tableti kullanan farkları kaydedeceğiz. İstenilen duruma ulaştığımızda aksiyonu tamamlayacağız.",
        "olcum": "Tablet kullanım hızı, dijital etkileşim kalitesi, teknoloji adapte etme",
        "hedef_ornek": "5 saniye içinde içerik ulaşım hedefi ve 10 role play tamamla"
    }
}

DEGERLENDIRME_SEVIYELERI = {
    "Gelişmeli": {
        "renk": "#F59E0B",
        "aciklama": "Gelişim alanı var, yoğun koçluk gerekli",
        "puan_araligi": [0, 69],
        "yaklasim": "Detaylı koçluk, adım adım rehberlik, sık takip"
    },
    "Başarılı": {
        "renk": "#3B82F6", 
        "aciklama": "Hedefleri karşılıyor, iyileştirme alanları var",
        "puan_araligi": [70, 89],
        "yaklasim": "Pekiştirme, ileri teknikler, mentorluk"
    },
    "Üstün Başarılı": {
        "renk": "#10B981",
        "aciklama": "Rol model seviyesi, başkalarına örnek",
        "puan_araligi": [90, 100], 
        "yaklasim": "Rol model olma, ekip liderliği, yenilik geliştirme"
    }
}

OGRENME_STILLERI = {
    "Aktivist": "Deneyim odaklı, pratik yaparak öğrenir",
    "Teorisyen": "Kavramsal öğrenme, sistem ve modelleri sever",
    "Reflektör": "Gözlem yaparak, düşünerek öğrenir",
    "Pragmatist": "Uygulama odaklı, sonuç temelli öğrenir"
}

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    role: str

class ROTASession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    baslik: str
    seviye: str
    ai_response: str
    smart_hedefler: List[str] = []
    nasil_adimlar: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    user_id: str
    message: str

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

async def get_rota_coach(user_id: str):
    """ROTA metodolojisi ile özelleştirilmiş AI koç"""
    system_message = f"""Sen uzman bir ROTA koçusun. İlaç sektöründe satış temsilcilerine koçluk yapıyorsun.

ROTA Verimlilik Başlıkları ve NASIL Metodolojisi:
{json.dumps(ROTA_BASLIKLAR, ensure_ascii=False, indent=2)}

Değerlendirme Seviyeleri:
{json.dumps(DEGERLENDIRME_SEVIYELERI, ensure_ascii=False, indent=2)}

Öğrenme Stilleri:
{json.dumps(OGRENME_STILLERI, ensure_ascii=False, indent=2)}

Ürünlerimiz: Sidefer, Cistus Antivirüs Pastil, Dalincare Atocure, Tümformlar
Branşlarımız: Pediatri, Dermatoloji, Kadın Doğum + Eczaneler

GÖREV: Kullanıcının mesajlarını analiz et ve şu format ile yanıtla:

Eğer başlık seçimi + seviye belirtirse:
1. Seviyeye özel yorum yap
2. NASIL 1-2-3 adımlarını sun
3. SMART hedefler oluştur (özellikle Gelişmeli için detaylı)
4. Öğrenme stilini sor ve uyarla
5. Motivasyonel ol, emoji kullan

ÖZEL DİKKAT:
- "Gelişmeli" seviye için çok detaylı koçluk yap
- Gerçek ürün isimleri kullan (Sidefer, Cistus vb.)
- Role play örnekleri ver
- Ölçülebilir hedefler koy
- Türkçe ve samimi dil kullan

Örnek Kullanım:
Kullanıcı: "Başlık: Etkili giriş, Seviye: Gelişmeli"
Sen: Detaylı analiz + NASIL adımlar + SMART hedefler + öğrenme stili sorusu"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"rota_coach_{user_id}",
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
        if '_id' in item:
            del item['_id']
        for key, value in item.items():
            if key.endswith('_at'):
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value)
                    except:
                        pass
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "ROTA Chat Koçluk API v1.0 - Başlangıç"}

@api_router.get("/rota/basliklar")
async def get_rota_basliklar():
    return {"basliklar": list(ROTA_BASLIKLAR.keys())}

@api_router.get("/rota/seviyeler") 
async def get_seviyeler():
    return {"seviyeler": DEGERLENDIRME_SEVIYELERI}

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(**user_data.dict())
    user_doc = prepare_for_mongo(user.dict())
    await db.users.insert_one(user_doc)
    return user

@api_router.post("/chat")
async def rota_chat(chat_request: ChatRequest):
    try:
        user = await db.users.find_one({"id": chat_request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get recent sessions for context
        recent_sessions = await db.rota_sessions.find(
            {"user_id": chat_request.user_id}
        ).sort("created_at", -1).limit(3).to_list(3)
        
        session_context = ""
        if recent_sessions:
            session_context = f"\nSon Değerlendirmeler:\n" + "\n".join([
                f"- {s.get('baslik', '')}: {s.get('seviye', '')}" 
                for s in recent_sessions
            ])
        
        context = f"""
Kullanıcı: {user['name']} ({user['role']})
{session_context}

Kullanıcı Mesajı: {chat_request.message}
"""
        
        ai_coach = await get_rota_coach(chat_request.user_id)
        
        # Add context to the message
        enhanced_message = f"""
Koçluk talebi: {chat_request.message}

Kullanıcı bilgisi: {user['name']} - {user['role']}
{session_context}
"""
        
        user_message = UserMessage(text=enhanced_message)
        response = await ai_coach.send_message(user_message)
        
        # Parse response to extract structured data if it's a coaching session
        baslik = ""
        seviye = ""
        
        message_lower = chat_request.message.lower()
        for baslik_key in ROTA_BASLIKLAR.keys():
            if baslik_key.lower() in message_lower:
                baslik = baslik_key
                break
        
        for seviye_key in DEGERLENDIRME_SEVIYELERI.keys():
            if seviye_key.lower() in message_lower:
                seviye = seviye_key
                break
        
        # If this was a structured coaching request, save it
        if baslik and seviye:
            # Extract SMART goals and NASIL steps from AI response
            smart_hedefler = []
            nasil_adimlar = []
            
            lines = response.split('\n')
            for line in lines:
                if 'smart' in line.lower() and any(word in line.lower() for word in ['hedef', 'goal', 'amaç']):
                    smart_hedefler.append(line.strip())
                elif 'nasıl' in line.lower():
                    nasil_adimlar.append(line.strip())
            
            # Save structured session
            rota_session = ROTASession(
                user_id=chat_request.user_id,
                baslik=baslik,
                seviye=seviye,
                ai_response=response,
                smart_hedefler=smart_hedefler[:3],  # Max 3
                nasil_adimlar=nasil_adimlar[:3]    # Max 3
            )
            
            session_doc = prepare_for_mongo(rota_session.dict())
            await db.rota_sessions.insert_one(session_doc)
        
        return {
            "response": response,
            "baslik": baslik,
            "seviye": seviye,
            "session_saved": bool(baslik and seviye)
        }
        
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sohbet hatası: {str(e)}")

@api_router.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str, limit: int = 20):
    sessions_raw = await db.rota_sessions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [parse_from_mongo(session) for session in sessions_raw]

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        user_clean = parse_from_mongo(user)
        
        # Get ROTA sessions
        sessions_raw = await db.rota_sessions.find({"user_id": user_id}).to_list(100)
        sessions = [parse_from_mongo(session) for session in sessions_raw]
        
        # Calculate stats
        total_sessions = len(sessions)
        
        # Seviye breakdown
        seviye_counts = {}
        baslik_counts = {}
        
        for session in sessions:
            seviye = session.get("seviye", "")
            baslik = session.get("baslik", "")
            
            if seviye:
                seviye_counts[seviye] = seviye_counts.get(seviye, 0) + 1
            if baslik:
                baslik_counts[baslik] = baslik_counts.get(baslik, 0) + 1
        
        # Calculate overall performance
        gelismeli_count = seviye_counts.get("Gelişmeli", 0)
        basarili_count = seviye_counts.get("Başarılı", 0) 
        ustun_count = seviye_counts.get("Üstün Başarılı", 0)
        
        total_weighted = (gelismeli_count * 50) + (basarili_count * 75) + (ustun_count * 95)
        overall_score = (total_weighted / total_sessions) if total_sessions > 0 else 0
        
        return {
            "user": user_clean,
            "total_sessions": total_sessions,
            "overall_score": round(overall_score, 1),
            "seviye_breakdown": seviye_counts,
            "baslik_breakdown": baslik_counts,
            "recent_sessions": sessions[-5:] if sessions else [],
            "available_basliklar": list(ROTA_BASLIKLAR.keys()),
            "available_seviyeler": list(DEGERLENDIRME_SEVIYELERI.keys())
        }
        
    except Exception as e:
        logging.error(f"Dashboard error: {str(e)}")
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

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()