# PharmaInsight GROW 360 — Koçluk Motoru Ürün ve İş Mantığı Spesifikasyonu

## 1. Amaç

Bu modül, tıbbi tanıtım temsilcisinin saha yetkinliklerini ve çalışma verimliliğini geliştirmek için kullanılacak veri destekli koçluk sistemidir.

Sistem üç ayrı kavramı kesin olarak ayırmalıdır:

1. **Ticari sonuçlar:** satış, hedef, realizasyon, pazar payı ve pazar payı gelişimi.
2. **Saha verimliliği:** plan, kaveraj, frekans, ziyaret sürekliliği, müşteri karması ve kaynak kullanımı.
3. **Gözlenen yetkinlikler:** hazırlık, açılış, soru sorma, ihtiyaç analizi, SPIN, mesaj sunumu, itiraz karşılama, kapanış ve takip.

Ticari sonuçlar ve saha verimliliği koçluğa bağlam sağlar. Bunlar yetkinlik puanını otomatik belirlemez. Yetkinlik değerlendirmesi yalnızca yöneticinin doğrudan gözlediği ve kayıt altına aldığı davranış kanıtlarına dayanır.

## 2. Temel ilkeler

- Koçluk kaydı gelişim amaçlıdır; disiplin, ihtar veya fesih kararı üretmez.
- Satış düşüklüğü tek başına düşük yetkinlik puanı oluşturamaz.
- Yüksek satış tek başına yüksek yetkinlik puanı oluşturamaz.
- Her değerlendirme rol ile ilgili, somut, tarihli ve gözlenebilir davranışa dayanmalıdır.
- Veri yoksa sistem hesap üretmemeli ve `Veri yok` göstermelidir.
- Hipotezler kesin bulgu gibi yazılmamalıdır.
- Çalışanın görüşü, seçtiği gelişim hedefi ve taahhüdü ayrı alanlarda tutulmalıdır.
- 3 puan `Beklenen düzey`dir ve gelişim alanı olarak etiketlenmez.
- Gelişim alanları öncelikle 1–2 puanlı kriterlerden seçilir.
- 4–5 puanlı kriterler güçlü yön ve paylaşılabilir iyi uygulama olarak gösterilir.
- Kişilik, niyet, sağlık, aile hayatı, siyasi görüş, sendika, inanç veya özel hayat hakkında kayıt tutulmaz.

## 3. Koçluk ekran akışı

Koçluk ekranı uzun tek sayfa olmamalıdır. Aşağıdaki adımlardan oluşan bir çalışma alanı şeklinde tasarlanmalıdır:

### Adım 1 — Koçluk kurulumu

Zorunlu alanlar:

- Temsilci
- Koçluk tarihi
- Koçluk türü: ikili ziyaret / bire bir görüşme / takip görüşmesi / beceri çalışması
- İl
- Çalışılan brick veya brickler
- Saha günü başlangıç ve bitiş saati
- Yönetici
- Önceki koçluk kaydı bağlantısı
- Koçluğun odak yetkinliği

### Adım 2 — Veri destekli bağlam

Bu bölüm otomatik oluşturulur. Koçluk puanına doğrudan etki etmez.

Gösterilecek başlıklar:

- Ticari sonuç özeti
- Pazar ve pazar payı özeti
- Saha aktivitesi ve süreklilik
- Kaynak kullanım özeti
- Müşteri portföyü ve seçki durumu
- Önceki koçluk hedeflerinin gerçekleşme durumu

Her metrikte şu bilgiler görünmelidir:

- Değer
- Önceki dönem değeri
- Değişim
- Veri dönemi
- Veri kaynağı
- Veri güvenilirlik durumu
- Hesaplama açıklaması

### Adım 3 — Gözlenen görüşmeler

Her doktor veya eczane görüşmesi ayrı kayıt olmalıdır.

Zorunlu alanlar:

