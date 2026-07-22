"""GROW 360 Koçluk Motoru.

Bağlayıcı iş ve ürün mantığı: docs/COACHING_ENGINE_SPEC.md
Şema: schemas/coaching-session.schema.json
Kabul testleri: tests/COACHING_ACCEPTANCE_TESTS.md

Bu modül, saha temsilcisinin gözlenen görüşmelerine dayanan, kanıt zorunlu
yetkinlik değerlendirmesi ve yapılandırılmış gelişim hedefi kaydı sağlar.
IMS/pazar/ziyaret/sipariş veri kaynakları bu depoda entegre olmadığından,
ticari ve saha bağlam metrikleri bilinçli olarak "missing" (Veri yok)
durumunda üretilir; hiçbir sayı uydurulmaz.
"""
import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

SCHEMA_VERSION = "6.0"

# ---------------------------------------------------------------------------
# 34 yetkinlik kriteri (docs/COACHING_ENGINE_SPEC.md bölüm 3)
# ---------------------------------------------------------------------------

COMPETENCY_CATEGORIES = [
    {"id": "A", "label": "Ziyaret öncesi hazırlık ve planlama"},
    {"id": "B", "label": "Açılış ve gündem oluşturma"},
    {"id": "C", "label": "Soru sorma ve ihtiyaç analizi"},
    {"id": "D", "label": "Bilimsel mesaj ve sunum"},
    {"id": "E", "label": "İtiraz karşılama ve müzakere"},
    {"id": "F", "label": "Kapanış ve takip"},
    {"id": "G", "label": "Eczane ve hesap yönetimi"},
    {"id": "H", "label": "Kaynak ve zaman kullanımı"},
    {"id": "I", "label": "Uyum ve profesyonel davranış"},
]

COMPETENCY_CRITERIA = [
    {"id": "A1", "category": "A", "label": "Müşteri geçmişini, seçki segmentini ve önceki görüşmeyi kullanarak görüşme hedefi belirleme."},
    {"id": "A2", "category": "A", "label": "Müşteriye ve branşa uygun ürün/mesaj seçme."},
    {"id": "A3", "category": "A", "label": "Ziyaret rotası ve zaman planını verimli oluşturma."},
    {"id": "A4", "category": "A", "label": "Kullanılacak kaynak ve materyali önceden hazırlama."},
    {"id": "B5", "category": "B", "label": "Profesyonel ve odaklı açılış yapma."},
    {"id": "B6", "category": "B", "label": "Görüşmenin amacını müşteri için anlamlı biçimde ifade etme."},
    {"id": "B7", "category": "B", "label": "Önceki görüşme veya taahhütle bağlantı kurma."},
    {"id": "C8", "category": "C", "label": "Açık uçlu sorularla müşteriyi konuşturma."},
    {"id": "C9", "category": "C", "label": "SPIN yaklaşımını uygun biçimde kullanma."},
    {"id": "C10", "category": "C", "label": "Müşterinin klinik, operasyonel veya hasta yönetimi ihtiyacını doğru tanımlama."},
    {"id": "C11", "category": "C", "label": "Aktif dinleme, özetleme ve derinleştirme soruları kullanma."},
    {"id": "D12", "category": "D", "label": "Mesajı müşterinin ihtiyacına göre kişiselleştirme."},
    {"id": "D13", "category": "D", "label": "Bilimsel doğruluk ve onaylı ürün bilgisine uyum."},
    {"id": "D14", "category": "D", "label": "Ana mesajı net, kısa ve yapılandırılmış sunma."},
    {"id": "D15", "category": "D", "label": "Kanıt, görsel veya materyali doğru zamanda ve amaca uygun kullanma."},
    {"id": "D16", "category": "D", "label": "Sunumu monolog yerine etkileşimli yürütme."},
    {"id": "E17", "category": "E", "label": "İtirazı kesmeden dinleme ve doğrulama."},
    {"id": "E18", "category": "E", "label": "İtirazın gerçek nedenini soru ile netleştirme."},
    {"id": "E19", "category": "E", "label": "Yanıtı kanıt ve ihtiyaçla ilişkilendirme."},
    {"id": "E20", "category": "E", "label": "Yanıt sonrası müşterinin kabulünü kontrol etme."},
    {"id": "F21", "category": "F", "label": "Görüşmeyi özetleme."},
    {"id": "F22", "category": "F", "label": "Açık ve uygun bir taahhüt sorusu yöneltme."},
    {"id": "F23", "category": "F", "label": "Bir sonraki adımı, sorumluyu ve tarihi netleştirme."},
    {"id": "F24", "category": "F", "label": "CRM/SFA kaydını zamanında ve doğru tamamlama."},
    {"id": "G25", "category": "G", "label": "Eczanenin stok, hasta profili ve ürün hareketini anlamaya yönelik soru sorma."},
    {"id": "G26", "category": "G", "label": "Sipariş talebini ihtiyaç, stok ve etik/ticari kurallar çerçevesinde yönetme."},
    {"id": "G27", "category": "G", "label": "Ürün bulunurluğu, takip ve sürdürülebilir ilişki planı oluşturma."},
    {"id": "H28", "category": "H", "label": "Saha zamanını yüksek öncelikli müşterilere dengeli ayırma."},
    {"id": "H29", "category": "H", "label": "Materyal, numune veya diğer kaynakları amaçla bağlantılı ve ölçülü kullanma."},
    {"id": "H30", "category": "H", "label": "Aynı müşteriye tekrarlanan fakat değer üretmeyen ziyaretleri azaltma."},
    {"id": "H31", "category": "H", "label": "Gün içinde plan değişikliğini gerekçeli ve verimli yönetme."},
    {"id": "I32", "category": "I", "label": "Tanıtım, etik ve şirket prosedürlerine uyum."},
    {"id": "I33", "category": "I", "label": "Müşteri ve çalışan kişisel verilerini gereksiz biçimde kaydetmeme."},
    {"id": "I34", "category": "I", "label": "Profesyonel, saygılı ve ayrımcı olmayan iletişim."},
]
COMPETENCY_IDS = {c["id"] for c in COMPETENCY_CRITERIA}

