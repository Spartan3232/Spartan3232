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

## Modülerleştirme durumu (Faz 1 — tamamlandı)

`src/` tamamen ayrıştırılmıştır; tek parça `app/legacy-app.js` artık yoktur.
Not: Aşağıdaki `pages/*` listesi, ilk taslakta öngörülen 6 sayfalık iskeletten
(dashboard/representative360/brick360/customer360/grow/reports) farklıdır —
gerçek uygulamanın 13 sayfası ortaya çıkınca dosya adları buna göre uyarlandı;
plana kör uymak yerine koda uyan bir yapı tercih edildi.

- `state.js` — ICONS/navItems, `DATA`/`STATE`/`STD`/`FREQ`/`MAX_SELECTION_TARGET`,
  temel yardımcılar (`norm`, `esc`, `escAttr`, `fmtTL`, `fmtPct`, ...),
  `reindex()`, `mergeUnique()`.
- `data/shared.js`, `data/ims-parser.js`, `data/seleksiyon-parser.js`,
  `data/ziyaret-parser.js`, `data/havuz-parser.js`, `data/siparis-parser.js`,
  `data/index.js` — Excel içe aktarma.
- `analytics/representative-analysis.js`, `brick-analysis.js`,
  `region-analysis.js` (Aksiyon Merkezi + veri kalitesi), `customer-analysis.js`,
  `forecast.js` (run-rate + senaryo), `coaching.js` (GROW veri modeli — bkz. not).
- `pages/dashboard.js`, `decisions.js`, `representative360.js`, `brick360.js`,
  `customer360.js`, `products.js`, `plan.js`, `forecast.js`, `archive.js`,
  `quality.js`, `upload.js`, `reports.js` — sayfa render fonksiyonları.
  `pages/grow.js` ayrıdır (bkz. aşağıdaki not).
- `app.js` — nav/routing (`go`, `renderNav`, `renderPage`), modal, genel arama,
  açılış bootstrap'ı.
- `exports/csv.js`, `print.js`, `html-report.js` — tüm dışa aktarma fonksiyonları.

**Not — üç katmanlı "ezme" (override) mimarisi korunmuştur:** orijinal v6
dosyasında `renderGrow`/`growSave`/`openRep` gibi bazı fonksiyonlar önce ana
katmanda tanımlanıp sonra GROW v5 ve piV6 katmanlarında yeniden atanıyordu.
Bu yüzden `analytics/coaching.js` içindeki `renderGrow`/`growSave`/`growLoad`
TABAN (gölgelenmiş/ölü) sürümdür — çalışma zamanında kazanan asıl sürüm
`pages/grow.js` (`growV5Script`) içindedir; `openRep`/`openBrick`/`closeModal`
gibi birkaç fonksiyon da benzer şekilde `app/pi-v6-workspace-layer.js`
(`piV6Script`) tarafından ezilir. Üç katman `tools/build.js`'de aynı sırayla
(state → data → analytics → pages → app → exports → pages/grow.js →
app/pi-v6-workspace-layer.js) birleştirilir; JS fonksiyon bildirimleri aynı
`<script>` bloğu içinde hoisted olduğundan hangi dosyada durdukları davranışı
etkilemez — yalnızca script TAG'leri arasındaki sıra (main → growV5Script →
piV6Script) önemlidir ve bu sıra korunmuştur. Playwright ile doğrulandı: tüm
sayfalar ayrıştırma sonrası da sıfır konsol hatasıyla, önceki davranışla
birebir aynı şekilde çalışıyor.

Kalan bilinen borç: `analytics/coaching.js` içindeki gölgelenmiş taban GROW
fonksiyonları (dead code) hâlâ dosyada duruyor — silinmeleri davranışı
değiştirmez ama netlik için ileride temizlenebilir.
