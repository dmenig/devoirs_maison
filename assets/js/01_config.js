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
// Chiffre de tête de la fiche = INDICATEUR ACTIF (pastille sélectionnée) : cliquer un
// bureau de vote après avoir choisi « Vote RN » doit afficher le vote RN de ce bureau, et
// non un score LFI figé — la fiche répond à la question que pose la carte. Le vote LFI
// reste lisible plus bas (section « Évolution du vote LFI »), quel que soit l'indicateur.
// Par clé : [scrutin FIXE de l'intitulé (null = scrutin(s) du sélecteur ⚖️), légende sous le
//            chiffre, méthodo du volet détail (paresseuse : dépend de A/B), intitulé au long
//            (facultatif : la pastille est à l'étroit, la fiche ne l'est pas)].
const HEAD_INFO={
  conquerir:["Présid. 2027","à trouver au-delà du socle LFI",()=>
    `Nombre de voix manquantes, dans cette zone, pour atteindre l'objectif de <b>qualification au `+
    `1<sup>er</sup> tour de la présidentielle 2027</b> (${Math.round(CARNET_HYP.qualif1T*100)} % des exprimés estimés), `+
    `au-delà du <b>socle de voix LFI</b> déjà acquises (plancher des voix LFI sur Présid. 2022, Europ. 2024 `+
    `et Légis. 2024). <b>0</b> = objectif déjà atteint. Aux échelles agrégées (région, département), somme `+
    `des déficits commune par commune.`],
  lfi:[null,"des inscrits",()=>
    `Part des inscrits ayant voté pour la liste <b>LFI / Union de la gauche</b> au scrutin choisi dans le `+
    `sélecteur ⚖️ (<b>${scLab(selB)}</b>). On rapporte aux <b>inscrits</b> (et non aux votants) pour mesurer `+
    `le poids réel sur le corps électoral. Source : Ministère de l'Intérieur.`],
  part:[null,"des inscrits",()=>
    `<b>Participation</b> = votants ÷ inscrits au scrutin choisi ⚖️ (<b>${scLab(selB)}</b>). `+
    `L'abstention en est le complément (100 − participation).`],
  rn:[null,"des inscrits",()=>
    `Part des inscrits ayant voté <b>RN / extrême droite</b> (RN + Reconquête + divers ED) au scrutin `+
    `choisi ⚖️ (<b>${scLab(selB)}</b>). Source : Ministère de l'Intérieur.`],
  gauche:[null,"des inscrits",()=>
    `Part des inscrits ayant voté pour l'ensemble de la <b>gauche</b> (LFI + PS + EELV + PCF + divers `+
    `gauche) au scrutin choisi ⚖️ (<b>${scLab(selB)}</b>).`],
  dyn_report:[null,"des voix LFI conservées",()=>
    `Part des voix LFI de <b>${scLab(selA)}</b> retrouvées à <b>${scLab(selB)}</b> (voix réelles ${selB} ÷ `+
    `voix réelles ${selA}). 100 % = socle intégralement conservé ; en dessous, des voix insoumises sont à reconquérir.`],
  dyn_dpart:[null,"de participation",()=>
    `Écart de <b>participation</b> entre <b>${scLab(selA)}</b> et <b>${scLab(selB)}</b>, en points de pourcentage `+
    `(part ${selB} − part ${selA}).`],
  dyn_perte:[null,"des voix de gauche",()=>
    `Part des voix de <b>gauche</b> (LFI, PS, EELV, PCF) perdues entre <b>${scLab(selA)}</b> et `+
    `<b>${scLab(selB)}</b> ((voix ${selA} − voix ${selB}) ÷ voix ${selA}). Réservoir de gauche à reconquérir ; `+
    `une valeur ≤ 0 = progression.`],
  abst:["Europ. 2024","d'inscrits n'ayant pas voté",()=>
    `<b>Nombre</b> d'inscrits n'ayant pas voté aux européennes 2024 (inscrits × taux d'abstention). `+
    `C'est le réservoir brut de voix à ramener aux urnes.`,"Abstention"],
  rev:["2021","par personne / an",()=>
    `<b>Revenu médian</b> par personne après impôts et aides, corrigé de la taille du foyer. `+
    `Source : INSEE FILOSOFI 2021. À l'échelle du <b>quartier (IRIS)</b>, les résultats électoraux ne sont `+
    `pas disponibles : le vote se compte par <b>bureau de vote</b>, pas par IRIS.`,"Revenu médian"],
  pauv:["2021","de la population",()=>
    `Part de la population vivant sous <b>60 % du revenu médian national</b>. Source : INSEE FILOSOFI 2021.`],
};
// intitulé du chiffre de tête : scrutins écrits en toutes lettres (la pastille, elle, est
// à l'étroit et se contente des codes P22/E24…).
function headLead(k){ const p=PAST.find(x=>x[0]===k); if(!p)return "";
  const hi=HEAD_INFO[k]||[], nom=hi[3]||p[1];
  if(hi[0])return `${nom} · ${hi[0]}`;
  return `${nom} · ${k.startsWith("dyn_")?`${scLab(selA)} → ${scLab(selB)}`:scLab(selB)}`; }
