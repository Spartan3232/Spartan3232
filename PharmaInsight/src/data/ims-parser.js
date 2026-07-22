// IMS hiyerarşi dosyalarını (Real / Kümüle / YTD) ayrıştırır.
// Üçü de aynı BM→TTT→Brick "Sicil No" başlıklı formatı kullanır; yalnızca
// hangi sayfaların aday olduğu ve hangi sayfanın "aktif" seçileceği değişir.
// Bağımlılık: global norm(), n(), realTotal(), toNum() (src/state.js, src/data/shared.js).
function parseIMS(wb,kind,fileName){
  const parse=sn=>{
    const grid=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null});
    let hr=-1;
    for(let r=0;r<Math.min(15,grid.length);r++) if((grid[r]||[]).some(c=>norm(c)==='SICIL NO')){hr=r;break}
    if(hr<0) return [];
    const metrics=grid[hr]||[],products=grid[hr-1]||[],cols=[];
    let last='';
    for(let c=8;c<metrics.length;c++){
      if(norm(products[c])) last=norm(products[c]);
      const met=norm(metrics[c]);
      if(['HEDEF','SATIS','SATIŞ','REAL','TL','PP','BRUT TL','MF'].includes(met)&&last) cols.push({c,m:met==='SATIŞ'?'SATIS':met,p:last});
    }
    let cr='',cp='',cc='',cn='';
    const rows=[];
    for(let i=hr+1;i<grid.length;i++){
      const row=grid[i]||[],region=String(row[3]??'').trim(),position=String(row[4]??'').trim(),unvan=norm(row[5]),name=String(row[6]??'').trim();
      if(!region&&!position&&!name) continue;
      if(norm(region)==='TURKIYE') continue;
      const values={};
      for(const z of cols){ values[z.m]??={}; values[z.m][z.p]=toNum(row[z.c]); }
      if(unvan==='BM'){
        cr=region;cp=region;cc='';cn='';
        rows.push({level:'BM',region,position:region,positionCode:'',repName:'',brick:null,share:null,values});
      } else if(unvan==='TTT'){
        cr=region;cp=position;
        const m=position.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
        cc=m?m[1]:position;cn=m?m[2].trim():'';
        rows.push({level:'TTT',region,position,positionCode:cc,repName:cn,brick:null,share:null,values});
      } else if(name){
        rows.push({level:'BRICK',region:cr,position:cp,positionCode:cc,repName:cn,brick:name,share:toNum(row[7]),values});
      }
    }
    return rows;
  };

  if(kind==='real'){
    const periods={};
    const cands=wb.SheetNames.filter(n=>/^\d{2}\|\d{2}$/.test(n)||['Q1','Q2','Q3','Q4','H1','H2'].includes(norm(n)));
    for(const sn of cands){
      const rows=parse(sn);
      if(!rows.length) continue;
      const regions=[...new Set(rows.map(x=>x.region).filter(Boolean))],region=regions.find(x=>norm(x).includes('CENGIZ'))||regions[0],mine=rows.filter(x=>x.region===region),bm=mine.find(x=>x.level==='BM');
      const targetTotal=realTotal(bm,'HEDEF'),salesTotal=realTotal(bm,'SATIS');
      if(targetTotal||salesTotal) periods[sn]={fileName,sheet:sn,rows:mine,targetTotal,salesTotal};
    }
    const actual=Object.keys(periods).filter(k=>/^\d{2}\|\d{2}$/.test(k)&&n(periods[k].salesTotal)>0).sort().at(-1)||Object.keys(periods)[0];
    return {active:periods[actual],periods};
  }

  let cands=wb.SheetNames;
  if(kind==='ytd') cands=cands.filter(n=>norm(n)==='YTD').concat(cands);
  let chosen=null,rows=[];
  for(let i=cands.length-1;i>=0;i--){
    const rr=parse(cands[i]);
    const sum=rr.filter(x=>x.level==='BRICK').reduce((a,x)=>a+realTotal(x,'SATIS'),0);
    if(rr.length&&sum>0){chosen=cands[i];rows=rr;break}
  }
  if(!chosen&&cands[0]){chosen=cands[0];rows=parse(chosen)}
  return {fileName,sheet:chosen,rows};
}
