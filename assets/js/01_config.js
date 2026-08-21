const BASE="__BASE__";
const FRANCE=[[41.3,-5.2],[51.2,9.7]];
const SCR=[["P22","Présid. 2022"],["E24","Europ. 2024"],["L24","Légis. 2024"],["M26","Munic. 2026"]];
const MET=[["part","Particip."],["lfi","LFI"],["gauche","Gauche"],["rn","RN"],["em","Macron"],["lr","LR"]];
// pastilles « statiques » (lfi/part/rn/gauche) : instantané du scrutin B choisi dans
// le sélecteur ⚖️ — d'où la reproduction des cartes BV de la prez à n'importe quel
// scrutin (Vote LFI Europ. 2024, Munic. 2026, Présid. 2022…), pas seulement aux européennes.
const STAT=new Set(["lfi","part","rn","gauche"]);
// rev/pauv : FILOSOFI, dispo seulement à la maille IRIS (absents aux échelons agrégés
// région/dép/circo et quasi vides en commune) → pastilles montrées en vue Quartiers IRIS.
const SOCIO=new Set(["rev","pauv"]);
const PAST=[["conquerir","Voix à conquérir"," voix"],
            ["lfi","Vote LFI","%"],["part","Participation","%"],["rn","Vote RN","%"],
            ["gauche","Gauche","%"],["dyn_report","Voix LFI conservées","%"],
            ["dyn_dpart","Évolution participation"," pts"],["dyn_perte","Voix perdues à gauche","%"],
            ["abst","Abstention (nb de voix)"," voix"],["rev","Revenu","€"],["pauv","Pauvreté","%"]];
// profil INSEE de la commune (fiche circonscription de la prez, slides 25-28)
const AGE_LAB=["0-14","15-29","30-44","45-59","60-74","75+"];
// indices tr_ : PAS=0,MAR=1,VELO=2,2ROUESMOT=3,VOIT=4,TCOM=5 ; ordre d'affichage = slide 28
const TR_ROWS=[[4,"Voiture"],[5,"Transports en commun"],[1,"Marche à pied"],[2,"Vélo"],[3,"Deux-roues motorisé"],[0,"Pas de déplacement"]];
const TR_COL=["#8a8a8a","#cf2e5b","#3b6ea5","#2e8b57","#b08a2e","#7d7591"];
const MIG_ROWS=["Même logement","Autre logement, même commune","Autre commune du département","Hors département en France","À l'étranger"];
// scrutins comparés par le sélecteur de réservoir (report / différentiel / taux de perte)
let selA="P22", selB="E24";
const scLab=c=>(SCR.find(s=>s[0]===c)||[,c])[1];
// seuils de zoom pour descendre/remonter automatiquement, par profondeur affichée
// niveaux : 0 France→Région · 1 Région→Dép · 2 Dép→Commune · 3 Commune→BV/IRIS (terminal)
const ZIN=[6.6,8.2,10.5], ZOUT=[0,6.1,7.9,9.8];
// remontée relative : on repart d'un niveau dès qu'on dézoome de ZBACK sous le zoom
// le plus profond atteint dans la zone (le repère suit les zooms manuels, pas seulement
// l'entrée), ZOUT restant un plancher absolu.
const ZBACK=0.35;
const $=id=>document.getElementById(id);
// Zoom molette/trackpad CONTINU, sans détection d'appareil ni pas discrets : la CIBLE
// de zoom suit les pixels scrollés (proportionnel, TP_PXL px = 1 niveau) et la caméra
// la rejoint frame par frame à vitesse plafonnée (TP_VMAX niveau/ms) — un micro-geste
// donne un micro-zoom, un glissement soutenu avance au rythme du doigt, jamais plus
// vite que le plafond. La cible ne peut devancer la caméra de plus de TP_AHEAD niveau :
// l'inertie du trackpad (macOS) n'accumule donc pas un retard qui continuerait à
// défiler longtemps après le geste. Application directe par setZoomAround sans
// animation Leaflet (l'animation ~250 ms par appel est ce qui rendait chaque pas
// « élastique » et cumulait les sauts). Pincement (ctrlKey) : deltas minuscules,
// amplifiés. deltaMode≠0 : molette « lignes » (Firefox) ou pages, converties en pixels.
const TP_PXL=220, TP_VMAX=0.003, TP_AHEAD=1;
L.Map.ScrollWheelZoom.prototype._onWheelScroll=function(e){
  L.DomEvent.stop(e);
  const m=this._map,
    px=e.deltaMode===0?e.deltaY:e.deltaY*(e.deltaMode===1?33:400),
    dy=e.ctrlKey?px*2.5:px;
  // boucle inactive = cible périmée (un flyTo/clic a pu bouger le zoom entre-temps)
  if(this._tpRaf==null)this._tpGoal=m.getZoom();
  this._tpGoal=Math.max(m.getMinZoom(),Math.min(m.getMaxZoom(),this._tpGoal-dy/TP_PXL));
  this._tpPos=m.mouseEventToContainerPoint(e);
  if(this._tpRaf!=null)return;
  this._tpPrevT=null;
  const step=t=>{ this._tpRaf=null;
    const z=m.getZoom(), dt=this._tpPrevT==null?17:Math.min(100,t-this._tpPrevT);
    this._tpPrevT=t;
    this._tpGoal=Math.max(z-TP_AHEAD,Math.min(z+TP_AHEAD,this._tpGoal));
    const d=Math.max(-TP_VMAX*dt,Math.min(TP_VMAX*dt,this._tpGoal-z));
    if(Math.abs(this._tpGoal-z)<0.001){ this._tpGoal=null; return; }
    if(d){ m._stop(); m.setZoomAround(this._tpPos,z+d,{animate:false}); }
    this._tpRaf=requestAnimationFrame(step); };
  this._tpRaf=requestAnimationFrame(step);
};
const map=L.map('map',{zoomControl:true,zoomSnap:0,preferCanvas:true}).fitBounds(FRANCE);
window.__map=map;
// {dark,light}_nolabels : pas de fond raster francisé chez CARTO, on retire donc les
// libellés anglais (pays voisins, mers) ; les noms français viennent des couches de l'atlas.
// La variante suit le thème (voir 13_theme.js, qui remplace l'URL à la bascule).
const tileURL=t=>`https://{s}.basemaps.cartocdn.com/${t==="light"?"light":"dark"}_nolabels/{z}/{x}/{y}{r}.png`;
// thème posé sur <html> avant le premier rendu par le script d'entête de map.html
const theme=()=>document.documentElement.dataset.theme==="light"?"light":"dark";
// Couleurs d'interface que le JS écrit lui-même (contours des polygones, fonds de barres,
// repères, échelle de la choroplèthe) : elles ne sont PAS dupliquées ici, on les lit dans
// les tokens CSS. Relecture groupée à chaque changement de thème plutôt que par polygone :
// getComputedStyle par bureau de vote coûterait des milliers d'appels sur une grande commune.
const CVARS=["geosel","geoline","geonodata","track","tick","softh","detbd","bg",
             "ramp0","ramp1","ramp2","ramp3","ramp4"];
