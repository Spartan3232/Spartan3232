# Kabul Testleri

Bu liste geçmeden yeni bir özellik "tamamlandı" sayılmaz (CLAUDE.md). `npm test`
bunların bir kısmını otomatik kontrol eder (statik); "manuel" işaretliler için
`dist/PharmaInsight_Command_Center.html`'i gerçek bir Chrome'da (veya
Playwright ile) açıp elle/otomatik doğrulama gerekir.

## Otomatik (`npm test` — tests/smoke.test.js)

- [ ] Build hatasız üretiliyor (`node tools/build.js`).
- [ ] Gömülü veri geçerli JSON ve beklenen anahtarları içeriyor.
- [ ] Görünen her `onclick="fn(...)"` çağrısının karşılığında tanımlı bir
      fonksiyon var (ölü buton yok).
- [ ] Bilinen regresyonlar geri gelmemiş (`score:60`/`score:75` sabiti,
      versiyon etiketi tutarsızlığı, adsız `220` sabiti).
- [ ] Dosya içine gömülü bir API anahtarı / secret yok.

## Manuel / Playwright (her önemli değişiklikten sonra)

- [ ] Her görünür butona basıldığında ölçülebilir bir sonuç oluşuyor (toast,
      indirilen dosya, güncellenen tablo/KPI — sessizce hiçbir şey olmuyor
      DEĞİL).
- [ ] Bölge → temsilci → brick → doktor/eczane geçişleri çalışıyor
      (`go`, `openRep`, `openBrick`).
- [ ] Geri dönüşte (`back`/sekme değişimi) seçili filtre ve dönem kaybolmuyor.
- [ ] Saha ayı (`STATE.period`) veya IMS dönemi (`STATE.imsPeriod`)
      değiştiğinde bağlı KPI'lar (`repMetric`, `brickMetric`, `regionMetric`)
      güncelleniyor.
- [ ] CSV/HTML/PDF (yazdır) düğmeleri gerçekten dosya üretiyor/indiriyor,
      boş/placeholder dosya değil.
- [ ] Hatalı veya eksik kolonlu Excel yüklendiğinde açıklayıcı bir uyarı
      (`toast`) çıkıyor, sessiz hata veya konsol çökmesi olmuyor.
- [ ] Tarayıcı konsolunda `pageerror`/`console.error` yok — tüm sayfalar
      (`main, decisions, forecast, reps, bricks, customers, products, plan,
      archive, quality, grow, reports, upload`) gezilerek doğrulanır.
- [x] Mobil (≈390px), 1366×768 ve 1920×1080 çözünürlüklerinde yerleşim
      bozulmuyor (Faz 6'da doğrulandı — bkz. altta).
- [ ] Eski çalışan fonksiyonlar yeni geliştirmeden sonra bozulmuyor
      (regresyon) — özellikle 3 katmanlı override zinciri
      (ana katman → `growV5Script` → `piV6Script`) etkilenen her fonksiyon
      için son (en sondaki) katmanın gerçekten çalıştığı doğrulanmalı; bir
      önceki katmanı düzeltip son katmanı unutmak Faz 0'daki asıl hataydı.
- [ ] GROW puanı hiçbir yerde ham "performans skoru" gibi tek başına
      sıralanabilir/karşılaştırılabilir şekilde sunulmuyor; ticari bağlam
      metinle birlikte veriliyor.

## Bu turda (Faz 0, Faz 1, Faz 6 — mobil düzen) doğrulananlar

Playwright ile (bkz. oturum notları): 13 sayfanın tamamı sıfır konsol hatasıyla
açıldı; temsilci/brick drill-in çalıştı; `exportGrowCSV()` hatasız çalıştı;
`growSave` skor formülünün farklı koçluk ortalamalarında farklı (sabit
olmayan) değer ürettiği doğrulandı; `dist/` çıktısının `legacy/` referansıyla
davranışsal olarak eşdeğer olduğu (aynı onclick seti, aynı düzeltmelerin her
ikisinde de mevcut olduğu) statik olarak doğrulandı.

**Faz 6 — mobil/masaüstü yerleşim bug'ı bulundu ve düzeltildi:** 390px, 1366×768
ve 1920×1080'de otomatik yatay-taşma (`scrollWidth > clientWidth`) taraması
yapıldı; "Veri Kalitesi" sayfası hem mobilde hem 1366px'te, "Trend & Forecast"
sayfası ise mobilde sayfa genişliğinin ~2 katı yatay taşma gösteriyordu. Kök
neden: CSS grid/flex'te bilinen bir sorun ("blowout") — grid öğeleri
varsayılan olarak içeriklerinin (burada `.data-table{min-width:780px}` olan
tablolar) min-content genişliğinin altına küçülemiyor, bu yüzden `.table-wrap`
kendi içinde yatay kaydırma sağlasa bile üst kapsayıcı (grid track'i, sonra
sayfa) dışa taşıyordu. Düzeltme: `.card{min-width:0}` (genel, çoğu grid öğesi
`.card`'dır) + `.forecast-layout>div,.forecast-layout>aside{min-width:0}`
(bu düzendeki doğrudan grid öğeleri `.card` değil sarmalayıcı `div`/`aside`
olduğu için ayrıca gerekti). Düzeltme sonrası 3 çözünürlükte × 13 sayfada
sıfır yatay taşma; ekran görüntüleriyle görsel olarak da doğrulandı.
