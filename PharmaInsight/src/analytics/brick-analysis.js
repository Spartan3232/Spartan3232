// Brick bazlı metrik hesaplama ve brick↔temsilci/il eşlemeleri.
function brickMetric(row){
 const rn=norm(row.repName)==='BOS'?'BOS POZISYON':norm(row.repName),bn=norm(row.brick),sel=IDX.selByBrick.get(bn)||[],pool=IDX.poolByBrick.get(bn)||[],orders=periodOrders(IDX.orderByBrick.get(bn)||[]),h=realTotal(row,'HEDEF'),s=realTotal(row,'SATIS'),real=h?100*s/h:rowPerf(row);
 const customers=new Set(sel.map(x=>norm(x.customer)));let visits=0,planned=0;const repVisits=periodVisits(IDX.visitByRep.get(rn)||[]);for(const v of repVisits)if(customers.has(norm(v.customer))){visits++;if(v.planned)planned++}
 const products=Object.keys(row.values?.HEDEF||{}).filter(x=>x!=='TOPLAM').map(p=>({product:p,target:realTotal(row,'HEDEF',p),sales:realTotal(row,'SATIS',p),real:rowPerf(row,p)})).filter(x=>x.target||x.sales).sort((a,b)=>(b.target-b.sales)-(a.target-a.sales));
 return {row,name:row.brick,bn,rn,owner:displayRep(rn),target:h,sales:s,real,gap:Math.max(0,h-s),sel,pool,orders,qty:orders.reduce((a,x)=>a+n(x.qty),0),pharmacies:new Set(orders.map(x=>norm(x.pharmacy))).size,visits,plan:visits?100*planned/visits:null,products}
}
function allBrickMetrics(){return IDX.bricks.map(brickMetric)}
function ownerOfBrick(brick){const row=IDX.bricks.find(x=>norm(x.brick)===norm(brick));return row?(norm(row.repName)==='BOS'?'BOS POZISYON':norm(row.repName)):'Beyaz Bölge'}
function provinceMetrics(){const map=new Map();for(const b of IDX.bricks){const p=province(b.brick),m=map.get(p)||{name:p,target:0,sales:0,gap:0,bricks:0,repSet:new Set(),orders:0};m.target+=realTotal(b,'HEDEF');m.sales+=realTotal(b,'SATIS');m.bricks++;m.repSet.add(norm(b.repName)==='BOS'?'BOS POZISYON':norm(b.repName));m.orders+=periodOrders(IDX.orderByBrick.get(norm(b.brick))||[]).length;map.set(p,m)}const reps=new Map(allRepMetrics().map(x=>[x.rn,x]));return [...map.values()].map(x=>{const rs=[...x.repSet].map(r=>reps.get(r)).filter(Boolean),plan=rs.length?rs.reduce((a,r)=>a+n(r.plan),0)/rs.length:0,freq=rs.length?rs.reduce((a,r)=>a+n(r.freq),0)/rs.length:0;return {...x,gap:Math.max(0,x.target-x.sales),real:x.target?100*x.sales/x.target:0,plan,freq}}).sort((a,b)=>b.sales-a.sales)}