SCORE_SCALE = [
    {"score": 1, "label": "Gelişmeli", "description": "Kritik davranış gözlenmedi veya yanlış uygulandı."},
    {"score": 2, "label": "Beklentiyi kısmen karşılıyor", "description": "Davranış parçalı, düzensiz veya yönlendirmeyle gerçekleşti."},
    {"score": 3, "label": "Beklenen düzey", "description": "Rol standardı bağımsız ve yeterli biçimde karşılandı."},
    {"score": 4, "label": "Beklenenin üzerinde", "description": "Davranış tutarlı, etkili ve duruma uyarlanmış biçimde uygulandı."},
    {"score": 5, "label": "Öğretici düzey", "description": "Davranış sürdürülebilir iyi uygulama niteliğinde ve başkalarına örnek olabilir."},
]

SESSION_TYPES = ["joint_field_visit", "one_to_one", "follow_up", "skill_practice", "other"]

# ---------------------------------------------------------------------------
# Hazır gelişim hedefi şablonları (tasks/04_BUILD_COACHING_ENGINE_MASTER_PROMPT.md)
# Şablon seçildiğinde alanlar örnekle dolar; kullanıcı onayı olmadan tamamlanmış sayılmaz.
# ---------------------------------------------------------------------------

GOAL_TEMPLATES = [
    {
        "id": "spin_open_question",
        "label": "SPIN ve açık uçlu soru",
        "competencyId": "C9",
        "currentState": "Gözlenen görüşmelerin çoğunda doğrudan ürün sunumuna geçiliyor; Problem ve Implication sorusu görülmüyor.",
        "targetBehavior": "Sunumdan önce en az bir Problem ve bir Implication sorusu yöneltmek ve cevabı ana mesaja bağlamak.",
        "implementationSteps": [
            "Görüşme öncesinde müşteri başına iki soru hazırlamak.",
            "Müşteri cevabını kısaca özetlemek.",
            "Cevaba uygun mesajı seçip bağlamak.",
        ],
        "measurementMethod": "Sonraki gözlenen görüşmelerin en az %80'inde P ve I sorusunun birlikte gözlenmesi.",
        "unit": "gözlenen görüşme",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "Her saha günü",
    },
    {
        "id": "active_listening",
        "label": "Aktif dinleme",
        "competencyId": "C11",
        "currentState": "Müşteri cevapları özetlenmeden bir sonraki soruya geçiliyor.",
        "targetBehavior": "Her görüşmede müşterinin son cevabını kendi cümleleriyle özetleyip onay almak.",
        "implementationSteps": ["Cevabı tek cümleyle özetlemek.", "'Doğru anladım mı?' türü onay sorusu sormak."],
        "measurementMethod": "Gözlenen görüşmelerin en az %70'inde özetleme örneği görülmesi.",
        "unit": "gözlenen görüşme",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "İki haftada bir",
    },
    {
        "id": "tailored_presentation",
        "label": "İhtiyaca uyarlanmış sunum",
        "competencyId": "D12",
        "currentState": "Ürün özellikleri sıralanıyor; ihtiyaç bağlantısı ve anlama kontrolü sınırlı.",
        "targetBehavior": "Her görüşmede tek ihtiyaç, tek ana mesaj, tek kanıt ve tek kontrol sorusundan oluşan yapı kullanmak.",
        "implementationSteps": ["Görüşme öncesi mesaj kartını doldurmak.", "Sunumu 3 dakika içinde tamamlamak.", "Kapanışta kontrol sorusu sormak."],
        "measurementMethod": "5 gözlenen görüşmenin en az 4'ünde dört unsurun birlikte görülmesi.",
        "unit": "gözlenen görüşme",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "Sonraki ikili ziyaret",
    },
    {
        "id": "objection_handling",
        "label": "İtiraz karşılama",
        "competencyId": "E18",
        "currentState": "İtirazın gerçek nedeni netleştirilmeden yanıt veriliyor.",
        "targetBehavior": "Her itirazda önce doğrulama, sonra netleştirici soru, sonra kanıta dayalı yanıt sırasını uygulamak.",
        "implementationSteps": ["İtirazı kesmeden dinlemek.", "Nedenini netleştiren bir soru sormak.", "Yanıtı kanıtla ilişkilendirmek.", "Kabulü kontrol etmek."],
        "measurementMethod": "Gözlenen itirazların en az %75'inde dört adımın sırayla uygulanması.",
        "unit": "itiraz",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "Her saha günü",
    },
    {
        "id": "closing_commitment",
        "label": "Kapanış ve taahhüt",
        "competencyId": "F22",
        "currentState": "Görüşmeler net bir taahhüt sorusu olmadan sonlanıyor.",
        "targetBehavior": "Her görüşmeyi özetleyip somut bir taahhüt sorusuyla kapatmak.",
        "implementationSteps": ["Görüşmeyi 1-2 cümleyle özetlemek.", "Açık taahhüt sorusu sormak.", "Sonraki adımı ve tarihi netleştirmek."],
        "measurementMethod": "Gözlenen görüşmelerin en az %80'inde taahhüt sorusu ve sonraki adım kaydı bulunması.",
        "unit": "gözlenen görüşme",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "Her saha günü",
    },
    {
        "id": "visit_continuity",
        "label": "Ziyaret sürekliliği",
        "competencyId": "field-continuity",
        "currentState": "Ziyaretlerin önemli bir kısmı ayın son haftasına yığılıyor.",
        "targetBehavior": "Hedef frekanslı müşterileri haftalara dengeli dağıtmak ve haftalık plan kontrolü yapmak.",
        "implementationSteps": ["Pazartesi günü frekans açığı listesini kontrol etmek.", "Geciken müşterileri cuma öncesi yeniden planlamak."],
        "measurementMethod": "Süreklilik oranını en az %70'e çıkarmak ve son hafta yığılmasını %25'in altına indirmek.",
        "unit": "%",
        "dataSource": "Ziyaret detay ve plan kayıtları",
        "checkFrequency": "Haftalık",
    },
    {
        "id": "frequency_planning",
        "label": "Frekans planlama",
        "competencyId": "field-frequency",
        "currentState": "Hedef frekansın altında kalan müşteri sayısı yüksek.",
        "targetBehavior": "Frekans açığı olan müşterileri haftalık plana öncelikli olarak eklemek.",
        "implementationSteps": ["Frekans açığı listesini haftalık çıkarmak.", "Öncelikli müşterileri plana eklemek."],
        "measurementMethod": "Hedef frekansın altındaki müşteri sayısını azaltmak.",
        "unit": "müşteri sayısı",
        "dataSource": "Seleksiyon ve ziyaret kayıtları",
        "checkFrequency": "Haftalık",
    },
    {
        "id": "resource_usage",
        "label": "Kaynak kullanımı",
        "competencyId": "H29",
        "currentState": "Materyal kullanımı sonrası takip sonucu kaydedilmiyor.",
        "targetBehavior": "Her kaynak kullanımında amaç ve takip sonucunu kaydetmek.",
        "implementationSteps": ["Kaynak kullanımını amaçla birlikte not almak.", "Bir sonraki ziyarette takip sonucunu kaydetmek."],
        "measurementMethod": "Takibi yapılan kaynak kullanım oranını artırmak.",
        "unit": "%",
        "dataSource": "Kaynak kullanım kaydı / manuel gözlem",
        "checkFrequency": "Aylık",
    },
    {
        "id": "pharmacy_account_management",
        "label": "Eczane hesap yönetimi",
        "competencyId": "G26",
        "currentState": "Sipariş talepleri stok ve ihtiyaç değerlendirmesi yapılmadan iletiliyor.",
        "targetBehavior": "Sipariş talebini stok, hasta profili ve etik/ticari kurallar çerçevesinde değerlendirip yönetmek.",
        "implementationSteps": ["Stok ve hareket sorularını sormak.", "Talebi ihtiyaçla eşleştirmek.", "Takip planı oluşturmak."],
        "measurementMethod": "Gözlenen eczane görüşmelerinin en az %70'inde bu sıranın uygulanması.",
        "unit": "gözlenen görüşme",
        "dataSource": "Yönetici gözlem formu",
        "checkFrequency": "Aylık",
    },
    {
        "id": "crm_sfa_quality",
        "label": "CRM/SFA kayıt kalitesi",
        "competencyId": "F24",
        "currentState": "Ziyaret sonrası CRM/SFA kaydı gecikmeli veya eksik giriliyor.",
        "targetBehavior": "Her ziyareti aynı gün içinde eksiksiz CRM/SFA'ya işlemek.",
        "implementationSteps": ["Ziyaret sonunda hemen not almak.", "Gün sonunda CRM/SFA girişini tamamlamak."],
        "measurementMethod": "Aynı gün tamamlanan kayıt oranını en az %90'a çıkarmak.",
        "unit": "%",
        "dataSource": "CRM/SFA sistem kaydı",
        "checkFrequency": "Haftalık",
    },
]

