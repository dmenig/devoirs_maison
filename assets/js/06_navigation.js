
// Affichage fluide : on prépare la couche mais on ne la PEINT que lorsque la caméra est
// posée (animating=false). Peindre une couche lourde sur le renderer Canvas pendant un
// flyTo produit le « blink » et les bandes partielles (canvas CSS-transformé puis
// repeint) — on défère donc à la fin de l'animation, avec un fondu d'apparition. Le fetch
// reste lancé tôt (il chevauche le vol). Un minuteur de secours garantit le rendu si
// moveend n'arrive pas (ex. flyToBounds sans déplacement à l'amorçage).
//
// Ces trois durées ÉTAIENT la latence perçue : la couche n'apparaissant qu'à
// l'atterrissage, 800 ms de vol suivis d'un fondu de 450 ms imposaient plus d'une seconde
// avant le premier polygone — même sur fibre, même quand les données étaient déjà en
// cache. Un vol court garde le même repère visuel (on voit d'où l'on vient) et un fondu
// bref suffit à masquer l'apparition brutale du canvas, pour ~3× moins d'attente.
// FLY_S balayé au banc (clic → polygones à l'écran, médiane de 4 passes, données déjà
// préchargées par le survol) : 0.42 s → 527/537/644 ms · 0.30 → 428/391/492 · 0.24 →
// ~330/345/478 · 0 → 701/728/846 (sans animation, moveend n'arrive pas et c'est le
// minuteur de secours qui peint : supprimer le vol est plus LENT que le raccourcir).
// Tout le reste est déjà gratuit : les données arrivent en 20-60 ms grâce au préchargement
// au survol, le tracé coûte 13-64 ms. Le vol EST la latence — d'où le seuil de 0.24 s,
// sous lequel on ne gagnait plus rien.
// Mais 0.24 s était trop BRUSQUE pour être suivi à l'œil : la caméra sautait, on perdait
// le lien entre la zone cliquée et son agrandissement. On rend donc ~0.25 s de latence
// pour que le déplacement redevienne lisible ; le fondu croisé suit d'autant.
const FLY_S=0.5, FADE_IN_S=0.16, FADE_OUT_S=0.11;
// Fondu croisé de SUBDIVISION : durée du chevauchement entre la zone cliquée (fantôme) et
// ses enfants. Plus long que le simple fondu d'apparition, parce qu'ici rien ne manque à
// l'écran pendant ce temps — la couleur du parent tient la place jusqu'au bout, on lit une
// zone qui se subdivise, pas une attente.
// GHOST_MAX_MS n'est qu'un FILET pour une descente qui échoue — chaque sortie en échec
// efface désormais le fantôme elle-même. Il valait 3 s, soit moins que le téléchargement
// des contours de bureaux d'un gros département sur un réseau lent : la commune cliquée
// s'effaçait et la carte restait vide une dizaine de secondes, un « ça s'affiche puis ça
// disparaît » observé en Guadeloupe (3,2 Mo, sans préchargement possible). Le fantôme
// tient maintenant le temps qu'il faut : c'est une copie peinte de la zone cliquée, la
// garder pendant le chargement est exactement ce qu'on veut.
const CROSS_S=0.28, GHOST_MAX_MS=20000;
// Filet de sécurité si moveend n'arrive pas (ex. flyToBounds sans déplacement à
// l'amorçage). Il doit rester FRANCHEMENT au-dessus de la durée réelle du vol : s'il se
// déclenche avant moveend, on peint pendant l'animation et les bandes partielles
// reviennent. Vol observé jusqu'à ~480 ms à FLY_S=0.24 (descente au bureau de vote,
// zoom 15) ; la marge suit le vol allongé.
const DRAW_GUARD_MS=1600;
let animating=false, pendingDraw=null, pendingTimer=null, layerStyle=null, paintSig=null;
function overlayEl(){ const p=map.getPanes().overlayPane; return p.querySelector("canvas")||p.querySelector("svg"); }
function fadeInLayer(){ const el=overlayEl(); if(!el)return;
  // avec un fantôme à l'écran, l'apparition des enfants et l'effacement du parent sont
  // lancés dans la MÊME frame : la somme des deux opacités reste constante, on ne voit
  // jamais de trou.
  const dur=ghost?CROSS_S:FADE_IN_S;
  el.style.transition="none"; el.style.opacity="0";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.style.transition=`opacity ${dur}s ease`; el.style.opacity="1"; fadeGhost(); })); }
