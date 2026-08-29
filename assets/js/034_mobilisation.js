// ============================================================================
// Explication des « voix à conquérir » des versions 2 et 3 : le bouton « i ».
//
// Le score de la version 1 est un objectif arithmétique — on peut le lire sans notice.
// Ceux des versions 2 et 3 sortent d'un MODÈLE : les afficher sans dire d'où ils viennent
// serait leur demander d'être crus sur parole. Chaque chiffre servi est donc accompagné :
//   · au SURVOL du « i » — une définition d'une phrase (CONQ_TIP) ;
//   · au CLIC — le volet méthodo, qui décompose le calcul AVEC LES VALEURS DE LA ZONE
//     ouverte (mobMethodo / rendMethodo) : chaque terme affiché est celui qui a servi ;
//   · depuis la légende de la carte — la même méthode, sans zone (mobResume, 15_version.js),
//     pour qui n'a encore cliqué nulle part.
// Les hypothèses (ancre nationale, courbe γ, budget-temps) ne sont PAS recopiées ici : on
// lit celles que le pipeline a réellement appliquées, servies dans values/_mobilisation.json
// (window.__mobRef). Une hypothèse changée dans prep_mobilisation.py se lit d'elle-même
// dans la notice, sans risque de divergence entre ce qui est calculé et ce qui est dit.

const mobRef=()=>window.__mobRef||{};
const _n0=v=>v==null?"—":Math.round(v).toLocaleString('fr');
const _n1=v=>v==null?"—":v.toLocaleString('fr',{maximumFractionDigits:1});
const _n2=v=>v==null?"—":v.toLocaleString('fr',{minimumFractionDigits:2,maximumFractionDigits:2});
const _pct=v=>v==null?"—":_n1(v)+" %";

const CONQ_TIP=VERSION===2
  ? "Abstentionnistes de gauche mobilisables : les électeur·ices qui reviennent voter quand "+
    "la participation monte, et qui penchent à gauche. Cliquez pour le détail du calcul."
  : "Voix gagnées par heure de porte-à-porte : chances de convaincre à chaque porte, "+
    "rapportées au temps qu'une porte coûte. Cliquez pour le détail du calcul.";

// Rappel de provenance, commun aux deux versions : d'où sort le modèle et ce qu'il vaut.
function mobSource(){ const r=mobRef();
  return `<p class="hypnote"><b>D'où viennent ces chiffres.</b> Modèle de prévision par bureau de vote `+
    `du dépôt <b>elections_predictions</b> (prévision des législatives 2027 : part de gauche et `+
    `abstention pour chacun des ${_n0(r.n_bv_modele)} bureaux de France, à partir de la démographie `+
    `INSEE et de l'historique de vote du bureau). Validé sur les législatives 2024 tenues à l'écart de `+
    `l'entraînement : R² de ${_n2(r.r2_gauche)} sur la gauche et ${_n2(r.r2_abstention)} sur `+
    `l'abstention. Le niveau NATIONAL est celui du scénario de référence du modèle `+
    `(« ${r.scenario_label||"—"} » : gauche ${_pct(r.nat&&r.nat.G)}, abstention `+
    `${_pct(r.nat&&r.nat.AB)}) — c'est une hypothèse de conjoncture, pas une prédiction du résultat. `+
    `Le modèle est publié à la <b>commune</b> pour 2027 ; la répartition entre les bureaux d'une même `+
    `commune reprend celle qu'il produit sur 2024.</p>`; }

// --- Version 2 : voix à conquérir --------------------------------------------------
// Trois nombres, un produit. On les montre dans l'ordre où ils s'enchaînent, chacun avec
// la valeur de la zone : abstention prédite → part conjoncturelle → part de gauche.
function mobMethodo(o){ o=o||{};
  const r=mobRef();
  const eq=`<div class="mobeq"><b>${_n0(o.mobc)}</b> abstentionnistes conjoncturels `+
    `× <b>${_pct(o.mobg)}</b> de gauche = <b>${_n0(o.mob)} voix</b></div>`;
  return (o.mob!=null?eq:"")+
    `<p><b>Ce que compte ce chiffre :</b> le nombre d'électeur·ices de cette zone qu'une campagne de `+
    `mobilisation peut ramener aux urnes <b>et</b> qui voteraient à gauche. Ce n'est pas un objectif `+
    `à atteindre : c'est une <b>estimation de ce qui est réellement là</b>, calculée en deux temps.</p>`+
    `<p><b>1. Qui peut revenir voter ?</b> Pas l'abstentionniste chronique — celui qui ne vote jamais, `+
    `quel que soit l'enjeu. On retient la frange <b>conjoncturelle</b> : l'abstention prévue pour 2027 `+
    `ici (<b>${_pct(o.moba)}</b> des inscrit·es) <b>moins</b> le plancher jamais franchi par cette zone `+
    `quand la mobilisation était au plus haut (<b>${_pct(o.mobf)}</b>). Soit `+
    `<b>${_n0(o.mobc)}</b> personnes.</p>`+
    `<p><b>2. Combien d'entre eux votent à gauche ?</b> <b>${_pct(o.mobg)}</b>. Ce n'est pas le score `+
    `de la gauche ici : c'est la part de gauche des électeur·ices <b>qui rentrent</b> quand la `+
    `participation monte — mesurée sur les législatives passées, et d'autant plus élevée que la zone `+
    `est déjà à gauche (elle est ici prévue à <b>${_pct(o.mobl)}</b> des exprimés). Prendre le score `+
    `local à la place serait circulaire, et surestimerait le gisement jusqu'à 17 points dans les bastions.</p>`+
    `<p><b>Comment le lire.</b> Une zone à 0 n'est pas une zone perdue : c'est une zone dont `+
    `l'abstention est déjà au plus bas, où il n'y a personne à aller rechercher. À l'inverse, un `+
    `gros chiffre signale un réservoir, pas une victoire acquise — il faudra aller le chercher. `+
    `Repère national : <b>${_n0(r.mob_france)} voix</b> sur toute la France.</p>`+
    `<p>Aux échelles d'ensemble (commune, département, région), c'est la <b>somme</b> des bureaux de `+
    `vote — France = Σ départements = Σ communes = Σ bureaux, comme partout ailleurs dans l'atlas.</p>`+
    mobSource();
}

