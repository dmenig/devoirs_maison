
// Profil INSEE de la commune (fiche circonscription de la prez, slides 25-28) :
// pyramide des âges, statut d'occupation, déplacements domicile-travail
// et renouvellement de population — chacun comparé à la France.
function adminPanel(o){ const a=o&&o.adm; if(!a)return ""; const fr=window.__adminFr||{};
  const exp=expBlock;
  const sec=t=>`<div class="sec">${t}</div>`;
  // Effectif d'une part du recensement. Ces parts n'ont pas toutes la même base : la
  // PYRAMIDE et le RENOUVELLEMENT portent sur la population (`pop`, servie ici), le
  // statut d'occupation sur les résidences principales et les déplacements sur les
  // actif·ves occupé·es — deux effectifs que `data_app` ne porte pas. On n'écrit donc un
  // nombre que là où sa base est connue, plutôt qu'un ordre de grandeur sur une base
  // approchée. `base` omise = la population ; `base` à null = aucun effectif.
  const effAdm=(v,base)=>{ const b=base===undefined?o.pop:base;
    return (v==null||b==null)?"":effTxt(b,v,"habitant·es"); };
  // barre comparative : remplissage commune + repère France (trait vertical « u »)
  const cmp=(lab,v,f,col,max,base)=>{ if(v==null)return "";
    const e=effAdm(v,base);
    return `<div class="lab"><span>${lab}</span><b>${v} %`+
    (e?` <span class="cnt">· ${e}</span>`:"")+
    `${f!=null?` <span class="frtag">· Fr ${f}</span>`:""}</b></div>`+
    `<div class="bar">${f!=null?`<u style="left:${Math.min(100,f/max*100)}%"></u>`:""}`+
    `<i style="width:${Math.max(2,Math.min(100,v/max*100))}%;background:${col}"></i></div>`; };
  // légende affichée une seule fois, au-dessus de la première section comparative
  let lgdDone=false;
  const lgd=()=> lgdDone?"":(lgdDone=true,
    `<div class="cmplgd"><span><span class="si"></span> bande colorée = la commune</span>`+
    `<span><span class="su"></span> trait vertical = la France</span></div>`);
  let h="";
  if(a.ageh&&a.ageh.some(v=>v!=null)){
    const all=[...a.ageh,...a.agef,...(fr.ageh||[]),...(fr.agef||[])].filter(v=>v!=null), mx=Math.max(...all,1);
    let rows="";
    // Les barres sont des pourcentages ; l'effectif de chacune se lit au survol (une
    // pyramide à douze libellés chiffrés serait illisible) et le total est écrit dessous.
    // AGE_LAB est à l'étroit dans la colonne du milieu (« 75+ ») : l'infobulle, elle, a
    // la place d'écrire la tranche en clair.
    const ageT=i=>i===5?"75 ans et plus":`${AGE_LAB[i]} ans`;
    for(let i=5;i>=0;i--){ const fh=(fr.ageh||[])[i], ff=(fr.agef||[])[i];
      const th=effAdm(a.ageh[i]), tf=effAdm(a.agef[i]);
      rows+=`<div class="pyrow"><div class="ph">${fh!=null?`<u style="right:${fh/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.ageh[i]||0)/mx*100}%;background:#3b6ea5"`+
        (th?` title="Hommes ${ageT(i)} : ${a.ageh[i]} % — ${th}"`:"")+`></i></div>`+
        `<div class="pmid">${AGE_LAB[i]}</div>`+
        `<div class="pf">${ff!=null?`<u style="left:${ff/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.agef[i]||0)/mx*100}%;background:#cf2e5b"`+
        (tf?` title="Femmes ${ageT(i)} : ${a.agef[i]} % — ${tf}"`:"")+`></i></div></div>`; }
    h+=lgd()+exp(sec("Pyramide des âges · 2021")+`<div class="pyr"><div class="pyrhead"><span>◀ Hommes</span><span>Femmes ▶</span></div>${rows}</div>`+
      (o.pop!=null?`<div class="hypnote">Sur ${nbf(o.pop)} habitant·es. Survolez une barre pour `+
        `son effectif.</div>`:""),
      `Population par <b>sexe et tranche d'âge</b> (% de la population), recensement INSEE 2021. Barres = la commune, `+
      `<b>trait vertical</b> = la France. Mesure la jeunesse / le vieillissement par rapport à la moyenne nationale.`+
      (o.pop!=null?` L'effectif de chaque barre — sur les <b>${nbf(o.pop)}</b> habitant·es de la commune — `+
        `se lit au survol.`:"")); }
  if(a.prop!=null||a.loc!=null) h+=lgd()+exp(sec("Logement · statut d'occupation · 2021")+
    cmp("Propriétaires",a.prop,fr.prop,"#3b6ea5",100,null)+cmp("Locataires",a.loc,fr.loc,"#cf2e5b",100,null)+
    cmp("dont HLM",a.hlm,fr.hlm,"#b08a2e",100,null),
    `Part des <b>résidences principales</b> selon que le ménage est propriétaire ou locataire (dont HLM), INSEE 2021. `+
    `<b>· Fr</b> = moyenne France. Une commune fortement <b>locataire</b> et pauvre est un terrain prioritaire. `+
    `La base est un nombre de <b>ménages</b>, que la source ne publie pas ici : ces parts restent donc sans `+
    `effectif, là où la pyramide des âges et le renouvellement de population en portent un.`);
  if(a.tr&&a.tr.some(v=>v!=null)) h+=lgd()+exp(sec("Déplacements domicile-travail · 2021")+
    TR_ROWS.map(([i,lab],j)=>cmp(lab,a.tr[i],(fr.tr||[])[i],TR_COL[j],80,null)).join(""),
    `Mode de transport principal des actifs pour aller travailler (% des actifs occupés), INSEE 2021. <b>· Fr</b> = moyenne `+
    `France. Un usage fort des <b>transports en commun / marche / vélo</b> signale un territoire urbain dense. `+
    `La base — les <b>actif·ves occupé·es</b> de la commune — n'est pas servie dans les données : ces parts `+
    `restent sans effectif.`);
  if(a.mig&&a.mig.some(v=>v!=null)) h+=lgd()+exp(sec("Renouvellement de population · sur 1 an (2020→2021)")+
    MIG_ROWS.map((lab,i)=>cmp(lab,a.mig[i],(fr.mig||[])[i],i===0?"#3b6ea5":"#cf2e5b",100)).join("")+
    (o.pop!=null?`<div class="hypnote">Sur ${nbf(o.pop)} habitant·es. Les parts sont mesurées à `+
      `l'échelle du canton (confidentialité de la source) puis appliquées à la commune : les `+
      `effectifs en héritent, ce sont des ordres de grandeur.</div>`:""),
    `<b>Lieu de résidence un an avant le recensement</b> (variable IRAN, recensement INSEE 2021) : la comparaison `+
    `porte donc sur <b>un seul an, entre 2020 et 2021</b> — part des habitants déjà présents vs. arrivé·es au cours `+
    `de cette année-là. Une faible part « même logement » = <b>fort renouvellement annuel</b>, électorat moins ancré, `+
    `à reconquérir à chaque scrutin.`);
  return h; }