# ---------------------------------------------------------------------------
# Ticari/saha bağlam metrikleri — bu depoda IMS/ziyaret/sipariş entegrasyonu
# YOK. Bu yüzden tüm kartlar bilinçli biçimde "missing" döner; hiçbir değer
# uydurulmaz. Formül ve kaynak alanları, ileride gerçek veri bağlandığında
# aynı kartların doldurulabilmesi için burada tutuluyor.
# ---------------------------------------------------------------------------

CONTEXT_METRIC_DEFS = [
    {"metricId": "sales_realization", "label": "Satış / Hedef Realizasyonu", "unit": "%", "formula": "Satış / Hedef × 100"},
    {"metricId": "market_share", "label": "Pazar Payı", "unit": "%", "formula": "İlgili ürün/portföy satış hacmi / toplam pazar satış hacmi × 100"},
    {"metricId": "market_share_change", "label": "Pazar Payı Gelişimi", "unit": "yüzde puan", "formula": "Güncel pazar payı − Önceki dönem pazar payı"},
    {"metricId": "sales_growth", "label": "Satış Gelişimi", "unit": "%", "formula": "(Güncel satış − Önceki satış) / Önceki satış × 100"},
    {"metricId": "market_growth", "label": "Pazar Büyümesi", "unit": "%", "formula": "(Güncel toplam pazar − Önceki toplam pazar) / Önceki toplam pazar × 100"},
    {"metricId": "growth_index", "label": "Gelişim İndeksi", "unit": "endeks", "formula": "Ürün satış endeksi / Pazar satış endeksi × 100"},
    {"metricId": "plan_compliance", "label": "Plan Uyumu", "unit": "%", "formula": "Planla eşleşen gerçekleşen ziyaret / Planlanan ziyaret × 100"},
    {"metricId": "doctor_coverage", "label": "Doktor Kaverajı", "unit": "%", "formula": "Dönemde ziyaret edilen seçili doktor / ziyaret edilmesi gereken seçili doktor × 100"},
    {"metricId": "pharmacy_coverage", "label": "Eczane Kaverajı", "unit": "%", "formula": "Dönemde ziyaret edilen seçili eczane / ziyaret edilmesi gereken seçili eczane × 100"},
    {"metricId": "frequency_compliance", "label": "Frekans Uyumu", "unit": "%", "formula": "min(Gerçekleşen ziyaret / Hedef ziyaret, 1) × 100 (müşteri bazlı ortalama)"},
    {"metricId": "visit_continuity", "label": "Ziyaret Sürekliliği", "unit": "%", "formula": "Zamanında gerçekleşen beklenen temas aralığı / Toplam beklenen temas aralığı × 100"},
    {"metricId": "field_day_efficiency", "label": "Saha Günü ve Günlük Ziyaret Verimliliği", "unit": "adet/gün", "formula": "Günlük ortalama doktor + eczane ziyareti"},
    {"metricId": "resource_usage", "label": "Kaynak Kullanımı", "unit": "adet", "formula": "Kaynak kullanılan müşteri sayısı ve takip oranı"},
    {"metricId": "order_active_pharmacy", "label": "Sipariş ve Aktif Eczane", "unit": "adet", "formula": "Dönemde en az bir sipariş veren eczane sayısı"},
]