- Müşteri adı
- Müşteri tipi: doktor / eczane
- Branş
- Ünite veya kurum
- Brick
- Ziyaret tarihi ve saati
- Planlı / plansız
- Görüşme süresi
- Görüşme hedefi
- Ürün veya mesaj odağı
- Kullanılan kaynak/materyal
- Görüşme sonucu
- Bir sonraki adım

Gözlem alanları:

- Açık uçlu soru sayısı
- Kapalı soru sayısı
- Derinleştirme/probe soru sayısı
- SPIN aşamaları
- Hekimin konuşma oranı için yönetici tahmini
- Temsilcinin konuşma oranı için yönetici tahmini
- İtiraz sayısı ve türü
- Kapanışta alınan taahhüt
- Takip tarihi
- Somut gözlem notu

### Adım 4 — Yetkinlik değerlendirmesi

Yetkinlikler 1–5 arasında puanlanır. Puanlamanın yanında somut kanıt seçimi ve açıklama bulunmalıdır.

#### Puan ölçeği

1. **Gelişmeli:** kritik davranış gözlenmedi veya yanlış uygulandı.
2. **Beklentiyi kısmen karşılıyor:** davranış parçalı, düzensiz veya yönlendirmeyle gerçekleşti.
3. **Beklenen düzey:** rol standardı bağımsız ve yeterli biçimde karşılandı.
4. **Beklenenin üzerinde:** davranış tutarlı, etkili ve duruma uyarlanmış biçimde uygulandı.
5. **Öğretici düzey:** davranış sürdürülebilir iyi uygulama niteliğinde ve başkalarına örnek olabilir.

#### Yetkinlik alanları

##### A. Ziyaret öncesi hazırlık ve planlama

1. Müşteri geçmişini, seçki segmentini ve önceki görüşmeyi kullanarak görüşme hedefi belirleme.
2. Müşteriye ve branşa uygun ürün/mesaj seçme.
3. Ziyaret rotası ve zaman planını verimli oluşturma.
4. Kullanılacak kaynak ve materyali önceden hazırlama.

##### B. Açılış ve gündem oluşturma

5. Profesyonel ve odaklı açılış yapma.
6. Görüşmenin amacını müşteri için anlamlı biçimde ifade etme.
7. Önceki görüşme veya taahhütle bağlantı kurma.

##### C. Soru sorma ve ihtiyaç analizi

8. Açık uçlu sorularla müşteriyi konuşturma.
9. SPIN yaklaşımını uygun biçimde kullanma.
10. Müşterinin klinik, operasyonel veya hasta yönetimi ihtiyacını doğru tanımlama.
11. Aktif dinleme, özetleme ve derinleştirme soruları kullanma.

##### D. Bilimsel mesaj ve sunum

12. Mesajı müşterinin ihtiyacına göre kişiselleştirme.
13. Bilimsel doğruluk ve onaylı ürün bilgisine uyum.
14. Ana mesajı net, kısa ve yapılandırılmış sunma.
15. Kanıt, görsel veya materyali doğru zamanda ve amaca uygun kullanma.
16. Sunumu monolog yerine etkileşimli yürütme.

##### E. İtiraz karşılama ve müzakere

17. İtirazı kesmeden dinleme ve doğrulama.
18. İtirazın gerçek nedenini soru ile netleştirme.
19. Yanıtı kanıt ve ihtiyaçla ilişkilendirme.
20. Yanıt sonrası müşterinin kabulünü kontrol etme.

##### F. Kapanış ve takip

21. Görüşmeyi özetleme.
22. Açık ve uygun bir taahhüt sorusu yöneltme.
23. Bir sonraki adımı, sorumluyu ve tarihi netleştirme.
24. CRM/SFA kaydını zamanında ve doğru tamamlama.

##### G. Eczane ve hesap yönetimi

25. Eczanenin stok, hasta profili ve ürün hareketini anlamaya yönelik soru sorma.
26. Sipariş talebini ihtiyaç, stok ve etik/ticari kurallar çerçevesinde yönetme.
27. Ürün bulunurluğu, takip ve sürdürülebilir ilişki planı oluşturma.

