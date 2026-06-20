
// Affichage fluide : on prépare la couche mais on ne la PEINT que lorsque la caméra est
// posée (animating=false). Peindre une couche lourde sur le renderer Canvas pendant un
// flyTo produit le « blink » et les bandes partielles (canvas CSS-transformé puis
// repeint) — on défère donc à la fin de l'animation, avec un fondu d'apparition. Le fetch
// reste lancé tôt (il chevauche le vol). Un minuteur de secours garantit le rendu si
// moveend n'arrive pas (ex. flyToBounds sans déplacement à l'amorçage).
let animating=false, pendingDraw=null, pendingTimer=null;
function overlayEl(){ const p=map.getPanes().overlayPane; return p.querySelector("canvas")||p.querySelector("svg"); }
function fadeInLayer(){ const el=overlayEl(); if(!el)return;
  el.style.transition="none"; el.style.opacity="0";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.style.transition="opacity .45s ease"; el.style.opacity="1"; })); }
function fadeOutLayer(){ const el=overlayEl(), old=layer; layer=null;
  if(old&&el){ el.style.transition="opacity .25s ease"; el.style.opacity="0"; }
  if(old)setTimeout(()=>old.remove(),260); }
function flushDraw(){ clearTimeout(pendingTimer);
  if(pendingDraw){ const d=pendingDraw; pendingDraw=null; d(); } }

function paintLayer(geo,valeurs,enter){ if(layer)layer.remove();
  const fc=colorer(geo.features.map(f=>valOf(f.properties)));
  layer=L.geoJSON(geo,{style:f=>({fillColor:fc(valOf(f.properties)),color:"#1a1a1a",weight:.5,fillOpacity:.85}),
    onEachFeature:(f,ly)=>{ const v=valOf(f.properties);
      ly.bindTooltip(`<b>${f.properties.__nom}</b><br>${indicLabel} : ${fmtVal(v,indicUnit)}`,{sticky:true});
      ly.on("mouseover",()=>ly.setStyle({weight:2.4,color:"#fff"}));
      ly.on("mouseout",()=>layer.resetStyle(ly));
      if(enter){ ly.__enter=()=>enter(f,ly);
        ly.on("click",()=>{infoPanel(f.properties.__nom,valeurs[f.properties.__code]);enter(f,ly);}); }
      else ly.on("click",()=>infoPanel(f.properties.__nom,valeurs[f.properties.__code])); }}).addTo(map);
  fadeInLayer(); }

function dessiner(geo,valeurs,codeProp,nameProp,enter){ curVals=valeurs;
  geo.features.forEach(f=>{f.properties.__code=String(f.properties[codeProp]);
    f.properties.__nom=f.properties[nameProp]||f.properties.__code;});
  const draw=()=>paintLayer(geo,valeurs,enter);
  if(animating){ pendingDraw=draw; clearTimeout(pendingTimer); pendingTimer=setTimeout(flushDraw,1200); }
  else draw(); }

function jumpTo(d){ stack=stack.slice(0,d); infoPanel(null); setFil(); fadeOutLayer();
  if(d===0)return vueFrance(); const t=stack[d-1];
  // remonter : on plafonne le zoom d'arrivée juste sous le seuil de redescente ZIN[d]
  // (tout en restant au-dessus de ZOUT[d]), sinon l'ajustement aux contours du parent
  // retombe pile sur le seuil et on replonge aussitôt dans la zone qu'on vient de quitter.
  flyTo(t.bounds, ZIN[d]!=null?ZIN[d]-0.1:15); render(t.niveau,t.code); }
function setFil(){ let h=`<span class="crumb" data-d="0">🇫🇷 France</span>`;
  stack.forEach((s,i)=>h+=` › <span class="crumb" data-d="${i+1}">${s.nom}</span>`);
  $("fil").innerHTML=h; $("fil").querySelectorAll(".crumb").forEach(e=>e.onclick=()=>jumpTo(+e.dataset.d));
  $("back").disabled=stack.length===0; }

function flyTo(b,maxZoom){ if(!b)return; busy=true; animating=true; map.flyToBounds(b,{duration:.8,maxZoom:maxZoom||11});
  map.once("moveend",()=>{ animating=false; if(stack.length)stack[stack.length-1].enterZoom=map.getZoom();
    // le zoomend final du vol ne doit PAS déclencher onZoomSettled (sinon descente auto en
    // cascade après un clic/saut) — on purge le debounce posé par ce zoomend programmatique.
    clearTimeout(zoomSettle); flushDraw(); setTimeout(()=>busy=false,320); }); }