NO_DATA_SOURCE = "Bağlı değil — bu uygulamada IMS/pazar/ziyaret/sipariş veri kaynağı entegrasyonu yok."

# ---------------------------------------------------------------------------
# Dil ve hukuki koruma — tasks/04_BUILD_COACHING_ENGINE_MASTER_PROMPT.md
# "block": disiplin/fesih dili — asla kaydedilemez, tamamlama her zaman engellenir.
# "warn": kişilik/özel hayat çıkarımı — uyarılır, kullanıcı metni yeniden yazar
#         veya yönetici açıkça onaylar (audit log'a işlenir).
# ---------------------------------------------------------------------------

FORBIDDEN_TERMS: Dict[str, Dict[str, str]] = {
    "fesih": {"severity": "block", "guidance": "Koçluk kaydı iş akdi/fesih kararı üretemez. Bu ifadeyi kaldırın; gerekiyorsa ayrı bir İK süreci başlatın."},
    "işten çıkar": {"severity": "block", "guidance": "Koçluk kaydı işten çıkarma kararı üretemez. Bu ifadeyi kaldırın; gerekiyorsa ayrı bir İK süreci başlatın."},
    "ihtar": {"severity": "block", "guidance": "Koçluk kaydı disiplin/ihtar süreci değildir. Bu ifadeyi kaldırın."},
    "ceza": {"severity": "block", "guidance": "Koçluk kaydı ceza/prim kesintisi önerisi üretemez. Bu ifadeyi kaldırın."},
    "prim kesint": {"severity": "block", "guidance": "Koçluk kaydı ücret/prim sonucu üretemez. Bu ifadeyi kaldırın."},
    "disiplin": {"severity": "block", "guidance": "Koçluk kaydı disiplin süreciyle karıştırılamaz. Bu ifadeyi kaldırın."},
    "tembel": {"severity": "warn", "guidance": "Kişilik yargısı yerine gözlenen somut davranışı ve etkisini yazın."},
    "isteksiz": {"severity": "warn", "guidance": "Niyet yorumu yerine gözlenen somut davranışı yazın."},
    "disiplinsiz": {"severity": "warn", "guidance": "Kişilik yargısı yerine gözlenen somut davranışı yazın."},
    "güvenilmez": {"severity": "warn", "guidance": "Kişilik yargısı yerine gözlenen somut davranışı yazın."},
    "agresif": {"severity": "warn", "guidance": "Kişilik yargısı yerine gözlenen somut davranışı yazın."},
    "karakter": {"severity": "warn", "guidance": "Karakter/kişilik değerlendirmesi yapılamaz; gözlenen davranışı yazın."},
    "kişilik": {"severity": "warn", "guidance": "Karakter/kişilik değerlendirmesi yapılamaz; gözlenen davranışı yazın."},
    "ailevi": {"severity": "warn", "guidance": "Aile hayatına ilişkin veri koçluk kaydına girilemez."},
    "aile durumu": {"severity": "warn", "guidance": "Aile hayatına ilişkin veri koçluk kaydına girilemez."},
    "sağlık sorun": {"severity": "warn", "guidance": "Sağlık verisi koçluk kaydına girilemez."},
    "hamile": {"severity": "warn", "guidance": "Gebelik/sağlık verisi koçluk kaydına girilemez."},
    "gebelik": {"severity": "warn", "guidance": "Gebelik/sağlık verisi koçluk kaydına girilemez."},
    "siyasi": {"severity": "warn", "guidance": "Siyasi görüş koçluk kaydına girilemez."},
    "sendika": {"severity": "warn", "guidance": "Sendika üyeliği koçluk kaydına girilemez."},
    "dini inan": {"severity": "warn", "guidance": "Din/inanç bilgisi koçluk kaydına girilemez."},
    "mezhep": {"severity": "warn", "guidance": "Din/inanç bilgisi koçluk kaydına girilemez."},
}

