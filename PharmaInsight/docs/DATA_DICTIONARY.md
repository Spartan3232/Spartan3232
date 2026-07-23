# Veri Sözlüğü

`DATA` global nesnesi, sayfa açılışında `fixtures/real-data.json` içeriğinden
(`#embeddedData` script bloğu) yüklenir; kullanıcı Excel yüklediğinde ilgili
alan güncellenir (`src/data/index.js` → `handleUpload`).

## `DATA` alanları

| Alan | Kaynak | Şekil | Ayrıştırıcı |
|---|---|---|---|
| `DATA.real` | IMS Real dosyası (aylık hedef/satış) | `{fileName, sheet, rows[]}` — aktif dönem | `src/data/ims-parser.js` (`parseIMS(wb,'real',...)`.`active`) |
| `DATA.realPeriods` | IMS Real dosyası | `{ [sheetAdı]: {fileName, sheet, rows[], targetTotal, salesTotal} }` — tüm yüklü dönemler | aynı, `.periods` |
| `DATA.kumule` | IMS Kümüle dosyası (pazar payı) | `{fileName, sheet, rows[]}` | `parseIMS(wb,'kumule',...)` |
| `DATA.ytd` | IMS YTD dosyası (opsiyonel) | `{fileName, sheet, rows[]}` | `parseIMS(wb,'ytd',...)` |
| `DATA.sel` | Seleksiyon Listesi | `[{rep, brick, specialty, customer}]` | `src/data/seleksiyon-parser.js` |
| `DATA.ziyaret` | Ziyaret Detay | `[{rep, date, specialty, customer, planned}]`, tekilleştirilmiş | `src/data/ziyaret-parser.js` (`mergeUnique`) |
| `DATA.havuz` | Havuz Raporu | `[{specialty, institution, il, brick, customer, selected}]` | `src/data/havuz-parser.js` |
| `DATA.siparis` | Sipariş Detay | `[{rep, date, status, pharmacy, brick, product, qty}]`, tekilleştirilmiş | `src/data/siparis-parser.js` |
| `DATA.actions` | Kullanıcı girişi (UI) | `{ [actionKey]: {status, due, owner, targetValue, actualValue, note, customAction, updated} }` | `src/analytics/region-analysis.js` (`actionRecord`) |
| `DATA.manualActions` | Sistem + kullanıcı | `[{type, subject, owner, impact, score, reason, action, target, id, color}]` | `decisionData()` + GROW takip kayıtları |
| `DATA.snapshots` | Dönem arşivi | uygulama içi | — |
| `DATA.generatedAt` | Son güncelleme zaman damgası | ISO string | `handleUpload` |

### `IMS row` şekli (real/kumule/ytd ortak)

```
{ level: 'BM'|'TTT'|'BRICK', region, position, positionCode, repName,
  brick: string|null, share: number|null,
  values: { HEDEF: {ÜRÜN: sayı, TOPLAM: sayı, ...}, SATIS: {...}, ... } }
```
Başlık satırı `"SICIL NO"` metnini içeren satır olarak bulunur (`parseIMS`
içindeki `hr` — header row). `region==='TURKIYE'` olan satırlar (ülke geneli
özet) atlanır; yalnızca bölge müdürünün kendi bölgesi (`region` içinde
"CENGIZ" geçen) kullanılır.

## `STATE` (oturum içi UI durumu — kalıcı değil)

```
{ page, period, imsPeriod, rep, brick, repTab, query, customerPage, mapLayer, scenario }
```
`period`: saha ayı filtresi (`'latest'` veya `'YYYY-MM'` veya `'all'`).
`imsPeriod`: hangi IMS Real dönemi aktif (`DATA.realPeriods` anahtarı).

## Standart sabitler (`src/state.js`)

- `STD` — branş başına aylık seleksiyon standardı (AHEK 10, Dahiliye 50,
  Ortopedi 30, Romatoloji 10, Dermatoloji 10, Kadın Doğum 50, Eczacı 60).
- `FREQ` — branş başına aylık ziyaret frekans standardı.
- `MAX_SELECTION_TARGET` — `Object.values(STD)` toplamı (220); tek bir
  temsilcinin toplam seleksiyon kotası. **Sabit sayı yazma — STD değişirse bu
  da otomatik değişsin diye türetilmiş haldedir** (Faz 0 denetim düzeltmesi).

## GROW veri modeli

`GROW_DRAFT` (oturum içi taslak) → `growSave()` ile `growSessions()`
(localStorage, `pi_grow_sessions_v3`) içine kalıcı kayıt olarak eklenir.
Her kayıt 13 kriterlik `scores{}`, `notes{}`, `evidence{}` + `avg`/`count`/
`sectionScores` (hesaplanan, gösterim amaçlı özet — bkz. PRODUCT_SPEC.md
"GROW puanı performans puanı değildir" ilkesi) içerir.
