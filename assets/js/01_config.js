const BASE="__BASE__";
// « Voix à conquérir » = RENTABILITÉ DU PORTE-À-PORTE : voix gagnables par heure passée à
// frapper aux portes. Le site a publié un temps trois définitions concurrentes du score,
// sur trois pages distinctes (index.html, v2/, v3/) : l'objectif arithmétique (20 % des
// exprimés estimés − socle LFI) et les voix modélisées (abstentionnistes conjoncturels × γ)
// ont été retirées, la rentabilité sert désormais seule et à la racine. Elle vit dans
// 02_data_geo.js (calcul) et 034_mobilisation.js (méthode).
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
// Effort d'accession : publié à la COMMUNE seulement (base DVF, cf. prep_immo.py). Les
// quartiers d'une commune en héritent — même valeur pour tous —, d'où une pastille réservée
// à la carte des communes (vue département) : à l'IRIS, la choroplèthe serait uniforme.
// Comme le socio, ces clés ne sont JAMAIS estimées.
// Le PRIX AU M² n'est plus une pastille : un prix brut ne décrit pas un territoire militant,
// il décrit un marché — et il colorait la carte du même dégradé que les scores électoraux,
// comme s'il se lisait de la même façon. Il reste dans la fiche, section « Prix du logement »,
// à côté de l'effort d'accession qui, lui, le traduit en capacité réelle à se loger et garde
// donc sa carte.
const IMMO=new Set(["effort"]);
// L'IRIS n'est PAS une maille électorale : le ministère n'y publie rien. Les résultats
// affichés par quartier sont ESTIMÉS (cf. prep_iris_bv.py) en répartissant les voix de
// chaque bureau de vote entre les quartiers que son contour recoupe, au prorata de la
// population de l'intersection, puis recalés sur le résultat RÉEL de la commune (la somme
// des quartiers redonne exactement la commune). Un quartier que les contours de bureaux
// ne recouvrent pas quasi intégralement n'est pas estimé du tout : il n'a aucune clé
// électorale et la carte le laisse gris — pas de chiffre plutôt qu'un chiffre faux.
// Le drapeau `est` marque les valeurs estimées ; tout ce qui les affiche doit le dire.
const estime=(o,k)=>{ const kk=k||indicKey;
  return !!(o&&o.est)&&!SOCIO.has(kk)&&!IMMO.has(kk); };
const EST_NOTE=`≈ <b>Résultats estimés</b> — le vote se compte par <b>bureau de vote</b>, pas par `+
  `quartier. Ces chiffres répartissent les voix des bureaux qui recoupent ce quartier, au prorata `+
  `de sa population, puis sont recalés sur le résultat réel de la commune.`;
const EST_METHODO=`<p><b>Chiffre estimé, non mesuré.</b> Aucun résultat électoral n'est publié à `+
  `l'échelle du <b>quartier (IRIS)</b> : le vote se compte par <b>bureau de vote</b>. On répartit `+
  `donc les voix de chaque bureau entre les quartiers que son contour recoupe, <b>au prorata de la `+
  `population</b> de chaque intersection, puis on recale l'ensemble sur le <b>résultat réel de la `+
  `commune</b> — la somme des quartiers d'une commune redonne exactement son résultat. `+
  `Sources : contours de bureaux <b>Voronoï data.gouv</b> (approchés), contours IRIS <b>IGN 2025</b>, `+
  `population <b>recensement INSEE 2021</b>. Un quartier que les contours de bureaux ne recouvrent `+
  `pas à 99 % n'est pas estimé : il n'affiche aucun chiffre électoral plutôt qu'un chiffre faux.</p>`;
// La clé du score reste `conquerir` : c'est l'emplacement dans l'interface (pastille,
// chiffre de tête, permalien), et les permaliens déjà partagés continuent d'y renvoyer.
const PAST=[["conquerir","Rentabilité du porte-à-porte"," voix/h"],
            ["lfi","Vote LFI","%"],["part","Participation","%"],["rn","Vote RN","%"],
            ["gauche","Gauche","%"],["dyn_report","Voix LFI conservées","%"],
            ["dyn_dpart","Évolution participation"," pts"],["dyn_perte","Voix perdues à gauche","%"],
            ["abst","Abstention (nb de voix)"," voix"],["rev","Revenu","€"],["pauv","Pauvreté","%"],
            ["effort","Effort logement","%"]];