_TR_UPPER_MAP = str.maketrans({"İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç"})


def _normalize(text: str) -> str:
    return text.translate(_TR_UPPER_MAP).lower()


def check_language(text: Optional[str]) -> List[Dict[str, str]]:
    """Metni yasaklı terimler için tarar. Kesin hukuki karar üretmez;
    kullanıcıyı role ilişkin somut davranışla yeniden yazmaya yönlendirir."""
    if not text:
        return []
    norm = _normalize(text)
    hits = []
    for term, meta in FORBIDDEN_TERMS.items():
        if term in norm:
            hits.append({"term": term, "severity": meta["severity"], "guidance": meta["guidance"]})
    return hits


# ---------------------------------------------------------------------------
# Pydantic modelleri — schemas/coaching-session.schema.json ile birebir
# ---------------------------------------------------------------------------


class SpinStage(BaseModel):
    used: bool = False
    question: Optional[str] = None
    newInformation: Optional[str] = None
    linkedToMessage: Optional[bool] = None


class SpinRecord(BaseModel):
    situation: SpinStage = Field(default_factory=SpinStage)
    problem: SpinStage = Field(default_factory=SpinStage)
    implication: SpinStage = Field(default_factory=SpinStage)
    needPayoff: SpinStage = Field(default_factory=SpinStage)


class PresentationRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    objectiveClear: Optional[bool] = None
    linkedToNeed: Optional[bool] = None
    coreMessageWithin90s: Optional[bool] = None
    scientificallyAccurate: Optional[bool] = None
    logicalFlow: Optional[bool] = None
    benefitVsFeature: Optional[bool] = None
    evidenceSupportsMessage: Optional[bool] = None
    materialSupportsConversation: Optional[bool] = None
    customerEngaged: Optional[bool] = None
    understandingChecked: Optional[bool] = None
    note: Optional[str] = None


class ObjectionRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    description: str = ""
    handled: Optional[bool] = None
    note: Optional[str] = None


