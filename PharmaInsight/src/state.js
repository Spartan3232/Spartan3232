'use strict';
const ICONS={
 home:'<path d="M3 11 12 3l9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
 decision:'<path d="M12 3v18"></path><path d="M5 8h14"></path><path d="M5 16h14"></path><circle cx="7" cy="8" r="2"></circle><circle cx="17" cy="16" r="2"></circle>',
 users:'<circle cx="9" cy="8" r="3"></circle><path d="M3 20c0-4 2-7 6-7s6 3 6 7"></path><circle cx="17" cy="9" r="2"></circle><path d="M16 14c3 0 5 2 5 6"></path>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
 customer:'<circle cx="12" cy="7" r="3"></circle><path d="M5 21c0-5 2.5-8 7-8s7 3 7 8"></path>',
 product:'<path d="M4 18V9l8-5 8 5v9l-8 3-8-3Z"></path><path d="m4 9 8 4 8-4"></path><path d="M12 13v8"></path>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M7 3v4M17 3v4M3 10h18"></path>',
 quality:'<path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"></path><path d="m8 12 2.5 2.5L16 9"></path>',
 grow:'<path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8Z"></path><path d="M12 11c4 0 7-2.5 7-7-4 0-7 2.5-7 7Z"></path>',
 report:'<path d="M6 3h9l4 4v14H6V3Z"></path><path d="M14 3v5h5M9 13h6M9 17h6"></path>',
 upload:'<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M4 15v5h16v-5"></path>',
 trend:'<path d="M3 18 9 12l4 4 8-10"></path><path d="M16 6h5v5"></path>',
 archive:'<rect x="3" y="4" width="18" height="5" rx="1"></rect><path d="M5 9v11h14V9M9 13h6"></path>'
};
const navItems=[
 ['main','Yönetici Özeti','home','ANA ANALİZ'],['decisions','Aksiyon Merkezi','decision'],['forecast','Trend & Forecast','trend'],['reps','Temsilci 360°','users'],['bricks','Brick 360°','grid'],['customers','Doktor / Eczane 360°','customer'],['products','Ürün & Rakip','product'],['plan','Plan & Frekans','calendar'],['archive','Dönem Arşivi','archive','YÖNETİM'],['quality','Veri Kalitesi','quality'],['grow','GROW Koçluk','grow'],['reports','Rapor Merkezi','report'],['upload','Veri Yükle','upload']
];
let DATA=JSON.parse(document.getElementById('embeddedData').textContent);DATA.actions=DATA.actions||{};DATA.manualActions=DATA.manualActions||[];DATA.snapshots=DATA.snapshots||[];
const STATE={page:'main',period:'latest',imsPeriod:'auto',rep:null,brick:null,repTab:'summary',query:'',customerPage:0,mapLayer:'real',scenario:{plan:15,freq:20,orders:10}};
const STD={AHEK:10,DAHILIYE:50,ORTOPEDI:30,ROMATOLOJI:10,DERMATOLOJI:10,'KADIN DOGUM':50,ECZACI:60};
const FREQ={AHEK:4,DAHILIYE:3,ORTOPEDI:3,ROMATOLOJI:3,DERMATOLOJI:3,'KADIN DOGUM':3,ECZACI:2};
const MAX_SELECTION_TARGET=Object.values(STD).reduce((a,b)=>a+b,0);
const SPEC={'AILE HEKIMLIGI':'AHEK','AILE HEKIMLIGI UZMANI':'AHEK','DAHILIYE':'DAHILIYE','IC HASTALIKLARI':'DAHILIYE','ORTOPEDI':'ORTOPEDI','ORTOPEDI VE TRAVMATOLOJI':'ORTOPEDI','ROMATOLOJI':'ROMATOLOJI','DERMATOLOJI':'DERMATOLOJI','DERI VE ZUHREVI HASTALIKLAR':'DERMATOLOJI','KADIN DOGUM':'KADIN DOGUM','KADIN HASTALIKLARI VE DOGUM':'KADIN DOGUM','ECZACI':'ECZACI'};
let IDX={};
const norm=s=>String(s??'').replaceAll('İ','I').replaceAll('ı','i').normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Inline onclick niteliğindeki fonksiyon argümanları için: esc() yalnızca HTML-escape yapar, ama
// tarayıcı onclick içeriğini JS olarak derlemeden ÖNCE HTML entity'lerini decode eder —
// yani &#39; tekrar ' olur ve içinde tek tırnak geçen (Excel'den gelen) bir doktor/eczane
// adı JS söz dizimini bozar (openCustomer('O'NEIL',...) gibi), buton sessizce çalışmaz
// hale gelir. Önce JS string literal kaçışı (\ ve ') uygulanır, esc() dıştan sarar.
const escAttr=s=>esc(String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtTL=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n(v));
const fmtN=v=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}).format(n(v));
const fmtPct=v=>v==null||!Number.isFinite(Number(v))?'—':'%'+Number(v).toLocaleString('tr-TR',{maximumFractionDigits:1});
const initials=s=>String(s||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const titleTR=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/(^|[\s-])([a-zçğıöşü])/g,(m,p,c)=>p+c.toLocaleUpperCase('tr-TR'));
const icon=name=>`<svg viewBox="0 0 24 24">${ICONS[name]||ICONS.grid}</svg>`;
const pctColor=v=>v>=100?'#00a878':v>=85?'#f59e0b':'#ef3f53';
const riskClass=v=>v>=65?'b-red':v>=35?'b-amber':'b-green';
const perfClass=v=>v>=100?'b-green':v>=85?'b-amber':'b-red';
const badge=(value,type='perf')=>`<span class="badge ${type==='risk'?riskClass(value):perfClass(value)}">${type==='risk'?'Risk '+Math.round(value):fmtPct(value)}</span>`;
function arrMapPush(map,key,val){if(!map.has(key))map.set(key,[]);map.get(key).push(val)}
function monthLabel(m){if(m==='all')return 'Tüm saha dönemi';const [y,mo]=String(m).split('-');return new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}
function imsPeriodLabel(k){if(/^\d{2}\|\d{2}$/.test(k)){const [y,m]=k.split('|');return new Date(2000+Number(y),Number(m)-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}if(/^Q[1-4]$/.test(k))return k+' 2026';if(k==='H2')return '2026 İkinci Yarı';if(k==='H1')return '2026 İlk Yarı';return k||'IMS dönemi'}
function activeReal(){const p=DATA.realPeriods||{};return p[STATE.imsPeriod]||DATA.real||Object.values(p)[0]||{rows:[],sheet:'—'}}
function realTotal(row,metric='SATIS',product='TOPLAM'){return n(row?.values?.[metric]?.[product])}
function rowPerf(row,product='TOPLAM'){const h=realTotal(row,'HEDEF',product),s=realTotal(row,'SATIS',product);return h?100*s/h:n(row?.values?.REAL?.[product])}
function province(brick){const x=norm(brick),labels={ANTALYA:'Antalya',KONYA:'Konya',KARAMAN:'Karaman',AFYON:'Afyon',MUGLA:'Muğla',DENIZLI:'Denizli',BURDUR:'Burdur',ISPARTA:'Isparta'};for(const p of Object.keys(labels))if(x.startsWith(p))return labels[p];return titleTR(x.split(' ')[0]||'Diğer')}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('mobileOverlay').classList.add('show')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('mobileOverlay').classList.remove('show')}
function reindex(){
 const periods=DATA.realPeriods||{};if(STATE.imsPeriod==='auto'||(Object.keys(periods).length&&!periods[STATE.imsPeriod]))STATE.imsPeriod=DATA.real?.sheet&&periods[DATA.real.sheet]?DATA.real.sheet:(Object.keys(periods)[0]||DATA.real?.sheet||'');const realSource=activeReal();const allReal=realSource?.rows||[];const regionNames=[...new Set(allReal.map(r=>r.region).filter(Boolean))];
 const regionName=regionNames.find(x=>norm(x).includes('CENGIZ'))||regionNames[0]||'';
 const real=allReal.filter(r=>r.region===regionName);
 const reps=real.filter(r=>r.level==='TTT');const bricks=real.filter(r=>r.level==='BRICK');const bm=real.find(r=>r.level==='BM')||null;
 const display=new Map();for(const list of [DATA.sel||[],DATA.ziyaret||[],DATA.siparis||[]])for(const x of list){const r=x.rep;if(r&&!display.has(norm(r)))display.set(norm(r),r)}
 const repByNorm=new Map();for(const r of reps){const rn=norm(r.repName)==='BOS'?'BOS POZISYON':norm(r.repName);repByNorm.set(rn,r);if(!display.has(rn))display.set(rn,rn==='BOS POZISYON'?'Boş Pozisyon':titleTR(r.repName))}
 const assignment=new Map();for(const b of bricks){const rn=norm(b.repName)==='BOS'?'BOS POZISYON':norm(b.repName);arrMapPush(assignment,rn,norm(b.brick))}
 const selByRep=new Map(),selByBrick=new Map(),visitByRep=new Map(),orderByRep=new Map(),orderByBrick=new Map(),poolByBrick=new Map(),poolByName=new Map();
 for(const x of DATA.sel||[]){arrMapPush(selByRep,norm(x.rep),x);arrMapPush(selByBrick,norm(x.brick),x)}
 for(const x of DATA.ziyaret||[])arrMapPush(visitByRep,norm(x.rep),x);
 for(const x of DATA.siparis||[]){arrMapPush(orderByRep,norm(x.rep),x);arrMapPush(orderByBrick,norm(x.brick),x)}
 for(const x of DATA.havuz||[]){arrMapPush(poolByBrick,norm(x.brick),x);arrMapPush(poolByName,norm(x.customer),x)}
 const months=[...new Set((DATA.ziyaret||[]).map(x=>String(x.date).slice(0,7)).filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort();
 const latest=months.at(-1)||'all';if(STATE.period==='latest')STATE.period=latest;
 IDX={regionName,real,bm,reps,bricks,display,repByNorm,assignment,selByRep,selByBrick,visitByRep,orderByRep,orderByBrick,poolByBrick,poolByName,months,latest,realSource,cache:new Map()};
 renderPeriod();renderIMSPeriod();renderSideStatus();
}
function displayRep(rn){return IDX.display.get(norm(rn))||(norm(rn)==='BOS'?'Boş Pozisyon':titleTR(rn))}
function periodVisits(list){if(STATE.period==='all')return list||[];return (list||[]).filter(x=>String(x.date).startsWith(STATE.period))}
function periodOrders(list){if(STATE.period==='all')return list||[];return (list||[]).filter(x=>String(x.date).startsWith(STATE.period))}
function visitCounts(repNorm){const key='vc|'+repNorm+'|'+STATE.period;if(IDX.cache.has(key))return IDX.cache.get(key);const m=new Map();for(const v of periodVisits(IDX.visitByRep.get(repNorm)||[])){const k=norm(v.customer);m.set(k,(m.get(k)||0)+1)}IDX.cache.set(key,m);return m}
