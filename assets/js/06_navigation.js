
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

function paintLayer(geo,valeurs,enter,niveau){ if(layer)layer.remove();
  const fc=colorer(geo.features.map(f=>valOf(f.properties)));
  layer=L.geoJSON(geo,{style:f=>({fillColor:fc(valOf(f.properties)),color:"#1a1a1a",weight:.5,fillOpacity:.85}),
    onEachFeature:(f,ly)=>{ const v=valOf(f.properties);
      ly.bindTooltip(`<b>${f.properties.__nom}</b><br>${indicLabel} : ${fmtVal(v,indicUnit)}`,{sticky:true});
      ly.on("mouseover",()=>ly.setStyle({weight:2.4,color:"#fff"}));
      ly.on("mouseout",()=>layer.resetStyle(ly));
      const o=valeurs[f.properties.__code];
      const show=()=>infoPanel(f.properties.__nom,o,niveau,f.properties.__code);
      if(enter){ ly.__enter=()=>{show();enter(f,ly,o);};
        ly.on("click",()=>{show();enter(f,ly,o);}); }
      else ly.on("click",show); }}).addTo(map);
  fadeInLayer(); }

// `niveau` = maille des features dessinées (region/departement/commune/iris/bv) : il qualifie
// la fiche ouverte au clic, pour réserver le Carnet de campagne au clic sur une COMMUNE.
function dessiner(geo,valeurs,codeProp,nameProp,enter,niveau){ curVals=valeurs;
  geo.features.forEach(f=>{f.properties.__code=String(f.properties[codeProp]);
    f.properties.__nom=f.properties[nameProp]||f.properties.__code;});
  const draw=()=>paintLayer(geo,valeurs,enter,niveau);
  if(animating){ pendingDraw=draw; clearTimeout(pendingTimer); pendingTimer=setTimeout(flushDraw,1200); }
  else draw(); }

// En remontant, le panneau de droite ne se vide plus : il se relie à la zone désormais
// en focus (sommet de pile) — sinon, après un zoom sur un BV, l'info de la commune était
// définitivement perdue. Seul le retour à la France (pas de zone unique) referme la fiche.
function jumpTo(d){ stack=stack.slice(0,d); fadeOutLayer();
  if(d===0){ infoPanel(null); setFil(); return vueFrance(); }
  const t=stack[d-1]; infoPanel(t.nom,t.o,t.niveau,t.code); setFil();
  // remonter : on plafonne le zoom d'arrivée juste sous le seuil de redescente ZIN[d]
  // (tout en restant au-dessus de ZOUT[d]), sinon l'ajustement aux contours du parent
  // retombe pile sur le seuil et on replonge aussitôt dans la zone qu'on vient de quitter.
  flyTo(t.bounds, ZIN[d]!=null?ZIN[d]-0.1:15); render(t.niveau,t.code); }
function setFil(){ let h=`<span class="crumb" data-d="0">🇫🇷 France</span>`;
  stack.forEach((s,i)=>h+=` › <span class="crumb" data-d="${i+1}">${s.nom}</span>`);
  $("fil").innerHTML=h; $("fil").querySelectorAll(".crumb").forEach(e=>e.onclick=()=>jumpTo(+e.dataset.d));
  $("back").disabled=stack.length===0; }

function flyTo(b,maxZoom){ if(!b)return; busy=true; animating=true;
  map.flyToBounds(b,{duration:.8,maxZoom:maxZoom||11,
    paddingTopLeft:[0,topInset()],paddingBottomRight:[infoInset(),sheetInset()]});
  map.once("moveend",()=>{ animating=false; if(stack.length)stack[stack.length-1].enterZoom=map.getZoom();
    // le zoomend final du vol ne doit PAS déclencher onZoomSettled (sinon descente auto en
    // cascade après un clic/saut) — on purge le debounce posé par ce zoomend programmatique.
    clearTimeout(zoomSettle); flushDraw(); setTimeout(()=>busy=false,320); }); }

async function vueFrance(){ stack=[]; setFil(); subToggle(false); flyTo(FRANCE,6);
  dessiner(await getJSON("geo/regions.geojson"),await getJSON("values/region.json"),"code","nom",
    (f,ly,o)=>entrer("region",f.properties.__code,f.properties.__nom,ly.getBounds(),o),"region"); }