class ObservedCall(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customerName: str
    customerType: Literal["doctor", "pharmacy", "other"]
    branch: Optional[str] = None
    unit: Optional[str] = None
    brick: str
    visitDateTime: Optional[str] = None
    planned: Optional[bool] = None
    durationMinutes: Optional[float] = Field(default=None, ge=0)
    visitGoal: Optional[str] = None
    productFocus: Optional[str] = None
    resourceUsed: Optional[str] = None
    openQuestionCount: int = Field(default=0, ge=0)
    closedQuestionCount: int = Field(default=0, ge=0)
    probeQuestionCount: int = Field(default=0, ge=0)
    spin: SpinRecord = Field(default_factory=SpinRecord)
    presentation: PresentationRecord = Field(default_factory=PresentationRecord)
    objections: List[ObjectionRecord] = Field(default_factory=list)
    commitment: Optional[str] = None
    nextStep: Optional[str] = None
    followUpDate: Optional[str] = None
    observationNote: str = Field(..., min_length=1)


class CompetencyRating(BaseModel):
    model_config = ConfigDict(extra="allow")
    criterionId: str
    score: Optional[int] = Field(default=None, ge=1, le=5)
    status: Literal["observed", "partly_observed", "not_observed", "not_assessed"] = "not_assessed"
    evidenceCallIds: List[str] = Field(default_factory=list)
    evidenceNote: Optional[str] = None
    classification: Literal["strength", "expected", "development", "not_assessed"] = "not_assessed"

    @model_validator(mode="after")
    def _validate(self):
        if self.criterionId not in COMPETENCY_IDS:
            raise ValueError(f"Bilinmeyen yetkinlik kriteri: {self.criterionId}")
        if self.status in ("not_assessed", "not_observed") or self.score is None:
            self.score = None
            self.classification = "not_assessed"
            return self
        if self.score in (1, 2, 4, 5):
            if not (self.evidenceNote and self.evidenceNote.strip()):
                raise ValueError(f"{self.criterionId}: {self.score} puan somut kanıt notu olmadan kaydedilemez.")
            if not self.evidenceCallIds:
                raise ValueError(f"{self.criterionId}: {self.score} puan en az bir görüşme kanıtına bağlanmadan kaydedilemez.")
        self.classification = "development" if self.score <= 2 else ("expected" if self.score == 3 else "strength")
        return self


class DevelopmentGoal(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    competencyId: str
    currentState: str = Field(..., min_length=1)
    evidenceCallIds: List[str] = Field(default_factory=list)
    targetBehavior: str = Field(..., min_length=1)
    implementationSteps: List[str] = Field(..., min_length=1)
    measurementMethod: str = Field(..., min_length=1)
    baselineValue: Optional[Any] = None
    targetValue: Optional[Any] = None
    unit: Optional[str] = None
    dataSource: str = Field(..., min_length=1)
    checkFrequency: Optional[str] = None
    reviewDate: str
    employeeCommitment: str = Field(..., min_length=1)
    managerSupport: str = Field(..., min_length=1)
    successEvidence: Optional[str] = None
    status: Literal["planned", "in_progress", "completed", "replanned"] = "planned"


class Representative(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    positionCode: Optional[str] = None


class Manager(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    id: Optional[str] = None


class ContextMetric(BaseModel):
    metricId: str
    label: str
    value: Optional[Any] = None
    previousValue: Optional[Any] = None
    change: Optional[Any] = None
    unit: Optional[str] = None
    period: Optional[str] = None
    source: str
    formula: Optional[str] = None
    status: Literal["available", "missing", "incompatible", "estimated"] = "missing"
    qualityNotes: List[str] = Field(default_factory=list)


class EmployeeReflection(BaseModel):
    whatWentWell: Optional[str] = None
    whatWasDifficult: Optional[str] = None
    chosenFocus: Optional[str] = None
    employeeStatement: Optional[str] = None


class GrowConversation(BaseModel):
    goal: Optional[str] = None
    reality: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    wayForward: Optional[str] = None


class AuditLogEntry(BaseModel):
    timestamp: str
    action: str
    actor: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class LanguageWarning(BaseModel):
    field: str
    term: str
    severity: Literal["block", "warn"]
    guidance: str


class CoachingSession(BaseModel):
    model_config = ConfigDict(extra="allow")
    schemaVersion: str = SCHEMA_VERSION
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    representative: Representative
    manager: Manager
    sessionDate: str
    sessionType: Literal["joint_field_visit", "one_to_one", "follow_up", "skill_practice", "other"]
    status: Literal["draft", "in_progress", "completed", "replanned"] = "draft"
    province: Optional[str] = None
    bricks: List[str] = Field(default_factory=list)
    focusCompetencies: List[str] = Field(default_factory=list)
    previousSessionId: Optional[str] = None
    contextMetrics: List[ContextMetric] = Field(default_factory=list)
    observedCalls: List[ObservedCall] = Field(default_factory=list)
    noCallsJustification: Optional[str] = None
    competencyRatings: List[CompetencyRating] = Field(default_factory=list)
    employeeReflection: EmployeeReflection = Field(default_factory=EmployeeReflection)
    growConversation: GrowConversation = Field(default_factory=GrowConversation)
    developmentGoals: List[DevelopmentGoal] = Field(default_factory=list)
    followUps: List[Dict[str, Any]] = Field(default_factory=list)
    languageWarnings: List[LanguageWarning] = Field(default_factory=list)
    auditLog: List[AuditLogEntry] = Field(default_factory=list)


class CoachingSessionCreate(BaseModel):
    representative: Representative
    manager: Manager
    sessionDate: str
    sessionType: Literal["joint_field_visit", "one_to_one", "follow_up", "skill_practice", "other"]
    province: Optional[str] = None
    bricks: List[str] = Field(default_factory=list)
    focusCompetencies: List[str] = Field(default_factory=list)
    previousSessionId: Optional[str] = None
    actor: Optional[str] = None


class LanguageCheckRequest(BaseModel):
    text: str


class CompleteRequest(BaseModel):
    actor: Optional[str] = None
    acknowledgeWarnings: bool = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_context_metrics() -> List[ContextMetric]:
    return [
        ContextMetric(
            metricId=m["metricId"],
            label=m["label"],
            unit=m["unit"],
            formula=m["formula"],
            source=NO_DATA_SOURCE,
            status="missing",
            qualityNotes=["Değer hesaplanamadı: bu koçluğa kaynak veri bağlanmadı."],
        )
        for m in CONTEXT_METRIC_DEFS
    ]


def _scan_session_language(session: CoachingSession) -> List[LanguageWarning]:
    warnings: List[LanguageWarning] = []

    def scan(field_name: str, text: Optional[str]):
        for hit in check_language(text):
            warnings.append(LanguageWarning(field=field_name, term=hit["term"], severity=hit["severity"], guidance=hit["guidance"]))

    for call in session.observedCalls:
        scan(f"observedCalls[{call.id}].observationNote", call.observationNote)
        scan(f"observedCalls[{call.id}].commitment", call.commitment)
    for rating in session.competencyRatings:
        scan(f"competencyRatings[{rating.criterionId}].evidenceNote", rating.evidenceNote)
    scan("employeeReflection.whatWentWell", session.employeeReflection.whatWentWell)
    scan("employeeReflection.whatWasDifficult", session.employeeReflection.whatWasDifficult)
    scan("employeeReflection.chosenFocus", session.employeeReflection.chosenFocus)
    scan("employeeReflection.employeeStatement", session.employeeReflection.employeeStatement)
    scan("growConversation.goal", session.growConversation.goal)
    scan("growConversation.reality", session.growConversation.reality)
    scan("growConversation.wayForward", session.growConversation.wayForward)
    for i, opt in enumerate(session.growConversation.options):
        scan(f"growConversation.options[{i}]", opt)
    for goal in session.developmentGoals:
        scan(f"developmentGoals[{goal.id}].currentState", goal.currentState)
        scan(f"developmentGoals[{goal.id}].targetBehavior", goal.targetBehavior)
        scan(f"developmentGoals[{goal.id}].employeeCommitment", goal.employeeCommitment)
        scan(f"developmentGoals[{goal.id}].managerSupport", goal.managerSupport)
    return warnings


def _label_for(criterion_id: str) -> str:
    for c in COMPETENCY_CRITERIA:
        if c["id"] == criterion_id:
            return c["label"]
    return criterion_id


def build_sfa_comment(session: CoachingSession) -> str:
    """Yerel kural motoru; harici AI kullanmadan, yalnızca kayıtlı veri ve
    kanıtla, docs/COACHING_ENGINE_SPEC.md bölüm 12'deki sırayla üretir."""
    parts: List[str] = []
    customers = {c.customerName for c in session.observedCalls}
    bricks = sorted(set(session.bricks) | {c.brick for c in session.observedCalls if c.brick})
    scope = f"{session.sessionDate} tarihinde "
    scope += f"{', '.join(bricks)} bölgesinde " if bricks else ""
    scope += f"{len(session.observedCalls)} görüşme gözlemlenmiştir"
    scope += f" ({len(customers)} farklı müşteri)." if customers else "."
    parts.append(scope)

    strengths = [r for r in session.competencyRatings if r.classification == "strength"]
    if strengths:
        items = "; ".join(f"{_label_for(r.criterionId)} — {r.evidenceNote}" for r in strengths)
        parts.append(f"Gözlenen güçlü yönler: {items}.")

    developments = [r for r in session.competencyRatings if r.classification == "development"]
    if developments:
        items = "; ".join(f"{_label_for(r.criterionId)} — {r.evidenceNote}" for r in developments)
        parts.append(f"Gelişim alanları: {items}.")

    if any(m.status == "missing" for m in session.contextMetrics):
        parts.append(
            "Ticari/saha veri bağlamı: IMS/pazar/ziyaret veri kaynağı bu koçluğa bağlı olmadığından, "
            "ticari sonuçlarla yetkinlik arasında herhangi bir nedensellik kurulmamıştır."
        )

    reflection = session.employeeReflection.employeeStatement or session.employeeReflection.chosenFocus
    if reflection:
        parts.append(f"Çalışanın görüşü: {reflection}")

    if session.developmentGoals:
        g = session.developmentGoals[0]
        parts.append(
            f"Üzerinde uzlaşılan hedef davranış: {g.targetBehavior} "
            f"Ölçüm: {g.measurementMethod} Takip tarihi: {g.reviewDate}. Yönetici desteği: {g.managerSupport}"
        )

    return " ".join(parts)


def build_csv(session: CoachingSession) -> str:
    buf = io.StringIO()
    buf.write("﻿")
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["Bölüm: Gözlenen Görüşmeler"])
    writer.writerow([
        "Tarih", "Müşteri", "Tip", "Branş", "Ünite", "Brick", "Planlı", "Süre (dk)",
        "Açık Soru", "Kapalı Soru", "Probe Soru", "Taahhüt", "Sonraki Adım", "Takip Tarihi", "Gözlem Notu",
    ])
    for c in session.observedCalls:
        planned = "Evet" if c.planned else ("Hayır" if c.planned is False else "")
        writer.writerow([
            c.visitDateTime or "", c.customerName, c.customerType, c.branch or "", c.unit or "", c.brick,
            planned, c.durationMinutes if c.durationMinutes is not None else "",
            c.openQuestionCount, c.closedQuestionCount, c.probeQuestionCount,
            c.commitment or "", c.nextStep or "", c.followUpDate or "", c.observationNote,
        ])
    writer.writerow([])
    writer.writerow(["Bölüm: Gelişim Hedefleri"])
    writer.writerow([
        "Yetkinlik", "Mevcut Durum", "Hedef Davranış", "Ölçüm Yöntemi", "Veri Kaynağı",
        "Takip Tarihi", "Çalışan Taahhüdü", "Yönetici Desteği", "Durum",
    ])
    for g in session.developmentGoals:
        writer.writerow([
            g.competencyId, g.currentState, g.targetBehavior, g.measurementMethod, g.dataSource,
            g.reviewDate, g.employeeCommitment, g.managerSupport, g.status,
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Depolama — motor (Mongo) db, server.py içinden set_db() ile bağlanır
# ---------------------------------------------------------------------------

_db = None


def set_db(db) -> None:
    global _db
    _db = db


def _collection():
    if _db is None:
        raise RuntimeError("coaching_engine.set_db() çağrılmadan kullanılamaz")
    return _db.coaching_sessions


async def _get_doc(session_id: str) -> Dict[str, Any]:
    doc = await _collection().find_one({"id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Koçluk kaydı bulunamadı")
    doc.pop("_id", None)
    return doc


async def _save_doc(session: CoachingSession) -> Dict[str, Any]:
    doc = session.model_dump()
    await _collection().replace_one({"id": session.id}, doc, upsert=True)
    return doc


def _validation_errors(exc: ValidationError) -> Dict[str, Any]:
    return {"message": "Koçluk kaydı geçerli değil", "errors": json.loads(exc.json())}


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

coaching_router = APIRouter(prefix="/coaching", tags=["coaching"])


@coaching_router.get("/competencies")
async def list_competencies():
    return {"categories": COMPETENCY_CATEGORIES, "criteria": COMPETENCY_CRITERIA, "scale": SCORE_SCALE}


@coaching_router.get("/goal-templates")
async def list_goal_templates():
    return {"templates": GOAL_TEMPLATES}


@coaching_router.get("/context-metrics")
async def context_metrics_stub():
    return {"metrics": [m.model_dump() for m in build_context_metrics()]}


@coaching_router.post("/language-check")
async def language_check(body: LanguageCheckRequest):
    hits = check_language(body.text)
    return {"flagged": bool(hits), "matches": hits}


@coaching_router.post("/sessions")
async def create_session(body: CoachingSessionCreate):
    session = CoachingSession(
        representative=body.representative,
        manager=body.manager,
        sessionDate=body.sessionDate,
        sessionType=body.sessionType,
        province=body.province,
        bricks=body.bricks,
        focusCompetencies=body.focusCompetencies,
        previousSessionId=body.previousSessionId,
        contextMetrics=build_context_metrics(),
        status="draft",
    )
    session.auditLog.append(AuditLogEntry(timestamp=_now(), action="created", actor=body.actor))
    doc = await _save_doc(session)
    doc.pop("_id", None)
    return doc


@coaching_router.get("/sessions")
async def list_sessions(
    viewer_id: str = Query(...),
    viewer_role: str = Query(...),
    representative_id: Optional[str] = Query(default=None),
):
    is_manager = viewer_role in ("coach", "manager", "bolge_muduru")
    if not is_manager:
        query: Dict[str, Any] = {"representative.id": viewer_id}
    elif representative_id:
        query = {"representative.id": representative_id}
    else:
        query = {"$or": [{"manager.id": viewer_id}, {"representative.id": viewer_id}]}
    cursor = _collection().find(query, {"_id": 0}).sort("sessionDate", -1)
    return await cursor.to_list(500)


@coaching_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    return await _get_doc(session_id)


@coaching_router.put("/sessions/{session_id}")
async def update_session(session_id: str, body: Dict[str, Any]):
    doc = await _get_doc(session_id)
    actor = body.pop("actor", None)
    incoming = {k: v for k, v in body.items() if k not in ("id", "schemaVersion", "auditLog")}
    doc.update(incoming)
    try:
        session = CoachingSession(**doc)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=_validation_errors(exc))
    session.languageWarnings = _scan_session_language(session)
    session.auditLog.append(AuditLogEntry(timestamp=_now(), action="updated", actor=actor, details={"fields": list(incoming.keys())}))
    return await _save_doc(session)


@coaching_router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: str, body: CompleteRequest):
    doc = await _get_doc(session_id)
    try:
        session = CoachingSession(**doc)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=_validation_errors(exc))

    warnings = _scan_session_language(session)
    blocking = [w for w in warnings if w.severity == "block"]
    advisory = [w for w in warnings if w.severity == "warn"]

    errors: List[str] = []
    if blocking:
        errors.append(
            "Kayıtta disiplin/fesih diline ait ifadeler var; koçluk kaydı bu haliyle tamamlanamaz. "
            "İlgili metni kaldırın: " + "; ".join(sorted({w.term for w in blocking}))
        )
    if advisory and not body.acknowledgeWarnings:
        errors.append(
            "Kayıtta kişilik/özel hayata ilişkin ifade olabilecek terimler var. "
            "Metni role ilişkin somut davranışla yeniden yazın veya bilerek onaylayın: "
            + "; ".join(sorted({w.term for w in advisory}))
        )
    if not session.observedCalls and not (session.noCallsJustification or "").strip():
        errors.append("En az bir gözlenen görüşme veya gerekçeli görüşmesiz koçluk türü açıklaması gereklidir.")
    if not session.competencyRatings or all(r.status == "not_assessed" for r in session.competencyRatings):
        errors.append("En az bir yetkinlik kriteri değerlendirilmelidir.")
    for r in session.competencyRatings:
        if r.score in (1, 2, 4, 5) and not (r.evidenceNote and r.evidenceCallIds):
            errors.append(f"{r.criterionId}: {r.score} puan kanıtsız tamamlanamaz.")
    if not any([
        session.employeeReflection.whatWentWell,
        session.employeeReflection.whatWasDifficult,
        session.employeeReflection.chosenFocus,
        session.employeeReflection.employeeStatement,
    ]):
        errors.append("En az bir çalışan öz değerlendirme alanı doldurulmalıdır.")
    if not session.developmentGoals:
        errors.append("En az bir gelişim veya güçlü yön hedefi gereklidir.")

    if errors:
        raise HTTPException(status_code=422, detail={
            "message": "Koçluk tamamlanamadı",
            "errors": errors,
            "languageWarnings": [w.model_dump() for w in warnings],
        })

    session.status = "completed"
    session.languageWarnings = warnings
    session.auditLog.append(AuditLogEntry(
        timestamp=_now(), action="completed", actor=body.actor,
        details={"acknowledgedWarnings": body.acknowledgeWarnings and bool(advisory)},
    ))
    return await _save_doc(session)


@coaching_router.get("/sessions/{session_id}/comment")
async def get_comment(session_id: str):
    doc = await _get_doc(session_id)
    session = CoachingSession(**doc)
    return {"comment": build_sfa_comment(session)}


@coaching_router.get("/sessions/{session_id}/export.csv")
async def export_csv(session_id: str):
    doc = await _get_doc(session_id)
    session = CoachingSession(**doc)
    csv_text = build_csv(session)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="coaching_{session_id}.csv"'},
    )
