// Havuz Raporu (hekim/eczacı evreni + seleksiyon işareti) dosyasını ayrıştırır.
// Bağımlılık: global findHeader(), norm() (src/data/shared.js, src/state.js).
function parseHavuzFile(wb){
  const r=findHeader(wb,['Branş','Ünite','İl','Brick','Dr/Ecz Adı','Seleksiyon']);
  if(!r) throw Error('Beklenen kolonlar yok');
  return r.rows.map(row=>({
    specialty:String(row[r.cols['Branş']]??'').trim(),
    institution:String(row[r.cols['Ünite']]??'').trim(),
    il:String(row[r.cols['İl']]??'').trim(),
    brick:String(row[r.cols['Brick']]??'').trim(),
    customer:String(row[r.cols['Dr/Ecz Adı']]??'').trim(),
    selected:['EVET','YES','1','TRUE'].includes(norm(row[r.cols['Seleksiyon']])),
  })).filter(x=>x.customer);
}
