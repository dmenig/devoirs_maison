// ============================================================================
// Explication des « voix à conquérir » — la rentabilité du porte-à-porte : le bouton « i ».
//
// Le score sort d'un MODÈLE : l'afficher sans dire d'où il vient serait lui demander d'être
// cru sur parole. Chaque chiffre servi est donc accompagné :
//   · au SURVOL du « i » — une définition d'une phrase (CONQ_TIP) ;
//   · au CLIC — le volet méthodo, qui décompose le calcul AVEC LES VALEURS DE LA ZONE
//     ouverte (rendMethodo) : chaque terme affiché est celui qui a servi ;
//   · depuis la légende de la carte — la même méthode, sans zone (mobResume, 15_modal.js),
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
// Les bornes du barème sont servies au MILLIÈME (0,224 · 1,642) : les écrire au centième
// afficherait « 50 × (0,22 − 0,00) ÷ (0,22 − 0,00) », une opération dont le résultat lu
// ne serait pas celui de la note affichée. Une opération recopiée doit retomber sur son
// résultat.
const _n3=v=>v==null?"—":v.toLocaleString('fr',{minimumFractionDigits:3,maximumFractionDigits:3});
// Même exigence pour les DEUX TERMES du rapport. `mobn` et `mobh` sont servis au centième
// depuis que la note d'une petite zone en dépend (cf. MOB_DEC, prep_bake.py) : Leménil-Mitry
// pèse 0,37 voix à conquérir pour 1,54 h de porte-à-porte. Écrits à l'unité, ils donnaient
// « 0 voix ÷ 2 h = 0,24 voix/h » — une équation que personne ne peut refaire, et qui laisse
// croire à une note tirée d'ailleurs. Les décimales ne s'affichent que là où elles portent
// l'information (sous 10), pour ne pas affubler « 8 069 579 h » d'un « ,00 » : une voix et
// une heure se comptent à l'unité dès qu'il y en a dix. Le zéro EXACT reste « 0 » et non
// « 0,00 » : sur les 231 zones dont le gisement est réellement nul, deux décimales
// affecteraient une précision à ce qui n'existe pas.
const _nq=v=>v==null?"—":(v!==0&&Math.abs(v)<10)?_n2(v):_n0(v);

// Pied de notice, commun aux deux « i ». Le doute sur un chiffre naît en lisant la méthode
// qui le fabrique : c'est là, et pas dans la barre du haut, qu'il faut trouver où le dire.
// Le clic est capté par 16_suggestion.js (délégation sur #modal et #info), à la manière du
// « i » de la légende — aucun appel croisé entre modules.
const SUGG_PIED=`<p class="sgfoot">Un chiffre vous paraît faux, une étape du calcul vous `+
  `échappe ? <span class="sglink" role="button" tabindex="0">Signalez-le à l'équipe Études `+
  `électorales</span> — le formulaire joint la zone et l'indicateur affichés.</p>`;

const CONQ_TIP="Voix gagnables par heure de porte-à-porte : chances de convaincre à chaque "+
  "porte, rapportées au temps qu'une porte coûte. Cliquez pour le détail du calcul.";

// Rappel de provenance : d'où sort le modèle et ce qu'il vaut.
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