// Hypothèses du prix / de l'effort d'accession — MIROIR de prep_immo.py (à garder
// synchronisé avec ce fichier). Elles ne sont pas décoratives : un taux d'effort ne veut
// rien dire si l'on ne dit pas pour quel logement, quel crédit et quel ménage il est calculé.
const IMMO_HYP={annees:"2022-2024",surface:70,apport:10,taux:3.5,duree:25,uc:1.55,vmin:5,hcsf:35};
const IMMO_METHODO=()=>
  `<p><b>Prix moyen au m²</b> des logements — maisons et appartements confondus — réellement <b>vendus</b> `+
  `dans la commune sur ${IMMO_HYP.annees}. Source : base <b>DVF</b> (Demandes de valeurs foncières, DGFiP), `+
  `agrégée par commune et par année sur data.gouv.fr. Les millésimes sont mis en commun, pondérés par le `+
  `nombre de ventes ; sous ${IMMO_HYP.vmin} ventes sur la période, aucun prix n'est affiché — une moyenne `+
  `tirée de deux mutations ne dit rien du marché local.</p>`+
  `<p><b>Effort d'accession</b> : part du revenu d'un ménage médian qu'absorberait la mensualité du crédit `+
  `pour acheter <b>${IMMO_HYP.surface} m²</b> ici. C'est ce qui traduit un prix en <b>capacité réelle à se `+
  `loger</b> : ${IMMO_HYP.surface} m² à Paris et ${IMMO_HYP.surface} m² dans la Creuse, ce n'est pas le même `+
  `effort pour le même salaire. Hypothèses : apport de <b>${IMMO_HYP.apport} %</b>, crédit sur `+
  `<b>${IMMO_HYP.duree} ans</b> à <b>${String(IMMO_HYP.taux).replace(".",",")} %</b> (hors assurance), revenu `+
  `médian local rapporté au ménage (${String(IMMO_HYP.uc).replace(".",",")} unité de consommation, INSEE). `+
  `Au-delà de <b>${IMMO_HYP.hcsf} %</b>, la règle du HCSF conduit les banques à refuser le prêt : la propriété `+
  `est alors hors d'atteinte pour la moitié des habitant·es.</p>`+
  `<p>Publié à l'échelle de la <b>commune</b> : les quartiers d'une même commune portent la même valeur. `+
  `Deux territoires sont absents de la source — l'<b>Alsace-Moselle</b> (57, 67, 68), régie par le livre `+
  `foncier et hors champ DVF, et l'<b>outre-mer</b>. Le prix est enfin un indicateur de <b>transaction</b> : `+
  `il décrit ce qui s'est vendu, pas la valeur du parc existant.</p>`;
const TIP_PXM2="Prix moyen au m² des logements vendus dans la commune (maisons et appartements), "+
  "base DVF 2022-2024. Cliquez pour la méthode et les limites.";
const TIP_EFFORT="Part du revenu d'un ménage médian qu'absorberait le crédit pour acheter 70 m² ici "+
  "(apport 10 %, 25 ans à 3,5 %). Au-delà de 35 %, les banques refusent en général le prêt.";
// Le repère « France » de ce taux ne porte que sur les communes où l'INSEE le publie :
// il sort au-dessus du taux national. Cliquer ouvre le détail (cf. refCouverture).
const TIP_PAUV="Part de la population vivant sous 60 % du revenu médian national. Le repère France "+
  "ne couvre que les communes où l'INSEE publie un taux — cliquez pour la portée exacte.";
