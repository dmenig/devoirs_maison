
// Affichage fluide : on prépare la couche mais on ne la PEINT que lorsque la caméra est
// posée (animating=false). Peindre une couche lourde sur le renderer Canvas pendant un
// flyTo produit le « blink » et les bandes partielles (canvas CSS-transformé puis
// repeint) — on défère donc à la fin de l'animation, avec un fondu d'apparition. Le fetch
// reste lancé tôt (il chevauche le vol). Un minuteur de secours garantit le rendu si
// moveend n'arrive pas (ex. flyToBounds sans déplacement à l'amorçage).
let animating=false, pendingDraw=null, pendingTimer=null, layerStyle=null;
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
  const raws=geo.features.map(f=>valOf(f.properties));
  const fc=colorer(raws);
  // une seule zone porteuse de valeur : la coloration relative la placerait au centre
  // (neutre). On hérite alors de la couleur que cette zone avait au niveau précédent
  // (sommet de pile) — renormaliser un singleton n'a pas de sens (demande terrain).
  const top=stack[stack.length-1];
  const inherit=(raws.filter(v=>v!=null&&!isNaN(v)).length===1&&top&&top.color)?top.color:null;
  const colOf=v=>(inherit&&v!=null&&!isNaN(v))?inherit:fc(v);
  // En mode sélection multiple (communes uniquement), une commune sélectionnée garde un
  // liseré blanc épais — y compris après un mouseout (resetStyle réapplique ce style).
  const selStyle=f=>{ const sel=multiSel&&niveau==="commune"&&selCodes.has(f.properties.__code);
    const fs=fillStyle();
    return {fillColor:colOf(valOf(f.properties)),color:sel?C.geosel:C.geoline,
            weight:sel?2.6:fs.w,fillOpacity:sel?Math.min(.95,fs.op+.2):fs.op}; };
  layerStyle=selStyle;
  layer=L.geoJSON(geo,{style:selStyle,
    onEachFeature:(f,ly)=>{ const v=valOf(f.properties);
      ly.bindTooltip(`<b>${f.properties.__nom}</b><br>${indicLabel} : ${fmtVal(v,indicUnit)}`,{sticky:true});
      ly.on("mouseover",()=>ly.setStyle({weight:2.6,color:C.geosel}));
      ly.on("mouseout",()=>layer.resetStyle(ly));
      const o=valeurs[f.properties.__code];
      const show=()=>infoPanel(f.properties.__nom,o,niveau,f.properties.__code);
      if(enter){ const go=fly=>{enterColor=colOf(v);show();enter(f,ly,o,fly);}; ly.__enter=go;
        ly.on("click",()=>{ if(multiSel&&niveau==="commune")toggleSel(f.properties.__code,o); else go(); }); }
      else ly.on("click",show); }}).addTo(map);
  fadeInLayer(); }

// `niveau` = maille des features dessinées (region/departement/commune/iris/bv) : il qualifie
// la fiche ouverte au clic, pour réserver le Carnet de campagne au clic sur une COMMUNE.
function dessiner(geo,valeurs,codeProp,nameProp,enter,niveau){ curVals=valeurs;
  geo.features.forEach(f=>{f.properties.__code=String(f.properties[codeProp]);
    f.properties.__nom=f.properties[nameProp]||f.properties.__code;});
  selBarSync();  // rafraîchit la barre de sélection multiple (et le sélecteur de circo) selon la maille
  const draw=()=>paintLayer(geo,valeurs,enter,niveau);
  if(animating){ pendingDraw=draw; clearTimeout(pendingTimer); pendingTimer=setTimeout(flushDraw,1200); }
  else draw(); }

// En remontant, le panneau de droite ne se vide plus : il se relie à la zone désormais
// en focus (sommet de pile) — sinon, après un zoom sur un BV, l'info de la commune était
// définitivement perdue. Seul le retour à la France (pas de zone unique) referme la fiche.
// fly=false (remontée au dézoom) : simple échange de couche, la caméra reste où
// l'utilisateur l'a mise — seuls les clics (fil d'Ariane, bouton retour) volent.
function jumpTo(d,fly=true){ clearSel(); stack=stack.slice(0,d); fadeOutLayer();
  if(d===0){ infoPanel(null); setFil(); return vueFrance(fly); }
  const t=stack[d-1]; infoPanel(t.nom,t.o,t.niveau,t.code); setFil();
  // remonter en volant : on plafonne le zoom d'arrivée juste sous le seuil de redescente
  // ZIN[d] (tout en restant au-dessus de ZOUT[d]), sinon l'ajustement aux contours du
  // parent retombe pile sur le seuil et on replonge aussitôt dans la zone qu'on vient de quitter.
  if(fly)flyTo(t.bounds, ZIN[d]!=null?ZIN[d]-0.1:15); else t.enterZoom=map.getZoom();
  render(t.niveau,t.code); }