function fadeOutLayer(){ const el=overlayEl(), old=layer; layer=null; paintSig=null;
  if(old&&el){ el.style.transition=`opacity ${FADE_OUT_S}s ease`; el.style.opacity="0"; }
  if(old)setTimeout(()=>old.remove(),FADE_OUT_S*1000+20); }

// FANTÔME de la zone cliquée. Tout est peint sur un seul canvas : baisser l'opacité de
// l'overlay effaçait donc AUSSI la zone qu'on venait de choisir, qui disparaissait puis
// revenait découpée — le clignotement. On recopie donc la zone cliquée dans son propre
// pane (donc son propre canvas, animable séparément), juste SOUS l'overlay : les zones
// voisines s'effacent, la zone choisie reste pleine pendant tout le vol, ses enfants se
// peignent par-dessus, et elle ne s'efface qu'en fondu croisé avec eux. On ne voit plus
// un trou se remplir mais une zone qui se subdivise. Le fantôme n'existe que le temps de
// la transition ; pas de fantôme à la remontée (dézoom), où la caméra ne bouge pas.
map.createPane("ghost").style.zIndex=399;
map.getPane("ghost").style.pointerEvents="none";
let ghost=null, ghostTimer=null;
const ghostEl=()=>map.getPane("ghost").querySelector("canvas");
function dropGhost(){ clearTimeout(ghostTimer); if(ghost){ ghost.remove(); ghost=null; } }
function setGhost(feature,style){ dropGhost();
  ghost=L.geoJSON(feature,{pane:"ghost",renderer:L.canvas({pane:"ghost"}),interactive:false,
    style:{fillColor:style.fillColor,fillOpacity:style.fillOpacity,stroke:false}}).addTo(map);
  const el=ghostEl(); if(el){ el.style.transition="none"; el.style.opacity="1"; }
  // filet : si la descente échoue (contours indisponibles), le fantôme ne reste pas figé.
  ghostTimer=setTimeout(()=>fadeGhost(),GHOST_MAX_MS); }
function fadeGhost(){ if(!ghost)return; clearTimeout(ghostTimer);
  const el=ghostEl(), g=ghost; ghost=null;
  if(el){ el.style.transition=`opacity ${CROSS_S}s ease`; el.style.opacity="0"; }
  ghostTimer=setTimeout(()=>g.remove(),CROSS_S*1000+60); }
function flushDraw(){ clearTimeout(pendingTimer);
  if(pendingDraw){ const d=pendingDraw; pendingDraw=null; d(); } }

// Préchargement au SURVOL : on survole toujours une zone avant de la cliquer. Le survol
// lance donc le téléchargement des fichiers dont la descente aura besoin — au clic ils
// sont déjà là et la couche paraît instantanée. getJSON dédoublonne (résultat + promesse
// en vol), un survol répété ou le survol de deux communes du même département ne coûtent
// qu'une requête. On ne précharge QUE ce qu'un clic demanderait de toute façon : rien
// n'est téléchargé « au cas où » sans geste de l'utilisateur.
// Départements sans contours IRIS : tout l'outre-mer (le produit IGN s'arrête à la
// métropole). Sans cette mémoire, le survol préchargeait consciencieusement deux fichiers
// qui n'existent pas, et le seul qui compte — les contours de bureaux, 3,2 Mo en
// Guadeloupe — n'était demandé qu'APRÈS le clic, et après deux 404 en série.
const irisAbsent=new Set();
const sousMaille=dep=>(sousMode==="iris"&&!irisAbsent.has(dep))?"iris":"bv";
function prefetchBV(d){ getJSON(`geo/bv/${d}.geojson`); getJSON(`values/bv/${d}.json`); }
function prefetchEnfants(niveau,code){
  if(niveau==="region"){ getJSON("geo/departements.geojson"); getJSON("values/departement.json");
    getJSON("values/_hierarchie.json"); return; }
  if(niveau==="departement"){ getJSON(`geo/communes/${code}.geojson`); getJSON(`values/commune/${code}.json`); return; }
  if(niveau==="commune"){ const d=depOf(code);
    if(sousMaille(d)!=="iris")return prefetchBV(d);
    getJSON(`values/iris/${d}.json`);
    // le survol découvre lui-même l'absence de quartiers et enchaîne sur les bureaux :
    // le premier survol d'une commune ultramarine lance déjà le bon téléchargement.
    getJSON(`geo/iris/${d}.geojson`).then(g=>{ if(!g){ irisAbsent.add(d); prefetchBV(d); } }); }
}

