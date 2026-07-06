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
// mouvement à ±1 niveau ENTIER (zoomSnap=1). Un trackpad émet un flux continu
// d'événements → 1 niveau/40 ms → toute la plage de zoom traversée en un glissement.
// Les événements trackpad alimentent un accumulateur : ±1 niveau tous les TP_PX pixels
// cumulés, au plus 1 niveau par TP_MS. Détection : mode pixel ET (petit delta OU flux
// en cours OU événement à <90 ms du précédent) — un glissement vigoureux peut débuter
// par un gros delta, indiscernable d'un cran de molette, d'où la mise en attente
// TP_HOLD : si un flux suit, il rejoint l'accumulateur, sinon on le rejoue en cran.
const TP_PX=350, TP_MS=350, TP_HOLD=70;
const _wheelScroll=L.Map.ScrollWheelZoom.prototype._onWheelScroll;
L.Map.ScrollWheelZoom.prototype._onWheelScroll=function(e){
  if(e.deltaMode!==0){ _wheelScroll.call(this,e); return; } // molette « lignes » (Firefox)
  const now=+new Date(), stream=this._tpTimer!=null||now-(this._tpLast||0)<90;
  this._tpLast=now;
  if(Math.abs(e.deltaY)>=50&&!stream){
    L.DomEvent.stop(e);
    this._tpHeld=e.deltaY; clearTimeout(this._tpHoldTimer);
    this._tpHoldTimer=setTimeout(()=>{ this._tpHeld=null; _wheelScroll.call(this,e); },TP_HOLD);
    return;
  }
  L.DomEvent.stop(e);
  this._lastMousePos=this._map.mouseEventToContainerPoint(e);
  if(this._tpHeld!=null){ clearTimeout(this._tpHoldTimer); this._tpAcc=(this._tpAcc||0)+this._tpHeld; this._tpHeld=null; }
  this._tpAcc=(this._tpAcc||0)+e.deltaY;
  clearTimeout(this._tpTimer);
  this._tpTimer=setTimeout(()=>{this._tpAcc=0; this._tpTimer=null;},200);
  if(Math.abs(this._tpAcc)<TP_PX||now-(this._tpZoomAt||0)<TP_MS)return;
  // deltaY>0 = dézoom ; _performZoom (sigmoïde + ceil sur zoomSnap) transforme tout
  // _delta non nul en exactement ±1 niveau, comme un cran de molette.
  this._tpZoomAt=now; this._delta=-Math.sign(this._tpAcc); this._tpAcc=0; this._startTime=now;
  this._performZoom();
};
const map=L.map('map',{zoomControl:true,preferCanvas:true}).fitBounds(FRANCE);
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
