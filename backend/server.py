from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from enum import Enum
from datetime import datetime, timezone, date
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'openai')
LLM_MODEL = os.environ.get('LLM_MODEL', 'gpt-4')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====
class Mumessil(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    ad: str
    bolge: str
    eposta: str
    telefon: str
    avatar_url: Optional[str] = None
    aktif: bool = True

class YetkinlikSeviye(str, Enum):
    GELISMELI = "Gelişmeli"
    BASARILI = "Başarılı"
    USTUN_BASARILI = "Üstün Başarılı"

class YetkinlikAlan(str, Enum):
    ETKINLIK = "Etkinlik"
    VERIMLILIK = "Verimlilik"

class YetkinlikPuani(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    oturum_id: str
    alan: YetkinlikAlan
    baslik: str
    seviye: YetkinlikSeviye

class KoclukOturumu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    mumessil_id: str
    tarih: str  # ISO date string
    doktor_sayisi: int
    eczane_sayisi: int
    ortak_yorum_1: Optional[str] = None
    ortak_yorum_2: Optional[str] = None

class EkDosyaTur(str, Enum):
    DOKUMAN = "Dokuman"
    EK_DOKUMAN = "Ek Dokuman"

class EkDosya(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    oturum_id: str
    tur: EkDosyaTur
    ad: str
    url: str
    tip: str
    boyut: int

class GorselKatalog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    kod: str
    kategori: YetkinlikAlan
    baslik: str
    url: Optional[str] = None
    aciklama: Optional[str] = None

class OturumGorsel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    oturum_id: str
    baslik: str
    katalog_id: Optional[str] = None
    url: Optional[str] = None
    not_: Optional[str] = Field(None, alias="not")

class Aksiyon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(datetime.now(timezone.utc).timestamp()))
    oturum_id: str
    baslik: str
    aksiyon_konusu: str
    hedef: str
    olcum: str
    beklenen_sonuc: str
    nasil1: str
    nasil2: Optional[str] = None
    nasil3: Optional[str] = None
    ai_generated: bool = False
    edited: bool = False

# ===== REQUEST/RESPONSE MODELS =====
class OrtakYorumRequest(BaseModel):
    mumessil_id: str
    tarih: str
    doktor_sayisi: int
    eczane_sayisi: int
    gelismeli_basliklar: List[dict]  # [{"alan": "Etkinlik", "baslik": "...", "gorsel_kodlari": []}]

class GelisimPlaniRequest(BaseModel):
    mumessil_id: str
    tarih: str
    doktor_sayisi: int
    eczane_sayisi: int
    gelismeli_basliklar: List[dict]
    ortak_yorum_1: str

class OturumKaydetRequest(BaseModel):
    mumessil_id: str
    tarih: str
    doktor_sayisi: int
    eczane_sayisi: int
    ortak_yorum_1: Optional[str] = None
    ortak_yorum_2: Optional[str] = None
    yetkinlikler: List[dict]  # [{"alan", "baslik", "seviye"}]
    gorseller: List[dict]  # [{"baslik", "katalog_id", "url", "not"}]
    aksiyonlar: List[dict]  # [{"baslik", "aksiyon_konusu", ...}]

# ===== SEED FUNCTION =====
async def seed_data():
    # Seed Mumessil
    count = await db.mumessil.count_documents({})
    if count == 0:
        mumessiller = [
            {"id": str(i), "ad": f"Mümessil {i}", "bolge": f"Bölge {(i-1)//2 + 1}",
             "eposta": f"mumessil{i}@firma.com", "telefon": f"+90 555 000 {i:02d}",
             "avatar_url": None, "aktif": True}
            for i in range(1, 11)
        ]
        await db.mumessil.insert_many(mumessiller)
        logging.info("✅ 10 Mümessil seed edildi")

    # Seed GorselKatalog
    count = await db.gorsel_katalog.count_documents({})
    if count == 0:
        etkinlik_basliklar = [
            "Ürün Bilgisi", "Medikal Bilgi", "Rekabet Bilgisi", "Bölge/Pazar Bilgisi",
            "Brick/Bireysel Bölge Bilgisi", "Ziyaret Öncesi Planlama ve Hazırlık",
            "Hedefleme / Segmentasyon", "Stratejiye uygun sunum planlaması",
            "Ziyaret sonrası analiz/değerlendirme ve önceki ziyaretle ilişkilendirme"
        ]
        verimlilik_basliklar = [
            "Etkili giriş (İlgi oluşturma)", "Etkili soru sorma becerisi", "Aktif dinleme",
            "İhtiyaçların ortaya çıkarılması ve giderilmesi", "İtirazları anlama ve karşılama",
            "Özellik - Avantaj/Fayda", "Tanıtım malzemesinin etkin kullanımı",
            "Olumlu davranışları destekleme", "Çoklu ürün çalışma becerisi",
            "Kısa tanıtım becerisi", "Kapanış teknikleri (Özetleme ve talepte bulunmak)",
            "Toplantı planlama ve sunum becerileri analizi / takibi", "Sosyal kabul düzeyi",
            "Eczane özel etkinlik planlama, gerçekleştirme ve takip",
            "Reçete analizi ve stok takibi", "Tablet ile tanıtım"
        ]
        
        katalog = []
        for i, baslik in enumerate(etkinlik_basliklar, 1):
            katalog.append({
                "id": f"E{i:02d}", "kod": f"E{i:02d}", "kategori": "Etkinlik",
                "baslik": baslik, "url": None, "aciklama": None
            })
        for i, baslik in enumerate(verimlilik_basliklar, 1):
            katalog.append({
                "id": f"V{i:02d}", "kod": f"V{i:02d}", "kategori": "Verimlilik",
                "baslik": baslik, "url": None, "aciklama": None
            })
        
        await db.gorsel_katalog.insert_many(katalog)
        logging.info(f"✅ {len(katalog)} GorselKatalog seed edildi")

@app.on_event("startup")
async def startup():
    await seed_data()

# ===== AI HELPER FUNCTIONS =====
def load_fallback_playbook():
    playbook_path = ROOT_DIR / "constants" / "coach_playbook.json"
    with open(playbook_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_metric_catalog():
    catalog_path = ROOT_DIR / "constants" / "metric_catalog.json"
    with open(catalog_path, 'r', encoding='utf-8') as f:
        return json.load(f)

async def generate_ortak_yorum(request: OrtakYorumRequest) -> str:
    """LLM-1: Ortak Yorum Generator"""
    # Build context
    mumessil = await db.mumessil.find_one({"id": request.mumessil_id}, {"_id": 0})
    
    # Get last 3 sessions trend
    past_sessions = await db.kocluk_oturumu.find(
        {"mumessil_id": request.mumessil_id},
        {"_id": 0}
    ).sort("tarih", -1).limit(3).to_list(3)
    
    gelismeli_list = [item["baslik"] for item in request.gelismeli_basliklar]
    gorsel_kodlari = []
    for item in request.gelismeli_basliklar:
        if "gorsel_kodlari" in item and item["gorsel_kodlari"]:
            gorsel_kodlari.extend(item["gorsel_kodlari"])
    
    system_prompt = """Sen ilaç sektöründe saha koçluğu uzmanısın. 
Verilen bağlama göre maksimum 6 madde halinde yapıcı, somut ve kısa bir koç yorumu yaz. 
Trend tekrarı varsa belirt; suçlayıcı dil ve belirsiz ifadeler kullanma. 
Metni düz madde/paragraf olarak döndür (Markdown veya HTML kullanma)."""
    
    # Build context
    context_parts = [
        f"Mümessil: {mumessil['ad']} - {mumessil['bolge']}",
        f"Tarih: {request.tarih}",
        f"Doktor Sayısı: {request.doktor_sayisi}, Eczane Sayısı: {request.eczane_sayisi}",
        f"\nGelişmeli Başlıklar:\n" + "\n".join([f"- {b}" for b in gelismeli_list])
    ]
    
    if gorsel_kodlari:
        context_parts.append(f"\nBağlam görselleri: {', '.join(gorsel_kodlari)}")
    
    if past_sessions:
        trend_text = []
        for idx, session in enumerate(past_sessions, 1):
            session_date = session.get('tarih', 'N/A')
            yorum = session.get('ortak_yorum_1', '')
            if yorum:
                trend_text.append(f"Oturum {idx} ({session_date}): {yorum[:200]}")
        if trend_text:
            context_parts.append(f"\nGeçmiş 3 oturum trend özeti:\n" + "\n".join(trend_text))
    
    context_parts.append("\nYapıcı, somut ve maksimum 6 madde halinde koç yorumu yaz.")
    
    user_text = "\n".join(context_parts)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ortak_yorum_{request.mumessil_id}_{datetime.now(timezone.utc).timestamp()}",
            system_message=system_prompt
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        
        message = UserMessage(text=user_text)
        response = await chat.send_message(message)
        
        # Normalize response
        normalized = response.strip()
        normalized = re.sub(r'^```(json|markdown)?', '', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'```$', '', normalized)
        
        # Extract bullet points
        lines = []
        for line in normalized.split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or (line[0].isdigit() and line[1] in '.)')):
                cleaned = re.sub(r'^(-|\*|\•|\d+[\.\)])\s*', '• ', line)
                lines.append(cleaned)
        
        # Guardrail: max 6 items
        if len(lines) > 6:
            lines = lines[:6]
        
        result = '\n'.join(lines) if lines else '• ' + normalized[:500]
        
        return result
    
    except Exception as e:
        logging.error(f"LLM-1 Error: {e}")
        # Fallback
        fallback_lines = [
            '• "Gelişmeli" işaretlenen başlıklarda içerik derinliği ve kanıt kullanımı artırılmalı.',
        ]
        if any('Ürün Bilgisi' in b or 'Medikal Bilgi' in b for b in gelismeli_list):
            fallback_lines.append('• Çekirdek ürün/medikal anlatımı + kanıt cümlesi standardize edilmelidir.')
        if any('İtiraz' in b or 'Kapanış' in b for b in gelismeli_list):
            fallback_lines.append('• İtirazlarda LAER, kapanışta varsayımsal cümle düzenli uygulanmalıdır.')
        if request.doktor_sayisi or request.eczane_sayisi:
            fallback_lines.append('• Aktivite notları CRM ile ilişkilendirilmeli, 1 hafta sonra sonuç kontrol edilmelidir.')
        fallback_lines.append('• Bir sonraki oturumda kısa uygulama kanıtları (not/rol-oyunu/görsel) beklenmektedir.')
        fallback_lines.append('• (Not) AI yanıtı alınamadı, fallback yorum kullanıldı.')
        return '\n'.join(fallback_lines[:6])

async def generate_gelisim_plani(request: GelisimPlaniRequest) -> List[dict]:
    """LLM-2: Gelişim Planı Generator with JSON strict mode"""
    mumessil = await db.mumessil.find_one({"id": request.mumessil_id}, {"_id": 0})
    gelismeli_list = [item["baslik"] for item in request.gelismeli_basliklar]
    
    system_prompt = """Sen SMART hedef mimarısın. 
'Gelişmeli' seçili her başlık için ayrı plan üret ve şu sırayı tek cümlelerle doldur:
Aksiyon konusu → Hedef → Ne ile ölçülecek → Beklenen sonuç → Nasıl-1 → Nasıl-2 → Nasıl-3

Hedef sayı + zaman + kapsam içersin; ölçüm bir veri kaynağı (CRM, test, reçete, stok, eğitim) içersin. 
Belirsiz kelimeler kullanma (daha iyi, daha fazla, artırmak, geliştirmek).
Her 'nasil' alanı bir fiille başlamalı (Planla, Hazırla, Uygula, Yaz, Ekle, vb).

Sadece JSON döndür, başka açıklama yapma."""
    
    user_text = f"""Mümessil: {mumessil['ad']} - {mumessil['bolge']}
Tarih: {request.tarih}
Ortak Yorum:
{request.ortak_yorum_1}

Gelişmeli Başlıklar:
{chr(10).join(['- ' + b for b in gelismeli_list])}

Her başlık için SMART gelişim planı oluştur."""
    
    # JSON Schema for strict mode
    response_schema = {
        "type": "object",
        "properties": {
            "planlar": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "baslik": {"type": "string"},
                        "aksiyon_konusu": {"type": "string"},
                        "hedef": {"type": "string"},
                        "olcum": {"type": "string"},
                        "beklenen_sonuc": {"type": "string"},
                        "nasil1": {"type": "string"},
                        "nasil2": {"type": "string"},
                        "nasil3": {"type": "string"}
                    },
                    "required": ["baslik", "aksiyon_konusu", "hedef", "olcum", "beklenen_sonuc", "nasil1", "nasil2", "nasil3"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["planlar"],
        "additionalProperties": False
    }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gelisim_plani_{request.mumessil_id}_{datetime.now(timezone.utc).timestamp()}",
            system_message=system_prompt,
            temperature=0.2,
            response_format={"type": "json_schema", "json_schema": {"name": "gelisim_plani", "strict": True, "schema": response_schema}}
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        
        message = UserMessage(text=user_text)
        response = await chat.send_message(message)
        
        # Parse JSON
        data = json.loads(response)
        planlar = data.get("planlar", [])
        
        # Guardrails
        validated_plans = []
        for plan in planlar:
            # SMART check
            hedef = plan.get("hedef", "")
            has_number = bool(re.search(r'\d+', hedef))
            has_time = bool(re.search(r'(gün|hafta|ay|gün içinde|hafta içinde|ayın)', hedef, re.IGNORECASE))
            
            olcum = plan.get("olcum", "")
            has_data_source = bool(re.search(r'(CRM|test|reçete|stok|eğitim|kayıt|dashboard)', olcum, re.IGNORECASE))
            
            # Check nasil starts with verb
            nasil1 = plan.get("nasil1", "")
            verb_pattern = r'^(Planla|Hazırla|Uygula|Yaz|Ekle|Seç|Rol-oyunu yap|Güncelle|İzle|Sor|Kur|Kaydet|Topla|İncele|Oluştur|Belirle|Tamamla|Tespit|Dinle|Kullan|Gözden|Kontrol|Bildir)'
            
            if has_number and has_time and has_data_source and re.search(verb_pattern, nasil1, re.IGNORECASE):
                validated_plans.append(plan)
        
        if validated_plans:
            return validated_plans
        else:
            # Retry once
            logging.warning("LLM-2: First attempt failed validation, retrying...")
            raise ValueError("Validation failed")
    
    except Exception as e:
        logging.error(f"LLM-2 Error: {e}, using fallback")
        # Fallback to playbook
        playbook = load_fallback_playbook()
        metric_catalog = load_metric_catalog()
        fallback_plans = []
        
        for baslik in gelismeli_list:
            template = playbook.get(baslik, {})
            metrics = metric_catalog.get(baslik, [])
            
            fallback_plans.append({
                "baslik": baslik,
                "aksiyon_konusu": f"{baslik} alanında yetkinlik geliştirme",
                "hedef": f"{baslik} için 14 gün içinde 5 görüşmede uygulanmış olsun",
                "olcum": f"CRM'de '{baslik}' notu işaretli ≥ 5 kayıt" if not metrics else metrics[0],
                "beklenen_sonuc": "Görüşme kalitesinde artış ve itirazın azalması",
                "nasil1": template.get("nasil1", "İlgili eğitim materyalini inceleyin ve özet çıkarın."),
                "nasil2": template.get("nasil2", "Rol-oyunu ile pratik yapın ve feedback alın."),
                "nasil3": template.get("nasil3", "İlk 3 görüşmede uygulayın ve sonuçları kaydedin.")
            })
        
        return fallback_plans

# ===== API ENDPOINTS =====
@api_router.get("/mumessil", response_model=List[Mumessil])
async def get_mumessiller():
    mumessiller = await db.mumessil.find({"aktif": True}, {"_id": 0}).to_list(100)
    return mumessiller

@api_router.get("/mumessil/{id}", response_model=Mumessil)
async def get_mumessil(id: str):
    mumessil = await db.mumessil.find_one({"id": id}, {"_id": 0})
    if not mumessil:
        raise HTTPException(404, "Mümessil bulunamadı")
    return mumessil

@api_router.post("/mumessil", response_model=Mumessil)
async def save_mumessil(mumessil: Mumessil):
    doc = mumessil.model_dump()
    await db.mumessil.update_one({"id": mumessil.id}, {"$set": doc}, upsert=True)
    return mumessil

@api_router.get("/mumessil/{id}/oturumlar")
async def get_mumessil_oturumlar(id: str):
    oturumlar = await db.kocluk_oturumu.find({"mumessil_id": id}, {"_id": 0}).sort("tarih", -1).to_list(100)
    for oturum in oturumlar:
        oturum["toplam_kocluk"] = len(oturumlar)
    return oturumlar

@api_router.get("/oturum/{id}")
async def get_oturum_detay(id: str):
    oturum = await db.kocluk_oturumu.find_one({"id": id}, {"_id": 0})
    if not oturum:
        raise HTTPException(404, "Oturum bulunamadı")
    
    yetkinlikler = await db.yetkinlik_puani.find({"oturum_id": id}, {"_id": 0}).to_list(100)
    gorseller = await db.oturum_gorsel.find({"oturum_id": id}, {"_id": 0}).to_list(100)
    dosyalar = await db.ek_dosya.find({"oturum_id": id}, {"_id": 0}).to_list(100)
    aksiyonlar = await db.aksiyon.find({"oturum_id": id}, {"_id": 0}).to_list(100)
    
    return {
        "oturum": oturum,
        "yetkinlikler": yetkinlikler,
        "gorseller": gorseller,
        "dosyalar": dosyalar,
        "aksiyonlar": aksiyonlar
    }

@api_router.get("/gorsel-katalog")
async def get_gorsel_katalog(kategori: Optional[str] = None):
    query = {}
    if kategori:
        query["kategori"] = kategori
    katalog = await db.gorsel_katalog.find(query, {"_id": 0}).to_list(100)
    return katalog

@api_router.post("/ai/ortak-yorum")
async def create_ortak_yorum(request: OrtakYorumRequest):
    if not request.gelismeli_basliklar:
        raise HTTPException(400, "En az bir başlık 'Gelişmeli' olmalı")
    
    yorum = await generate_ortak_yorum(request)
    return {"ortak_yorum": yorum}

@api_router.post("/ai/gelisim-plani")
async def create_gelisim_plani(request: GelisimPlaniRequest):
    if not request.ortak_yorum_1:
        raise HTTPException(400, "Önce ortak yorumu üretin")
    if not request.gelismeli_basliklar:
        raise HTTPException(400, "En az bir başlık 'Gelişmeli' olmalı")
    
    planlar = await generate_gelisim_plani(request)
    return {"planlar": planlar}

@api_router.post("/oturum")
async def kaydet_oturum(request: OturumKaydetRequest):
    # Create session
    oturum = KoclukOturumu(
        mumessil_id=request.mumessil_id,
        tarih=request.tarih,
        doktor_sayisi=request.doktor_sayisi,
        eczane_sayisi=request.eczane_sayisi,
        ortak_yorum_1=request.ortak_yorum_1,
        ortak_yorum_2=request.ortak_yorum_2
    )
    await db.kocluk_oturumu.insert_one(oturum.model_dump())
    
    # Save yetkinlikler
    for y in request.yetkinlikler:
        yetkinlik = YetkinlikPuani(oturum_id=oturum.id, **y)
        await db.yetkinlik_puani.insert_one(yetkinlik.model_dump())
    
    # Save gorseller
    for g in request.gorseller:
        gorsel = OturumGorsel(oturum_id=oturum.id, **g)
        await db.oturum_gorsel.insert_one(gorsel.model_dump())
    
    # Save aksiyonlar
    for a in request.aksiyonlar:
        aksiyon = Aksiyon(oturum_id=oturum.id, **a)
        await db.aksiyon.insert_one(aksiyon.model_dump())
    
    return {"success": True, "oturum_id": oturum.id}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