async function vueFrance(){ stack=[]; setFil(); subToggle(false); flyTo(FRANCE,6);
  dessiner(await getJSON("geo/regions.geojson"),await getJSON("values/region.json"),"code","nom",
    (f,ly)=>entrer("region",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueRegion(code){ subToggle(false);
  const [geo,val,hier]=await Promise.all([getJSON("geo/departements.geojson"),
    getJSON("values/departement.json"),getJSON("values/_hierarchie.json")]);
  const deps=new Set(hier.departements.filter(d=>d.region===code).map(d=>d.code));
  dessiner({type:"FeatureCollection",features:geo.features.filter(f=>deps.has(String(f.properties.code)))},
    val,"code","nom",(f,ly)=>entrer("departement",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueDepartement(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/circ/${code}.geojson`),getJSON("values/circonscription.json")]);
  if(!geo||!geo.features.length)return vueDeptCommunes(code); // dép. sans circo (outre-mer/étranger)
  const depNom=(stack[stack.length-1]||{}).nom||code;
  geo.features.forEach(f=>f.properties.nom=circoNom(f.properties.code_circonscription,depNom));
  dessiner(geo,val||{},"code_circonscription","nom",
    (f,ly)=>entrer("circonscription",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueDeptCommunes(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/communes/${code}.geojson`),getJSON(`values/commune/${code}.json`)]);
  if(!geo){$("loading").textContent="contours indisponibles";return;}
  dessiner(geo,val||{},"code","nom",(f,ly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds())); }
// communes d'une circonscription : on rabat les communes du département dont le centre
// tombe dans le contour de la circo (rattachement approché, front-only).
async function vueCirconscription(code){ subToggle(false); const dep=code.split("-")[0];
  const [cgeo,geo,val]=await Promise.all([getJSON(`geo/circ/${dep}.geojson`),
    getJSON(`geo/communes/${dep}.geojson`),getJSON(`values/commune/${dep}.json`)]);
  if(!geo){$("loading").textContent="contours communes indisponibles";return;}
  const cf=cgeo&&cgeo.features.find(f=>String(f.properties.code_circonscription)===code);
  let feats=geo.features;
  if(cf){ feats=geo.features.filter(f=>{const c=centroid(f.geometry);return ptInGeom(c[0],c[1],cf.geometry);});
    if(!feats.length){ const cc=centroid(cf.geometry); // circo urbaine : rabattre la commune englobante
      feats=geo.features.filter(f=>ptInGeom(cc[0],cc[1],f.geometry)); }
    if(!feats.length)feats=geo.features; }
  dessiner({type:"FeatureCollection",features:feats},val||{},"code","nom",
    (f,ly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds())); }
const subToggle=show=>{ $("subtoggle").style.display=show?"flex":"none";
  if(!show){ sousMode="bv";
    $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m==="bv")); }
  syncSocioChips(); };
async function vueCommune(code){ const dep=depOf(code); subToggle(true);
  if(sousMode==="iris"){
    const [geo,val]=await Promise.all([getJSON(`geo/iris/${dep}.geojson`),getJSON("values/iris.json")]);
    if(!geo){$("loading").textContent="quartiers indisponibles ici";return;}
    const fc={type:"FeatureCollection",features:geo.features.filter(f=>irisInCommune(String(f.properties.code_iris),code))};
    if(!fc.features.length){$("loading").textContent="pas de données par quartier";return;}
    dessiner(fc,val||{},"code_iris","nom_iris",null); return; }
  const [geo,val]=await Promise.all([getJSON(`geo/bv/${dep}.geojson`),getJSON(`values/bv/${dep}.json`)]);
  if(!geo){$("loading").textContent="contours BV indisponibles";return;}
  const fc={type:"FeatureCollection",features:geo.features.filter(f=>String(f.properties.code_commune)===code)};
  if(!fc.features.length){$("loading").textContent="pas de bureaux";return;}
  dessiner(fc,val||{},"bureau","bureau",null); }

function render(n,c){ if(n==="region")vueRegion(c);else if(n==="departement")vueDepartement(c);
  else if(n==="circonscription")vueCirconscription(c);else if(n==="commune")vueCommune(c); }
function entrer(niveau,code,nom,bounds){ stack.push({niveau,code,nom,bounds}); setFil();
  fadeOutLayer(); flyTo(bounds,niveau==="commune"?15:11); render(niveau,code); }
$("back").onclick=()=>jumpTo(stack.length-1);
// hooks de test/débogage (comme window.__map) : piloter la navigation, lister les zones dessinées
window.__enter=entrer;
window.__feats=()=>{const a=[];layer&&layer.eachLayer(l=>l.feature&&a.push(l.feature.properties.__nom));return a;};

// zoom-molette = descendre/remonter automatiquement
function featureAuCentre(){ if(!layer)return null; const c=map.getCenter(); let best=null,ba=1e18;
  layer.eachLayer(ly=>{ if(ly.getBounds){const b=ly.getBounds(); if(b.contains(c)){
    const a=(b.getEast()-b.getWest())*(b.getNorth()-b.getSouth()); if(a<ba){ba=a;best=ly;}}}}); return best; }
// remontée/descente auto au zoom-molette. On NE réagit PAS à chaque zoomend : Leaflet en
// émet plusieurs par coup de molette (momentum compris), ce qui faisait remonter en
// cascade. On attend que le zoom se POSE (debounce) puis on n'applique qu'UN saut — un
// dézoom continu = une seule remontée. Sur une remontée on purge en plus le delta molette
// en attente (disable/enable) pour que l'inertie post-flyTo ne déclenche pas un 2e saut.
let zoomSettle=null;
function onZoomSettled(){ if(busy)return; const z=map.getZoom(), d=stack.length;
  if(d<4 && ZIN[d]!=null && z>=ZIN[d]){ const f=featureAuCentre(); if(f&&f.__enter)f.__enter(); }
  else if(d>=1){ const top=stack[d-1];
    if(top.enterZoom==null) top.enterZoom=z;
    if(z>top.enterZoom){ top.enterZoom=z; return; } // on plonge : le repère suit le zoom le plus profond atteint
    const thr=Math.max(ZOUT[d], top.enterZoom-ZBACK);
    if(z<=thr){ map.scrollWheelZoom.disable(); map.scrollWheelZoom.enable(); jumpTo(d-1); } } }
// un zoomend pendant un vol programmatique (clic/saut) ne doit jamais armer la descente
// auto : sinon le zoom d'arrivée, au-dessus de ZIN, fait replonger d'un niveau tout seul
// (clic Région → descente parasite dans le département centré).
map.on("zoomend",()=>{ if(busy||animating)return; clearTimeout(zoomSettle); zoomSettle=setTimeout(onZoomSettled,260); });
