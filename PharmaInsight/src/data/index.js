// Excel yükleme giriş noktası — UI'daki dosya inputlarının onchange'i burayı çağırır.
// Ayrıştırma işini kind'a göre ilgili *-parser.js modülüne devreder, sonra
// DATA/STATE'i günceller ve sayfayı yeniden çizer.
function handleUpload(kind,file,input){
  if(!file) return;
  readWB(file,wb=>{
    try{
      if(kind==='real'){
        const z=parseIMS(wb,kind,file.name);
        DATA.real=z.active;
        DATA.realPeriods={...(DATA.realPeriods||{}),...(z.periods||{})};
        STATE.imsPeriod=DATA.real?.sheet||'auto';
      } else if(['kumule','ytd'].includes(kind)){
        DATA[kind]=parseIMS(wb,kind,file.name);
      } else if(kind==='sel'){
        DATA.sel=parseSeleksiyonFile(wb);
      } else if(kind==='ziyaret'){
        DATA.ziyaret=parseZiyaretFile(wb,DATA.ziyaret);
      } else if(kind==='siparis'){
        DATA.siparis=parseSiparisFile(wb,DATA.siparis);
      } else if(kind==='havuz'){
        DATA.havuz=parseHavuzFile(wb);
      }
      DATA.generatedAt=new Date().toISOString();
      reindex();
      renderPage();
      document.getElementById('status-'+kind).textContent=file.name+' · yüklendi';
      toast(file.name+' işlendi');
    }catch(e){
      toast('Yükleme hatası: '+e.message);
    }
  });
}
