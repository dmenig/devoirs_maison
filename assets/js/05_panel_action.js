
// Pont « de la carte à l'action » (slide 51) : traduit le profil de la zone en
// recommandations de terrain, rappelle la composition des blocs et invite à
// confronter les chiffres à la connaissance des militant·es.
function actionPanel(o){ if(!o)return "";
  const tips=[], abst=o.part_E24==null?null:Math.round(100-o.part_E24),
    recon=(o.lfi_P22!=null&&o.lfi_E24!=null)?Math.round((o.lfi_P22-o.lfi_E24)*10)/10:null;
  if(abst!=null&&abst>=50)
    tips.push(`Abstention massive (<b>${abst}%</b>) : la priorité est de <b>ramener aux urnes</b> avant de convaincre — ciblez les inscrits non-votants.`);
  else if(abst!=null&&abst>=40)
    tips.push(`Forte abstention (<b>${abst}%</b>) : gros réservoir de remobilisation, porte-à-porte civique.`);
  if(recon!=null&&recon>=5)
    tips.push(`<b>${recon} pts</b> d'insoumis de 2022 non remobilisés en 2024 : <b>renouer le contact</b>, ils nous connaissent déjà.`);
  if(o.pauv!=null&&o.pauv>=20)
    tips.push(`Pauvreté élevée (<b>${o.pauv}%</b>), souvent quartier dense / logement social : <b>le porte-à-porte y est le plus efficace</b>.`);
  if(!tips.length)
    tips.push(`Pas de réservoir dominant : combinez mobilisation des abstentionnistes et conviction, en vous appuyant sur le terrain.`);
  const dot=(c,n,d)=>`<div><span class="dot" style="background:${c}"></span><b>${n}</b> — ${d}</div>`;
  return `<div class="act"><div class="ah">🎯 De la carte à l'action</div>`+
    `<ul>${tips.map(t=>`<li>${t}</li>`).join("")}</ul>`+
    `<div class="leg">Blocs : `+
      dot("#cf2e5b","Gauche","LFI · PS · EELV · PCF")+dot("#e6902e","Macron","Renaissance · MoDem · Horizons")+
      dot("#3b6ea5","Droite","LR · divers droite")+dot("#1f3a63","RN / ED","RN · Reconquête")+`</div>`+
    `<div class="inv">Ces chiffres ne remplacent pas le terrain : confrontez-les à ce que vous savez de la commune `+
    `(présence militante, marché, vie associative, traditions locales).</div></div>`; }
