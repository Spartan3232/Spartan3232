import { useState, useEffect } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Info, Image as ImageIcon, X, Loader2, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import AksiyonCard from "@/components/AksiyonCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ETKINLIK_BASLIKLAR = [
  "Ürün Bilgisi",
  "Medikal Bilgi",
  "Rekabet Bilgisi",
  "Bölge/Pazar Bilgisi",
  "Brick/Bireysel Bölge Bilgisi",
  "Ziyaret Öncesi Planlama ve Hazırlık",
  "Hedefleme / Segmentasyon",
  "Stratejiye uygun sunum planlaması",
  "Ziyaret sonrası analiz/değerlendirme ve önceki ziyaretle ilişkilendirme"
];

const VERIMLILIK_BASLIKLAR = [
  "Etkili giriş (İlgi oluşturma)",
  "Etkili soru sorma becerisi",
  "Aktif dinleme",
  "İhtiyaçların ortaya çıkarılması ve giderilmesi",
  "İtirazları anlama ve karşılama",
  "Özellik - Avantaj/Fayda",
  "Tanıtım malzemesinin etkin kullanımı",
  "Olumlu davranışları destekleme",
  "Çoklu ürün çalışma becerisi",
  "Kısa tanıtım becerisi",
  "Kapanış teknikleri (Özetleme ve talepte bulunmak)",
  "Toplantı planlama ve sunum becerileri analizi / takibi",
  "Sosyal kabul düzeyi",
  "Eczane özel etkinlik planlama, gerçekleştirme ve takip",
  "Reçete analizi ve stok takibi",
  "Tablet ile tanıtım"
];

const YAPILAN_UYGULAMALAR = [
  "Eğitim",
  "İkili ziyaret",
  "İş değerlendirmesi",
  "Koçluk",
  "Mentorluk"
];

