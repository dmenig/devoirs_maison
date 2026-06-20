// Barre de dispersion des revenus (niveau de vie par UC) : moustaches D1→D9, segment
// épais Q1→Q3, trait blanc = médiane. Échelle bornée à [D1..D9] (ou [Q1..Q3] à la commune).
function distBand(o){ const lo=o.d1??o.q1, hi=o.d9??o.q3;
  if(lo==null||hi==null||hi<=lo)return "";
  const pos=v=>v==null?null:Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
  const q1=pos(o.q1),q3=pos(o.q3),md=pos(o.rev),d1=pos(o.d1),d9=pos(o.d9);
  const seg=(a,b,bg,ht)=> a==null||b==null?"":
    `<i style="position:absolute;left:${a}%;width:${Math.max(.5,b-a)}%;top:50%;transform:translateY(-50%);height:${ht}px;background:${bg};border-radius:2px"></i>`;
  const tick=p=>p==null?"":`<u style="position:absolute;left:${p}%;top:2px;bottom:2px;width:2px;background:#fff;opacity:.9"></u>`;
  const eur=v=>v.toLocaleString('fr')+" €";
  return `<div style="position:relative;height:20px;margin:6px 0 3px;background:#2c2640;border-radius:5px">`+
    seg(d1,d9,"rgba(123,73,179,.4)",6)+seg(q1,q3,"#6b4d94",12)+tick(md)+`</div>`+
    `<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--mut)">`+
    `<span>${eur(lo)}</span><span>médiane ${o.rev!=null?eur(o.rev):"—"}</span><span>${eur(hi)}</span></div>`; }

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
        `Poids de chaque <b>bloc en % des inscrits</b>. Historique scrutin par scrutin (2012→2026) : `+
        `<b>FI</b>=LFI-PCF-EXG · <b>PS</b>=PS-EELV · <b>EM</b>=MoDem-Renaissance · <b>LR</b>=LR-DVD · `+
        `<b>RN</b>=RN-EXD · <b>Div</b>=autres · <b>Abs</b>=abstention. « · » = indisponible.`+
        `<div class="rwrap"><table class="recompo"><thead><tr><th></th>`+
        heads.map((x,j)=>`<th style="color:${cols[j]||'#999'}">${x}</th>`).join("")+
        `</tr></thead><tbody>${rows}</tbody></table></div>`); } }

  // réservoirs de voix entre les DEUX scrutins choisis (sélecteur A→B), recalculés à la volée
  const pm=pairMetrics(o), arrow=`${selA}→${selB}`;
  let resRows="", resDet=`<p>Réservoirs entre les <b>deux scrutins choisis</b> dans le sélecteur en haut de carte.</p>`;
  if(pm.report!=null){ const perte=Math.round((100-pm.report)*10)/10;
    resRows+=`<div class="row"><span>Voix LFI conservées ${arrow}</span><b>${pm.report} %</b></div>`;
    resDet+=`<p><b>Voix LFI conservées</b> : LFI a conservé <b>${pm.report}%</b> de ses voix entre ${scLab(selA)} et ${scLab(selB)}`+
      `${perte>0?` (soit <b>${perte}%</b> de voix insoumises perdues à reconquérir)`:""}. `+
      `Taux de report en <b>voix réelles</b> (voix LFI ${selB} ÷ voix LFI ${selA}), non en % d'inscrits.</p>`; }
  if(pm.dpart!=null){
    resRows+=`<div class="row"><span>Évolution participation ${arrow}</span><b>${pm.dpart>0?"+":""}${pm.dpart} pts</b></div>`;
    resDet+=`<p><b>Évolution participation</b> : participation ${pm.dpart>=0?"plus forte":"plus faible"} de <b>${Math.abs(pm.dpart)} pts</b> `+
      `en ${scLab(selB)} qu'en ${scLab(selA)} (en points d'inscrits). Mesure la (dé)mobilisation entre les deux scrutins.</p>`; }
  if(pm.perte!=null){
    resRows+=`<div class="row"><span>Voix perdues à gauche ${arrow}</span><b>${pm.perte>0?pm.perte+" %":"—"}</b></div>`;
    resDet+=`<p><b>Voix perdues à gauche</b> : la gauche (LFI, PS, EELV, PCF) a perdu <b>${pm.perte}%</b> de ses voix entre `+
      `${scLab(selA)} et ${scLab(selB)} (voix réelles). Une valeur négative = progression.</p>`; }
  if(o.abst!=null){
    resRows+=`<div class="row"><span>Abstentionnistes à remobiliser · E24</span><b>${o.abst.toLocaleString('fr')} voix</b></div>`;
    resDet+=`<p><b>Abstentionnistes à remobiliser</b> : <b>nombre</b> d'inscrits n'ayant pas voté aux européennes 2024 `+
      `(inscrits × taux d'abstention) — et non le <b>taux</b> d'abstention en % affiché plus haut. `+
      `C'est le réservoir brut de voix à ramener aux urnes.</p>`; }
  if(resRows)h+=exp(sec(`Réservoirs de voix · ${arrow}`)+resRows,resDet);

  // Contexte social (FILOSOFI 2021) : niveau de vie + dispersion (quartiles/déciles,
  // interdécile, Gini). À l'IRIS le jeu est complet ; à la commune, médiane/pauvreté + Q1/Q3.
  const eur=v=>v.toLocaleString('fr')+" €";
  const s=[];
  if(o.rev!=null)s.push(["Revenu médian (après impôts et aides)",eur(o.rev)]);
  if(o.pauv!=null)s.push(["Taux de pauvreté",o.pauv+" %"]);
  if(o.q1!=null)s.push(["Les 25 % les plus modestes gagnent moins de",eur(o.q1)]);
  if(o.q3!=null)s.push(["Les 25 % les plus aisés gagnent plus de",eur(o.q3)]);
  if(o.ridec!=null)s.push(["Écart riches / pauvres",o.ridec+" ×"]);
  if(o.gini!=null)s.push(["Indice d'inégalité (Gini)",o.gini]);
  if(s.length)h+=exp(sec("Contexte social")+distBand(o)+
    s.map(x=>`<div class="row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join(""),
    `<b>Revenu médian (après impôts et aides)</b> par personne, corrigé de la taille du foyer, et <b>taux de pauvreté</b> `+
    `(part des habitants vivant sous 60 % du revenu médian national). La barre montre la répartition des revenus : `+
    `la barre épaisse = la moitié des foyers autour de la médiane, les traits fins vont du plus modeste au plus aisé `+
    `(8 foyers sur 10), le trait blanc = la médiane. L'<b>écart riches / pauvres</b> (combien de fois les 10 % les plus `+
    `riches gagnent plus que les 10 % les plus pauvres) et l'<b>indice de Gini</b> (0 = égalité parfaite, 1 = inégalité `+
    `maximale) mesurent les inégalités dans la zone. Source : INSEE FILOSOFI 2021 (données fiscales) — par <b>quartier</b> `+
    `le détail est complet ; à l'échelle de la <b>commune</b>, médiane et seuils (moyenne des quartiers).`);
  h+=adminPanel(o);
  h+=actionPanel(o);
  info.innerHTML=`<div class="slider"><div class="pane">${h}</div>`+
    `<div class="pane detpane"><div class="back">‹ Retour</div><div class="detbody"></div></div></div>`;
  info.scrollTop=0; info.style.display="block"; }