const C={};
function syncColors(){ const cs=getComputedStyle(document.documentElement);
  for(const n of CVARS)C[n]=cs.getPropertyValue("--"+n).trim(); }
syncColors();
const tiles=L.tileLayer(tileURL(theme()),
  {attribution:'© OpenStreetMap, © CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);

// indicateur de coloration par défaut : « Voix à conquérir » (retour Elia, point 5) — la
// carte montre d'emblée le besoin de mobilisation par zone plutôt que la participation.
const cache={}; let layer=null, stack=[], indicKey="conquerir", indicLabel="Voix à conquérir", indicUnit=" voix",
    curVals={}, busy=false, sousMode="bv", lastInfo=null, panelDetails=[], enterColor=null;
// Sélection multiple de communes (retour Elia, point 4) : en mode multi, un clic sur une
// commune l'ajoute/retire de la sélection (fiche agrégée) au lieu d'y descendre.
let multiSel=false; const selCodes=new Set();
// entête cliquable d'une section : le détail est poussé dans le volet de droite (slide)
const expBlock=(body,det)=>{ if(!det)return `<div class="exp">${body}</div>`;
  const i=panelDetails.length; panelDetails.push(det);
  return `<div class="exp"><div class="exph" data-di="${i}">${body}</div></div>`; };
// Groupe dépliable (spoiler) : en-tête cliquable qui plie/déplie son corps, replié par
// défaut (open=true pour l'ouvrir). Sert à n'exposer d'office que le Carnet et à ranger
// l'analyse détaillée derrière un clic. Les sections .exp internes (volet méthodo) restent intactes.
const spoiler=(titre,corps,open=false)=> !corps?"":
  `<div class="spoiler${open?" open":""}"><div class="sph">${titre}<span class="spcaret">›</span></div>`+
  `<div class="spbody">${corps}</div></div>`;
const fmtVal=(v,u)=> v==null?"—":(u==="€"?Math.round(v).toLocaleString('fr')+" €":
  (u===" voix"?Math.round(v).toLocaleString('fr')+" voix":v+(u||"")));

// cache:"no-cache" force le navigateur à revalider auprès de GitHub (requête conditionnelle
// ETag → 304 si inchangé, sinon contenu frais) au lieu de servir aveuglément sa copie en
// cache : sans ça, après une mise à jour de data_app, la carte gardait les anciennes valeurs
// (ex. « 0 voix à conquérir ») jusqu'à un vidage manuel du cache. Le cache mémoire `cache{}`
// dédoublonne les appels dans une même session.
async function getJSON(p){ if(p in cache)return cache[p];
  $("loading").textContent="…"; let j=null;
  try{const r=await fetch(BASE+"/"+p,{cache:"no-cache"}); j=r.ok?await r.json():null;}catch(e){j=null;}
  cache[p]=j; $("loading").textContent=""; return j; }