##### H. Kaynak ve zaman kullanımı

28. Saha zamanını yüksek öncelikli müşterilere dengeli ayırma.
29. Materyal, numune veya diğer kaynakları amaçla bağlantılı ve ölçülü kullanma.
30. Aynı müşteriye tekrarlanan fakat değer üretmeyen ziyaretleri azaltma.
31. Gün içinde plan değişikliğini gerekçeli ve verimli yönetme.

##### I. Uyum ve profesyonel davranış

32. Tanıtım, etik ve şirket prosedürlerine uyum.
33. Müşteri ve çalışan kişisel verilerini gereksiz biçimde kaydetmeme.
34. Profesyonel, saygılı ve ayrımcı olmayan iletişim.

## 4. SPIN değerlendirme modeli

SPIN yalnızca kutu işaretleme olmamalıdır. Her aşama için gözlenen soru ve müşteriden elde edilen bilgi kaydedilmelidir.

### S — Situation / Durum

Amaç: mevcut uygulamayı ve bağlamı anlamak.

Örnek soru yapıları:

- Bu hasta grubunda mevcut yaklaşımınız nasıl ilerliyor?
- Bu tür hastalarda en sık hangi tedavi yolunu tercih ediyorsunuz?
- Eczanenizde bu ürün grubunda stok yönetimini nasıl yapıyorsunuz?

Kontrol: durum soruları gereğinden fazla olmamalı; zaten bilinen bilgi tekrar sorulmamalıdır.

### P — Problem / Sorun

Amaç: müşteri açısından gerçek güçlüğü ortaya çıkarmak.

Örnek soru yapıları:

- Bu yaklaşımda sizi en çok zorlayan nokta nedir?
- Hastaların uyumunda hangi problemle daha sık karşılaşıyorsunuz?
- Bu ürün grubunda bulunurluk açısından yaşadığınız temel sorun nedir?

### I — Implication / Etki

Amaç: sorunun klinik, hasta, zaman veya operasyon üzerindeki etkisini derinleştirmek.

Örnek soru yapıları:

- Bu durum devam ettiğinde hasta yönetimini nasıl etkiliyor?
- Bu stok problemi hasta talebini karşılama sürenizi nasıl değiştiriyor?
- Bu sorun kontrollerde hangi ek yükü oluşturuyor?

### N — Need-payoff / Çözüm değeri

Amaç: müşterinin çözümün değerini kendi cümlesiyle ifade etmesini sağlamak.

Örnek soru yapıları:

- Bu sorunu azaltan bir yaklaşımın sizin için en önemli faydası ne olurdu?
- Daha kolay uygulanabilir bir seçenek hasta uyumuna nasıl katkı sağlayabilir?
- Sürekli bulunurluk sağlansa iş akışınızda ne değişirdi?

### SPIN ölçümü

Her gözlenen görüşme için:

- Kullanılan aşamalar: S/P/I/N
- Her aşamadaki soru sayısı
- Sorunun açık/kapalı türü
- Müşteriden elde edilen yeni bilgi
- Bilginin sunum mesajına yansıtılıp yansıtılmadığı
- Yönetici kanıt notu

Sistem SPIN soru sayısını otomatik yetkinlik puanına çevirmemelidir. Sayı yalnızca bağlamdır; soruların uygunluğu ve elde edilen bilgiyi kullanma biçimi yönetici tarafından değerlendirilir.

## 5. Açık uçlu soru ve aktif dinleme ölçümü

### Açık uçlu soru

`Evet/hayır` veya tek kelimelik cevapla sınırlandırılamayan, müşterinin düşüncesini açıklamasına imkân veren sorudur.

### Kapalı soru

Belirli bilgi doğrulayan veya kısa cevap bekleyen sorudur. Kapalı soru kullanımı olumsuz değildir; doğru aşamada kullanılmalıdır.

### Derinleştirme sorusu

