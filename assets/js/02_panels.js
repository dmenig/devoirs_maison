// Fiche claire : tous les chiffres clés du rapport. Chaque section est dépliable
// (clic) pour révéler comment le chiffre est calculé, ses dates et sa source.
function infoPanel(nom,o){ const info=$("info"); lastInfo=o?{nom,o}:null;
  if(!o){info.style.display="none";return;}
  panelDetails=[];
  const w=(v,max)=>v==null?0:Math.max(2,Math.min(100,v/max*100));
  const barRow=(lab,v,col,max=50)=> v==null?"":
    `<div class="lab"><span>${lab}</span><b>${v} %</b></div>`+
    `<div class="bar"><i style="width:${w(v,max)}%;background:${col}"></i></div>`;
  const exp=expBlock;
  const sec=t=>`<div class="sec">${t}</div>`;

  const lfi=o.lfi_E24!=null?o.lfi_E24:(o.lfi_L24!=null?o.lfi_L24:o.lfi_P22);
  let h=`<div class="t">${nom}</div>`;
  h+=exp(`<div class="lead">Vote LFI · Europ. 2024</div>`+
         `<div class="head">${lfi==null?"—":lfi+" %"}<small> des inscrits</small></div>`,
    `Part des inscrits ayant voté pour la liste LFI / Union de la gauche aux <b>européennes de juin 2024</b>. `+
    `On rapporte aux <b>inscrits</b> (et non aux votants) pour mesurer le poids réel sur le corps électoral. `+
    `Source : Ministère de l'Intérieur.`);

  if(SCR.some(([sc])=>o[`lfi_${sc}`]!=null)){
    h+=exp(sec("Évolution du vote LFI")+`<div class="trend">`+
      SCR.map(([sc,lab])=>{const v=o[`lfi_${sc}`];
        return `<div class="tcol"><div class="tbarwrap"><div class="tbar" style="height:${w(v,45)}%"></div></div>`+
               `<div class="tv">${v==null?"·":v}</div><div>${lab.split(' ')[0]}</div></div>`;}).join("")+`</div>`,
      `Vote LFI en % des inscrits à chaque scrutin : <b>Présid.</b> avril 2022 (voix Mélenchon, 1<sup>er</sup> tour) · `+
      `<b>Europ.</b> juin 2024 · <b>Légis.</b> juin 2024 (1<sup>er</sup> tour) · <b>Munic.</b> mars 2026 (1<sup>er</sup> tour, `+
      `là où disponible). « · » = donnée indisponible.`); }

  if(o.part_E24!=null){ const abst=Math.round((100-o.part_E24)*10)/10;
    h+=exp(sec("Participation · Europ. 2024")+barRow("Participation",o.part_E24,"#2e8b57",100)+
      `<div class="row"><span>Abstention</span><b>${abst} %</b></div>`,
      `<b>Participation</b> = votants ÷ inscrits aux européennes de juin 2024. `+
      `<b>Abstention</b> = 100 − participation = part des inscrits qui ne se sont pas déplacés.`); }

  if([o.gauche_E24,o.em_E24,o.lr_E24,o.rn_E24].some(v=>v!=null)){
    h+=exp(sec("Rapport de force · Europ. 2024")+
      barRow("Gauche (LFI-PS-EELV-PCF)",o.gauche_E24,"#cf2e5b")+
      barRow("Macron (Renaissance)",o.em_E24,"#e6902e")+
      barRow("Droite (LR)",o.lr_E24,"#3b6ea5")+
      barRow("RN / extrême droite",o.rn_E24,"#1f3a63"),
      `Poids de chaque bloc en <b>% des inscrits</b> aux européennes 2024. `+
      `<b>Gauche</b> = LFI + PS + EELV + PCF + divers gauche. <b>Macron</b> = Renaissance / MoDem / Horizons. `+
      `<b>Droite</b> = LR + divers droite. <b>RN</b> = RN + Reconquête + extrême droite.`); }

  // recomposition (slide 23) : essentiel = barre du dernier scrutin ; détail (clic) = tableau complet
  if(window.__scr&&o.rec){
    const heads=["FI","PS","EM","LR","RN","Div","Abs"],
      full=["LFI-PCF","PS-EELV","Macron","LR-DVD","RN-ED","Autres"],
      cols=["#cf2e5b","#c2348b","#e6902e","#3b6ea5","#1f3a63","#8a8a8a"], gris="rgba(140,140,150,.45)";
    let li=-1; window.__scr.forEach((s,i)=>{ if(o.rec[i])li=i; }); // dernier scrutin disponible
    if(li>=0){ const r=o.rec[li];
      const seg=r.slice(0,6).map((v,j)=> v?`<i style="width:${v}%;background:${cols[j]}" title="${full[j]} ${v}%"></i>`:"").join("")+
        (r[6]?`<i style="width:${r[6]}%;background:${gris}" title="Abstention ${r[6]}%"></i>`:"");
      const lg=full.map((n,j)=> r[j]?`<span><i style="background:${cols[j]}"></i>${n} ${r[j]}%</span>`:"").filter(Boolean).join("")+
        (r[6]?`<span><i style="background:${gris}"></i>Abst. ${r[6]}%</span>`:"");
      let rows="";
      window.__scr.forEach((s,i)=>{ const rr=o.rec[i]; if(!rr)return;
        rows+=`<tr><td class="sc" title="${s.l}">${s.c}</td>`+
          rr.map(v=>`<td>${v==null?"·":v}</td>`).join("")+`</tr>`; });
      h+=exp(sec("Recomposition · "+window.__scr[li].c)+
        `<div class="recbar">${seg}</div><div class="reclg">${lg}</div>`,
        `Poids de chaque <b>bloc en % des inscrits</b> (slide 23). Historique scrutin par scrutin (2012→2026) : `+
        `<b>FI</b>=LFI-PCF-EXG · <b>PS</b>=PS-EELV · <b>EM</b>=MoDem-Renaissance · <b>LR</b>=LR-DVD · `+
        `<b>RN</b>=RN-EXD · <b>Div</b>=autres · <b>Abs</b>=abstention. « · » = indisponible.`+
        `<div class="rwrap"><table class="recompo"><thead><tr><th></th>`+
        heads.map((x,j)=>`<th style="color:${cols[j]||'#999'}">${x}</th>`).join("")+
        `</tr></thead><tbody>${rows}</tbody></table></div>`); } }

  // réservoirs de voix entre les DEUX scrutins choisis (sélecteur A→B), recalculés à la volée
  const pm=pairMetrics(o), arrow=`${selA}→${selB}`;
  let resRows="", resDet=`<p>Réservoirs entre les <b>deux scrutins choisis</b> dans le sélecteur en haut de carte.</p>`;
  if(pm.report!=null){ const perte=Math.round((100-pm.report)*10)/10;
    resRows+=`<div class="row"><span>Report LFI ${arrow}</span><b>${pm.report} %</b></div>`;
    resDet+=`<p><b>Report LFI</b> : LFI a conservé <b>${pm.report}%</b> de ses voix entre ${scLab(selA)} et ${scLab(selB)}`+
      `${perte>0?` (soit <b>${perte}%</b> de voix insoumises perdues à reconquérir)`:""}. `+
      `Taux de report en <b>voix réelles</b> (voix LFI ${selB} ÷ voix LFI ${selA}), non en % d'inscrits.</p>`; }
  if(pm.dpart!=null){
    resRows+=`<div class="row"><span>Différentiel participation ${arrow}</span><b>${pm.dpart>0?"+":""}${pm.dpart} pts</b></div>`;
    resDet+=`<p><b>Différentiel participation</b> : participation ${pm.dpart>=0?"plus forte":"plus faible"} de <b>${Math.abs(pm.dpart)} pts</b> `+
      `en ${scLab(selB)} qu'en ${scLab(selA)} (en points d'inscrits). Mesure la (dé)mobilisation entre les deux scrutins.</p>`; }
  if(pm.perte!=null){
    resRows+=`<div class="row"><span>Taux de perte gauche ${arrow}</span><b>${pm.perte>0?pm.perte+" %":"—"}</b></div>`;
    resDet+=`<p><b>Taux de perte gauche</b> : la gauche (bloc social-écologique) a perdu <b>${pm.perte}%</b> de ses voix entre `+
      `${scLab(selA)} et ${scLab(selB)} (voix réelles). Une valeur négative = progression.</p>`; }
  if(o.abst!=null){
    resRows+=`<div class="row"><span>Abstentionnistes à remobiliser · E24</span><b>${o.abst.toLocaleString('fr')} voix</b></div>`;
    resDet+=`<p><b>Abstentionnistes à remobiliser</b> : <b>nombre</b> d'inscrits n'ayant pas voté aux européennes 2024 `+
      `(inscrits × taux d'abstention) — et non le <b>taux</b> d'abstention en % affiché plus haut. `+
      `C'est le réservoir brut de voix à ramener aux urnes.</p>`; }
  if(resRows)h+=exp(sec(`Réservoirs de voix · ${arrow}`)+resRows,resDet);

  const s=[];
  if(o.rev!=null)s.push(["Revenu médian",o.rev.toLocaleString('fr')+" €"]);
  if(o.pauv!=null)s.push(["Taux de pauvreté",o.pauv+" %"]);
  if(s.length)h+=exp(sec("Contexte social")+
    s.map(x=>`<div class="row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join(""),
    `<b>Revenu médian</b> disponible par unité de consommation et <b>taux de pauvreté</b> (part sous le seuil de `+
    `pauvreté). Source : INSEE FILOSOFI 2021, à la commune (ou à l'IRIS en vue quartiers).`);
  h+=adminPanel(o);
  h+=actionPanel(o);
  info.innerHTML=`<div class="slider"><div class="pane">${h}</div>`+
    `<div class="pane detpane"><div class="back">‹ Retour</div><div class="detbody"></div></div></div>`;
  info.scrollTop=0; info.style.display="block"; }

// Profil INSEE de la commune (fiche circonscription de la prez, slides 25-28) :
// pyramide des âges, statut d'occupation, déplacements domicile-travail,
// renouvellement de population et maire en exercice — chacun comparé à la France.
function adminPanel(o){ const a=o&&o.adm; if(!a)return ""; const fr=window.__adminFr||{};
  const exp=expBlock;
  const sec=t=>`<div class="sec">${t}</div>`;
  // barre comparative : remplissage commune + repère France (trait blanc « u »)
  const cmp=(lab,v,f,col,max)=> v==null?"":
    `<div class="lab"><span>${lab}</span><b>${v} %${f!=null?` <span class="frtag">· Fr ${f}</span>`:""}</b></div>`+
    `<div class="bar">${f!=null?`<u style="left:${Math.min(100,f/max*100)}%"></u>`:""}`+
    `<i style="width:${Math.max(2,Math.min(100,v/max*100))}%;background:${col}"></i></div>`;
  let h="";
  if(a.maire) h+=exp(sec("Maire en exercice")+
    `<div class="row"><span>${a.maire}</span><b class="frtag">${a.csp||""}</b></div>`,
    `<b>Maire actuel</b> (Répertoire national des élus, data.gouv). Point de départ de l'<b>histoire `+
    `électorale</b> locale (slide 22) : complétez avec les maires successifs et la tradition politique connue des militant·es.`);
  if(a.ageh&&a.ageh.some(v=>v!=null)){
    const all=[...a.ageh,...a.agef,...(fr.ageh||[]),...(fr.agef||[])].filter(v=>v!=null), mx=Math.max(...all,1);
    let rows="";
    for(let i=5;i>=0;i--){ const fh=(fr.ageh||[])[i], ff=(fr.agef||[])[i];
      rows+=`<div class="pyrow"><div class="ph">${fh!=null?`<u style="right:${fh/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.ageh[i]||0)/mx*100}%;background:#3b6ea5"></i></div>`+
        `<div class="pmid">${AGE_LAB[i]}</div>`+
        `<div class="pf">${ff!=null?`<u style="left:${ff/mx*100}%"></u>`:""}`+
        `<i style="width:${(a.agef[i]||0)/mx*100}%;background:#cf2e5b"></i></div></div>`; }
    h+=exp(sec("Pyramide des âges")+`<div class="pyr"><div class="pyrhead"><span>◀ Hommes</span><span>Femmes ▶</span></div>${rows}</div>`,
      `Population par <b>sexe et tranche d'âge</b> (% de la population), recensement INSEE 2021. Barres = la commune, `+
      `<b>trait blanc</b> = la France. Mesure la jeunesse / le vieillissement par rapport à la moyenne nationale (slide 26).`); }
  if(a.prop!=null||a.loc!=null) h+=exp(sec("Logement · statut d'occupation")+
    cmp("Propriétaires",a.prop,fr.prop,"#3b6ea5",100)+cmp("Locataires",a.loc,fr.loc,"#cf2e5b",100)+
    cmp("dont HLM",a.hlm,fr.hlm,"#b08a2e",100),
    `Part des <b>résidences principales</b> selon que le ménage est propriétaire ou locataire (dont HLM), INSEE 2021. `+
    `<b>· Fr</b> = moyenne France. Une commune fortement <b>locataire</b> et pauvre est un terrain prioritaire (slide 27).`);
  if(a.tr&&a.tr.some(v=>v!=null)) h+=exp(sec("Déplacements domicile-travail")+
    TR_ROWS.map(([i,lab],j)=>cmp(lab,a.tr[i],(fr.tr||[])[i],TR_COL[j],80)).join(""),
    `Mode de transport principal des actifs pour aller travailler (% des actifs occupés), INSEE 2021. <b>· Fr</b> = moyenne `+
    `France. Un usage fort des <b>transports en commun / marche / vélo</b> signale un territoire urbain dense (slide 28).`);
  if(a.mig&&a.mig.some(v=>v!=null)) h+=exp(sec("Renouvellement de population")+
    MIG_ROWS.map((lab,i)=>cmp(lab,a.mig[i],(fr.mig||[])[i],i===0?"#3b6ea5":"#cf2e5b",100)).join(""),
    `<b>Lieu de résidence un an auparavant</b> (recensement INSEE) : part des habitants déjà présents vs. arrivés récemment. `+
    `Une faible part « même logement » = <b>fort renouvellement</b> (slide 25), électorat moins ancré, à reconquérir à chaque scrutin.`);
  return h; }

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