// Chiffre de tête de la fiche = INDICATEUR ACTIF (pastille sélectionnée) : cliquer un
// bureau de vote après avoir choisi « Vote RN » doit afficher le vote RN de ce bureau, et
// non un score LFI figé — la fiche répond à la question que pose la carte. Le vote LFI
// reste lisible plus bas (section « Évolution du vote LFI »), quel que soit l'indicateur.
// Par clé : [scrutin FIXE de l'intitulé (null = scrutin(s) du sélecteur ⚖️), légende sous le
//            chiffre, méthodo du volet détail (paresseuse : dépend de A/B), intitulé au long
//            (facultatif : la pastille est à l'étroit, la fiche ne l'est pas)].
const HEAD_INFO={
  // La méthodologie du score est LONGUE et dépend des valeurs de la zone ouverte : elle
  // vit dans 034_mobilisation.js, qui la reçoit.
  conquerir:["Légis. 2027","de porte-à-porte, par militant·e",o=>rendMethodo(o),
    "Rentabilité du porte-à-porte"],
  lfi:[null,"des inscrits",()=>
    `Part des inscrits ayant voté <b>LFI</b> au scrutin choisi dans le sélecteur ⚖️ `+
    `(<b>${scLab(selB)}</b>) : bulletin LFI, ou candidature d'union que LFI CONDUIT et où elle n'a pas de `+
    `bulletin séparé (NUPES 2022, NFP 2024). Les listes d'union de la gauche que LFI soutient sans les `+
    `mener comptent dans le bloc de gauche, pas ici. On rapporte aux <b>inscrits</b> (et non aux votants) `+
    `pour mesurer le poids réel sur le corps électoral. Source : Ministère de l'Intérieur.`],
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
    `Source : INSEE FILOSOFI 2021. C'est la seule échelle où le revenu est publié — à l'inverse des `+
    `résultats électoraux, qui n'y sont qu'<b>estimés</b> depuis les bureaux de vote.`,"Revenu médian"],
  pauv:["2021","de la population",()=>
    `Part de la population vivant sous <b>60 % du revenu médian national</b>. Source : INSEE FILOSOFI 2021.`],
  effort:[IMMO_HYP.annees,`du revenu du ménage pour ${IMMO_HYP.surface} m²`,IMMO_METHODO,"Effort d'accession"],
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
// Fond de carte : tuiles VECTORIELLES OpenFreeMap (données OpenStreetMap), rendues par
// MapLibre. Trois raisons de ne pas reprendre un fond raster :
//   1. les TOPONYMES. Un style vectoriel est un JSON qu'on retouche : on force les libellés
//      sur `name:fr` (voir NAME_FR). Un raster arrive avec ses noms cuits dedans, et ils
//      sont anglicisés — CARTO écrivait « New Aquitania » dès le zoom 8, d'où le fond
//      _nolabels et le seuil de libellés qui ont longtemps servi de contournement ;
//   2. le ZOOM. Les tuiles s'arrêtent au niveau 14 et MapLibre les redessine au-delà :
//      descendre au quartier ou au bureau de vote (17-19) ne coûte AUCUNE requête ;
//   3. la GRATUITÉ. Ni clé ni quota — CARTO exige désormais une clé et tamponne « API KEY
//      REQUIRED » en travers des tuiles anonymes.
// La variante suit le thème (voir 13_theme.js, qui rappelle setStyle à la bascule).
const OFM=t=>`https://tiles.openfreemap.org/styles/${t==="light"?"positron":"dark"}`;
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
// Le style OFM alimente les TROIS couches ci-dessous, chacune n'en gardant qu'une part.
// MapLibre ne sait pas filtrer un style au chargement : on le retouche donc après coup, à
// chaque `style.load` — donc aussi à chaque bascule de thème, qui rappelle setStyle.
//   `symbols` = ce que la couche garde. false → le décor SANS un seul nom (fond, encre) ;
//   true → les noms seuls sur un canevas transparent (couche de libellés).
// Les libellés passent tous sur `name:fr` : les tuiles OFM portent une centaine de champs
// `name:xx`, et le style s'en tient par défaut à `name:latin` — le nom LOCAL, soit
// « España » et « Bay of Biscay » en bord de carte. C'est ce réglage d'une ligne qui rend
// inutile tout le contournement raster (fond sans libellés + seuil d'affichage).
const NAME_FR=["coalesce",["get","name:fr"],["get","name:latin"],["get","name"]];
function shapeStyle(gl,symbols){
  for(const l of gl.getStyle().layers){
    if((l.type==="symbol")!==symbols){gl.removeLayer(l.id);continue;}
    // On ne retouche QUE les couches dont le libellé lit déjà un nom. Les écussons
    // d'autoroute affichent un NUMÉRO (`["to-string",["get","ref"]]`) : leur passer NAME_FR
    // laissait des cartouches VIDES sur la carte (aucun `name` sur ces tronçons). Le test
    // porte sur l'expression et non sur l'identifiant de couche, qui change d'un style à
    // l'autre — dark nomme la sienne `highway_name_motorway`, positron en a trois
    // (`highway-shield-non-us`, …).
    const tf=l.layout&&l.layout["text-field"];
    if(tf&&JSON.stringify(tf).includes('"name'))
      gl.setLayoutProperty(l.id,"text-field",NAME_FR);
  }
}
// Les trois couches demandent les MÊMES tuiles au même instant. Trois instances MapLibre =
// trois files de requêtes indépendantes, et le cache HTTP du navigateur n'a encore RIEN
// quand les deuxième et troisième partent : la vue France téléchargeait 36 tuiles pour 12
// distinctes (1,8 Mo au lieu de 0,6). On route donc tuiles et glyphes vers un protocole
// maison, partagé par les trois instances, qui mutualise la requête en vol. Une fois la
// réponse arrivée on oublie la promesse : les demandes suivantes retombent sur le cache du
// navigateur, qu'OpenFreeMap marque immuable (chemin versionné, max-age 10 ans).
// `slice(0)` : MapLibre TRANSFÈRE le buffer à son worker de décodage, ce qui le détache —
// sans copie, la première couche servie viderait le buffer des deux autres.
const enVol=new Map();
maplibregl.addProtocol("ofm",params=>{
  const url="https"+params.url.slice(3);
  let p=enVol.get(url);
  if(!p){p=fetch(url).then(r=>r.arrayBuffer()).finally(()=>enVol.delete(url));enVol.set(url,p);}
  return p.then(data=>({data:data.slice(0)}));
});
const MUTUALISE=new Set(["Tile","Glyphs"]);
// Le pane est transparent aux clics, sans quoi il intercepterait ceux destinés aux
// polygones ; l'opacité se pose sur le conteneur et non sur le pane, qui porte déjà le
// mode de fusion de l'encre (voir map.css).
function glLayer(symbols,opts){
  const c=L.maplibreGL(Object.assign({style:OFM(theme()),maxZoom:19,
    transformRequest:(url,kind)=>({url:MUTUALISE.has(kind)?url.replace(/^https/,"ofm"):url})},opts)).addTo(map);
  // `style.load` et non `load` : il se rejoue à chaque setStyle, là où `load` ne part
  // qu'une fois — sans quoi la bascule de thème rendrait le style entier, libellés
  // anglicisés et fond dupliqué compris.
  c.getMaplibreMap().on("style.load",()=>shapeStyle(c.getMaplibreMap(),symbols));
  c.getContainer().style.pointerEvents="none";
  if(opts&&opts.opacity!=null)c.getContainer().style.opacity=opts.opacity;
  return c;
}
// La mention de source n'est pas passée en option : le greffon la LIT dans le style (champ
// `attribution` des sources) et l'ajoute au contrôle Leaflet lui-même — « OpenFreeMap ©
// OpenMapTiles Data from OpenStreetMap ». Les trois couches déclarent la même, que Leaflet
// dédoublonne.
const tiles=glLayer(false);
// Les libellés (rues, quartiers, communes) sont posés dans un pane AU-DESSUS des polygones.
// Les noms sont donc imprimés PAR-DESSUS la choroplèthe au lieu d'être recouverts par elle
// — c'est ce qui permet de baisser l'opacité des zones sans perdre la lecture du terrain.
// Contrairement au fond raster, cette couche n'a plus de zoom plancher : ses noms sont
// français à toutes les échelles, il n'y a donc plus rien à cacher en vue nationale.
map.createPane("labels").style.zIndex=450;
map.getPane("labels").style.pointerEvents="none";
const labels=glLayer(true,{pane:"labels"});
// SURIMPRESSION : une seconde copie du décor, posée elle aussi au-dessus des polygones et
// composée en fusion (multiply en thème clair, screen en sombre — voir map.css). Le fond
// étant quasi uni, il laisse la couleur de la zone intacte ; seul ce qui s'en écarte —
// casings de routes, contours de bâtiments, cours d'eau — s'imprime PAR-DESSUS elle, comme
// une encre sur du papier. C'est ce qui permet de garder un remplissage franc au lieu de
// délaver la zone pour apercevoir la trame. Les tuiles sont les MÊMES que celles du fond :
// le navigateur les sert depuis son cache, sans requête réseau.
map.createPane("overprint").style.zIndex=440;
map.getPane("overprint").style.pointerEvents="none";
const overprint=glLayer(false,{pane:"overprint",opacity:.8});
// L'encre ne s'allume qu'à partir d'INK_MINZ : au-dessus, elle n'a rien à imprimer (le
// décor est vide à l'échelle nationale) et brûlerait du GPU pour rien. `visibility` plutôt
// qu'un retrait de couche : détruire et rouvrir un contexte WebGL à chaque passage du seuil
// se verrait comme un à-coup. Ce seuil est un SCALE, pas une taille d'écran : c'est
// justement pourquoi il doit rester bas. Un même territoire s'affiche ~2 niveaux plus bas
// sur un écran étroit (ajuster des bounds à 390 px de large donne un zoom bien inférieur
// qu'à 1500 px) : avec un seuil à 11, Toulouse tombait à 10.6 en portable et n'avait pas
// d'encre, là où le desktop était à 12.35 et l'avait. À 9, les deux se rejoignent dès
// l'échelle communale.
const INK_MINZ=9;
const inkGate=()=>{map.getPane("overprint").style.visibility=map.getZoom()>=INK_MINZ?"":"hidden";};
map.on("zoom zoomend",inkGate);
inkGate();
// Remplissage des zones : la trame étant surimprimée, il reste franc (.8) — juste assez
// transparent pour donner de la profondeur. Le CONTOUR s'épaissit d'autant, pour que la
// zone reste délimitée sous l'encre. Un seul palier, celui de l'encre.
function fillStyle(){ return map.getZoom()>=INK_MINZ?{op:.8,w:1}:{op:.85,w:.5}; }

