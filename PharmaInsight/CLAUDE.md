# PharmaInsight geliştirme kuralları

- Nihai teslimat tek, taşınabilir HTML dosyasıdır.
- Kullanıcı kurulum yapmadan Chrome'da açabilmelidir.
- Görünür hiçbir buton işlevsiz bırakılamaz.
- Her buton için çalışır fonksiyon ve hata durumu bulunmalıdır.
- Demo veri gerçek veriyle karıştırılamaz.
- Hesaplanan her KPI'nın veri kaynağı belirli olmalıdır.
- Veri bulunmadığında sayı üretme; "Veri yok" göster.
- API anahtarı HTML içine yazılamaz.
- Türkçe karakterler ve Türkçe sayı/tarih formatı korunmalıdır.
- GROW puanı çalışan performans veya disiplin puanı değildir.
- GROW'da 3 puan beklenen düzeydir; gelişim alanı yalnızca 1–2'dir.
- Koçluk çıktısı kişilik, niyet, sağlık veya özel hayat değerlendirmesi içeremez.
- Tasarım masaüstü, tablet ve mobilde test edilmelidir.
- Değişiklikten önce mevcut fonksiyonların regresyon testleri çalıştırılmalıdır.
- Yeni özellik tamamlanmadan önce konsol hatası sıfır olmalıdır.

## Proje yapısı ve iş akışı

Kaynak `src/` altında modülerdir; her `<script>`/`<style>` bloğu ayrı bir dosyaya
karşılık gelir ve **klasik (non-module) global scope** paylaşır — aralarında
import/export yoktur, sıralama `tools/build.js`'de tanımlıdır. Bu bilinçli bir
tercihtir: nihai teslimat bir bundler gerektirmemeli, yalnızca
`node tools/build.js` ile `dist/PharmaInsight_Command_Center.html` üretilmelidir.

```
npm run build   # src/ + fixtures/real-data.json → dist/PharmaInsight_Command_Center.html
npm test        # build'i çalıştırır + statik regresyon kontrolleri (ölü buton, gömülü anahtar, bilinen bug'lar)
```

Yeni bir `src/` dosyası eklediğinde `tools/build.js`'deki birleştirme sırasına
da eklemeyi unutma — build script dosyaları otomatik keşfetmez, sırayı sen
kontrol edersin. Ana script bloğu sırası: `state.js` → `data/*` → `analytics/*`
→ `pages/*` → `app.js` → `exports/*`; bunlar tek bir `<script>` içinde
birleştiği için (aynı global scope, fonksiyon hoisting) aralarındaki sıra
davranışı etkilemez. Asıl önemli olan ayrı `<script>` etiketleri arasındaki
sıra: ana blok → `pages/grow.js` (`growV5Script`) → `app/pi-v6-workspace-layer.js`
(`piV6Script`) — bu üçü aynı isimli bazı fonksiyonları (`renderGrow`,
`growSave`, `openRep` gibi) art arda ezer, son yüklenen kazanır. Bu sırayı
bozma.

`fixtures/real-data.json` **gerçek** iş verisidir (gerçek temsilci/doktor adları,
gerçek satış rakamları) — bilinçli olarak bu depoya işlenmiştir (bkz. proje geçmişi).
Yeni test/demo verisi eklerken bunu asla bu dosyayla karıştırma; ayrı, açıkça
"demo"/"sample" adlı bir fixture kullan ve UI'da gerçek veriden görsel olarak
ayırt edilebilir olmasını sağla.

Mevcut durum ve hangi dosyaların henüz tam ayrıştırılmadığı için
`docs/PRODUCT_SPEC.md` içindeki "Modülerleştirme durumu" bölümüne bak.
