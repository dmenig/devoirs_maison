
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

// Paris/Lyon/Marseille : faute de contours d'arrondissement, on classe les arrondissements
// (échelle d'un GA) en barres — à partir des valeurs d'arrondissement déjà bakées.
function arrLabel(code){ const n=code.startsWith("6938")?+code.slice(-1):+code.slice(-2);
  return n+(n===1?"ᵉʳ":"ᵉ")+" arr."; }
function apercuArrond(code,vals){ const rx=PLM[code];
  const sibs=Object.keys(vals).filter(c=>rx.test(c)&&c!==code).sort(); if(!sibs.length)return "";
  const cols=APERCU_IND.map(([k,lab])=>{ const key=`${k}_${APERCU_SCR}`;
    const max=Math.max(1,...sibs.map(c=>vals[c]&&vals[c][key]!=null?vals[c][key]:0));
    const rows=sibs.map(c=>{ const v=vals[c]?vals[c][key]:null;
      return `<div class="arow"><span class="al">${arrLabel(c)}</span>`+
        `<span class="ab"><i style="width:${v==null?0:Math.max(2,100*v/max).toFixed(0)}%"></i></span>`+
        `<b>${v==null?'—':v+'%'}</b></div>`; }).join("");
    return `<figure class="amini wide"><figcaption>${lab}</figcaption>${rows}</figure>`; }).join("");
  return `<div class="aminis">${cols}</div>`+
    `<div class="ahint">Comparaison par arrondissement — la maille d'un Groupe d'action · Europ. 2024.</div>`;
}

// rendu asynchrone : la fiche est posée en HTML synchrone (placeholder #apercu), puis remplie
// dès que geo/values du département sont là (souvent déjà en cache). Un jeton évite d'écrire
// dans la fiche d'une AUTRE commune ouverte entre-temps.
async function fillApercu(code){ const seq=++apercuSeq, dep=depOf(code);
  if(!$("info").querySelector("#apercu"))return;
  const [geo,vals]=await Promise.all([getJSON(`geo/communes/${dep}.geojson`),getJSON(`values/commune/${dep}.json`)]);
  if(seq!==apercuSeq)return;
  const host=$("info").querySelector("#apercu"); if(!host)return;
  const cur=geo&&geo.features.find(f=>String(f.properties.code)===code);
  const html=(cur&&geo.features.length>2)?apercuCartes(geo,vals||{},code)
    :(PLM[code]?apercuArrond(code,vals||{}):"");
  host.innerHTML=html||`<div class="ahint">Vue d'ensemble locale indisponible ici.</div>`;
}