function setFil(){ const court=matchMedia("(max-width:680px)").matches;
  // Mobile : la ligne fait ~150 px, on n'y met QUE la zone courante (le chemin complet
  // était tronqué à « 🇫🇷 … », c'est-à-dire à rien d'utile ; remonter se fait par ⬅).
  if(court&&stack.length){ const t=stack[stack.length-1];
    $("fil").innerHTML=`<span class="crumb" data-d="${stack.length-1}">${t.nom}</span>`;
    $("fil").querySelector(".crumb").onclick=()=>jumpTo(stack.length-1);
    $("back").disabled=false; if(window.__syncLayout)window.__syncLayout(); return; }
  let h=`<span class="crumb" data-d="0">🇫🇷 France</span>`;
  stack.forEach((s,i)=>h+=` › <span class="crumb" data-d="${i+1}">${s.nom}</span>`);
  $("fil").innerHTML=h; $("fil").querySelectorAll(".crumb").forEach(e=>e.onclick=()=>jumpTo(+e.dataset.d));
  $("back").disabled=stack.length===0;
  if(window.__syncLayout)window.__syncLayout(); }
addEventListener("resize",()=>setFil());

function flyTo(b,maxZoom){ if(!b)return; busy=true; animating=true;
  map.flyToBounds(b,{duration:.8,maxZoom:maxZoom||11,
    paddingTopLeft:[14,topInset()],paddingBottomRight:[infoInset()+14,sheetInset()]});
  map.once("moveend",()=>{ animating=false; if(stack.length)stack[stack.length-1].enterZoom=map.getZoom();
    // le zoomend final du vol ne doit PAS déclencher onZoomSettled (sinon remontée en
    // cascade après un clic/saut) — on purge le debounce posé par ce zoomend programmatique.
    clearTimeout(zoomSettle); flushDraw(); setTimeout(()=>busy=false,320); }); }

async function vueFrance(fly=true){ clearSel(); stack=[]; setFil(); subToggle(false); if(fly)flyTo(FRANCE,6);
  dessiner(await getJSON("geo/regions.geojson"),await getJSON("values/region.json"),"code","nom",
    (f,ly,o,fly)=>entrer("region",f.properties.__code,f.properties.__nom,ly.getBounds(),o,fly),"region"); }
async function vueRegion(code){ subToggle(false);
  const [geo,val,hier]=await Promise.all([getJSON("geo/departements.geojson"),
    getJSON("values/departement.json"),getJSON("values/_hierarchie.json")]);
  const deps=new Set(hier.departements.filter(d=>d.region===code).map(d=>d.code));
  dessiner({type:"FeatureCollection",features:geo.features.filter(f=>deps.has(String(f.properties.code)))},
    val,"code","nom",(f,ly,o,fly)=>entrer("departement",f.properties.__code,f.properties.__nom,ly.getBounds(),o,fly),"departement"); }
// Présidentielle : pas d'échelle circonscription (scrutin national). Le département
// descend directement aux communes — ce qui dissout aussi le bug des communes à cheval
// sur deux circos (cf. EVOLUTIONS.md, chantier 1).
async function vueDepartement(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/communes/${code}.geojson`),getJSON(`values/commune/${code}.json`)]);
  if(!geo){$("loading").textContent="Contours des communes indisponibles pour ce département "+
    "(non générés pour l'outre-mer) — utilisez la recherche pour ouvrir une commune.";return;}
  dessiner(geo,val||{},"code","nom",(f,ly,o,fly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds(),o,fly),"commune"); }
const subToggle=show=>{ const adv=document.body.classList.contains("adv");
  $("subtoggle").style.display=(show&&adv)?"flex":"none";
  if(window.__syncLayout)window.__syncLayout();
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
  // chantier 4 — filtre de fiabilité géométrique DÉSACTIVÉ pour l'instant : la métrique
  // (compte de polygones disjoints) confond le bruit de tessellation Voronoï avec une vraie
  // fragmentation et masquait à tort ~25-40 % de bureaux nets. On affiche tous les bureaux ;
  // à refondre en comptage tolérant aux slivers avant de réactiver.
  // const fiables=tous.filter(bvFiable), masques=tous.length-fiables.length;
  // $("loading").textContent=masques?`${masques}/${tous.length} bureau·x au tracé peu fiable masqué·s — voir l'export`:"";
  // if(!fiables.length){$("loading").textContent="contours de bureaux trop peu fiables ici — utilisez l'export des données";return;}
  $("loading").textContent="";
  tous.forEach(f=>{ const b=String(f.properties.bureau), n=(b.split("_")[1]||b).replace(/^0+/,"");
    f.properties.__bvlab=`Bureau ${n||b}`; });
  dessiner({type:"FeatureCollection",features:tous},val||{},"bureau","__bvlab",null,"bv"); }

