
// Plan d'action priorisé et daté (chantier 3 / maquette LFI-PEE). Ordre des leviers fixé
// par le PEE : (1) inscription des non-/mal-inscrit·es, (2) REMOBILISATION des électeur·ices
// LFI 2022 — non automatique, (3) abstentionnistes, (4) primo-votant·es ; les électorats
// proches (PS 2024) ne sont qu'un levier marginal. Les réservoirs affichés sont des voix
// réelles ; les fourchettes de conversion restent à valider (PEE).
function lever(n, titre, fenetre, res, corps){
  const r=res!=null?`<span class="lvres">${Math.round(res).toLocaleString('fr')} voix</span>`:"";
  return `<li class="lever"><div class="lvh"><span class="lvn">${n}</span>`+
    `<b>${titre}</b><span class="lvwin">${fenetre}</span>${r}</div>`+
    `<div class="lvb">${corps}</div></li>`;
}

function actionPanel(o){ if(!o)return "";
  const items=[];
  const noninsc=o.noninsc, malinsc=o.malinsc;
  const inscRes=(noninsc!=null||malinsc!=null)?(noninsc||0)+(malinsc||0):null;
  const detail=[];
  if(noninsc!=null)detail.push(`≈ <b>${noninsc.toLocaleString('fr')}</b> non-inscrit·es`);
  if(malinsc!=null)detail.push(`≈ <b>${malinsc.toLocaleString('fr')}</b> mal-inscrit·es`);
  items.push(lever("1","Inscription des non- et mal-inscrit·es","sept.→déc.",inscRes,
    `<b>Priorité n°1.</b> ${detail.length?detail.join(" · ")+". ":""}Campagne d'inscription sur les listes `+
    `et de procuration : c'est le plus gros réservoir et le plus rentable. Porte-à-porte d'inscription + permanences.`));

  const remob=(o.lfiv_P22!=null&&o.lfiv_E24!=null)?Math.max(0,o.lfiv_P22-o.lfiv_E24):null;
  items.push(lever("2","Remobiliser les électeur·ices LFI 2022","sept.→avr.",remob,
    `Le retour <b>n'est pas automatique</b> : ${remob!=null?`<b>${remob.toLocaleString('fr')}</b> voix Mélenchon 2022 ne se sont pas `+
    `retrouvées aux européennes 2024 — il faut renouer le contact, pas attendre qu'elles « reviennent à la maison ».`:
    `renouer le contact avec les électeur·ices de 2022, ne pas présumer leur retour.`}`));

  if(o.abst!=null)
    items.push(lever("3","Mobiliser les abstentionnistes","févr.→avr.",o.abst,
      `${o.abst.toLocaleString('fr')} inscrit·es n'ont pas voté aux européennes 2024. Plutôt tractage marchés / `+
      `lieux publics (le porte-à-porte y est moins efficace, disponibilités contraintes).`));

  const primo=(o.a1529!=null)?`Part des 15-29 ans : <b>${o.a1529}%</b>. `:"";
  items.push(lever("4","Aller vers les primo-votant·es","en continu",null,
    `${primo}Présence devant lycées / facs / résidences étudiantes (CROUS), inscription d'office à vérifier.`));

  const ps=o.gauche_M26!=null&&o.lfi_M26!=null?Math.round((o.gauche_M26-o.lfi_M26)*10)/10:null;
  const marg=ps!=null&&ps>0?`<div class="inv">Levier marginal : électorats proches (type PS 2024, ≈ ${ps} pts d'inscrits hors LFI à gauche) — à ne travailler qu'après les priorités ci-dessus.</div>`:"";

  return `<div class="act"><div class="ah">🎯 Plan d'action — par ordre de priorité</div>`+
    `<ul class="levers">${items.join("")}</ul>${marg}`+
    `<div class="inv">Réservoirs en voix réelles ; conversion en voix mobilisées à confronter au terrain `+
    `(présence militante, marché, vie associative).</div></div>`;
}