// profil INSEE de la commune (fiche circonscription de la prez, slides 25-28)
const AGE_LAB=["0-14","15-29","30-44","45-59","60-74","75+"];
// indices tr_ : PAS=0,MAR=1,VELO=2,2ROUESMOT=3,VOIT=4,TCOM=5 ; ordre d'affichage = slide 28
const TR_ROWS=[[4,"Voiture"],[5,"Transports en commun"],[1,"Marche à pied"],[2,"Vélo"],[3,"Deux-roues motorisé"],[0,"Pas de déplacement"]];
const TR_COL=["#8a8a8a","#cf2e5b","#3b6ea5","#2e8b57","#b08a2e","#7d7591"];
const MIG_ROWS=["Même logement","Autre logement, même commune","Autre commune du département","Hors département en France","À l'étranger"];
// scrutins comparés par le sélecteur de réservoir (report / différentiel / taux de perte)
let selA="P22", selB="E24";
const scLab=c=>(SCR.find(s=>s[0]===c)||[,c])[1];
// niveaux : 0 France→Région · 1 Région→Dép · 2 Dép→Commune · 3 Commune→BV/IRIS (terminal)
// La DESCENTE est réservée au CLIC : zoomer ne change jamais la couche affichée. ZIN ne
// sert plus qu'à plafonner le zoom d'arrivée quand on remonte en volant (fil d'Ariane).
const ZIN=[6.6,8.2,10.5], ZOUT=[0,6.1,7.9,9.8];
// Remontée au dézoom : on quitte un niveau seulement en descendant de ZBACK sous le zoom
// D'ENTRÉE dans la zone (repère FIGÉ à l'entrée, jamais réhaussé par les zooms manuels —
// sinon zoomer à fond puis revenir à son zoom initial faisait remonter d'un cran).
// ZOUT reste un plancher absolu : un dézoom franc peut remonter plusieurs niveaux d'un coup.
const ZBACK=1.5;
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
             "ramp0","ramp1","ramp2","ramp3","ramp4","lr","rn"];
const C={};
function syncColors(){ const cs=getComputedStyle(document.documentElement);
  for(const n of CVARS)C[n]=cs.getPropertyValue("--"+n).trim(); }
