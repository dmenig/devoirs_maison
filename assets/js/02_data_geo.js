const depOf=c=>c.startsWith("97")?c.slice(0,3):c.slice(0,2);
// circonscription : nom synthétique (le contour INSEE ne porte que le code DEP-NN)
const circoNom=(code,dep)=>{ const n=parseInt((String(code).split("-")[1]||"").replace(/^0+/,""))||0;
  return (n===1?"1re":(n||"?")+"ᵉ")+" circ."+(dep?" — "+dep:""); };
// Rattachement commune ⇄ circonscription côté carte (pas de table embarquée). On partitionne
// par le centroïde : une commune est rattachée à la circo contenant son centre. Les circos
// purement urbaines (découpe d'une grande commune — ex. Lyon scindé en plusieurs circos) ne
// contiennent le centre d'aucune commune entière : on y rabat alors la commune englobante.
function ringArea(r){ let A=0; for(let i=0,j=r.length-1;i<r.length;j=i++) A+=r[j][0]*r[i][1]-r[i][0]*r[j][1]; return Math.abs(A/2); }
function centroid(geom){ const polys=geom.type==="MultiPolygon"?geom.coordinates:[geom.coordinates];
  const poly=polys.reduce((a,b)=>ringArea(b[0])>ringArea(a[0])?b:a), r=poly[0];
  let A=0,cx=0,cy=0; for(let i=0,j=r.length-1;i<r.length;j=i++){
    const f=r[j][0]*r[i][1]-r[i][0]*r[j][1]; A+=f; cx+=(r[j][0]+r[i][0])*f; cy+=(r[j][1]+r[i][1])*f; }
  A*=.5; return A?[cx/(6*A),cy/(6*A)]:[r[0][0],r[0][1]]; }
function ptInRing(x,y,r){ let ins=false; for(let i=0,j=r.length-1;i<r.length;j=i++){
  const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];
  if(((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi) ins=!ins; } return ins; }
function ptInGeom(x,y,geom){ const ps=geom.type==="MultiPolygon"?geom.coordinates:[geom.coordinates];
  for(const poly of ps){ if(!ptInRing(x,y,poly[0]))continue;
    let hole=false; for(let h=1;h<poly.length;h++) if(ptInRing(x,y,poly[h])){hole=true;break;}
    if(!hole)return true; } return false; }

// Coloration par RANG (percentile) parmi les zones affichées : les couleurs
// s'étalent sur toute la distribution (chaque zone ayant une valeur est colorée).
// Le centre (blanc) = la médiane des zones ; bleu = plus faible, rouge = plus élevé.
function colorer(vals){ const xs=vals.filter(v=>v!=null&&!isNaN(v)).sort((a,b)=>a-b);
  if(!xs.length)return()=>"#3a3a3a";
  const n=xs.length, s=["#3b8fd4","#2d5b82","#46415a","#9e3b34","#d23f2d"];
  const rang=v=>{ let lo=0,hi=n; while(lo<hi){const md=(lo+hi)>>1; xs[md]<v?lo=md+1:hi=md;}
    let hi2=lo; while(hi2<n&&xs[hi2]===v)hi2++; return ((lo+hi2)/2)/n; };
  return v=>{ if(v==null||isNaN(v))return"#3a3a3a";
    const x=rang(v)*(s.length-1),i=Math.floor(x); return (x-i)<.5||i+1>=s.length?s[i]:s[i+1]; }; }
// Réservoirs entre les deux scrutins choisis (A→B), recalculés à la volée à partir des
// voix réelles bakées (lfiv_*, gv_*) et de la participation — mêmes formules que
// indicators.reservoirs : report = voixB/voixA, perte gauche = (voixA−voixB)/voixA,
// différentiel de participation = part B − part A (points).
function pairMetrics(o){ if(!o)return {};
  const lvA=o[`lfiv_${selA}`], lvB=o[`lfiv_${selB}`], gvA=o[`gv_${selA}`], gvB=o[`gv_${selB}`],
        pA=o[`part_${selA}`], pB=o[`part_${selB}`];
  return {
    report: lvA?Math.round(1000*lvB/lvA)/10:null,
    perte:  gvA?Math.round(1000*(gvA-gvB)/gvA)/10:null,
    dpart:  (pA!=null&&pB!=null)?Math.round((pB-pA)*10)/10:null };
}
// Les autres valeurs sont bakées par prep_bake.py et lues telles quelles.
function rawVal(o,k){ if(!o)return null;
  if(k==="dyn_report")return pairMetrics(o).report;
  if(k==="dyn_dpart") return pairMetrics(o).dpart;
  if(k==="dyn_perte") return pairMetrics(o).perte;
  if(STAT.has(k)) return o[`${k}_${selB}`];  // instantané du scrutin B (lfi/part/rn/gauche)
  return o[k]; }
const valOf=p=>rawVal(curVals[p.__code],indicKey);