export default function KoclukForm({ mumessilId, onSuccess }) {
  const [doktorSayisi, setDoktorSayisi] = useState(0);
  const [eczaneSayisi, setEczaneSayisi] = useState(0);
  const [koclukTipi, setKoclukTipi] = useState("Saha Koçluğu");
  const [yapilanUygulamalar, setYapilanUygulamalar] = useState([]);
  const [etkinlikSeviyeleri, setEtkinlikSeviyeleri] = useState({});
  const [verimlilikSeviyeleri, setVerimlilikSeviyeleri] = useState({});
  const [ortakYorum1, setOrtakYorum1] = useState("");
  const [ortakYorum2, setOrtakYorum2] = useState("");
  const [aksiyonlar, setAksiyonlar] = useState([]);
  const [loading, setLoading] = useState({ yorum: false, plan: false, kaydet: false });

  const [gorselKatalog, setGorselKatalog] = useState([]);
  const [selectedGorseller, setSelectedGorseller] = useState({});

  const toggleUygulama = (uygulama) => {
    if (yapilanUygulamalar.includes(uygulama)) {
      setYapilanUygulamalar(yapilanUygulamalar.filter(u => u !== uygulama));
    } else {
      setYapilanUygulamalar([...yapilanUygulamalar, uygulama]);
    }
  };

  useEffect(() => {
    fetchGorselKatalog();
  }, []);

  const fetchGorselKatalog = async () => {
    try {
      const res = await axios.get(`${API}/gorsel-katalog`);
      setGorselKatalog(res.data);
    } catch (error) {
      console.error("Görsel katalog yüklenemedi", error);
    }
  };

  const getGelismeliBasliklar = () => {
    const gelismeli = [];
    Object.entries(etkinlikSeviyeleri).forEach(([baslik, seviye]) => {
      if (seviye === "Gelişmeli") {
        gelismeli.push({ alan: "Etkinlik", baslik, gorsel_kodlari: [] });
      }
    });
    Object.entries(verimlilikSeviyeleri).forEach(([baslik, seviye]) => {
      if (seviye === "Gelişmeli") {
        gelismeli.push({ alan: "Verimlilik", baslik, gorsel_kodlari: [] });
      }
    });
    return gelismeli;
  };

  const handleOrtakYorumUret = async () => {
    const gelismeli = getGelismeliBasliklar();
    if (gelismeli.length === 0) {
      toast.warning("En az bir başlık 'Gelişmeli' olmalı");
      return;
    }

    setLoading({ ...loading, yorum: true });
    try {
      const res = await axios.post(`${API}/ai/ortak-yorum`, {
        mumessil_id: mumessilId,
        tarih: new Date().toISOString().split('T')[0],
        doktor_sayisi: doktorSayisi,
        eczane_sayisi: eczaneSayisi,
        kocluk_tipi: koclukTipi,
        yapilan_uygulamalar: yapilanUygulamalar,
        gelismeli_basliklar: gelismeli
      });
      setOrtakYorum1(res.data.ortak_yorum);
      toast.success("Ortak yorum eklendi");
    } catch (error) {
      toast.error("Ortak yorum üretilirken hata oluştu");
    }
    setLoading({ ...loading, yorum: false });
  };

  const handleGelisimHedefiniver = async () => {
    if (!ortakYorum1) {
      toast.warning("Önce ortak yorumu üretin");
      return;
    }
    const gelismeli = getGelismeliBasliklar();
    if (gelismeli.length === 0) {
      toast.warning("En az bir başlık 'Gelişmeli' olmalı");
      return;
    }

    setLoading({ ...loading, plan: true });
    try {
      const res = await axios.post(`${API}/ai/gelisim-plani`, {
        mumessil_id: mumessilId,
        tarih: new Date().toISOString().split('T')[0],
        doktor_sayisi: doktorSayisi,
        eczane_sayisi: eczaneSayisi,
        gelismeli_basliklar: gelismeli,
        ortak_yorum_1: ortakYorum1
      });
      const newAksiyonlar = res.data.planlar.map(p => ({
        ...p,
        ai_generated: true,
        edited: false
      }));
      setAksiyonlar(newAksiyonlar);
      toast.success("Gelişim planları dolduruldu", {
        description: "Artık Final olarak kaydedebilirsiniz."
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gelişim planı üretilirken hata oluştu");
    }
    setLoading({ ...loading, plan: false });
  };

  const handleKaydet = async () => {
    if (doktorSayisi < 0 || eczaneSayisi < 0) {
      toast.error("Doktor/Eczane sayısı negatif olamaz");
      return;
    }
    if (!koclukTipi) {
      toast.error("Koçluk tipi seçilmelidir");
      return;
    }
    
    // Taslak modu: Aksiyon planı opsiyonel
    const status = aksiyonlar.length === 0 ? "draft" : "final";
    
    if (aksiyonlar.length === 0) {
      toast.warning("Aksiyon planı eklenmedi. Taslak olarak kaydedildi.", {
        description: "'Gelişim hedefini ver' butonuyla plan oluşturabilirsiniz."
      });
    }

    setLoading({ ...loading, kaydet: true });
    try {
      const yetkinlikler = [
        ...Object.entries(etkinlikSeviyeleri).map(([baslik, seviye]) => ({
          alan: "Etkinlik",
          baslik,
          seviye
        })),
        ...Object.entries(verimlilikSeviyeleri).map(([baslik, seviye]) => ({
          alan: "Verimlilik",
          baslik,
          seviye
        }))
      ];

      await axios.post(`${API}/oturum`, {
        mumessil_id: mumessilId,
        tarih: new Date().toISOString().split('T')[0],
        doktor_sayisi: doktorSayisi,
        eczane_sayisi: eczaneSayisi,
        kocluk_tipi: koclukTipi,
        yapilan_uygulamalar: yapilanUygulamalar,
        status: status,
        ortak_yorum_1: ortakYorum1,
        ortak_yorum_2: ortakYorum2,
        yetkinlikler,
        gorseller: [],
        aksiyonlar
      });

      onSuccess();
    } catch (error) {
      toast.error("Kayıt sırasında hata oluştu");
    }
    setLoading({ ...loading, kaydet: false });
  };

  const ortakYorumAktif = getGelismeliBasliklar().length > 0;
  const gelisimHedefinverAktif = ortakYorum1 && getGelismeliBasliklar().length > 0;

  return (
    <div className="space-y-6">
      {/* Üst Bilgiler */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="doktorSayisi" className="text-base font-semibold text-gray-700 mb-2 flex items-center">
                Doktor Sayısı <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="doktorSayisi"
                type="number"
                min="0"
                value={doktorSayisi}
                onChange={(e) => setDoktorSayisi(parseInt(e.target.value) || 0)}
                className="h-12 text-base"
                data-testid="doktor-sayisi-input"
              />
            </div>
            <div>
              <Label htmlFor="eczaneSayisi" className="text-base font-semibold text-gray-700 mb-2 flex items-center">
                Eczane Sayısı <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="eczaneSayisi"
                type="number"
                min="0"
                value={eczaneSayisi}
                onChange={(e) => setEczaneSayisi(parseInt(e.target.value) || 0)}
                className="h-12 text-base"
                data-testid="eczane-sayisi-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Koçluk Tipi & Yapılan Uygulama */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6 space-y-6">
          {/* Koçluk Tipi */}
          <div>
            <Label className="text-base font-semibold text-gray-700 mb-3 flex items-center">
              Koçluk Tipi <span className="text-red-500 ml-1">*</span>
            </Label>
            <RadioGroup value={koclukTipi} onValueChange={setKoclukTipi} className="flex space-x-4">
              <div className="flex items-center space-x-2 border rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="Saha Koçluğu" id="saha" />
                <Label htmlFor="saha" className="cursor-pointer">Saha Koçluğu</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="Ofis Koçluğu" id="ofis" />
                <Label htmlFor="ofis" className="cursor-pointer">Ofis Koçluğu</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Yapılan Uygulama */}
          <div>
            <Label className="text-base font-semibold text-gray-700 mb-3">
              Yapılan Uygulama
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {YAPILAN_UYGULAMALAR.map((uygulama) => (
                <div
                  key={uygulama}
                  className={`flex items-center space-x-2 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                    yapilanUygulamalar.includes(uygulama) 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleUygulama(uygulama)}
                >
                  <input
                    type="checkbox"
                    checked={yapilanUygulamalar.includes(uygulama)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <Label className="cursor-pointer flex-1">{uygulama}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETKİNLİK KONULARI */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">▶</span>ETKİNLİK KONULARI
          </h2>
          <div className="space-y-4">
            {ETKINLIK_BASLIKLAR.map((baslik, idx) => (
              <YetkinlikRow
                key={baslik}
                baslik={baslik}
                seviye={etkinlikSeviyeleri[baslik]}
                onChange={(sev) => setEtkinlikSeviyeleri({ ...etkinlikSeviyeleri, [baslik]: sev })}
                kategori="Etkinlik"
                katalog={gorselKatalog.filter(g => g.kategori === "Etkinlik")}
                testId={`etkinlik-${idx}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VERİMLİLİK KONULARI */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">▶</span>VERİMLİLİK KONULARI
          </h2>
          <div className="space-y-4">
            {VERIMLILIK_BASLIKLAR.map((baslik, idx) => (
              <YetkinlikRow
                key={baslik}
                baslik={baslik}
                seviye={verimlilikSeviyeleri[baslik]}
                onChange={(sev) => setVerimlilikSeviyeleri({ ...verimlilikSeviyeleri, [baslik]: sev })}
                kategori="Verimlilik"
                katalog={gorselKatalog.filter(g => g.kategori === "Verimlilik")}
                testId={`verimlilik-${idx}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* YORUMLAR */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">▶</span>YORUMLAR
          </h2>
          <div className="space-y-6">
            <div>
              <Label htmlFor="ortakYorum1" className="text-base font-semibold text-gray-700 mb-2 flex items-center">
                Ortak Yorumlar <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="ortakYorum1"
                rows={6}
                value={ortakYorum1}
                onChange={(e) => setOrtakYorum1(e.target.value)}
                className="text-base resize-none"
                placeholder="Ortak yorumlar bu alana otomatik doldurulacak..."
                data-testid="ortak-yorum-1"
              />
            </div>
            <div>
              <Label htmlFor="ortakYorum2" className="text-base font-semibold text-gray-700 mb-2">
                Ortak Yorumlar 2
              </Label>
              <Textarea
                id="ortakYorum2"
                rows={6}
                value={ortakYorum2}
                onChange={(e) => setOrtakYorum2(e.target.value)}
                className="text-base resize-none"
                placeholder="İsteğe bağlı ek yorumlar..."
                data-testid="ortak-yorum-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AKSİYON PLANI */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">▶</span>AKSİYON PLANI
          </h2>
          {aksiyonlar.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Gelişim hedeflerini oluşturmak için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aksiyonlar.map((aksiyon, index) => (
                <AksiyonCard
                  key={index}
                  aksiyon={aksiyon}
                  onChange={(updated) => {
                    const newAksiyonlar = [...aksiyonlar];
                    newAksiyonlar[index] = { ...updated, edited: true };
                    setAksiyonlar(newAksiyonlar);
                  }}
                  onDelete={() => {
                    setAksiyonlar(aksiyonlar.filter((_, i) => i !== index));
                    toast.success("Aksiyon silindi");
                  }}
                  testId={`aksiyon-card-${index}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alt Aksiyon Çubuğu (Yapışkan) */}
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 shadow-2xl py-4 px-6 rounded-t-xl z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleOrtakYorumUret}
              disabled={!ortakYorumAktif || loading.yorum}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="ortak-yorum-btn"
            >
              {loading.yorum && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ortak yorumu üret
            </Button>
            <Button
              onClick={handleGelisimHedefiniver}
              disabled={!gelisimHedefinverAktif || loading.plan}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="gelisim-hedefi-btn"
            >
              {loading.plan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gelişim hedefini ver
            </Button>
          </div>
          <Button
            onClick={handleKaydet}
            disabled={loading.kaydet}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold"
            data-testid="kaydet-btn"
          >
            {loading.kaydet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

// YetkinlikRow Component
function YetkinlikRow({ baslik, seviye, onChange, kategori, katalog, testId }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <span className="text-sm md:text-base font-medium text-gray-800 flex-1">{baslik}</span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" data-testid={`${testId}-info-btn`}>
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Görsel Kataloğu - {baslik}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {katalog.filter(g => g.baslik === baslik).map(gorsel => (
                <div key={gorsel.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{gorsel.kod}</Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{gorsel.baslik}</p>
                  {gorsel.url ? (
                    <img src={gorsel.url} alt={gorsel.baslik} className="mt-3 w-full h-40 object-cover rounded" />
                  ) : (
                    <div className="mt-3 w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
              {katalog.filter(g => g.baslik === baslik).length === 0 && (
                <p className="text-gray-500 text-center py-8">Bu başlık için görsel bulunmamaktadır.</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <RadioGroup value={seviye} onValueChange={onChange} className="flex space-x-2" data-testid={`${testId}-radio`}>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="Gelişmeli" id={`${testId}-gelismeli`} className="text-amber-600" />
          <Label htmlFor={`${testId}-gelismeli`} className="text-xs md:text-sm cursor-pointer">GELİŞMELİ</Label>
        </div>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="Başarılı" id={`${testId}-basarili`} className="text-blue-600" />
          <Label htmlFor={`${testId}-basarili`} className="text-xs md:text-sm cursor-pointer">BAŞARILI</Label>
        </div>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="Üstün Başarılı" id={`${testId}-ustun`} className="text-green-600" />
          <Label htmlFor={`${testId}-ustun`} className="text-xs md:text-sm cursor-pointer">ÜSTÜN BAŞARILI</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