function render(n,c){ if(n==="region")vueRegion(c);else if(n==="departement")vueDepartement(c);
  else if(n==="commune")vueCommune(c); }
// Le clic vole vers la zone ; `fly=false` (hook de test / navigation programmatique) échange
// la couche sans recadrer la caméra.
function entrer(niveau,code,nom,bounds,o,fly=true){ clearSel();
  stack.push({niveau,code,nom,bounds,o,color:enterColor,enterZoom:fly?null:map.getZoom()}); setFil();
  fadeOutLayer(); if(fly)flyTo(bounds,niveau==="commune"?15:11); render(niveau,code); }
// Si la fiche affiche un sous-élément (BV/IRIS) de la zone en focus, le 1er « retour »
// restaure la fiche de la COMMUNE (couche déjà à l'écran) au lieu de remonter au
// département — on ne remonte d'un cran qu'au clic suivant (même logique qu'au dézoom).
$("back").onclick=()=>{ const top=stack[stack.length-1];
  if(top&&lastInfo&&lastInfo.code!==top.code){ infoPanel(top.nom,top.o,top.niveau,top.code); return; }
  jumpTo(stack.length-1); };
// hooks de test/débogage (comme window.__map) : piloter la navigation, lister les zones dessinées
window.__enter=entrer;
window.__feats=()=>{const a=[];layer&&layer.eachLayer(l=>l.feature&&a.push(l.feature.properties.__nom));return a;};

// zoom-molette = REMONTER seulement. Zoomer ne change JAMAIS la couche affichée : la
// descente d'un niveau est réservée au clic (et au fil d'Ariane). C'est ce qui permet de
// zoomer à fond sur une zone puis de revenir à son zoom initial sans que les données
// changent sous les doigts.
// La remontée n'entraîne aucun recadrage : on n'échange que la couche, la caméra reste où
// l'utilisateur l'a mise. Le repère `enterZoom` est FIGÉ au zoom d'entrée dans la zone
// (posé par flyTo / jumpTo) : un zoom manuel ne le réhausse pas, sinon le seuil de sortie
// suivrait le doigt et le moindre retour en arrière ferait remonter d'un cran.
// On ne réagit pas à chaque zoomend (Leaflet en émet plusieurs par geste) : on attend que
// le zoom se POSE (debounce), puis on calcule d'un coup la profondeur cible — un dézoom
// franc peut donc remonter plusieurs niveaux en une fois via le plancher absolu ZOUT.
let zoomSettle=null, lastSettleZ=null;
// profondeur où le zoom `z` doit nous laisser : on dépile tant qu'on est sous le seuil de
// sortie du niveau courant (max du plancher absolu ZOUT et du repère relatif enterZoom-ZBACK).
function profondeurCible(z){ let d=stack.length;
  while(d>=1){ const e=stack[d-1].enterZoom;
    if(z>Math.max(ZOUT[d],(e==null?z:e)-ZBACK))break;
    d--; }
  return d; }
function onZoomSettled(){ if(busy)return;
  const z=map.getZoom(), monte=lastSettleZ!=null&&z>=lastSettleZ; lastSettleZ=z;
  if(monte||!stack.length)return;
  const d=stack.length, cible=profondeurCible(z); if(cible===d)return;
  // si la fiche affiche un sous-élément (BV/IRIS) de la zone en focus, le 1er dézoom
  // restaure d'abord la fiche de la zone (la commune) ; on ne remonte qu'au dézoom suivant.
  const top=stack[d-1];
  if(lastInfo&&lastInfo.code!==top.code){ infoPanel(top.nom,top.o,top.niveau,top.code); return; }
  jumpTo(cible,false); }
// un zoomend pendant un vol programmatique (clic/saut, restauration d'URL) ne doit jamais
// armer la remontée — il recale seulement le repère directionnel sur le zoom d'arrivée.
map.on("zoomend",()=>{ if(busy||animating){ lastSettleZ=map.getZoom(); return; }
  clearTimeout(zoomSettle); zoomSettle=setTimeout(onZoomSettled,260); });
// Opacité/contour dépendent du zoom : on ne repeint qu'au FRANCHISSEMENT d'un palier,
// pas à chaque cran de molette (la couche BV d'une grande ville est lourde à restyler).
let fillPalier=null;
map.on("zoomend",()=>{ const op=fillStyle().op; if(op===fillPalier)return; fillPalier=op;
  if(layer&&layerStyle)layer.setStyle(layerStyle); });