Müşterinin verdiği cevabı açmak, örnek almak veya etkisini anlamak için sorulan takip sorusudur.

Ölçümler:

- Açık uçlu soru adedi
- Kapalı soru adedi
- Derinleştirme sorusu adedi
- Açık uçlu soru oranı = açık uçlu / toplam soru × 100
- Müşteriden elde edilen yeni bilgi adedi
- Elde edilen bilginin mesajda kullanıldığı örnek sayısı
- Temsilcinin müşterinin ifadesini özetlediği örnek sayısı

Bu ölçümler değerlendirmeyi destekler; otomatik puan üretmez.

## 6. Sunum yetkinliği modeli

Sunum değerlendirmesinde yalnızca ürün bilgisinin aktarılması yeterli değildir.

Her görüşmede değerlendirilecek alanlar:

1. Sunum hedefi açık mı?
2. Mesaj müşterinin ihtiyacına bağlı mı?
3. Ana mesaj ilk 60–90 saniyede netleşiyor mu?
4. Bilimsel bilgi onaylı ve doğru mu?
5. Mesaj mantıksal bir akışa sahip mi?
6. Fayda, özellikten ayrıştırılıyor mu?
7. Kullanılan kanıt mesajı gerçekten destekliyor mu?
8. Görsel materyal okunarak değil, konuşmayı desteklemek için mi kullanılıyor?
9. Müşteri sunum boyunca sürece dahil ediliyor mu?
10. Sunum sonunda anlama/kabul kontrolü yapılıyor mu?

Sunum gelişim hedefi örneği:

- Mevcut durum: Ürün özellikleri sıralanıyor; müşteri ihtiyacı ile bağlantı sınırlı.
- Hedef davranış: Her görüşmede ihtiyaçtan seçilen tek ana mesajı, bir kanıt ve bir kontrol sorusuyla sunmak.
- Ölçüm: Sonraki ikili ziyarette gözlenen 5 görüşmenin en az 4'ünde bu üç unsurun birlikte görülmesi.
- Veri kaynağı: Yönetici görüşme gözlem formu.
- Takip tarihi: belirlenen sonraki koçluk tarihi.

## 7. Ticari ve pazar metrikleri

### 7.1 Realizasyon

`Realizasyon (%) = Satış / Hedef × 100`

Kullanım: ticari sonuç bağlamı. Yetkinlik puanı değildir.

### 7.2 Pazar payı

`Pazar payı (%) = İlgili ürün veya portföy satış hacmi / İlgili toplam pazar satış hacmi × 100`

Pazar payı ancak pay ve toplam pazar aynı dönem, coğrafya, kanal ve ölçü birimine sahipse hesaplanmalıdır.

Pazar verisi bulunmuyorsa `Pazar verisi yok` gösterilmeli; satış/ hedef oranı pazar payı gibi adlandırılmamalıdır.

### 7.3 Pazar payı gelişimi

Birincil gösterim yüzde puan farkıdır:

`Pazar payı gelişimi (pp) = Güncel pazar payı − Önceki dönem pazar payı`

Örnek: %12,4'ten %14,1'e çıkış = `+1,7 yüzde puan`.

İkincil gösterim olarak göreli değişim kullanılabilir:

`Göreli pay değişimi (%) = (Güncel pay − Önceki pay) / Önceki pay × 100`

Arayüzde yüzde puan ve göreli yüzde birbirine karıştırılmamalıdır.

### 7.4 Satış gelişimi

`Satış gelişimi (%) = (Güncel satış − Önceki satış) / Önceki satış × 100`

Önceki satış sıfırsa oran hesaplanmaz.

### 7.5 Pazar büyümesi

`Pazar büyümesi (%) = (Güncel toplam pazar − Önceki toplam pazar) / Önceki toplam pazar × 100`

### 7.6 Gelişim indeksi

Pazar verisi mevcutsa:

`Gelişim indeksi = Ürün satış endeksi / Pazar satış endeksi × 100`

Burada satış endeksi güncel dönem satışının baz dönem satışına oranıdır.

