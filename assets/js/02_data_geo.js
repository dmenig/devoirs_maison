const depOf=c=>c.startsWith("97")?c.slice(0,3):c.slice(0,2);
// Paris/Lyon/Marseille : la commune INSEE (75056/69123/13055) agrège des arrondissements
// dont les IRIS portent le code d'arrondissement (751xx, 6938x, 132xx) — la jointure par
// préfixe à 5 sur le code commune renverrait 0 quartier. On élargit le filtre à ces villes.
const PLM={"75056":/^751\d\d/,"69123":/^6938\d/,"13055":/^132\d\d/};
const irisInCommune=(ci,code)=>{ const r=PLM[code]; return r?r.test(ci):ci.slice(0,5)===code; };

// Fiabilité géométrique d'un contour de bureau de vote (chantier 4). Les contours sont des
// Voronoï data.gouv (approchés) ; un découpage absurde se trahit par des polygones DISJOINTS.
// On préfère le drapeau `fiable` baké (prep_bv) ; à défaut on compte les parts côté client et
// on masque les BV trop fragmentés (au-delà de BV_MAX_PARTS) plutôt que d'afficher un tracé faux.
const BV_MAX_PARTS=2;
const geomParts=g=>g&&g.type==="MultiPolygon"?g.coordinates.length:1;
const bvFiable=f=>{ const p=f.properties;
  return p&&p.fiable!=null?!!(+p.fiable):geomParts(f.geometry)<=BV_MAX_PARTS; };

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