// --- Version 3 : rentabilité du porte-à-porte ---------------------------------------
// La ressource rare d'une campagne est l'HEURE de militant·e, pas la voix théorique. On
// divise donc le gisement par le temps qu'il coûte à aller chercher, porte après porte.
function rendMethodo(o){ o=o||{};
  const r=mobRef(), rend=rendementPorte(o);
  const parPorte=(o.mobp&&o.mobn!=null)?o.mobn/o.mobp:null;     // proba de trouver quelqu'un
  const minPorte=(o.mobp&&o.mobh!=null)?60*o.mobh/o.mobp:null;  // coût d'une porte, en minutes
  const pasM=(o.mobp&&o.mobk!=null)?1000*o.mobk/o.mobp:null;    // pas moyen entre deux portes
  const trajet=(minPorte!=null&&r.minutes_conversation!=null)?minPorte-r.minutes_conversation:null;
  const heuresParVoix=rend?1/rend:null;
  const uneSur=parPorte?Math.round(1/parPorte):null;
  const voiture=o.mobv!=null&&o.mobv>=50;
  const lig=(lab,val,det)=>`<div class="row"><span>${lab}</span><b>${val}</b></div>`+
    (det?`<div class="mobdet">${det}</div>`:"");
  return (rend!=null?`<div class="mobeq"><b>${_n0(o.mobn)} voix</b> à conquérir ÷ `+
      `<b>${_n0(o.mobh)} h</b> de porte-à-porte = <b>${_n2(rend)} voix/h</b></div>`:"")+
    `<p><b>Ce que mesure ce chiffre :</b> le rendement de l'heure militante. Une zone peut abriter `+
    `beaucoup de voix à conquérir et coûter très cher à démarcher (habitat dispersé), une autre en `+
    `abriter moins mais les rendre atteignables. C'est le rapport des deux qui dit où envoyer `+
    `l'équipe en premier.</p>`+
    `<div class="sec">Les valeurs de cette zone</div>`+
    lig("Voix à conquérir",_n0(o.mobn)+" voix",
        "abstentionnistes conjoncturels × part de gauche du votant marginal (score de la version 2)")+
    // `insc` n'est baké qu'à la commune et au quartier ; au bureau de vote on le relit sur
    // les portes, dont il est la source exacte (portes = inscrits ÷ électeur·ices par porte).
    lig("Portes à frapper",_n0(o.mobp)+" portes",
        `${_n0(o.insc!=null?o.insc:(o.mobp||0)*(r.electeurs_par_porte||1))} inscrit·es `+
        `÷ ${_n1(r.electeurs_par_porte)} électeur·ice par logement`)+
    lig("Chance par porte",parPorte!=null?_n2(100*parPorte)+" %":"—",
        uneSur?`une porte sur ${_n0(uneSur)} cache une voix à gagner`:"")+
    lig("Temps par porte",minPorte!=null?_n1(minPorte)+" min":"—",
        `${_n1(r.minutes_conversation)} min de conversation + ${_n1(trajet)} min de trajet`)+
    lig("Déplacement",pasM!=null?_n0(pasM)+" m entre deux portes":"—",
        voiture?`majoritairement <b>en voiture</b> (${_pct(o.mobv)} des portes)`
               :`majoritairement <b>à pied</b>${o.mobv?` (${_pct(o.mobv)} des portes en voiture)`:""}`)+
    lig("Temps total",_n0(o.mobh)+" h",
        `pour frapper à toutes les portes de la zone (${_n0(o.mobk)} km parcourus)`)+
    `<p><b>Comment c'est calculé.</b> Le numérateur est le score de la version 2. Le dénominateur est `+
    `un <b>budget-temps</b> : chaque porte coûte <b>${_n1(r.minutes_conversation)} minutes</b> de `+
    `conversation — la même partout — plus le temps d'aller à la suivante. Ce temps de trajet dépend `+
    `du terrain : on retient le mode le moins coûteux entre la <b>marche</b> (${_n0(r.kmh_marche)} km/h) `+
    `et la <b>voiture</b> (${_n0(r.kmh_voiture)} km/h, plus ${_n1(r.minutes_arret_voiture)} min par `+
    `porte pour se garer et redémarrer). Le mode n'est donc pas choisi à la main : on marche `+
    `naturellement en ville et on roule dès que les portes s'éloignent de plus de `+
    `<b>${_n0(r.pas_bascule_m)} m</b> — le seuil sort du calcul, pas d'un réglage. L'écart entre deux `+
    `portes se déduit de l'aire du territoire et du nombre de logements (longueur d'une tournée `+
    `optimale sur une surface donnée).</p>`+
    `<p><b>Comment le lire.</b> ${rend!=null?`<b>${_n2(rend)} voix par heure</b> ici, soit une voix `+
      `gagnée toutes les <b>${_n1(heuresParVoix)} heures</b> de porte-à-porte`:"Valeur indisponible ici"} — `+
    `contre <b>${_n2(r.rendement_france)} voix/h</b> en moyenne en France. Deux fois la moyenne = deux `+
    `fois moins d'heures militantes pour la même voix. C'est un <b>rendement</b>, pas un volume : une `+
    `petite commune très rentable ne remplace pas une grande ville à gros gisement — regardez les deux `+
    `(la version 2 donne le volume). Et c'est une <b>rentabilité relative</b> : un porte-à-porte n'est `+
    `pas la seule façon d'aller chercher une voix.</p>`+
    `<p class="hypnote"><b>Limites du dénominateur.</b> Les contours de bureaux de vote sont approchés `+
    `(Voronoï) et couvrent tout le territoire, champs compris : à la campagne, la distance entre deux `+
    `portes est donc <b>majorée</b>, puisque les maisons y sont groupées au village. Le nombre de `+
    `logements est déduit des inscrit·es, pas compté. Et ${_n1(r.minutes_conversation)} minutes par `+
    `porte est une convention : c'est l'ordre de grandeur d'un vrai échange, pas une mesure. Ces trois `+
    `approximations déplacent l'échelle du chiffre bien plus que le classement des zones entre elles.</p>`+
    mobSource();
}

