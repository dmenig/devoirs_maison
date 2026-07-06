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
// Zoom trackpad : Leaflet arrondit chaque fenêtre de debounce (40 ms) contenant du
// mouvement à ±1 niveau ENTIER — un glissement traverse toute la plage de zoom, et
// le moindre pas de -1 dépasse ZBACK → remontée de granularité (flyTo) : zoom violent.
// Remède : zoomSnap 0.25 sur la carte, et le flux trackpad zoome par QUARTS de niveau
// (TP_PX px cumulés par pas, au plus un pas par TP_MS) — un micro-geste donne ±0.25,
// sous ZBACK, donc sans bascule de couche. Un gros delta isolé hors flux (cran de
// molette probable) est retenu TP_HOLD ms : si un flux suit c'était un glissement et
// il rejoint l'accumulateur, sinon on applique un cran classique de ±1 niveau.
const TP_PX=150, TP_MS=100, TP_HOLD=70, TP_STEP=0.25;
const _wheelScroll=L.Map.ScrollWheelZoom.prototype._onWheelScroll;
function tpZoom(h,mag){ const m=h._map, z=m.getZoom(),
    t=Math.max(m.getMinZoom(),Math.min(m.getMaxZoom(),z+mag));
  if(t!==z){ m._stop(); m.setZoomAround(h._lastMousePos,t); } }
L.Map.ScrollWheelZoom.prototype._onWheelScroll=function(e){
  if(e.deltaMode!==0){ _wheelScroll.call(this,e); return; } // molette « lignes » (Firefox)
  L.DomEvent.stop(e);
  this._lastMousePos=this._map.mouseEventToContainerPoint(e);
  const now=+new Date(), stream=this._tpTimer!=null||now-(this._tpLast||0)<90;
  this._tpLast=now;
  const dy=e.ctrlKey?e.deltaY*3:e.deltaY; // pincement : deltas minuscules, amplifiés
  if(Math.abs(dy)>=50&&!stream){
    this._tpHeld=dy; clearTimeout(this._tpHoldTimer);
    this._tpHoldTimer=setTimeout(()=>{ this._tpHeld=null; tpZoom(this,dy>0?-1:1); },TP_HOLD);
    return;
  }
  if(this._tpHeld!=null){ clearTimeout(this._tpHoldTimer); this._tpAcc=(this._tpAcc||0)+this._tpHeld; this._tpHeld=null; }
  this._tpAcc=(this._tpAcc||0)+dy;
  clearTimeout(this._tpTimer);
  this._tpTimer=setTimeout(()=>{this._tpAcc=0; this._tpTimer=null;},200);
  if(Math.abs(this._tpAcc)<TP_PX||now-(this._tpZoomAt||0)<TP_MS)return;
  this._tpZoomAt=now;
  const dir=this._tpAcc>0?-1:1; this._tpAcc=0; // deltaY>0 = dézoom
  tpZoom(this,dir*TP_STEP);
};
const map=L.map('map',{zoomControl:true,zoomSnap:0.25,preferCanvas:true}).fitBounds(FRANCE);
window.__map=map;
// dark_nolabels : pas de fond raster francisé chez CARTO, on retire donc les
// libellés anglais (pays voisins, mers) ; les noms français viennent des couches de l'atlas.
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
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