// --- Du rendement à la note sur 100 -------------------------------------------------
// La carte, l'infobulle et le chiffre de tête de la fiche n'affichent PAS le rendement mais
// la note « Prioritaire ». Le volet décomposait donc scrupuleusement « 0,28 voix/h » sous un
// titre qui venait d'annoncer « 52 / 100 », sans jamais dire par quoi on passait de l'un à
// l'autre : deux nombres sans lien apparent, et un lecteur fondé à croire la note tirée
// d'ailleurs. Ce bloc est ce chaînon — l'échelle, la position de la zone dessus, et
// l'opération écrite avec ses nombres, telle qu'on peut la refaire à la main.
//
// Les trois bornes sont celles que le pipeline SERT (`rendement_min/median/max`, cf.
// prep_bake._reperes_rendement), lues comme le calcul les lit (`rendRep`, 02_data_geo.js) :
// un data_app régénéré les déplace, et la notice se déplace avec lui. La note affichée est
// celle que `scorePrioritaire` renvoie — pas une seconde formule écrite ici, qui pourrait
// s'en écarter sans qu'on le voie.
function noteEchelle(o){ const b=rendRep(); if(!b)return "";
  const lo=b.rendement_min||0, md=b.rendement_median, hi=b.rendement_max;
  if(!(md>lo)||!(hi>md))return "";
  const r=o?rendementPorte(o):null, n=o?scorePrioritaire(o):null;
  // Remplissage = la note elle-même ; le CURSEUR, lui, est ramené dans le rail (à 0 comme à
  // 100, la pastille en déborderait de moitié). Deux grandeurs et non une seule : rogner
  // aussi le remplissage donnerait 2 % de barre pleine à une zone qui note zéro.
  const pos=n!=null?Math.max(2,Math.min(98,n)):null;
  // L'opération du segment RÉELLEMENT emprunté, et lui seul : afficher les deux demanderait
  // au lecteur de choisir, alors que la valeur de la zone a déjà tranché. La note est écrite
  // ARRONDIE, comme partout ailleurs dans l'interface — et le dit, sinon l'opération recopiée
  // (60,06) ne retombe pas sur le résultat affiché (60).
  const rnd=n!=null&&Math.abs(n-Math.round(n))>0.005
    ?` <span class="notescarr">(${_n2(n)}, arrondie)</span>`:"";
  const eq=r==null?"":(r<=md
    ?`50 × (${_n3(r)} − ${_n3(lo)}) ÷ (${_n3(md)} − ${_n3(lo)}) = <b>${_n0(n)} / 100</b>${rnd}`
    :`50 + 50 × (${_n3(r)} − ${_n3(md)}) ÷ (${_n3(hi)} − ${_n3(md)}) = <b>${_n0(n)} / 100</b>${rnd}`);
  const grad=(note,val,quoi)=>`<span><b>${note}</b><small>${_n3(val)} voix/h<br>${quoi}</small></span>`;
  // Sans zone ouverte (notice de la légende), pas de curseur : la réserve de place au-dessus
  // du rail n'a plus d'objet.
  return `<div class="notesc${pos==null?" nocur":""}">`+
    `<div class="notescr">`+(n!=null?`<i style="width:${Math.max(0,Math.min(100,n))}%"></i>`:"")+
      `<u style="left:50%"></u>`+
      (pos!=null?`<span class="notescc" style="left:${pos}%">${_n0(n)}</span>`:"")+`</div>`+
    `<div class="notescl">`+grad(0,lo,"pire terrain")+grad(50,md,"terrain médian")+
      grad(100,hi,"meilleur terrain")+`</div>`+
    (eq?`<div class="notesceq">${eq}</div>`:"")+`</div>`; }

