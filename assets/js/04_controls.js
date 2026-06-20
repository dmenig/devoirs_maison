
// pastilles d'indicateurs (pas de menu déroulant) ; les pastilles « dyn_* » affichent
// la paire de scrutins choisie (ex. « Report LFI P22→E24 »).
const labelFor=k=>{ const p=PAST.find(x=>x[0]===k); if(!p)return k;
  return k.startsWith("dyn_")?`${p[1]} ${selA}→${selB}`:p[1]; };
// la paire de scrutins ne colore la carte que pour les indicateurs « dyn_* » : on allume
// le cadre ⚖️ quand l'un d'eux est l'indicateur actif, on le grise sinon.
const updatePairActive=()=>$("pairgroup").classList.toggle("active",indicKey.startsWith("dyn_"));
function setIndic(k){ const p=PAST.find(x=>x[0]===k); if(!p)return;
  indicKey=p[0]; indicLabel=labelFor(k); indicUnit=p[2]||""; $("legtitle").textContent=indicLabel;
  $("pastilles").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.k===k));
  updatePairActive(); }
function buildPastilles(){ const box=$("pastilles"), grp=$("pairgroup");
  PAST.forEach(([k])=>{ const c=document.createElement("span"); c.className="chip"+(k===indicKey?" on":"");
    c.textContent=labelFor(k); c.dataset.k=k;
    c.onclick=()=>{ setIndic(k); const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); };
    (k.startsWith("dyn_")?grp:box).appendChild(c); });
  $("legtitle").textContent=labelFor(indicKey); updatePairActive(); }
// sélecteur de deux scrutins : peuple A/B et recalcule réservoirs (carte + fiche) à la volée
function buildSelecteur(){
  for(const id of ["selA","selB"]){ const sel=$(id), cur=id==="selA"?selA:selB;
    sel.innerHTML=SCR.map(([c,l])=>`<option value="${c}"${c===cur?" selected":""}>${l}</option>`).join("");
    sel.onchange=()=>{ selA=$("selA").value; selB=$("selB").value; refreshPair(); }; } }
function refreshPair(){
  $("pastilles").querySelectorAll(".chip").forEach(c=>{ if(c.dataset.k.startsWith("dyn_"))c.textContent=labelFor(c.dataset.k); });
  if(indicKey.startsWith("dyn_")){ indicLabel=labelFor(indicKey); $("legtitle").textContent=indicLabel;
    const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); }
  if(lastInfo)infoPanel(lastInfo.nom,lastInfo.o); }
// clic sur une section : translate la fiche sur le côté pour révéler son détail (et retour)
$("info").addEventListener("click",e=>{ const sl=$("info").querySelector(".slider"); if(!sl)return;
  if(e.target.closest(".back")){ sl.classList.remove("on"); $("info").scrollTop=0; return; }
  const h=e.target.closest(".exph"); if(!h)return;
  sl.querySelector(".detbody").innerHTML=panelDetails[+h.dataset.di];
  sl.classList.add("on"); $("info").scrollTop=0; });
// bascule Bureaux de vote ⇄ Quartiers IRIS (au niveau commune)
$("subtoggle").querySelectorAll(".chip").forEach(c=>c.onclick=()=>{ const m=c.dataset.m; if(m===sousMode)return;
  sousMode=m; $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m===m));
  const socio=indicKey==="rev"||indicKey==="pauv";
  if(m==="iris"&&!socio)setIndic("rev"); else if(m==="bv"&&socio)setIndic("lfi_E24");
  const t=stack[stack.length-1]; if(t&&t.niveau==="commune")vueCommune(t.code); });

// Recherche multi-granularités : régions · départements · circonscriptions · communes.
// L'index complet (≈38 000 zones) reste en mémoire ; on filtre à la frappe et on ne
// pousse que les ~50 meilleurs résultats dans le datalist (insensible aux accents/casse).
const LVLAB={region:"région",departement:"dép.",circonscription:"circ.",commune:"commune"};
const LVRANK={region:0,departement:1,circonscription:2,commune:3};
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ᵉ/g,"e").toLowerCase();
const regNom=c=>(window.__hier&&window.__hier.regions[c])||c;
const depNom=c=>(window.__hier&&window.__hier.depNom[c])||c;

async function initSearch(){
  const [idx,hier]=await Promise.all([getJSON("values/search_index.json"),getJSON("values/_hierarchie.json")]);
  if(hier)window.__hier={regions:hier.regions||{},
    depNom:Object.fromEntries((hier.departements||[]).map(d=>[d.code,d.nom]))};
  if(!idx)return;
  idx.forEach(e=>{e.__nom=norm(e.nom);e.__n=e.__nom+" "+e.code.toLowerCase();});
  const sb=$("search"),dl=$("zones"); sb.__byval={};
  const fill=q=>{ dl.innerHTML=""; sb.__byval={};
    const toks=norm(q.trim()).split(/\s+/).filter(Boolean); if(!toks.length)return;
    const hits=[];
    for(const e of idx){ if(!toks.every(t=>e.__n.includes(t)))continue;
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
  else if(e.niveau==="circonscription"){
    stack=[{niveau:"region",code:e.region,nom:regNom(e.region),bounds:null},
           {niveau:"departement",code:e.dep,nom:depNom(e.dep),bounds:null},
           {niveau:"circonscription",code:e.code,nom:e.nom,bounds:null}];
    await vueCirconscription(e.code); }
  else{ stack=[{niveau:"region",code:e.region,nom:regNom(e.region),bounds:null},
               {niveau:"departement",code:e.dep,nom:depNom(e.dep),bounds:null}];
    await vueCommune(e.code); stack.push({niveau:"commune",code:e.code,nom:e.nom,bounds:null});
    const cv=await getJSON(`values/commune/${e.dep}.json`); infoPanel(e.nom,(cv||{})[e.code]); }
  setFil();
  const b=layer&&layer.getBounds&&layer.getBounds();
  if(b&&b.isValid())flyTo(b,e.niveau==="commune"?15:11); }
$("search").addEventListener("change",()=>{ const sb=$("search"),e=sb.__byval&&sb.__byval[sb.value];
  if(e)gotoZone(e); });

async function init(){ buildSelecteur(); buildPastilles();
  window.__scr=await getJSON("values/_scrutins.json"); window.__adminFr=await getJSON("values/_admin_fr.json");
  await initSearch(); vueFrance(); }
