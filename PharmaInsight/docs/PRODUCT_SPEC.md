# PharmaInsight Command Center — Ürün Özeti

Türkiye ilaç sektöründe bir bölge müdürü (G3 Akdeniz, 7 temsilci + 1 boş kadro)
için saha performans, koçluk ve raporlama uygulaması. Tek bir taşınabilir HTML
dosyası olarak dağıtılır; kurulum gerektirmez, veriler tarayıcıda kalır.

## Sayfalar (nav)

| id | Ad | İşlev |
|---|---|---|
| `main` | Yönetici Özeti | Bölge KPI'ları, öne çıkan bulgular |
| `decisions` | Aksiyon Merkezi | Gerçek veriden türetilen öncelikli aksiyon listesi (brick/temsilci/GROW takip) |
| `forecast` | Trend & Forecast | Dönemsel eğilim |
| `reps` | Temsilci 360° | Temsilci bazlı hedef/satış/plan/frekans/kaveraj |
| `bricks` | Brick 360° | Brick bazlı realizasyon, doktor/eczane, sipariş |
| `customers` | Doktor / Eczane 360° | Hekim/eczacı havuzu ve seleksiyon |
| `products` | Ürün & Rakip | Pazar payı, rakip analizi |
| `plan` | Plan & Frekans | Ziyaret planı uyumu |
| `archive` | Dönem Arşivi | Geçmiş dönem verisi |
| `quality` | Veri Kalitesi | Veri tutarlılık kontrolleri |
| `grow` | GROW Koçluk | Bkz. aşağıdaki GROW bölümü |
| `reports` | Rapor Merkezi | CSV/HTML/PDF çıktılar |
| `upload` | Veri Yükle | Excel içe aktarma (IMS Real/Kümüle/YTD, Seleksiyon, Ziyaret, Havuz, Sipariş) |

## GROW Koçluk — kritik kurallar

GROW modülü **gelişim koçluğudur, performans/disiplin puanlaması değildir** —
bu ayrım hem CLAUDE.md'de hem de uygulamanın kendi arayüzünde
(`grow-v5-banner`) açıkça belirtilir:

> "Koçluk çıktısı satış/realizasyon üzerinden hüküm kurmaz; yalnızca doğrudan
> gözlenen yetkinlik, müşteri görüşmesi bağlamı ve operasyonel verimlilik
> verisini kullanır. Kişilik, niyet, sağlık, aile veya disiplin/fesih yorumu
> üretmez."

13 kriterlik 1-5 ölçekli davranış değerlendirmesi: **3 = beklenen düzey**
(nötr/olumlu yorumlanır), **1-2 = gelişim alanı**, **4-5 = güçlü yön**. Ticari
metrikler (realizasyon, plan uyumu vb.) yalnızca *bağlam* sağlar, davranış
puanını otomatik belirlemez (`growV5FormHtml`/`growV5Efficiency`).

Tamamlanan bir koçluk seansı, Aksiyon Merkezi'nde bir **takip aksiyonu**
oluşturur (`growSave` → `DATA.manualActions`, tip: "GROW Yetkinlik Takibi").
Bu skor gerçek koçluk ortalamasından ve satış açığından türetilir — sabit bir
sayı OLMAMALIDIR (bkz. Faz 0 denetim raporu: bu tam olarak düzeltilen bug'dı).

## Veri kaynağı ilkesi

Her KPI'nın kaynağı izlenebilir olmalı: `DATA.real`/`DATA.realPeriods` (IMS
hedef/satış), `DATA.sel` (seleksiyon), `DATA.ziyaret` (ziyaret disiplini),
`DATA.havuz` (doktor/eczacı evreni), `DATA.siparis` (sipariş). Veri yoksa
fonksiyonlar `null`/`'—'` döner (`fmtPct`, `fmtTL`) — sayı uydurulmaz. Yeni bir
KPI eklerken bu deseni koru: kaynağı belirsizse veya veri eksikse "Veri yok"
göster, asla varsayılan/rastgele bir sayı üretme.

## Modülerleştirme durumu (Faz 1)

`src/` altında ayrıştırılmış olanlar:
- `state.js` — ICONS/navItems, `DATA`/`STATE`/`STD`/`FREQ`/`MAX_SELECTION_TARGET`,
  temel yardımcılar (`norm`, `esc`, `fmtTL`, `fmtPct`, ...), `reindex()`.
- `data/shared.js`, `data/ims-parser.js`, `data/seleksiyon-parser.js`,
  `data/ziyaret-parser.js`, `data/havuz-parser.js`, `data/siparis-parser.js`,
  `data/index.js` — Excel içe aktarma tamamen ayrıştırıldı.
- `pages/grow.js` — GROW v5 yetkinlik katmanı (`growV5Script`, orijinal dosyada
  ana render fonksiyonlarını ezen ikinci katman).
- `app/pi-v6-workspace-layer.js` — v6 viewport-first UI katmanı (`piV6Script`,
  birden çok sayfanın render fonksiyonunu ezen üçüncü/son katman).
- `app/legacy-app.js` — **henüz tam ayrıştırılmamış** kalan blok: analytics
  (region/representative/brick/customer metrikleri, `decisionData`),
  pages (dashboard/rep360/brick360/customer360/reports render fonksiyonları),
  exports (CSV/print/downloadUpdatedHtml) ve nav/app iskeleti hâlâ bu tek
  dosyada bir arada. Sonraki artımlı adım: bu dosyayı
  `analytics/*.js` + `pages/*.js` (dashboard, representative360, brick360,
  customer360, reports) + `exports/*.js` (csv, print, html-report) +
  `app.js` (nav/bootstrap) olarak bölmek — fonksiyon fonksiyon, her adımdan
  sonra `npm test` yeşil kalacak şekilde.

Üç katmanlı "ezme" (override) mimarisi korunmuştur: orijinal dosyada
`renderGrow`/`growSave`/`openRep` gibi fonksiyonlar önce ana katmanda
tanımlanıp sonra GROW v5 ve piV6 katmanlarında yeniden atanıyordu — bu üç
katman `src/`'de de aynı sırayla (state → data → app/legacy-app →
pages/grow → app/pi-v6-workspace-layer) birleştirilir, davranış birebir
korunur (bkz. Faz 0 denetim raporu, Orta öncelik #2).