- 100 üzeri: ürün pazardan hızlı gelişiyor.
- 100: ürün pazarla aynı hızda gelişiyor.
- 100 altı: ürün pazarın gerisinde gelişiyor.

Bu metrik için baz dönem ve karşılaştırma dönemi ekranda görünmelidir.

## 8. Saha verimliliği metrikleri

### 8.1 Plan uyumu

`Plan uyumu (%) = Planlanan gün ve müşteriyle eşleşen gerçekleşen ziyaret / Planlanan ziyaret × 100`

Aynı müşteriye farklı gün yapılan ziyaret plana uyum sayılmamalı; ayrıca `plan dışı gerçekleşen` olarak gösterilmelidir.

### 8.2 Kaveraj

`Kaveraj (%) = Dönemde en az bir kez ziyaret edilen seçili müşteri / Ziyaret edilmesi gereken seçili müşteri × 100`

Doktor ve eczane kaverajı ayrı gösterilmelidir.

### 8.3 Frekans uyumu

Müşteri bazında:

`Frekans uyumu (%) = min(Gerçekleşen ziyaret / Hedef ziyaret, 1) × 100`

Ekip veya temsilci düzeyinde müşteri bazlı frekans uyumlarının ortalaması kullanılmalıdır. Fazla ziyaretler %100'ün üzerine çıkarak eksik müşterileri maskelememelidir.

Ayrıca gösterilecek:

- Hedef frekansın altında kalan müşteri sayısı
- Hedef frekansta olan müşteri sayısı
- Hedefin üzerinde ziyaret edilen müşteri sayısı

### 8.4 Ziyaret sürekliliği

Süreklilik yalnızca toplam ziyaret sayısı değildir. Ziyaretlerin hedeflenen zaman aralıklarına dağılımını ölçer.

Her müşteri için hedef frekansa göre beklenen periyot oluşturulur:

- Frekans 4/ay: yaklaşık haftalık temas
- Frekans 2/ay: yaklaşık iki haftada bir temas
- Frekans 1/ay: aylık temas

`Süreklilik (%) = Zamanında gerçekleşen beklenen temas aralığı / Toplam beklenen temas aralığı × 100`

Tolerans yönetilebilir ayar olmalıdır. Varsayılan tolerans:

- Haftalık: ±3 gün
- İki haftalık: ±5 gün
- Aylık: ±7 gün

Ayrıca seri ziyaret ve uzun boşluk uyarıları gösterilmelidir:

- Aynı müşteriye çok kısa aralıkta tekrarlanan ziyaret
- Hedef aralığın iki katından uzun ziyaret boşluğu
- Ayın son haftasına yığılmış ziyaretler

### 8.5 Günlük saha verimliliği

Gösterilecek metrikler:

- Saha günü sayısı
- Günlük ortalama doktor ziyareti
- Günlük ortalama eczane ziyareti
- İlk ziyaret saati
- Son ziyaret saati
- Görüşmeler arası ortalama süre
- Planlı ziyaret oranı
- Benzersiz müşteri oranı
- Yüksek öncelikli müşteri temas oranı

İlk/son ziyaret saati yalnızca doğru zaman verisi varsa hesaplanmalıdır. Konum veya rota verisi yoksa yol verimliliği uydurulmamalıdır.

## 9. Kaynak kullanımı modeli

Kaynak kullanımı yalnızca miktar değil, amaca uygunluk ve sonuç bağlantısıdır.

Kaynak kategorileri:

- Basılı/görsel tanıtım materyali
- Dijital materyal
- Numune veya promosyonel kaynak — yalnızca şirket ve mevzuat izin veriyorsa
- Toplantı/eğitim daveti
- Yönetici zamanı
- Temsilci saha zamanı
- Eczane stok/takip çalışması

Her kaynak kullanımında:

- Kaynak türü
- Müşteri
- Brick
- Kullanım amacı
- Kullanım tarihi
- İlgili ürün/mesaj
- Beklenen davranış veya çıktı
- Takip sonucu
- Yönetici gözlemi