// Fabrique de style, séparée de la construction de la couche : changer d'indicateur ne
// touche ni aux contours ni aux valeurs, il suffit alors de rejouer ce style sur la couche
// déjà tracée (cf. dessiner).
function styleFactory(geo,niveau){
  // `colValOf` et non `valOf` : la couleur se calcule sur la grandeur BRUTE, la note
  // « Prioritaire » n'étant qu'un habillage à la pente cassée (cf. 02_data_geo.js). Pour
  // tous les autres indicateurs, les deux sont le même nombre.
  const raws=geo.features.map(f=>colValOf(f.properties));
  const fc=colorer(raws);
  // une seule zone porteuse de valeur : la coloration relative la placerait au centre
  // (neutre). On hérite alors de la couleur que cette zone avait au niveau précédent
  // (sommet de pile) — renormaliser un singleton n'a pas de sens (demande terrain).
  const top=stack[stack.length-1];
  const inherit=(raws.filter(v=>v!=null&&!isNaN(v)).length===1&&top&&top.color)?top.color:null;
  const colOf=v=>(inherit&&v!=null&&!isNaN(v))?inherit:fc(v);
  // En mode sélection multiple (communes uniquement), une commune sélectionnée garde un
  // liseré blanc épais — y compris après un mouseout (resetStyle réapplique ce style).
  const st=f=>{ const sel=multiSel&&niveau==="commune"&&selCodes.has(f.properties.__code);
    const fs=fillStyle();
    return {fillColor:colOf(colValOf(f.properties)),color:sel?C.geosel:C.geoline,
            weight:sel?2.6:fs.w,fillOpacity:sel?Math.min(.95,fs.op+.2):fs.op}; };
  st.colOf=colOf; return st; }

// Infobulle et écouteurs posés UNE fois sur le groupe, pas feuille par feuille : Leaflet
// propage les événements des enfants au FeatureGroup (e.layer = le polygone survolé). Sur
// une commune à 1300 bureaux, lier 1 Tooltip + 3 closures par feature coûtait plus cher
// que le tracé lui-même. Le contenu de l'infobulle est calculé à l'ouverture : il suit
// l'indicateur actif sans qu'on ait à reconstruire quoi que ce soit.
function paintLayer(geo,valeurs,enter,niveau){ if(layer)layer.remove();
  const st=styleFactory(geo,niveau); layerStyle=st;
  layer=L.geoJSON(geo,{style:st}).addTo(map);
  layer.bindTooltip(l=>{ const p=l.feature.properties;
    // un chiffre estimé (quartier) ne doit jamais se lire comme un chiffre mesuré, même
    // dans une infobulle survolée à la volée.
    const est=estime(curVals[p.__code])?" <i>(estimé)</i>":"";
    // Un survol sert à comparer : le taux classe, l'effectif dit la taille. On l'ajoute
    // dès que la zone porte le registre du scrutin lu (cf. effEtiquette, 02_data_geo.js).
    return `<b>${p.__nom}</b><br>${indicLabel} : ${fmtVal(valOf(p),indicUnit)}${est}`+
      effEtiquette(curVals[p.__code]); },{sticky:true});
  layer.on("mouseover",e=>{ const ly=e.layer; if(!ly||!ly.feature)return;
    ly.setStyle({weight:2.6,color:C.geosel});
    prefetchEnfants(niveau,ly.feature.properties.__code); });
  layer.on("mouseout",e=>{ if(e.layer&&e.layer.feature)layer.resetStyle(e.layer); });
  layer.on("click",e=>{ const ly=e.layer; if(!ly||!ly.feature)return;
    const f=ly.feature, p=f.properties, o=valeurs[p.__code];
    if(enter&&multiSel&&niveau==="commune")return toggleSel(p.__code,o);
    if(enter){ enterColor=layerStyle.colOf(colValOf(p)); setGhost(f,layerStyle(f)); }
    infoPanel(p.__nom,o,niveau,p.__code);
    if(enter)enter(f,ly,o,true); });
  fadeInLayer(); }

