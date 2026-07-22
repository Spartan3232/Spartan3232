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
- [ ] Mobil (≈390px), 1366×768 ve 1920×1080 çözünürlüklerinde yerleşim
      bozulmuyor.
- [ ] Eski çalışan fonksiyonlar yeni geliştirmeden sonra bozulmuyor
      (regresyon) — özellikle 3 katmanlı override zinciri
      (ana katman → `growV5Script` → `piV6Script`) etkilenen her fonksiyon
      için son (en sondaki) katmanın gerçekten çalıştığı doğrulanmalı; bir
      önceki katmanı düzeltip son katmanı unutmak Faz 0'daki asıl hataydı.
- [ ] GROW puanı hiçbir yerde ham "performans skoru" gibi tek başına
      sıralanabilir/karşılaştırılabilir şekilde sunulmuyor; ticari bağlam
      metinle birlikte veriliyor.

## Bu turda (Faz 0 + Faz 1 başlangıcı) doğrulananlar

Playwright ile (bkz. oturum notları): 13 sayfanın tamamı sıfır konsol hatasıyla
açıldı; temsilci/brick drill-in çalıştı; `exportGrowCSV()` hatasız çalıştı;
`growSave` skor formülünün farklı koçluk ortalamalarında farklı (sabit
olmayan) değer ürettiği doğrulandı; `dist/` çıktısının `legacy/` referansıyla
davranışsal olarak eşdeğer olduğu (aynı onclick seti, aynı düzeltmelerin her
ikisinde de mevcut olduğu) statik olarak doğrulandı.
