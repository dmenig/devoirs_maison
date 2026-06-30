
// Profil INSEE de la commune (fiche circonscription de la prez, slides 25-28) :
// pyramide des âges, statut d'occupation, déplacements domicile-travail
// et renouvellement de population — chacun comparé à la France.
function adminPanel(o){ const a=o&&o.adm; if(!a)return ""; const fr=window.__adminFr||{};
  const exp=expBlock;
  const sec=t=>`<div class="sec">${t}</div>`;
  // barre comparative : remplissage commune + repère France (trait blanc « u »)
  const cmp=(lab,v,f,col,max)=> v==null?"":
    `<div class="lab"><span>${lab}</span><b>${v} %${f!=null?` <span class="frtag">· Fr ${f}</span>`:""}</b></div>`+
    `<div class="bar">${f!=null?`<u style="left:${Math.min(100,f/max*100)}%"></u>`:""}`+
    `<i style="width:${Math.max(2,Math.min(100,v/max*100))}%;background:${col}"></i></div>`;
  // légende affichée une seule fois, au-dessus de la première section comparative
  let lgdDone=false;
  const lgd=()=> lgdDone?"":(lgdDone=true,
    `<div class="cmplgd"><span><span class="si"></span> bande colorée = la commune</span>`+
    `<span><span class="su"></span> trait blanc = la France</span></div>`);
  let h="";
  if(a.ageh&&a.ageh.some(v=>v!=null)){
    const all=[...a.ageh,...a.agef,...(fr.ageh||[]),...(fr.agef||[])].filter(v=>v!=null), mx=Math.max(...all,1);
    let rows="";
    for(let i=5;i>=0;i--){ const fh=(fr.ageh||[])[i], ff=(fr.agef||[])[i];
      rows+=`<div class="pyrow"><div class="ph">${fh!=null?`<u style="right:${fh/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.ageh[i]||0)/mx*100}%;background:#3b6ea5"></i></div>`+
        `<div class="pmid">${AGE_LAB[i]}</div>`+
        `<div class="pf">${ff!=null?`<u style="left:${ff/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.agef[i]||0)/mx*100}%;background:#cf2e5b"></i></div></div>`; }
    h+=lgd()+exp(sec("Pyramide des âges · 2021")+`<div class="pyr"><div class="pyrhead"><span>◀ Hommes</span><span>Femmes ▶</span></div>${rows}</div>`,
      `Population par <b>sexe et tranche d'âge</b> (% de la population), recensement INSEE 2021. Barres = la commune, `+
      `<b>trait blanc</b> = la France. Mesure la jeunesse / le vieillissement par rapport à la moyenne nationale.`); }
  if(a.prop!=null||a.loc!=null) h+=lgd()+exp(sec("Logement · statut d'occupation · 2021")+
    cmp("Propriétaires",a.prop,fr.prop,"#3b6ea5",100)+cmp("Locataires",a.loc,fr.loc,"#cf2e5b",100)+
    cmp("dont HLM",a.hlm,fr.hlm,"#b08a2e",100),
    `Part des <b>résidences principales</b> selon que le ménage est propriétaire ou locataire (dont HLM), INSEE 2021. `+
    `<b>· Fr</b> = moyenne France. Une commune fortement <b>locataire</b> et pauvre est un terrain prioritaire.`);
  if(a.tr&&a.tr.some(v=>v!=null)) h+=lgd()+exp(sec("Déplacements domicile-travail · 2021")+
    TR_ROWS.map(([i,lab],j)=>cmp(lab,a.tr[i],(fr.tr||[])[i],TR_COL[j],80)).join(""),
    `Mode de transport principal des actifs pour aller travailler (% des actifs occupés), INSEE 2021. <b>· Fr</b> = moyenne `+
    `France. Un usage fort des <b>transports en commun / marche / vélo</b> signale un territoire urbain dense.`);
  if(a.mig&&a.mig.some(v=>v!=null)) h+=lgd()+exp(sec("Renouvellement de population · sur 1 an (2020→2021)")+
    MIG_ROWS.map((lab,i)=>cmp(lab,a.mig[i],(fr.mig||[])[i],i===0?"#3b6ea5":"#cf2e5b",100)).join(""),
    `<b>Lieu de résidence un an avant le recensement</b> (variable IRAN, recensement INSEE 2021) : la comparaison `+
    `porte donc sur <b>un seul an, entre 2020 et 2021</b> — part des habitants déjà présents vs. arrivé·es au cours `+
    `de cette année-là. Une faible part « même logement » = <b>fort renouvellement annuel</b>, électorat moins ancré, `+
    `à reconquérir à chaque scrutin.`);
  return h; }