syncColors();
const tiles=L.tileLayer(tileURL(theme()),
  {attribution:'© OpenStreetMap, © CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);
// CARTO sert les libellés (rues, quartiers, communes) dans une couche SÉPARÉE : on la pose
// dans un pane AU-DESSUS des polygones. Les noms sont donc imprimés PAR-DESSUS la
// choroplèthe au lieu d'être recouverts par elle — c'est ce qui permet de baisser
// l'opacité des zones sans perdre la lecture du terrain. Le pane est transparent aux
// clics, sans quoi il intercepterait les clics destinés aux polygones.
// Activée seulement à partir de LBL_MINZ : plus bas, CARTO écrit des noms de régions et de
// mers ANGLICISÉS (« New Aquitania » dès le zoom 8) — la raison d'être du fond _nolabels ;
// à partir du zoom 9 ce ne sont plus que des toponymes locaux (Bordeaux, Foix, Vielha).
// Ce seuil est un SCALE, pas une taille d'écran : c'est justement pourquoi il doit rester
// bas. Un même territoire s'affiche ~2 niveaux plus bas sur un écran étroit (ajuster des
// bounds à 390 px de large donne un zoom bien inférieur qu'à 1500 px) : avec un seuil à 11,
// Toulouse tombait à 10.6 en portable et n'avait NI libellés NI encre, là où le desktop
// était à 12.35 et les avait. À 9, les deux se rejoignent dès l'échelle communale.
const labelURL=t=>`https://{s}.basemaps.cartocdn.com/${t==="light"?"light":"dark"}_only_labels/{z}/{x}/{y}{r}.png`;
const LBL_MINZ=9;
map.createPane("labels").style.zIndex=450;
map.getPane("labels").style.pointerEvents="none";
// updateWhenZooming:false — pendant un vol, Leaflet empilait deux niveaux de tuiles de
// libellés (l'ancien mis à l'échelle + le nouveau) : les noms de communes s'affichaient
// en double, décalés, plusieurs secondes après l'atterrissage.
const labels=L.tileLayer(labelURL(theme()),
  {subdomains:'abcd',maxZoom:19,minZoom:LBL_MINZ,pane:"labels",
   updateWhenZooming:false,updateWhenIdle:true}).addTo(map);
// SURIMPRESSION : une seconde copie du fond de carte, posée elle aussi au-dessus des
// polygones et composée en fusion (multiply en thème clair, screen en sombre — voir
// map.css). Le fond de CARTO étant quasi uni, il laisse la couleur de la zone intacte ;
// seul ce qui s'en écarte — casings de routes, contours de bâtiments, cours d'eau —
// s'imprime PAR-DESSUS elle, comme une encre sur du papier. C'est ce qui permet de garder
// un remplissage franc au lieu de délaver la zone pour apercevoir la trame. Les tuiles ont
// la MÊME URL que le fond : le navigateur les sert depuis son cache, sans requête réseau.
map.createPane("overprint").style.zIndex=440;
map.getPane("overprint").style.pointerEvents="none";
const overprint=L.tileLayer(tileURL(theme()),
  {subdomains:'abcd',maxZoom:19,minZoom:LBL_MINZ,pane:"overprint",opacity:.8,
   updateWhenZooming:false,updateWhenIdle:true}).addTo(map);
// Remplissage des zones : la trame étant désormais surimprimée, il reste franc (.8) — juste
// assez transparent pour donner de la profondeur. Le CONTOUR s'épaissit d'autant, pour que
// la zone reste délimitée sous l'encre. Un seul palier, celui de l'encre : deux réglages
// qui s'allument au même seuil, donc identiques en portable comme en desktop.
function fillStyle(){ return map.getZoom()>=LBL_MINZ?{op:.8,w:1}:{op:.85,w:.5}; }

// indicateur de coloration par défaut : « Voix à conquérir » (retour Elia, point 5) — la
// carte montre d'emblée le besoin de mobilisation par zone plutôt que la participation.
// Le cache mémoire démarre avec la vue France inlinée par le serveur (window.__seed, cf.
// prep_seed.py) : getJSON la trouve déjà là et le premier tracé ne fait aucune requête.
const cache=window.__seed||{}; let layer=null, stack=[], indicKey="conquerir", indicLabel="Voix à conquérir", indicUnit=" voix",
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

// values/* : cache:"no-cache" force le navigateur à revalider auprès de GitHub (requête
// conditionnelle ETag → 304 si inchangé, sinon contenu frais) au lieu de servir aveuglément
// sa copie en cache : sans ça, après une mise à jour de data_app, la carte gardait les
// anciennes valeurs (ex. « 0 voix à conquérir ») jusqu'à un vidage manuel du cache.
// geo/* : les CONTOURS sont immuables (ils ne changent qu'au redécoupage administratif) et
// pèsent l'essentiel du transfert — on les laisse servir depuis le cache disque, sans
// aller-retour réseau. C'est ce qui rend une revisite (ou un retour sur une zone déjà vue)
// instantané au lieu de payer une revalidation par fichier.
// `inflight` mémorise la PROMESSE et non seulement le résultat : sans ça, deux appels
// concurrents sur le même fichier (préchargement au survol + clic) lançaient deux
// téléchargements du même mégaoctet.
const inflight={}; let loadPending=0;
function loadTick(d){ loadPending+=d; const e=$("loading");
  if(loadPending>0)e.textContent="…"; else if(e.textContent==="…")e.textContent=""; }
function getJSON(p){ if(p in cache)return Promise.resolve(cache[p]);
  if(p in inflight)return inflight[p];
  loadTick(1);
  const q=fetch(BASE+"/"+p,{cache:p.startsWith("geo/")?"default":"no-cache"})
    .then(r=>r.ok?r.json():null).catch(()=>null)
    .then(j=>{ cache[p]=j; delete inflight[p]; loadTick(-1); return j; });
  inflight[p]=q; return q; }