Kaynak verimliliği için otomatik tek skor oluşturulmayacaktır. Sistem şu göstergeleri sunar:

- Kaynak kullanılan müşteri sayısı
- Kullanımın öncelikli müşteri içindeki oranı
- Takibi yapılan kaynak kullanım oranı
- Aynı müşteride tekrar kullanım sayısı
- Amaç veya takip sonucu yazılmamış kayıt sayısı

## 10. Koçluk hedefi oluşturma standardı

Her koçluk hedefi aşağıdaki alanların tamamını içermelidir:

- **Gelişim alanı:** hangi yetkinlik?
- **Mevcut durum:** bugün gözlenen somut davranış nedir?
- **Kanıt:** hangi doktor/eczane, ünite, brick ve görüşmede gözlendi?
- **Hedef davranış:** kişi bundan sonra tam olarak ne yapacak?
- **Nasıl uygulanacak:** adım adım yöntem.
- **Ölçüm:** başarı hangi göstergeyle değerlendirilecek?
- **Başlangıç değeri:** mevcut seviye veya gözlem sayısı.
- **Hedef değer:** beklenen seviye veya gözlem sayısı.
- **Ölçüm birimi:** adet, oran, gözlenen görüşme, gün vb.
- **Veri kaynağı:** ziyaret raporu, gözlem formu, CRM/SFA, IMS veya manuel kayıt.
- **Kontrol sıklığı:** haftalık, iki haftalık, sonraki saha günü vb.
- **Bitiş/takip tarihi:** kesin tarih.
- **Çalışanın taahhüdü:** çalışan kendi cümlesiyle ne yapacağını yazar.
- **Yönetici desteği:** yönetici hangi desteği sağlayacak?
- **Başarı kanıtı:** hedef tamamlandığında hangi belge/gözlem bulunacak?
- **Durum:** planlandı / devam ediyor / tamamlandı / yeniden planlandı.

### Hedef yazım şablonu

`[Tarih] tarihine kadar, [müşteri/görüşme bağlamında] [hedef davranışı], [uygulama yöntemi] kullanarak gerçekleştirecek; başarı [ölçüm yöntemi] ile [hedef değer] düzeyinde doğrulanacaktır. Çalışanın taahhüdü: [...]. Yönetici desteği: [...].`

### Örnek 1 — Açık uçlu soru ve SPIN

- Gelişim alanı: İhtiyaç analizi.
- Mevcut durum: Gözlenen 4 görüşmenin 3'ünde doğrudan ürün sunumuna geçildi; problem ve etki sorusu görülmedi.
- Kanıt: Dr. X, Y Hastanesi, Konya Meram-1; Dr. Y, Z ASM, Konya Meram-2.
- Hedef davranış: Sunumdan önce en az bir Problem ve bir Implication sorusu yöneltmek ve cevabı ana mesaja bağlamak.
- Nasıl: Görüşme öncesinde müşteri başına iki soru hazırlamak; müşteri cevabını kısa özetleyip uygun mesajı seçmek.
- Ölçüm: Sonraki 6 gözlenen görüşmenin en az 5'inde P ve I sorusunun birlikte gözlenmesi; en az 4'ünde cevabın mesaja yansıması.
- Veri kaynağı: Yönetici gözlem formu.
- Takip tarihi: sonraki ikili ziyaret tarihi.

### Örnek 2 — Sunum

- Gelişim alanı: İhtiyaca uyarlanmış bilimsel sunum.
- Mevcut durum: Ürün özellikleri sıralanıyor; ihtiyaç bağlantısı ve anlama kontrolü sınırlı.
- Hedef davranış: Her görüşmede tek ihtiyaç, tek ana mesaj, tek kanıt ve tek kontrol sorusundan oluşan yapı kullanmak.
- Nasıl: Görüşme öncesi mesaj kartını doldurmak; sunumu 3 dakika içinde tamamlamak; kapanışta `Bu yaklaşım sizin hasta grubunuz açısından nasıl değerlendirilebilir?` benzeri kontrol sorusu sormak.
- Ölçüm: 5 gözlenen görüşmenin en az 4'ünde dört unsurun birlikte görülmesi.

