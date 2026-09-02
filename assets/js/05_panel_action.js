
// Plan d'action priorisé et daté (chantier 3 / maquette LFI-PEE). Ordre des leviers fixé
// par le PEE : (1) inscription des non-/mal-inscrit·es, (2) REMOBILISATION des électeur·ices
// LFI 2022 — non automatique, (3) abstentionnistes, (4) primo-votant·es ; les électorats
// proches (PS 2024) ne sont qu'un levier marginal. Les réservoirs affichés sont des voix
// réelles.
// `unite` : le réservoir du levier n°1 se compte en PERSONNES à inscrire, pas en voix —
// l'ancien libellé annonçait « 87 577 voix » sous un chiffre qui n'était ni des voix ni
// même un effectif juste.
function lever(n, titre, fenetre, res, corps, unite){
  const r=res!=null?`<span class="lvres">${Math.round(res).toLocaleString('fr')} ${unite||"voix"}</span>`:"";
  return `<li class="lever"><div class="lvh"><span class="lvn">${n}</span>`+
    `<b>${titre}</b><span class="lvwin">${fenetre}</span>${r}</div>`+
    `<div class="lvb">${corps}</div></li>`;
}

function actionPanel(o){ if(!o)return "";
  const items=[];
  // Levier n°1 : le RÉSERVOIR D'INSCRIPTION, un solde signé baké par prep_bake —
  //   resinsc = majeur·es français·es résidant dans la commune − inscrit·es
  // soit les non-inscrit·es PLUS les résident·es inscrit·es ailleurs, moins les inscrit·es
  // partis. On ne le ventile pas (ce serait un modèle) et on ne l'additionne à rien : le
  // panneau affichait « non-inscrit·es + mal-inscrit·es », alors que le second terme est
  // déjà dans le premier — double compte qui, avec une population majeure toutes
  // nationalités, portait Montpellier à 87 577 pour 42 086. Le flux d'arrivées récentes
  // (IRAN, `adm.mig`) reste affiché comme TEXTURE du levier, jamais comme un addend.
  const res=o.resinsc, maj=o.maj, insc=o.insc;
  const mig=o.adm&&o.adm.mig;
  // arrivé·es d'une autre commune ou de l'étranger dans l'année : catégories 2 à 4 d'IRAN.
  const arriv=(mig&&mig.slice(2).every(v=>v!=null))?Math.round(mig[2]+mig[3]+mig[4]):null;
  const flux=arriv!=null
    ? ` <b>${arriv} %</b> des habitant·es ont changé de commune dans l'année (recensement) : `+
      `c'est le vivier le plus mobile du réservoir, et le plus facile à convaincre.`
    : "";
  // Un solde négatif ne veut pas dire qu'il n'y a personne à inscrire : il veut dire que
  // les inscrit·es partis sont plus nombreux que les résident·es non inscrit·es. Le flux
  // d'arrivées reste donc une cible, mais ce n'est plus « le vivier du réservoir ».
  const fluxNeg=arriv!=null
    ? ` <b>${arriv} %</b> des habitant·es ont malgré tout changé de commune dans l'année `+
      `(recensement) : il y a bien des résident·es à inscrire ici, simplement moins que `+
      `d'inscrit·es qui n'y habitent plus.`
    : "";
  const pct=(res!=null&&maj)?` — <b>${(100*res/maj).toLocaleString('fr',{maximumFractionDigits:1})} %</b> `+
    `des majeur·es français·es de la zone` : "";
  let corps, reservoir=null;
  if(res==null){
    corps=`<b>Priorité n°1.</b> Campagne d'inscription sur les listes et de procuration : `+
      `c'est le plus gros réservoir et le plus rentable. Porte-à-porte d'inscription + permanences.${flux}`+
      `<div class="inv">Réservoir d'inscription <b>non estimable ici</b> : il manque le `+
      `recensement ou le registre électoral de la zone.</div>`;
  }else if(res>0){
    reservoir=res;
    corps=`<b>Priorité n°1.</b> ≈ <b>${res.toLocaleString('fr')}</b> résident·es majeur·es `+
      `français·es <b>ne sont pas inscrit·es ici</b>${pct} : non-inscription et inscription `+
      `restée ailleurs confondues — c'est la même démarche à faire faire. Campagne `+
      `d'inscription sur les listes et de procuration : le plus gros réservoir et le plus `+
      `rentable. Porte-à-porte d'inscription + permanences.${flux}`+
      `<div class="inv">Solde mesuré : <b>${maj.toLocaleString('fr')}</b> majeur·es `+
      `français·es recensé·es − <b>${insc.toLocaleString('fr')}</b> inscrit·es. Il ne se `+
      `ventile pas entre non- et mal-inscription, et il ne compte pas les résident·es `+
      `étranger·es, qui ne peuvent pas s'inscrire.</div>`;
  }else if(res<0){
    corps=`<b>Priorité n°1.</b> La liste électorale est ici <b>plus large</b> que la `+
      `population majeure française résidente (<b>${(-res).toLocaleString('fr')}</b> `+
      `inscrit·es de plus) : la commune est une commune d'<b>origine</b> de mal-inscrit·es — `+
      `des gens y votent sans y habiter. Le levier n'est pas l'inscription mais la `+
      `<b>procuration</b> et le contact avec les inscrit·es partis.${fluxNeg}`;
  }else{
    corps=`<b>Priorité n°1.</b> Liste électorale et population majeure française résidente `+
      `sont ici <b>à l'équilibre</b> : autant d'inscrit·es que de résident·es éligibles. Le `+
      `solde ne dit pas qu'il n'y a personne à inscrire, mais que les départs compensent `+
      `exactement les manques. Inscription et procuration à parts égales.${fluxNeg}`;
  }
  items.push(lever("1","Inscription des non- et mal-inscrit·es","sept.→déc.",reservoir,
    corps,"à inscrire"));

  const remob=(o.lfiv_P22!=null&&o.lfiv_E24!=null)?Math.max(0,o.lfiv_P22-o.lfiv_E24):null;
  items.push(lever("2","Remobiliser les électeur·ices LFI 2022","sept.→avr.",remob,
    `Le retour <b>n'est pas automatique</b> : ${remob!=null?`<b>${remob.toLocaleString('fr')}</b> voix Mélenchon 2022 ne se sont pas `+
    `retrouvées aux européennes 2024 — il faut renouer le contact, pas attendre qu'elles « reviennent à la maison ».`:
    `renouer le contact avec les électeur·ices de 2022, ne pas présumer leur retour.`}`));

  if(o.abst!=null){
    // Le stock brut d'abstentionnistes est un FAIT mesuré (européennes 2024), pas une
    // estimation. Mais le présenter seul, c'est laisser croire que tout ce monde est à
    // prendre — l'erreur même que le modèle 2027 sert à corriger. On adosse donc au stock
    // la part qui en est réellement gagnable, celle dont la carte tire son rendement.
    const part=(o.mob!=null&&o.abst>0)
      ? ` Sur ce stock, le modèle 2027 n'en estime que <b>${Math.round(o.mob).toLocaleString('fr')}</b> `+
        `réellement mobilisables à gauche (${(100*o.mob/o.abst).toLocaleString('fr',{maximumFractionDigits:1})} %) : `+
        `le reste est de l'abstention chronique, que la campagne ne ramène pas.`
      : "";
    items.push(lever("3","Mobiliser les abstentionnistes","févr.→avr.",o.abst,
      `${o.abst.toLocaleString('fr')} inscrit·es n'ont pas voté aux européennes 2024.${part} Plutôt tractage marchés / `+
      `lieux publics (le porte-à-porte y est moins efficace, disponibilités contraintes).`));
  }

  const primo=(o.a1529!=null)?`Part des 15-29 ans : <b>${o.a1529}%</b>. `:"";
  items.push(lever("4","Aller vers les primo-votant·es","en continu",null,
    `${primo}Présence devant lycées / facs / résidences étudiantes (CROUS), inscription d'office à vérifier.`));

  // « PS 2024 » se mesure sur les LÉGISLATIVES 2024, pas sur les municipales : le libellé
  // disait 2024 et le calcul lisait M26 — le scrutin où, dans 31 542 communes de moins de
  // 1 000 habitants, le ministère ne publie aucune ventilation par liste, si bien que le
  // levier disparaissait là où il est justement le plus lisible. Aux municipales, « gauche
  // hors LFI » est de surcroît surtout composée de listes locales, pas d'un électorat PS.
  const ps=o.gauche_L24!=null&&o.lfi_L24!=null?Math.round((o.gauche_L24-o.lfi_L24)*10)/10:null;
  const marg=ps!=null&&ps>0?`<div class="inv">Levier marginal : électorats proches (type PS, législatives 2024 : ≈ ${ps} pts d'inscrits hors LFI à gauche) — à ne travailler qu'après les priorités ci-dessus.</div>`:"";

  return `<div class="act"><div class="ah">🎯 Plan d'action — par ordre de priorité</div>`+
    `<ul class="levers">${items.join("")}</ul>${marg}`+
    `<div class="inv">Réservoirs en voix réelles ; conversion en voix mobilisées à confronter au terrain `+
    `(présence militante, marché, vie associative).</div></div>`;
}
