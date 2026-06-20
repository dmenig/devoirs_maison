const BASE="__BASE__";
const FRANCE=[[41.3,-5.2],[51.2,9.7]];
const SCR=[["P22","Présid. 2022"],["E24","Europ. 2024"],["L24","Légis. 2024"],["M26","Munic. 2026"]];
const MET=[["part","Particip."],["lfi","LFI"],["gauche","Gauche"],["rn","RN"],["em","Macron"],["lr","LR"]];
// pastilles « statiques » (lfi/part/rn/gauche) : instantané du scrutin B choisi dans
// le sélecteur ⚖️ — d'où la reproduction des cartes BV de la prez à n'importe quel
// scrutin (Vote LFI Europ. 2024, Munic. 2026, Présid. 2022…), pas seulement aux européennes.
const STAT=new Set(["lfi","part","rn","gauche"]);
const PAST=[["lfi","Vote LFI","%"],["part","Participation","%"],["rn","Vote RN","%"],
            ["gauche","Gauche","%"],["dyn_report","Report LFI","%"],
            ["dyn_dpart","Δ Participation"," pts"],["dyn_perte","Perte gauche","%"],
            ["abst","Abstention (stock)"," voix"],["rev","Revenu","€"],["pauv","Pauvreté","%"]];
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
// niveaux : 0 France→Région · 1 Région→Dép · 2 Dép→Circo · 3 Circo→Commune · 4 Commune→BV/IRIS
const ZIN=[6.6,8.2,9.6,11.0], ZOUT=[0,6.1,7.9,9.2,10.6];
// remontée relative : on repart d'un niveau dès qu'on dézoome de ZBACK sous le zoom
// auquel on est entré dans la zone (ZOUT reste un plancher absolu).
const ZBACK=0.7;
const $=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:true,preferCanvas:true}).fitBounds(FRANCE);
window.__map=map;
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {attribution:'© OpenStreetMap, © CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);

const cache={}; let layer=null, stack=[], indicKey="lfi", indicLabel="Vote LFI", indicUnit="%",
    curVals={}, busy=false, sousMode="bv", lastInfo=null, panelDetails=[];
// entête cliquable d'une section : le détail est poussé dans le volet de droite (slide)
const expBlock=(body,det)=>{ if(!det)return `<div class="exp">${body}</div>`;
  const i=panelDetails.length; panelDetails.push(det);
  return `<div class="exp"><div class="exph" data-di="${i}">${body}</div></div>`; };
const fmtVal=(v,u)=> v==null?"—":(u==="€"?Math.round(v).toLocaleString('fr')+" €":
  (u===" voix"?Math.round(v).toLocaleString('fr')+" voix":v+(u||"")));

async function getJSON(p){ if(p in cache)return cache[p];
  $("loading").textContent="…"; let j=null;
  try{const r=await fetch(BASE+"/"+p); j=r.ok?await r.json():null;}catch(e){j=null;}
  cache[p]=j; $("loading").textContent=""; return j; }