### Örnek 3 — Ziyaret sürekliliği

- Gelişim alanı: Saha planlama ve takip disiplini.
- Mevcut durum: Hedef frekanslı müşterilerin %38'i zamanında ziyaret edilmiş; ziyaretlerin %41'i ayın son haftasında yoğunlaşmış.
- Hedef davranış: Frekans 4 müşterileri haftalara dengeli dağıtmak ve haftalık plan kontrolü yapmak.
- Nasıl: Pazartesi günü frekans açığı listesini kontrol etmek; hafta içinde geciken müşterileri cuma gününden önce yeniden planlamak.
- Ölçüm: İki aylık takip sonunda sürekliliği en az %70'e çıkarmak ve son hafta yığılmasını %25'in altına indirmek.
- Veri kaynağı: Ziyaret detay ve plan kayıtları.
- Not: Bu hedef yetkinlik puanını otomatik değiştirmez; sonuç sonraki koçlukta kanıt olarak değerlendirilir.

## 11. GROW görüşme yapısı

### G — Goal / Hedef

Yönetici cevap yazmaz; çalışanın düşünmesini sağlayan sorular sunar:

- Bu görüşmelerde hangi davranışını geliştirmek istiyorsun?
- Bir sonraki saha gününde farklı ne yaparsan daha etkili olursun?
- Başarıyı ne gördüğümüzde anlayacağız?

Çıktı: çalışanın seçtiği hedef davranış ve başarı tanımı.

### R — Reality / Mevcut durum

- Bugün hangi görüşmede istediğin sonucu aldın?
- Nerede zorlandın?
- Müşterinin hangi cevabını yeterince derinleştirmedin?
- Veriler ve gözlemler bize ne söylüyor?

Çıktı: çalışanın görüşü + yöneticinin somut gözlem kanıtı. İki alan birbirine karıştırılmaz.

### O — Options / Seçenekler

- Başka hangi soru biçimini kullanabilirdin?
- Sunumu daha kısa ve ihtiyaca bağlı yapmak için hangi yöntemi deneyebilirsin?
- Kimden veya hangi materyalden destek alabilirsin?
- Planını hangi kontrol noktalarıyla sürdürebilirsin?

Çıktı: en az iki seçenek ve çalışanın seçtiği yöntem.

### W — Way Forward / İlerleme planı

- İlk adım nedir?
- Ne zaman yapacaksın?
- Hangi müşteri grubunda uygulayacaksın?
- Başarıyı hangi veri veya gözlemle ölçeceğiz?
- Yönetici desteği ne olacak?

Çıktı: ölçülebilir gelişim hedefi, tarih ve takip planı.

## 12. Otomatik yorum üretme kuralları

Sistem yorum üretirken şu sırayı kullanmalıdır:

1. Koçluğun kapsamı: tarih, brick, müşteri ve görüşme sayısı.
2. Gözlenen güçlü davranışlar ve somut örnekler.
3. Gelişim alanları ve somut örnekler.
4. Ticari/saha verisinin bağlamı; neden-sonuç iddiası olmadan.
5. Çalışanın öz değerlendirmesi.
6. Üzerinde uzlaşılan hedef davranış.
7. Ölçüm yöntemi, takip tarihi ve yönetici desteği.

Yasak yorum örnekleri:

- İsteksiz, tembel, disiplinsiz, agresif, güvenilmez.
- Satışı düşük olduğu için yetkinliği yetersizdir.
- Bu şekilde devam ederse iş akdi etkilenir.
- Ailevi/sağlık sorunları performansını etkiliyor.

Uygun dil örneği:

`22 Temmuz 2026 tarihinde Konya Meram-1 ve Meram-2 bricklerinde dört doktor görüşmesi gözlenmiştir. Görüşmelerin üçünde açılış ve ürün mesajı planlanan çerçevede uygulanmıştır. Üç görüşmede doğrudan ürün anlatımına geçilmiş; müşterinin sorununu ve etkisini derinleştiren soru gözlenmemiştir. Temsilci, görüşme sonu değerlendirmesinde bu alanı geliştirmek istediğini belirtmiştir. Sonraki ikili ziyarete kadar müşteri başına bir Problem ve bir Implication sorusu hazırlama; altı gözlenen görüşmenin en az beşinde bu soruları kullanma hedefi üzerinde uzlaşılmıştır. Yönetici, örnek soru havuzu ve bir rol çalışma oturumu sağlayacaktır.`

## 13. Veri kaynakları

Mevcut PharmaInsight dosyalarıyla eşleştirme:

- **Real/Kümüle/YTD IMS:** satış, hedef, realizasyon, ürün ve brick sonuçları.
- **Pazar verisi dosyası:** toplam pazar ve ürün pazar payı. Bu dosya yoksa pazar payı hesaplanmaz.
- **Seleksiyon listesi:** müşteri seçkisi, branş ve brick.
- **Ziyaret detay:** tarih, müşteri, planlı/plansız, temsilci ve ziyaret sürekliliği.
- **Havuz raporu:** müşteri ana verisi, ünite, branş, brick.
- **Sipariş detay:** eczane, ürün, adet, tutar ve tarih.
- **Koçluk gözlem kaydı:** açık/kapalı/SPIN soruları, sunum, itiraz, kapanış ve davranış kanıtları.
- **Kaynak kullanım dosyası:** varsa materyal veya kaynak hareketleri. Yoksa kaynak kullanımı manuel gözlemle sınırlıdır.

Sistem veri kaynağında olmayan alanı üretmemelidir.

## 14. Veri modeli

Her koçluk kaydı en az şu nesneleri içermelidir:

- `coaching_session`
- `context_metrics[]`
- `observed_calls[]`
- `competency_ratings[]`
- `employee_reflection`
- `grow_conversation`
- `development_goals[]`
- `manager_support[]`
- `followups[]`
- `audit_log[]`

Ayrıntılı şema `schemas/coaching-session.schema.json` dosyasındadır.

## 15. Hukuki ve veri güvenliği sınırları

- Sistem formal performans yönetimi veya disiplin sistemi olarak etiketlenmemelidir.
- Koçluk kaydı otomatik fesih, ceza, prim kesintisi veya disiplin önerisi üretemez.
- Formal insan kaynakları süreci gerekiyorsa ayrı şirket prosedürü ve hukuk/İK incelemesine yönlendirme yapılır.
- Çalışanın iş ile ilgili olmayan kişisel verileri kaydedilmez.
- Erişim görev bazlı olmalıdır; temsilci yalnızca kendi koçluk kaydını görmelidir.
- Dışa aktarılan raporlarda gereksiz müşteri veya çalışan verisi bulunmamalıdır.
- Saklama süresi şirket politikası ve hukuki değerlendirme ile yapılandırılmalıdır.
- Silme, dışa aktarma ve erişim kayıtları audit log içinde tutulmalıdır.

## 16. Tamamlanma koşulları

Koçluk şu koşullar sağlanmadan `Tamamlandı` olamaz:

- En az bir gözlenen müşteri görüşmesi veya gerekçeli görüşmesiz koçluk türü.
- Puanlanan her 1, 2, 4 ve 5 kriter için somut kanıt.
- En az bir çalışan öz değerlendirme kaydı.
- En az bir gelişim veya güçlü yön hedefi.
- Hedefte mevcut durum, hedef davranış, ölçüm, veri kaynağı ve takip tarihi.
- Çalışan taahhüdü.
- Yönetici desteği.
- Yasaklı/ayrımcı dil kontrolünden geçme.
- Koçluk ile disiplin sürecinin karıştırılmadığına dair sistem kontrolü.