// --- Rentabilité du porte-à-porte ---------------------------------------------------
// La ressource rare d'une campagne est l'HEURE de militant·e, pas la voix théorique. On
// divise donc le gisement par le temps qu'il coûte à aller chercher, porte après porte.
function rendMethodo(o){ o=o||{};
  const r=mobRef(), rend=rendementPorte(o);
  // Deux comptes de portes, et c'est tout l'objet de la correction « résidences
  // secondaires » : `mobpt` les portes RÉELLES — celles de la rue, qu'on frappe toutes —
  // et `mobp` les seules qui abritent un·e électeur·ice. Les données servies avant cette
  // correction n'ont pas `mobpt` : on retombe alors sur `mobp` (parc réputé tout habité).
  const portes=(o.mobpt!=null?o.mobpt:o.mobp)||null;
  const vides=(portes!=null&&o.mobp!=null)?portes-o.mobp:null;  // sans électeur inscrit
  const partVides=(vides!=null&&portes)?100*vides/portes:null;
  const parPorte=(portes&&o.mobn!=null)?o.mobn/portes:null;     // proba de trouver quelqu'un
  const pasM=(portes&&o.mobk!=null)?1000*o.mobk/portes:null;    // pas moyen entre deux portes
  // Le coût se rapporte à la porte HABITÉE, pas à la porte quelconque : c'est le prix d'une
  // conversation possible, portes closes traversées comprises. Le rapporter à toutes les
  // portes ferait afficher « 4,5 min » dans une station de ski contre « 12,5 min » à
  // Paris — une moyenne tirée vers le bas par les volets fermés, qui donnerait à lire
  // comme bon marché le terrain le plus cher qui soit.
  const minPorte=(o.mobp&&o.mobh!=null)?60*o.mobh/o.mobp:null;
  const trajet=(minPorte!=null&&r.minutes_conversation!=null)?minPorte-r.minutes_conversation:null;
  const heuresParVoix=rend?1/rend:null;
  const uneSur=parPorte?Math.round(1/parPorte):null;
  const voiture=o.mobv!=null&&o.mobv>=50;
  // Part des portes en voiture : servie aussi en NOMBRE de portes, comme le reste de cette
  // notice — un pourcentage de portes ne se planifie pas, un nombre si.
  const portesVoiture=(o.mobv&&portes)?`, soit ${_n0(portes*o.mobv/100)}`:"";
  const lig=(lab,val,det)=>`<div class="row"><span>${lab}</span><b>${val}</b></div>`+
    (det?`<div class="mobdet">${det}</div>`:"");
  const note=scorePrioritaire(o), ech=noteEchelle(o);
  const bareme=!ech?"":
    `<div class="sec">Du rendement à la note sur 100</div>`+ech+
    `<p>La carte, l'infobulle et le chiffre en tête de cette fiche n'affichent pas les `+
    `${rend!=null?`${_n2(rend)} voix/h`:"voix par heure"} ci-dessus mais cette <b>note</b> : un `+
    `rendement ne se classe pas sans savoir d'abord ce qu'est une bonne valeur, `+
    `${note!=null?`là où « ${_n0(note)} sur 100 » se situe`:"là où une note se situe"} tout seul. `+
    `Elle place la zone entre le <b>pire</b> terrain de France (0), le terrain <b>médian</b> (50) `+
    `et le <b>meilleur</b> (100), en interpolant de part et d'autre du médian.</p>`+
    `<p><b>Deux segments, et non une règle de trois sur le maximum</b>, parce que la `+
    `distribution est très dissymétrique : rapporté au seul sommet, le bureau médian notait `+
    `14 sur 100 et la moitié des communes tenait entre 9 et 17 — une note qui n'utilise pas son `+
    `échelle ne classe plus rien. L'ordre, lui, est identique : la transformation est monotone. `+
    `Conséquence à connaître, la <b>pente casse à 50</b> : dix points de note ne valent pas le `+
    `même écart de voix/h des deux côtés du médian. C'est pourquoi la <b>couleur</b> de la carte `+
    `se calcule sur le rendement brut et non sur la note — le nombre dit le rang, la teinte dit `+
    `l'écart.</p>`+
    `<p class="hypnote">Les trois bornes sont celles des <b>${_n0(r.n_bv)} bureaux de vote</b>, `+
    `seule maille qui découpe la France entière : la zone se situe ainsi parmi les bureaux du `+
    `pays, quelle que soit sa taille — et une commune, qui moyenne ses bons et ses mauvais `+
    `terrains, note donc moins que son meilleur bureau, un département moins encore. C'est `+
    `l'information, pas un défaut d'échelle. Les bornes sont calculées sur les valeurs `+
    `réellement servies et publiées avec elles : une régénération des données les déplace, et `+
    `ce barème avec.</p>`;
  // Le volet s'ouvre sur le chemin COMPLET, de la voix à la note : c'est la note qui est
  // écrite au-dessus (chiffre de tête, infobulle, carte), et un volet qui n'ouvrirait que
  // sur « 0,28 voix/h » expliquerait un chiffre que le lecteur n'a pas sous les yeux. Le
  // barème lui-même est détaillé plus bas (noteEchelle) : ici, seulement le fait qu'il existe.
  return (rend!=null?`<div class="mobeq"><b>${_nq(o.mobn)} voix</b> à conquérir ÷ `+
      `<b>${_nq(o.mobh)} h</b> de porte-à-porte = <b>${_n2(rend)} voix/h</b>`+
      (note!=null?`<div class="mobeq2">→ soit une note de <b>${_n0(note)} / 100</b> sur `+
        `l'échelle des bureaux de vote de France <span class="mobeq3">(barème plus bas)</span></div>`:"")+
      `</div>`:"")+
    `<p><b>Ce que mesure ce chiffre :</b> le rendement de l'heure militante. Une zone peut abriter `+
    `beaucoup de voix à conquérir et coûter très cher à démarcher (habitat dispersé), une autre en `+
    `abriter moins mais les rendre atteignables. C'est le rapport des deux qui dit où envoyer `+
    `l'équipe en premier.</p>`+
    `<div class="sec">Les valeurs de cette zone</div>`+
    // Le numérateur en un coup d'œil, avec les nombres de la zone : l'abstention
    // conjoncturelle (l'abstention prévue en 2027 moins le plancher jamais franchi ici),
    // puis la part de gauche de celles et ceux qui rentrent quand la participation monte.
    lig("Voix à conquérir",_nq(o.mobn)+" voix",
        `${_n0(o.mobc)} abstentionnistes conjoncturels (${_pct(o.moba)} d'abstention prévue `+
        `moins un plancher de ${_pct(o.mobf)}) × ${_pct(o.mobg)} de gauche chez le votant marginal`)+
    // Le registre est désormais baké à TOUTES les échelles (`insc_E24`), bureau de vote
    // compris : la ligne l'écrit tel quel au lieu de le relire sur les portes, dont il
    // était la source (portes = inscrits ÷ électeur·ices par porte).
    lig("Portes à frapper",_n0(portes)+" portes",
        `${_n0(inscRef(o)!=null?inscRef(o):(o.mobp||0)*(r.electeurs_par_porte||1))} inscrit·es `+
        `÷ ${_n1(r.electeurs_par_porte)} électeur·ice par logement`+
        (o.mobp!=null?` = ${_n0(o.mobp)} logements habités`:"")+
        (vides?`, plus ${_n0(vides)} résidences secondaires ou logements vacants `+
        `(${_pct(partVides)} du parc), qu'on frappe aussi`:""))+
    lig("Chance par porte",parPorte!=null?_n2(100*parPorte)+" %":"—",
        uneSur?`une porte sur ${_n0(uneSur)} cache une voix à gagner`:"")+
    lig("Temps par porte habitée",minPorte!=null?_n1(minPorte)+" min":"—",
        `${_n1(r.minutes_conversation)} min de conversation + ${_n1(trajet)} min de trajet`+
        (vides?`, portes sans électeur comprises (${_n1(vides/(o.mobp||1))} par porte habitée, `+
               `à ${_n1(r.minutes_porte_vide)} min de sonnette sans réponse)`:""))+
    lig("Déplacement",pasM!=null?_n0(pasM)+" m entre deux portes":"—",
        voiture?`majoritairement <b>en voiture</b> (${_pct(o.mobv)} des portes${portesVoiture})`
               :`majoritairement <b>à pied</b>${o.mobv?` (${_pct(o.mobv)} des portes en voiture${portesVoiture})`:""}`)+
    lig("Temps total",_nq(o.mobh)+" h",
        `pour frapper à toutes les portes de la zone (${_n0(o.mobk)} km parcourus)`)+
    `<p><b>Comment c'est calculé.</b> Le numérateur, ce sont les voix réellement mobilisables `+
    `(détail dans le « i » de la légende). Le dénominateur est `+
    `un <b>budget-temps</b> : chaque porte coûte <b>${_n1(r.minutes_conversation)} minutes</b> de `+
    `conversation — la même partout — plus le temps d'aller à la suivante. Ce temps de trajet dépend `+
    `du terrain : on retient le mode le moins coûteux entre la <b>marche</b> (${_n0(r.kmh_marche)} km/h) `+
    `et la <b>voiture</b> (${_n0(r.kmh_voiture)} km/h, plus ${_n1(r.minutes_arret_voiture)} min par `+
    `porte pour se garer et redémarrer). Le mode n'est donc pas choisi à la main : on marche `+
    `naturellement en ville et on roule dès que les portes s'éloignent de plus de `+
    `<b>${_n0(r.pas_bascule_m)} m</b> — le seuil sort du calcul, pas d'un réglage. L'écart entre deux `+
    `portes se déduit de l'aire du territoire et du nombre de logements (longueur d'une tournée `+
    `optimale sur une surface donnée). Et on frappe à <b>toutes</b> les portes de la rue : les `+
    `résidences secondaires et les logements vacants du recensement allongent la tournée et coûtent `+
    `${_n1(r.minutes_porte_vide)} min chacun, sans jamais rendre de voix — là où ils font l'essentiel `+
    `du parc (stations, littoral), c'est ce qui sépare une carte du bâti d'une carte des électeur·ices.`+
    `</p>`+
    `<p><b>Comment le lire.</b> ${rend!=null?`<b>${_n2(rend)} voix par heure</b> ici, soit une voix `+
      `gagnable toutes les <b>${_n1(heuresParVoix)} heures</b> de porte-à-porte`:"Valeur indisponible ici"} — `+
    `contre <b>${_n2(r.rendement_france)} voix/h</b> en moyenne en France. Deux fois la moyenne = deux `+
    `fois moins d'heures militantes pour la même voix. C'est un <b>rendement</b>, pas un volume : une `+
    `petite commune très rentable ne remplace pas une grande ville à gros gisement — la ligne `+
    `« Voix à conquérir » ci-dessus en donne le volume. Et c'est une <b>rentabilité relative</b> : `+
    `un porte-à-porte n'est `+
    `pas la seule façon d'aller chercher une voix.</p>`+
    // Le barème, après le rendement et jamais avant : on ne peut situer sur une échelle
    // qu'une grandeur déjà comprise. C'est aussi l'ordre dans lequel le lecteur arrive —
    // il a lu la note, il veut la mesure ; il a la mesure, il veut le barème. Toute la
    // section tombe si les bornes ne sont pas servies (noteEchelle rend ""), plutôt que
    // d'expliquer une échelle qu'on ne peut pas montrer.
    bareme+
    `<p class="hypnote"><b>Limites du dénominateur.</b> Les contours de bureaux de vote sont approchés `+
    `(Voronoï) et couvrent tout le territoire, champs compris : à la campagne, la distance entre deux `+
    `portes est donc <b>majorée</b>, puisque les maisons y sont groupées au village. Le nombre de `+
    `logements habités est déduit des inscrit·es, pas compté — le reste du parc vient de la part de `+
    `résidences principales du quartier au recensement 2021, qui date l'occupation d'une année et non `+
    `d'une saison. Et ${_n1(r.minutes_conversation)} minutes par `+
    `porte est une convention : c'est l'ordre de grandeur d'un vrai échange, pas une mesure. Ces `+
    `approximations déplacent l'échelle du chiffre bien plus que le classement des zones entre elles.</p>`+
    mobSource()+SUGG_PIED;
}

