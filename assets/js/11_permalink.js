
// Permalien : l'URL de la PAGE (pas de l'iframe) reflète la vue courante — centre `ll`,
// zoom `z`, zone en focus `e` (niveau:code, sommet de pile), sous-mode `sm` (quartiers
// IRIS) et fiche ouverte `f` (BV/IRIS cliqué) — pour qu'un militant sauvegarde l'URL et
// retombe exactement sur sa vue. Écriture via replaceState (pas de rechargement, pas
// d'entrée d'historique à chaque zoom). La carte vit dans l'iframe srcdoc du composant
// Streamlit, et Streamlit Community Cloud enveloppe LUI-MÊME l'app dans un iframe interne
// (/~/+/, même origine que la barre d'adresse) : window.parent n'est donc PAS la page
// visible. On grimpe la chaîne d'ancêtres jusqu'à la plus haute fenêtre même-origine
// (window.top en déployé comme en local) ; un ancêtre cross-origin arrête la montée et
// on dégrade en silence sur la dernière fenêtre accessible.
const URL_KEYS=["ll","z","e","sm","f"];
function permWin(){ let w=window;
  try{ while(w!==w.parent){ void w.parent.location.href; w=w.parent; } }catch(e){}
  return w; }
function urlState(){ const c=map.getCenter(), top=stack[stack.length-1];
  const p={ll:c.lat.toFixed(4)+","+c.lng.toFixed(4), z:map.getZoom().toFixed(2)};
  if(top){ p.e=top.niveau+":"+top.code;
    if(top.niveau==="commune"&&sousMode==="iris")p.sm="iris"; }
  if(lastInfo&&top&&lastInfo.code!==top.code&&(lastInfo.niveau==="bv"||lastInfo.niveau==="iris"))
    p.f=lastInfo.niveau+":"+lastInfo.code;
  return p; }
let urlTimer=null;
function writeURL(){ clearTimeout(urlTimer); urlTimer=setTimeout(()=>{ try{
  const w=permWin(), u=new URL(w.location.href), p=urlState();
  URL_KEYS.forEach(k=>u.searchParams.delete(k));
  URL_KEYS.forEach(k=>{ if(p[k]!=null)u.searchParams.set(k,p[k]); });
  w.history.replaceState(null,"",u); }catch(e){} },300); }
map.on("moveend",writeURL);

// La restauration attend la fin des vols programmatiques (flyTo pose busy/animating)
// avant d'appliquer le zoom/centre sauvegardés, sinon les deux animations se disputent
// la caméra. Garde-fou temporel : on n'attend jamais plus de 4 s.
const waitIdle=()=>new Promise(res=>{ const t0=Date.now();
  (function chk(){ if((!busy&&!animating)||Date.now()-t0>4000)return res(); setTimeout(chk,120); })(); });

// Fiche d'un sous-élément (BV/IRIS) de la commune en focus : rouverte depuis les fichiers
// de valeurs (mêmes données que le clic sur la couche), le nom IRIS depuis les contours.
async function restoreFiche(f){ const [niv,code]=f.split(":"), top=stack[stack.length-1];
  if(!top||top.niveau!=="commune")return; const dep=depOf(top.code);
  if(niv==="bv"){ const val=await getJSON(`values/bv/${dep}.json`), o=(val||{})[code];
    if(o)infoPanel(code,o,"bv",code); }
  else if(niv==="iris"){ const [geo,val]=await Promise.all([getJSON(`geo/iris/${dep}.geojson`),getJSON("values/iris.json")]);
    const o=(val||{})[code]; if(!o)return;
    const ft=geo&&geo.features.find(x=>String(x.properties.code_iris)===code);
    infoPanel((ft&&ft.properties.nom_iris)||code,o,"iris",code); } }

// Amorçage : appelé par init() À LA PLACE de vueFrance() quand l'URL porte une vue.
// On rejoue la navigation réelle (gotoZone reconstruit le fil d'Ariane et charge la bonne
// couche) puis on rétablit le cadrage exact. enterZoom est réaligné sur le zoom restauré
// pour que la remontée relative au dézoom (ZBACK) reparte du bon repère ; zoomSettle est
// purgé pour que ce setView programmatique n'arme pas la descente/remontée auto.
async function restoreFromURL(){ let q; try{ q=new URL(permWin().location.href).searchParams; }catch(e){ return false; }
  const e=q.get("e"), z=parseFloat(q.get("z")), ll=(q.get("ll")||"").split(",").map(Number);
  const hasView=!isNaN(z)&&ll.length===2&&ll.every(v=>!isNaN(v));
  if(!e&&!hasView)return false;
  if(q.get("sm")==="iris"){ sousMode="iris";
    $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m==="iris")); }
  if(e){ const [niv,code]=e.split(":"), idx=await getJSON("values/search_index.json");
    const ent=(idx||[]).find(x=>x.niveau===niv&&x.code===code);
    if(!ent&&!hasView)return false;
    if(ent)await gotoZone(ent); else await vueFrance(); }
  else await vueFrance();
  await waitIdle();
  if(hasView){ busy=true; map.setView(ll,z,{animate:false}); clearTimeout(zoomSettle);
    if(stack.length)stack[stack.length-1].enterZoom=z;
    flushDraw(); setTimeout(()=>busy=false,350); }
  const f=q.get("f"); if(f)await restoreFiche(f);
  writeURL(); return true; }
