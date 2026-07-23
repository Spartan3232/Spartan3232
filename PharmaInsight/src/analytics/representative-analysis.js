// Temsilci bazlı metrik hesaplama (hedef/satış/plan/frekans/kaveraj) — IDX.reps üzerinden.
function repMetric(repRow){
 const rn=norm(repRow.repName)==='BOS'?'BOS POZISYON':norm(repRow.repName);const sel=IDX.selByRep.get(rn)||[];const visits=periodVisits(IDX.visitByRep.get(rn)||[]);const orders=periodOrders(IDX.orderByRep.get(rn)||[]);const vcs=visitCounts(rn);
 const h=realTotal(repRow,'HEDEF'),s=realTotal(repRow,'SATIS'),real=h?100*s/h:rowPerf(repRow);const repBricks=IDX.bricks.filter(b=>(norm(b.repName)==='BOS'?'BOS POZISYON':norm(b.repName))===rn);const riskBricks=repBricks.filter(b=>rowPerf(b)<70).length;
 const planned=visits.filter(x=>x.planned).length,plan=visits.length?100*planned/visits.length:null;let visited=0,withTarget=0,compliant=0;const groups={};
 for(const x of sel){const g=SPEC[norm(x.specialty)];if(g)groups[g]=(groups[g]||0)+1;const c=vcs.get(norm(x.customer))||0;if(c>0)visited++;if(g&&FREQ[g]!=null){withTarget++;if(c>=FREQ[g])compliant++}}
 const coverage=sel.length?100*visited/sel.length:null,freq=withTarget?100*compliant/withTarget:null,selection=100*sel.length/MAX_SELECTION_TARGET;const pharmacies=new Set(orders.map(x=>norm(x.pharmacy))).size,qty=orders.reduce((a,x)=>a+n(x.qty),0);
 const assigned=new Set(IDX.assignment.get(rn)||[]);const wrong=sel.filter(x=>assigned.size&&!assigned.has(norm(x.brick))).length;
 let risk=0;risk+=clamp((85-real)/85,0,1)*38;risk+=clamp((85-(plan??0))/85,0,1)*18;risk+=clamp((85-(freq??0))/85,0,1)*18;risk+=clamp((80-selection)/80,0,1)*12;risk+=repBricks.length?riskBricks/repBricks.length*8:0;risk+=sel.length?Math.min(wrong/sel.length,1)*6:0;risk=clamp(risk,0,100);
 return {rn,name:displayRep(rn),row:repRow,target:h,sales:s,real,sel,selection,visits,plan,coverage,freq,withTarget,compliant,orders,pharmacies,qty,bricks:repBricks,riskBricks,groups,wrong,risk,gap:Math.max(0,h-s)}
}
function allRepMetrics(){return IDX.reps.map(repMetric).sort((a,b)=>b.real-a.real)}