// Notice sans zone, pour le « i » de la légende (aucune fiche ouverte) : la même méthode,
// dite en trois phrases, plus les repères nationaux.
function mobResume(){ const r=mobRef();
  const commun=`<p><b>Voix à conquérir</b> = <b>abstentionnistes conjoncturels</b> (l'abstention prévue `+
    `en 2027 moins le plancher jamais franchi par la zone) <b>×</b> la <b>part de gauche du votant `+
    `marginal</b> (la couleur politique des électeur·ices qui reviennent quand la participation monte, `+
    `${_pct(r.gamma_moyen)} en moyenne). Soit, sur toute la France, <b>${_n0(r.mob_france)} voix</b> `+
    `réellement mobilisables — à comparer aux ${_n0(r.conj_france)} abstentionnistes conjoncturels et `+
    `aux ${_n0(r.insc_france)} inscrit·es.</p>`;
  if(VERSION===2)return `<h3>Voix à conquérir · législatives 2027</h3>`+commun+
    `<p>C'est une <b>mesure</b>, pas un objectif : elle dit ce qu'il y a à aller chercher ici, pas ce `+
    `qu'il faudrait obtenir. Cliquez une zone pour voir le calcul avec ses propres chiffres.</p>`+
    mobSource();
  return `<h3>Rentabilité du porte-à-porte · législatives 2027</h3>`+commun+
    `<p><b>Rentabilité</b> = ces voix ÷ le <b>temps</b> qu'il faut pour aller les chercher porte à `+
    `porte. Chaque porte coûte ${_n1(r.minutes_conversation)} minutes de conversation, plus le trajet `+
    `jusqu'à la suivante — à pied en ville, en voiture dès que les portes s'éloignent de plus de `+
    `${_n0(r.pas_bascule_m)} m (${_pct(r.part_voiture)} des portes de France). Moyenne nationale : `+
    `<b>${_n2(r.rendement_france)} voix par heure</b>, soit `+
    `${_n1(r.heures_france/1e6)} millions d'heures pour frapper à toutes les portes du pays.</p>`+
    `<p>La carte montre donc <b>où l'heure militante rapporte le plus</b>, et non où il y a le plus de `+
    `voix — les deux ne coïncident pas. Cliquez une zone pour voir le calcul avec ses propres chiffres.</p>`+
    mobSource();
}