async function vueRegion(code){ subToggle(false);
  const [geo,val,hier]=await Promise.all([getJSON("geo/departements.geojson"),
    getJSON("values/departement.json"),getJSON("values/_hierarchie.json")]);
  const deps=new Set(hier.departements.filter(d=>d.region===code).map(d=>d.code));
  dessiner({type:"FeatureCollection",features:geo.features.filter(f=>deps.has(String(f.properties.code)))},
    val,"code","nom",(f,ly,o)=>entrer("departement",f.properties.__code,f.properties.__nom,ly.getBounds(),o),"departement"); }
// Présidentielle : pas d'échelle circonscription (scrutin national). Le département
// descend directement aux communes — ce qui dissout aussi le bug des communes à cheval
// sur deux circos (cf. EVOLUTIONS.md, chantier 1).
async function vueDepartement(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/communes/${code}.geojson`),getJSON(`values/commune/${code}.json`)]);
  if(!geo){$("loading").textContent="contours indisponibles";return;}
  dessiner(geo,val||{},"code","nom",(f,ly,o)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds(),o),"commune"); }
const subToggle=show=>{ const adv=document.body.classList.contains("adv");
  $("subtoggle").style.display=(show&&adv)?"flex":"none";
  if(!show){ sousMode="bv";
    $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m==="bv")); }
  syncSocioChips(); };
async function vueCommune(code){ const dep=depOf(code); subToggle(true);
  if(sousMode==="iris"){
    const [geo,val]=await Promise.all([getJSON(`geo/iris/${dep}.geojson`),getJSON("values/iris.json")]);
    if(!geo){$("loading").textContent="quartiers indisponibles ici";return;}
    const fc={type:"FeatureCollection",features:geo.features.filter(f=>irisInCommune(String(f.properties.code_iris),code))};
    if(!fc.features.length){$("loading").textContent="pas de données par quartier";return;}
    dessiner(fc,val||{},"code_iris","nom_iris",null,"iris"); return; }
  const [geo,val]=await Promise.all([getJSON(`geo/bv/${dep}.geojson`),getJSON(`values/bv/${dep}.json`)]);
  if(!geo){$("loading").textContent="contours BV indisponibles";return;}
  const tous=geo.features.filter(f=>String(f.properties.code_commune)===code);
  if(!tous.length){$("loading").textContent="pas de bureaux";return;}
  // chantier 4 : on n'affiche que les bureaux au tracé fiable ; les Voronoï absurdes
  // (polygones disjoints) sont masqués plutôt qu'affichés faux. Données restituables via l'export.
  const fiables=tous.filter(bvFiable), masques=tous.length-fiables.length;
  $("loading").textContent=masques?`${masques}/${tous.length} bureau·x au tracé peu fiable masqué·s — voir l'export`:"";
  if(!fiables.length){$("loading").textContent="contours de bureaux trop peu fiables ici — utilisez l'export des données";return;}
  dessiner({type:"FeatureCollection",features:fiables},val||{},"bureau","bureau",null,"bv"); }

function render(n,c){ if(n==="region")vueRegion(c);else if(n==="departement")vueDepartement(c);
  else if(n==="commune")vueCommune(c); }
function entrer(niveau,code,nom,bounds,o){ stack.push({niveau,code,nom,bounds,o}); setFil();
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
    if(z<=thr){ map.scrollWheelZoom.disable(); map.scrollWheelZoom.enable();
      // si la fiche affiche un sous-élément (BV/IRIS) de la zone en focus, le 1er dézoom
      // restaure d'abord la fiche de la zone (la commune) ; on ne remonte qu'au dézoom suivant.
      if(lastInfo&&lastInfo.code!==top.code){ infoPanel(top.nom,top.o,top.niveau,top.code); return; }
      jumpTo(d-1); } } }
// un zoomend pendant un vol programmatique (clic/saut) ne doit jamais armer la descente
// auto : sinon le zoom d'arrivée, au-dessus de ZIN, fait replonger d'un niveau tout seul
// (clic Région → descente parasite dans le département centré).
map.on("zoomend",()=>{ if(busy||animating)return; clearTimeout(zoomSettle); zoomSettle=setTimeout(onZoomSettled,260); });
