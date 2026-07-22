# GROW 360 Koçluk Motoru — Kabul Testleri

## A. Veri ve metrik doğruluğu

- [ ] Satış ve hedef mevcutsa realizasyon doğru hesaplanır.
- [ ] Hedef sıfır veya boşsa realizasyon hesaplanmaz.
- [ ] Pazar toplamı yoksa pazar payı gösterilmez.
- [ ] Pazar payı gelişimi yüzde puan olarak doğru gösterilir.
- [ ] Göreli pay değişimi yüzde puanla karıştırılmaz.
- [ ] Önceki dönem sıfırsa gelişim yüzdesi hesaplanmaz.
- [ ] Frekans fazlası başka müşterinin frekans açığını kapatmaz.
- [ ] Doktor ve eczane kaverajı ayrı hesaplanır.
- [ ] Ziyaret sürekliliği toplam ziyaret sayısından bağımsız zaman aralıklarıyla hesaplanır.
- [ ] Her metrik veri dönemi ve kaynak bilgisini gösterir.

## B. Görüşme bağlamı

- [ ] Ziyaret tarihinden görüşme otomatik getirilebilir.
- [ ] Doktor adı seçildiğinde branş, ünite ve brick otomatik gelir.
- [ ] Eczane adı seçildiğinde eczane bricki ve sipariş bağlamı gelir.
- [ ] Aynı isimli müşteriler ünite/brick ile ayrıştırılır.
- [ ] Görüşme hedefi, ürün, sonuç ve takip tarihi kaydedilir.
- [ ] SPIN S/P/I/N alanlarının her biri soru ve elde edilen bilgiyle kaydedilir.
- [ ] Açık, kapalı ve probe soru adetleri görüşme bazında korunur.

## C. Yetkinlik puanlama

- [ ] Kriterler varsayılan olarak boş/değerlendirilmedi gelir.
- [ ] Sistem boş kriterleri otomatik 3 yapmaz.
- [ ] 3 puan `Beklenen düzey` olarak görünür.
- [ ] 3 puan gelişim alanı listesine otomatik girmez.
- [ ] 1, 2, 4 ve 5 puan somut kanıt olmadan kaydedilemez.
- [ ] Satış, hedef veya realizasyon puanı otomatik değiştirmez.
- [ ] Puan yalnızca seçilen görüşme ve yönetici kanıtına bağlanabilir.
- [ ] Değerlendirilmeyen kriter genel ortalamaya dahil edilmez.

## D. Gelişim hedefleri

- [ ] Hedefte mevcut durum zorunludur.
- [ ] Hedef davranış zorunludur.
- [ ] Uygulama yöntemi zorunludur.
- [ ] Ölçüm yöntemi ve veri kaynağı zorunludur.
- [ ] Takip tarihi zorunludur.
- [ ] Çalışan taahhüdü zorunludur.
- [ ] Yönetici desteği zorunludur.
- [ ] Hedef şablonu seçildiğinde tüm alanlar düzenlenebilir.
- [ ] Ölçülemeyen `daha iyi olacak` benzeri hedefler için uyarı verilir.
- [ ] Tamamlanan hedefte takip kanıtı kaydedilir.

## E. Dil ve süreç güvenliği

- [ ] Kişilik yargısı içeren ifadeler uyarılır.
- [ ] Sağlık, aile veya diğer özel alanlara ilişkin kayıt uyarılır.
- [ ] Disiplin/fesih/ceza dili uyarılır.
- [ ] Sistem otomatik disiplin veya fesih önerisi üretmez.
- [ ] Çalışanın görüşü yönetici yorumundan ayrı tutulur.
- [ ] Temsilci özel raporunda başka temsilcilerin verisi bulunmaz.
- [ ] Dışa aktarılan raporda gereksiz kişisel veri bulunmaz.

## F. Kullanıcı deneyimi

- [ ] Koçluk adımları arasında sayfanın sonuna kaydırmadan geçilir.
- [ ] Başlık, özet ve kaydet düğmeleri görünür kalır.
- [ ] Görüşme tablosu kendi panelinde kayar.
- [ ] 1366×768 çözünürlükte ana işlemler görünürdür.
- [ ] 1920×1080 çözünürlükte gereksiz boşluk oluşmaz.
- [ ] Tablet ve mobilde tek kolon ve yatay adım navigasyonu çalışır.
- [ ] Görünür hiçbir düğme işlevsiz değildir.
- [ ] Her işlem başarı veya açıklayıcı hata mesajı verir.

## G. Kayıt ve çıktı

- [ ] Taslak kaydı tarayıcı yeniden açıldığında korunur.
- [ ] Eski GROW kayıtları migration ile açılır.
- [ ] Migration kaybı kullanıcıya açıklanır.
- [ ] JSON dışa/içe aktarma çalışır.
- [ ] CSV çıktısı görüşme, doktor, ünite, brick ve hedef alanlarını içerir.
- [ ] Yazdır/PDF görünümü okunaklıdır.
- [ ] SFA yorumu yalnızca somut kayıtları kullanır.
- [ ] Tarayıcı konsolunda hata yoktur.

