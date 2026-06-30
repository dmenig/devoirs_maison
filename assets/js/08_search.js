
// Recherche multi-granularités : régions · départements · communes.
// L'index complet (≈38 000 zones) reste en mémoire ; on filtre à la frappe et on ne
// pousse que les ~50 meilleurs résultats dans le datalist (insensible aux accents/casse).
const LVLAB={region:"région",departement:"dép.",commune:"commune"};
const LVRANK={region:0,departement:1,commune:2};
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ᵉ/g,"e").toLowerCase();
const regNom=c=>(window.__hier&&window.__hier.regions[c])||c;
const depNom=c=>(window.__hier&&window.__hier.depNom[c])||c;

async function initSearch(){
  const [idx,hier]=await Promise.all([getJSON("values/search_index.json"),getJSON("values/_hierarchie.json")]);
  if(hier)window.__hier={regions:hier.regions||{},
    depNom:Object.fromEntries((hier.departements||[]).map(d=>[d.code,d.nom]))};
  if(!idx)return;
  // l'échelle circonscription est retirée (présidentielle) : on l'écarte de l'index même
  // si search_index.json (servi depuis master) la contient encore avant régénération.
  const zones=idx.filter(e=>e.niveau!=="circonscription");
  zones.forEach(e=>{e.__nom=norm(e.nom);e.__n=e.__nom+" "+e.code.toLowerCase();});
  const sb=$("search"),dl=$("zones"); sb.__byval={};
  const fill=q=>{ dl.innerHTML="";
    const toks=norm(q.trim()).split(/\s+/).filter(Boolean); if(!toks.length)return;
    const hits=[];
    for(const e of zones){ if(!toks.every(t=>e.__n.includes(t)))continue;
      hits.push([e,e.__nom.startsWith(toks[0])?0:1,LVRANK[e.niveau],e.__n.indexOf(toks[0]),e.nom.length]);
      if(hits.length>600)break; }
    hits.sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[3]-b[3]||a[4]-b[4]);
    for(const [e] of hits.slice(0,50)){ const val=`${e.nom} · ${LVLAB[e.niveau]} ${e.code}`;
      sb.__byval[val]=e; const o=document.createElement("option"); o.value=val; dl.appendChild(o); } };
  sb.addEventListener("input",()=>fill(sb.value)); }
// Atteindre n'importe quelle zone : on reconstruit le fil d'Ariane (avec les vrais noms
// des parents) puis on dessine et on cadre la zone — quel que soit son niveau.
async function gotoZone(e){ infoPanel(null);
  if(e.niveau==="region"){ stack=[{niveau:"region",code:e.code,nom:e.nom,bounds:null}];
    await vueRegion(e.code); }
  else if(e.niveau==="departement"){
    stack=[{niveau:"region",code:e.region,nom:regNom(e.region),bounds:null},
           {niveau:"departement",code:e.code,nom:e.nom,bounds:null}];
    await vueDepartement(e.code); }
  else{ stack=[{niveau:"region",code:e.region,nom:regNom(e.region),bounds:null},
               {niveau:"departement",code:e.dep,nom:depNom(e.dep),bounds:null}];
    await vueCommune(e.code); stack.push({niveau:"commune",code:e.code,nom:e.nom,bounds:null});
    const cv=await getJSON(`values/commune/${e.dep}.json`); infoPanel(e.nom,(cv||{})[e.code],"commune",e.code); }
  setFil();
  const b=layer&&layer.getBounds&&layer.getBounds();
  if(b&&b.isValid())flyTo(b,e.niveau==="commune"?15:11); }
$("search").addEventListener("change",()=>{ const sb=$("search"),e=sb.__byval&&sb.__byval[sb.value];
  if(e)gotoZone(e); });

async function init(){ buildSelecteur(); buildPastilles();
  window.__scr=await getJSON("values/_scrutins.json"); window.__adminFr=await getJSON("values/_admin_fr.json");
  window.__socioFr=await getJSON("values/_socio_fr.json"); window.__socioReg=await getJSON("values/_socio_reg.json");
  await initSearch(); vueFrance(); }
init();  // amorçage — perdu lors de l'éclatement en modules, sans quoi rien ne se charge
