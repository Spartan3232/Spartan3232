# Spartan3232 — Claude Code Kuralları

## Ürün amacı
Bu depo, ilaç sektöründe saha temsilcilerine yönelik bir React (CRA/craco + Tailwind + shadcn) frontend'i ve FastAPI + MongoDB backend'inden oluşan bir satış koçluğu uygulamasıdır. Uygulama iki ayrı bileşen içerir:

1. **ROTA Koçluk Chat**: Serbest metin tabanlı, GPT ile çalışan genel koçluk sohbeti ve öz değerlendirme akışları (mevcut, önceden var olan modül).
2. **GROW 360 Koçluk Motoru** (`frontend/src/components/coaching/`, `backend/coaching_engine.py`): Yöneticinin sahada gözlemlediği davranışlara dayanan, kanıt zorunlu yetkinlik değerlendirmesi ve yapılandırılmış gelişim hedefi üretimi. Bu modülün bağlayıcı iş ve ürün mantığı `docs/COACHING_ENGINE_SPEC.md` dosyasıdır.

> Not: Bu depo `dist/PharmaInsight_Command_Center.html` tek dosya mimarisini **kullanmaz**. Bu, çok sayfalı bir React uygulamasıdır ve `frontend/build` üzerinden dağıtılır. IMS, ziyaret, seleksiyon, sipariş ve havuz veri kaynakları bu depoda entegre değildir; GROW 360 modülündeki ticari/saha bağlam kartları bu nedenle bilinçli olarak `Veri yok` göstermektedir.

## Değiştirilemez kurallar
1. Görünür hiçbir düğme, menü veya adım işlevsiz bırakılamaz.
2. Henüz bağlanmamış bir veri kaynağına dayanan metrik asla uydurulamaz; `Veri yok` / `Bağlı değil` gösterilmeli ve nedeni açıklanmalıdır.
3. Demo veri ile gerçek veri aynı görünümde karıştırılamaz.
4. API anahtarı, parola veya gizli anahtar frontend koduna gömülemez; yalnızca backend `.env` üzerinden okunur.
5. Türkçe karakter, tarih ve yüzde formatları korunmalıdır.
6. Her değişiklikten sonra tarayıcı konsolunda hata olmadığı doğrulanmalıdır.
7. Büyük refactor tek committe yapılmamalı; küçük ve geri alınabilir commitler kullanılmalıdır.

## GROW 360 ve iş hukuku güvenliği
1. GROW/koçluk kaydı çalışan performans, disiplin veya iş akdi kararı değildir; koçluk amaçlı yetkinlik profilidir.
2. 3 puan `Beklenen Düzeyde`dir. Gelişim alanı yalnızca 1–2 puanlardır.
3. 1–2 ve 4–5 puan için somut davranış kanıtı (bağlı görüşme + not) zorunludur; kanıtsız kaydedilemez.
4. Boş/değerlendirilmeyen kriterler otomatik olarak 3 ile doldurulamaz.
5. Kişilik, niyet, sağlık, ailevi durum, gebelik, siyasi görüş, sendika, din veya özel hayata ilişkin çıkarım yapılamaz — bu ifadeler dil koruması tarafından engellenir/uyarılır.
6. Fesih, ceza, ihtar veya disiplin sonucu otomatik üretilemez; bu terimler tamamlama aşamasında sert biçimde engellenir.
7. Koçluk çıktısı gözlenen davranış → etkisi → gelişim hedefi → çalışanın seçtiği aksiyon → yönetici desteği → takip tarihi yapısında olmalıdır.
8. Satış ve realizasyon yalnızca bağlam olabilir; yetkinlik puanını otomatik belirleyemez.
9. Erişim görev bazlıdır; temsilci yalnızca kendi koçluk kaydını görebilir.

## Tamamlanma tanımı (GROW 360 modülü için)
- İlgili kabul testleri (`tests/COACHING_ACCEPTANCE_TESTS.md`) — bu depoda uygulanabilir olanlar — geçti.
- Tarayıcı konsolunda yeni hata yok.
- Veri yok/hata senaryosu ele alındı.
- Yapılan değişiklikler ve test sonucu raporlandı.
