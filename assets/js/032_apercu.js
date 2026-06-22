
// Vue d'ensemble locale embarquée en bas de la fiche commune. Ground truth (fil de
// discussion) : « il faut ajouter les cartes en bas du truc d'Elia, en mode vue générale
// au niveau le plus pertinent pour un GA » + « comparer aux voisins, checker la géographie ».
// → petites cartes SVG (small multiples) de la commune dans son voisinage, sur le scrutin
// par défaut (Europ. 2024). Pour Paris/Lyon/Marseille, pas de géométrie infra-communale :
// on classe les ARRONDISSEMENTS (la maille d'un Groupe d'action) à partir des valeurs bakées.
const APERCU_SCR="E24", APERCU_K=18;
const APERCU_IND=[["lfi","Vote LFI"],["part","Participation"],["rn","Vote RN"]];
let apercuSeq=0;
const _dist2=(a,b)=>{ const dx=a[0]-b[0],dy=a[1]-b[1]; return dx*dx+dy*dy; };

// géométrie GeoJSON (lon/lat) → tracé SVG ; centroïde grossier (anneau extérieur).
const _ringD=(ring,proj)=>{ let d=""; for(let i=0;i<ring.length;i++){ const [x,y]=proj(ring[i][0],ring[i][1]);
  d+=(i?"L":"M")+x.toFixed(1)+","+y.toFixed(1); } return d+"Z"; };
function _featD(geom,proj){ if(!geom)return "";
  const polys=geom.type==="MultiPolygon"?geom.coordinates:geom.type==="Polygon"?[geom.coordinates]:[];
  return polys.map(rings=>rings.map(r=>_ringD(r,proj)).join("")).join(""); }
function _centro(geom){ const polys=geom.type==="MultiPolygon"?geom.coordinates:[geom.coordinates];
  let sx=0,sy=0,n=0; polys.forEach(rings=>rings[0].forEach(([x,y])=>{ sx+=x; sy+=y; n++; }));
  return n?[sx/n,sy/n]:[0,0]; }
function _projecteur(feats,W,H,pad){ let a=1e9,b=1e9,c=-1e9,d=-1e9;
  feats.forEach(f=>{ const polys=f.geometry.type==="MultiPolygon"?f.geometry.coordinates:[f.geometry.coordinates];
    polys.forEach(rings=>rings[0].forEach(([x,y])=>{ if(x<a)a=x; if(x>c)c=x; if(y<b)b=y; if(y>d)d=y; })); });
  const s=Math.min((W-2*pad)/((c-a)||1),(H-2*pad)/((d-b)||1));
  const ox=pad+((W-2*pad)-s*(c-a))/2, oy=pad+((H-2*pad)-s*(d-b))/2;
  return (x,y)=>[ox+s*(x-a),oy+s*(d-y)]; }            // latitude inversée (sud en bas)

// petites cartes du voisinage (cas général : commune entourée de ses voisines).
function apercuCartes(geo,vals,code){
  const cur=geo.features.find(f=>String(f.properties.code)===code); if(!cur)return "";
  const cc=_centro(cur.geometry);
  const near=geo.features.map(f=>({f,d:_dist2(_centro(f.geometry),cc)}))
    .sort((x,y)=>x.d-y.d).slice(0,APERCU_K).map(x=>x.f);
  const W=150,H=128,pad=5, proj=_projecteur(near,W,H,pad);
  const paths=near.map(f=>({code:String(f.properties.code),nom:f.properties.nom,d:_featD(f.geometry,proj)}));
  const cards=APERCU_IND.map(([k,lab])=>{ const key=`${k}_${APERCU_SCR}`;
    const series=near.map(f=>{ const o=vals[String(f.properties.code)]; return o?o[key]:null; });
    if(!series.some(v=>v!=null))return "";
    const fc=colorer(series);
    const svg=paths.map((p,i)=>{ const v=series[i], cu=p.code===code;
      return `<path d="${p.d}" fill="${v==null?'#3a3a3a':fc(v)}" stroke="${cu?'#fff':'#15131c'}" `+
        `stroke-width="${cu?1.6:.4}"><title>${p.nom} — ${v==null?'—':v+'%'}</title></path>`; }).join("");
    return `<figure class="amini"><figcaption>${lab}</figcaption>`+
      `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet">${svg}</svg></figure>`;
  }).filter(Boolean).join("");
  if(!cards)return "";
  return `<div class="aminis">${cards}</div>`+
    `<div class="ahint">Commune (contour blanc) comparée à ses voisines · Europ. 2024 · couleur = rang local (bleu faible → rouge élevé).</div>`;
}