// Signature de la couche peinte : changer d'indicateur (ou de paire de scrutins) rappelle
// render() avec les MÊMES contours et les mêmes valeurs. Reconstruire la couche — reparser,
// recréer N chemins, reposer les écouteurs — était la seconde d'attente ressentie au clic
// sur une pastille ; on se contente de la recolorer en place.
const sigOf=(geo,niveau)=>{ const f=geo.features, n=f.length;
  return `${niveau}|${n}|${n?f[0].properties.__code:""}|${n?f[n-1].properties.__code:""}`; };

// `niveau` = maille des features dessinées (region/departement/commune/iris/bv) : il qualifie
// la fiche ouverte au clic, pour réserver le Carnet de campagne au clic sur une COMMUNE.
function dessiner(geo,valeurs,codeProp,nameProp,enter,niveau){ curVals=valeurs;
  geo.features.forEach(f=>{f.properties.__code=String(f.properties[codeProp]);
    f.properties.__nom=f.properties[nameProp]||f.properties.__code;});
  selBarSync();  // rafraîchit la barre de sélection multiple (et le sélecteur de circo) selon la maille
  const sig=sigOf(geo,niveau);
  if(layer&&!animating&&sig===paintSig){ layerStyle=styleFactory(geo,niveau); layer.setStyle(layerStyle); return; }
  paintSig=sig;
  const draw=()=>paintLayer(geo,valeurs,enter,niveau);
  if(animating){ pendingDraw=draw; clearTimeout(pendingTimer); pendingTimer=setTimeout(flushDraw,DRAW_GUARD_MS); }
  else draw(); }

// En remontant, le panneau de droite ne se vide plus : il se relie à la zone désormais
// en focus (sommet de pile) — sinon, après un zoom sur un BV, l'info de la commune était
// définitivement perdue. Seul le retour à la France (pas de zone unique) referme la fiche.
// fly=false (remontée au dézoom) : simple échange de couche, la caméra reste où
// l'utilisateur l'a mise — seuls les clics (fil d'Ariane, bouton retour) volent.
function jumpTo(d,fly=true){ clearSel(); dropGhost(); stack=stack.slice(0,d); fadeOutLayer();
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
  map.flyToBounds(b,{duration:FLY_S,maxZoom:maxZoom||11,
    paddingTopLeft:[14,topInset()],paddingBottomRight:[infoInset()+14,sheetInset()]});
  map.once("moveend",()=>{ animating=false; if(stack.length)stack[stack.length-1].enterZoom=map.getZoom();
    // le zoomend final du vol ne doit PAS déclencher onZoomSettled (sinon remontée en
    // cascade après un clic/saut) — on purge le debounce posé par ce zoomend programmatique.
    clearTimeout(zoomSettle); flushDraw(); setTimeout(()=>busy=false,320); }); }

// Les deux fichiers en PARALLÈLE : passés en arguments, `await geo` puis `await valeurs`
// s'évaluaient de gauche à droite, donc les valeurs n'étaient demandées qu'une fois les
// contours arrivés — un aller-retour en série sur le tout premier affichage, le seul que
// le préchargement au survol ne peut pas masquer. Les autres niveaux le font déjà.
async function vueFrance(fly=true){ clearSel(); stack=[]; setFil(); subToggle(false); if(fly)flyTo(FRANCE,6);
  const [geo,val]=await Promise.all([getJSON("geo/regions.geojson"),getJSON("values/region.json")]);
  dessiner(geo,val,"code","nom",
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
  if(!geo){fadeGhost();$("loading").textContent="Contours des communes indisponibles pour ce département "+
    "(non générés pour l'outre-mer) — utilisez la recherche pour ouvrir une commune.";return;}
  dessiner(geo,val||{},"code","nom",(f,ly,o,fly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds(),o,fly),"commune"); }
function majSousMode(m){ sousMode=m;
  $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m===m));
  syncSocioChips(); }