// Notice sans zone, pour le « i » de la légende (aucune fiche ouverte) : la même méthode,
// dite en trois phrases, plus les repères nationaux.
function mobResume(){ const r=mobRef(), ech=noteEchelle(null);
  const bareme=!ech?"":
    `<p><b>Ce que la carte colore est une note sur 100</b>, pas ce rendement : la place de la `+
    `zone entre le pire terrain de France (0), le terrain médian (50) et le meilleur (100). `+
    `Un rendement en voix par heure ne se classe pas sans savoir d'abord ce qu'est une bonne `+
    `valeur ; une note se situe seule.</p>`+ech+
    `<p>La note interpole de part et d'autre du médian — deux segments de droite, parce que la `+
    `distribution est très dissymétrique et qu'une simple règle de trois sur le maximum tassait `+
    `le bureau médian à 14 sur 100. L'ordre est le même, l'échelle est utilisée. Les repères sont `+
    `ceux des <b>${_n0(r.n_bv)} bureaux de vote</b>, seule maille qui découpe la France entière : `+
    `une commune ou un département s'y situent donc parmi les bureaux du pays, et une commune, `+
    `qui moyenne ses bons et ses mauvais terrains, note moins que son meilleur bureau.</p>`;
  const commun=`<p><b>Voix à conquérir</b> = <b>abstentionnistes conjoncturels</b> (l'abstention prévue `+
    `en 2027 moins le plancher jamais franchi par la zone) <b>×</b> la <b>part de gauche du votant `+
    `marginal</b> (la couleur politique des électeur·ices qui reviennent quand la participation monte, `+
    `${_pct(r.gamma_moyen)} en moyenne). Soit, sur toute la France, <b>${_n0(r.mob_france)} voix</b> `+
    `réellement mobilisables — à comparer aux ${_n0(r.conj_france)} abstentionnistes conjoncturels et `+
    `aux ${_n0(r.insc_france)} inscrit·es.</p>`;
  return `<h3>Rentabilité du porte-à-porte · législatives 2027</h3>`+commun+
    `<p><b>Rentabilité</b> = ces voix ÷ le <b>temps</b> qu'il faut pour aller les chercher porte à `+
    `porte. Chaque porte coûte ${_n1(r.minutes_conversation)} minutes de conversation, plus le trajet `+
    `jusqu'à la suivante — à pied en ville, en voiture dès que les portes s'éloignent de plus de `+
    `${_n0(r.pas_bascule_m)} m (${_pct(r.part_voiture)} des portes de France, soit `+
    `${_n0((r.portes_france||0)*(r.part_voiture||0)/100)} portes sur ${_n0(r.portes_france)}). On frappe `+
    `à toutes les portes du parc, mais ${_pct(r.part_rp_france)} seulement sont des résidences `+
    `principales : les ${_n0((r.portes_france||0)-(r.portes_habitees_france||0))} autres `+
    `(résidences secondaires, logements vacants) allongent la tournée sans jamais répondre, et c'est `+
    `dans les communes touristiques que cela change tout. Moyenne nationale : `+
    `<b>${_n2(r.rendement_france)} voix par heure</b>, soit `+
    `${_n1(r.heures_france/1e6)} millions d'heures pour frapper à toutes les portes du pays.</p>`+
    // Le barème AUSSI sans zone : la légende explique ce qu'on regarde avant tout clic, et
    // ce qu'on regarde est une note — pas le rendement dont elle est tirée. Comme dans la
    // fiche, tout le passage tombe si les bornes ne sont pas servies.
    bareme+
    `<p>La carte montre donc <b>où l'heure militante rapporte le plus</b>, et non où il y a le plus de `+
    `voix — les deux ne coïncident pas. Cliquez une zone pour voir le calcul avec ses propres chiffres.</p>`+
    mobSource()+SUGG_PIED;
}