// Paris/Lyon/Marseille : pas de contours d'arrondissement, et le vote n'est baké qu'à la
// commune entière. On agrège donc les BUREAUX par arrondissement (2 premiers chiffres du code
// local : 75056_AABB → arr. AA) pour retrouver les MÊMES indicateurs qu'ailleurs (LFI /
// participation / RN, Europ. 2024). Chaque indicateur étant un % d'inscrits, l'agrégat exact
// est la moyenne pondérée par les inscrits (inscrits du bureau = abstention ÷ (1 − participation)).
const arrLabel=a=>{ const n=+a; return n+(n===1?"ᵉʳ":"ᵉ")+" arr."; };
const _inscrits=o=>(o.abst==null||o.part_E24==null||o.part_E24>=100)?null:o.abst/(1-o.part_E24/100);
function apercuArrond(plmCode,bv){
  const groups={};
  for(const full in bv){ const i=full.indexOf("_"); if(i<0)continue;
    if(full.slice(0,i)!==plmCode)continue;
    const a=full.slice(i+1,i+3); if(!/^\d\d$/.test(a)||+a<1)continue;   // écarte les bureaux spéciaux (JUS1, arr. 00)
    (groups[a]=groups[a]||[]).push(bv[full]); }
  const arrs=Object.keys(groups).sort(); if(!arrs.length)return "";
  const aggr=(list,key)=>{ let sw=0,sv=0; list.forEach(o=>{ const w=_inscrits(o),v=o[key];
    if(w!=null&&v!=null){ sw+=w; sv+=w*v; } }); return sw?sv/sw:null; };
  const cols=APERCU_IND.map(([k,lab])=>{ const key=`${k}_${APERCU_SCR}`;
    const series=arrs.map(a=>aggr(groups[a],key));
    if(!series.some(v=>v!=null))return "";
    const max=Math.max(1,...series.map(v=>v==null?0:v));
    const rows=arrs.map((a,i)=>{ const v=series[i];
      return `<div class="arow"><span class="al">${arrLabel(a)}</span>`+
        `<span class="ab"><i style="width:${v==null?0:Math.max(2,100*v/max).toFixed(0)}%"></i></span>`+
        `<b>${v==null?'—':v.toFixed(1)+'%'}</b></div>`; }).join("");
    return `<figure class="amini wide"><figcaption>${lab}</figcaption>${rows}</figure>`; }).filter(Boolean).join("");
  if(!cols)return "";
  return `<div class="aminis">${cols}</div>`+
    `<div class="ahint">Par arrondissement (bureaux agrégés, pondérés par les inscrits) — la maille d'un Groupe d'action · Europ. 2024.</div>`;
}

// rendu asynchrone : la fiche est posée en HTML synchrone (placeholder #apercu), puis remplie
// dès que geo/values du département sont là (souvent déjà en cache). Un jeton évite d'écrire
// dans la fiche d'une AUTRE commune ouverte entre-temps.
async function fillApercu(code){ const seq=++apercuSeq, dep=depOf(code);
  if(!$("info").querySelector("#apercu"))return;
  let html="";
  if(PLM[code]){                                   // Paris/Lyon/Marseille → agrégation par arrondissement
    const bv=await getJSON(`values/bv/${dep}.json`); if(seq!==apercuSeq)return;
    html=bv?apercuArrond(code,bv):"";
  }else{
    const [geo,vals]=await Promise.all([getJSON(`geo/communes/${dep}.geojson`),getJSON(`values/commune/${dep}.json`)]);
    if(seq!==apercuSeq)return;
    const cur=geo&&geo.features.find(f=>String(f.properties.code)===code);
    if(cur&&geo.features.length>2)html=apercuCartes(geo,vals||{},code);
  }
  const host=$("info").querySelector("#apercu"); if(!host)return;
  host.innerHTML=html||`<div class="ahint">Vue d'ensemble locale indisponible ici.</div>`;
}
