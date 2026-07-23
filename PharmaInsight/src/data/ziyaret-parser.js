// Ziyaret Detay dosyasını ayrıştırır ve mevcut kayıtlarla tekilleştirerek birleştirir.
// Bağımlılık: global findHeader(), norm(), mergeUnique() (src/data/shared.js, src/state.js).
function parseZiyaretFile(wb,existingRows){
  const r=findHeader(wb,['Kullanıcı','Tarih','Branş','Dr/Ecz Adı','Planlı/Plansız']);
  if(!r) throw Error('Beklenen kolonlar yok');
  const newRows=r.rows.map(row=>({
    rep:String(row[r.cols['Kullanıcı']]??'').trim(),
    date:row[r.cols['Tarih']] instanceof Date ? row[r.cols['Tarih']].toISOString().slice(0,10) : String(row[r.cols['Tarih']]??'').slice(0,10),
    specialty:String(row[r.cols['Branş']]??'').trim(),
    customer:String(row[r.cols['Dr/Ecz Adı']]??'').trim(),
    planned:norm(row[r.cols['Planlı/Plansız']])==='PLANLI',
  })).filter(x=>x.rep&&x.date);
  return mergeUnique(existingRows,newRows,x=>[norm(x.rep),x.date,norm(x.customer),x.planned?'P':'X'].join('|'));
}
