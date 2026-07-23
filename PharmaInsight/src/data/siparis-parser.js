// Sipariş Detay dosyasını ayrıştırır ve mevcut kayıtlarla tekilleştirerek birleştirir.
// Bağımlılık: global findHeader(), norm(), n(), toNum(), mergeUnique() (src/data/shared.js, src/state.js).
function parseSiparisFile(wb,existingRows){
  const r=findHeader(wb,['Kullanıcı','Sipariş Tarihi','Siparişin Durumu','Eczane Adı','Eczane Brick','Ürün Adı','Ürün Adet']);
  if(!r) throw Error('Beklenen kolonlar yok');
  const newRows=r.rows.map(row=>({
    rep:String(row[r.cols['Kullanıcı']]??'').trim(),
    date:row[r.cols['Sipariş Tarihi']] instanceof Date ? row[r.cols['Sipariş Tarihi']].toISOString().slice(0,10) : String(row[r.cols['Sipariş Tarihi']]??'').slice(0,10),
    status:String(row[r.cols['Siparişin Durumu']]??'').trim(),
    pharmacy:String(row[r.cols['Eczane Adı']]??'').trim(),
    brick:String(row[r.cols['Eczane Brick']]??'').trim(),
    product:String(row[r.cols['Ürün Adı']]??'').trim(),
    qty:toNum(row[r.cols['Ürün Adet']]),
  })).filter(x=>x.rep);
  return mergeUnique(existingRows,newRows,x=>[norm(x.rep),x.date,norm(x.pharmacy),norm(x.product),n(x.qty)].join('|'));
}
