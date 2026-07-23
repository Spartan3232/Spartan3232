// Seleksiyon (hedef doktor/eczacı listesi) dosyasını ayrıştırır.
// Bağımlılık: global findHeader() (src/data/shared.js).
function parseSeleksiyonFile(wb){
  const r=findHeader(wb,['Kullanıcı','Brick','Branş','Dr/Ecz Adı']);
  if(!r) throw Error('Beklenen kolonlar yok');
  return r.rows.map(row=>({
    rep:String(row[r.cols['Kullanıcı']]??'').trim(),
    brick:String(row[r.cols['Brick']]??'').trim(),
    specialty:String(row[r.cols['Branş']]??'').trim(),
    customer:String(row[r.cols['Dr/Ecz Adı']]??'').trim(),
  })).filter(x=>x.rep);
}