const subToggle=show=>{ const adv=document.body.classList.contains("adv");
  $("subtoggle").style.display=(show&&adv)?"flex":"none";
  if(window.__syncLayout)window.__syncLayout();
  if(!show)majSousMode(SOUS_DEFAUT); else syncSocioChips(); };
async function vueCommune(code){ const dep=depOf(code); subToggle(true);
  let repli="";
  if(sousMaille(dep)==="iris"){
    const [geo,val]=await Promise.all([getJSON(`geo/iris/${dep}.geojson`),getJSON(`values/iris/${dep}.json`)]);
    if(!geo)irisAbsent.add(dep);
    // Un quartier SANS AUCUNE valeur n'est pas tracé : les contours IRIS de l'IGN sont
    // d'un millésime plus récent que le recensement, 30 d'entre eux (Oullins, Neufchâteau,
    // Saint-Denis, et 7 communes fusionnées) n'ont ni socio ni électoral. Les peindre en
    // gris ouvrait une fiche vide sans rien en dire. Un quartier qui n'a « que » du socio
    // reste tracé : il est gris sur une pastille électorale, mais sa fiche a du contenu.
    const vals=val||{};
    const fc=geo&&geo.features.filter(f=>{
      const ci=String(f.properties.code_iris); return irisInCommune(ci,code)&&vals[ci]; });
    if(fc&&fc.length){ $("loading").textContent="";
      dessiner({type:"FeatureCollection",features:fc},vals,"code_iris","nom_iris",null,"iris"); return; }
    // Aucun quartier ici : l'outre-mer n'en a aucun (les contours IRIS de l'IGN s'arrêtent
    // à la métropole) et quelques communes n'en ont aucun de documenté. Depuis que le
    // quartier est la maille par défaut, c'était un cul-de-sac — on sert les bureaux de
    // vote, qui eux existent partout, en le disant et en bougeant la bascule.
    majSousMode("bv");
    repli="pas de quartiers ici — vue par bureaux de vote"; }
  const [geo,val]=await Promise.all([getJSON(`geo/bv/${dep}.geojson`),getJSON(`values/bv/${dep}.json`)]);
  if(!geo){fadeGhost();$("loading").textContent="contours BV indisponibles";return;}
  const tous=geo.features.filter(f=>String(f.properties.code_commune)===code);
  if(!tous.length){fadeGhost();$("loading").textContent="pas de bureaux";return;}
  // chantier 4 — filtre de fiabilité géométrique DÉSACTIVÉ pour l'instant : la métrique
  // (compte de polygones disjoints) confond le bruit de tessellation Voronoï avec une vraie
  // fragmentation et masquait à tort ~25-40 % de bureaux nets. On affiche tous les bureaux ;
  // à refondre en comptage tolérant aux slivers avant de réactiver.
  // const fiables=tous.filter(bvFiable), masques=tous.length-fiables.length;
  // $("loading").textContent=masques?`${masques}/${tous.length} bureau·x au tracé peu fiable masqué·s — voir l'export`:"";
  // if(!fiables.length){$("loading").textContent="contours de bureaux trop peu fiables ici — utilisez l'export des données";return;}
  $("loading").textContent=repli;
  tous.forEach(f=>{ const b=String(f.properties.bureau), n=(b.split("_")[1]||b).replace(/^0+/,"");
    f.properties.__bvlab=`Bureau ${n||b}`; });
  dessiner({type:"FeatureCollection",features:tous},val||{},"bureau","__bvlab",null,"bv"); }

function render(n,c){ $("loading").textContent="";  // chaque vue repart d'une case vide
  if(n==="region")vueRegion(c);else if(n==="departement")vueDepartement(c);
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