// indicateur de coloration par défaut : « Voix à conquérir » (retour Elia, point 5) — la
// carte montre d'emblée le besoin de mobilisation par zone plutôt que la participation.
// Le cache mémoire démarre avec la vue France inlinée par le serveur (window.__seed, cf.
// prep_seed.py) : getJSON la trouve déjà là et le premier tracé ne fait aucune requête.
// Sous-maille servie par défaut sous la commune : le QUARTIER (IRIS). C'est la maille de
// lecture du terrain (on y a le revenu, la sociologie ET, désormais, l'électoral estimé),
// là où le bureau de vote est une maille d'organisation du travail militant — resté
// disponible d'un clic en mode avancé.
const SOUS_DEFAUT="iris";
const cache=window.__seed||{}; let layer=null, stack=[], indicKey="conquerir", indicLabel=PAST[0][1], indicUnit=PAST[0][2],
    curVals={}, busy=false, sousMode=SOUS_DEFAUT, lastInfo=null, panelDetails=[], enterColor=null;
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
// Petit « i » d'explication accolé à un libellé : au SURVOL, une définition courte
// (infobulle CSS, cf. map.css) ; au CLIC, le volet méthodo de la section — le clic remonte
// jusqu'à l'entête .exph qui l'ouvre. C'est aussi le repli tactile, où le survol n'existe pas.
const hint=t=>`<span class="hint" data-tip="${t.replace(/"/g,"&quot;")}">i</span>`;
// `isNaN` autant que `null` : une valeur non mesurable se lit « — », jamais « NaN% ».
const fmtVal=(v,u)=> (v==null||(typeof v==="number"&&isNaN(v)))?"—":(u==="€"?Math.round(v).toLocaleString('fr')+" €":
  // « voix/h » : un rendement se lit à deux décimales (0,28 · 0,74), jamais arrondi à
  // l'unité — il vaut moins de 1 partout, et l'arrondi entier écraserait toute la carte à 0.
  (u===" voix/h"?v.toLocaleString('fr',{minimumFractionDigits:2,maximumFractionDigits:2})+" voix/h":
  (u===" voix"?Math.round(v).toLocaleString('fr')+" voix":v+(u||""))));

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
// « … » n'est qu'un remplissage : il ne doit pas écraser un message que la navigation a
// à dire (« pas de quartiers ici — vue par bureaux de vote » disparaissait dès qu'une
// requête de plus partait derrière lui). Chaque render repart d'une case vide, donc un
// message présent est forcément celui de la vue en cours.
function loadTick(d){ loadPending+=d; const e=$("loading");
  if(loadPending>0){ if(!e.textContent)e.textContent="…"; }
  else if(e.textContent==="…")e.textContent=""; }
function getJSON(p){ if(p in cache)return Promise.resolve(cache[p]);
  if(p in inflight)return inflight[p];
  loadTick(1);
  const q=fetch(BASE+"/"+p,{cache:p.startsWith("geo/")?"default":"no-cache"})
    .then(r=>r.ok?r.json():null).catch(()=>null)
    .then(j=>{ cache[p]=j; delete inflight[p]; loadTick(-1); return j; });
  inflight[p]=q; return q; }
