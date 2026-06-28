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

// Bottom-sheet mobile : à l'ouverture, on recentre la carte vers le haut pour que le
// point central reste visible dans la moitié de carte laissée libre (pan de h/2). À la
// fermeture, on annule ce décalage. Inactif en desktop (fiche latérale, pas de recouvrement).
const isMobileSheet=()=>window.matchMedia("(max-width:680px)").matches;
// hauteur occultée en haut par la barre (#top : fil d'Ariane + recherche), pour la réserver
// aussi dans les cadrages : la zone visée se centre dans la carte réellement visible.
const topInset=()=>isMobileSheet()?Math.round($("top").getBoundingClientRect().bottom):0;
let _sheetPan=0;
function showInfoSheet(info){
  const wasHidden=info.style.display!=="block";
  info.scrollTop=0; info.style.display="block";
  if(isMobileSheet()&&wasHidden){
    _sheetPan=Math.round((info.getBoundingClientRect().height-topInset())/2);
    if(_sheetPan)map.panBy([0,_sheetPan],{animate:true}); } }
function hideInfoSheet(info){ info.style.display="none";
  if(_sheetPan){ map.panBy([0,-_sheetPan],{animate:false}); _sheetPan=0; } }
// hauteur occultée par le bottom-sheet (mobile) : sert de marge basse aux cadrages
// flyTo pour que la zone visée soit centrée dans la carte VISIBLE, pas sous la fiche.
function sheetInset(){ const info=$("info");
  return isMobileSheet()&&info.style.display==="block"?Math.round(info.getBoundingClientRect().height):0; }
// largeur occultée à droite par la fiche latérale (desktop) : sert de marge droite aux
// cadrages flyTo pour que la zone visée se centre dans la carte libre, à gauche de la fiche.
function infoInset(){ const info=$("info"); if(isMobileSheet()||info.style.display!=="block")return 0;
  return Math.round(info.getBoundingClientRect().width)+20; }

// Fiche claire : tous les chiffres clés du rapport. Chaque section est dépliable
// (clic) pour révéler comment le chiffre est calculé, ses dates et sa source.
function infoPanel(nom,o,niveau,code){ const info=$("info"); lastInfo=o?{nom,o,niveau,code}:null;
  if(!o){hideInfoSheet(info);return;}
  panelDetails=[];
  const w=(v,max)=>v==null?0:Math.max(2,Math.min(100,v/max*100));
  const barRow=(lab,v,col,max=50)=> v==null?"":
    `<div class="lab"><span>${lab}</span><b>${v} %</b></div>`+
    `<div class="bar"><i style="width:${w(v,max)}%;background:${col}"></i></div>`;
  const exp=expBlock;
  const sec=t=>`<div class="sec">${t}</div>`;

  const lfi=o.lfi_E24!=null?o.lfi_E24:(o.lfi_L24!=null?o.lfi_L24:o.lfi_P22);
  let h=`<div class="t">${nom}</div>`;
  // Carnet de campagne (objectifs + décomposition + plan d'action) RÉSERVÉ à la commune :
  // c'est la maille d'action de référence (cf. EVOLUTIONS.md ch.3). Aux échelles d'ensemble
  // (région/dép) et de drill-down (BV/IRIS), on ne montre que la fiche descriptive.
  const estCommune=niveau==="commune";
  if(estCommune)h+=carnet(o);
  if(lfi!=null){
    h+=exp(`<div class="lead">Vote LFI · Europ. 2024</div>`+
           `<div class="head">${lfi} %<small> des inscrits</small></div>`,
      `Part des inscrits ayant voté pour la liste LFI / Union de la gauche aux <b>européennes de juin 2024</b>. `+
      `On rapporte aux <b>inscrits</b> (et non aux votants) pour mesurer le poids réel sur le corps électoral. `+
      `Source : Ministère de l'Intérieur.`);
  } else if(o.rev!=null){
    h+=exp(`<div class="lead">Revenu médian · quartier · 2021</div>`+
           `<div class="head">${o.rev.toLocaleString('fr')} €<small> par personne / an</small></div>`,
      `À l'échelle du <b>quartier (IRIS)</b>, les résultats électoraux ne sont pas disponibles : le vote se compte `+
      `par <b>bureau de vote</b>, pas par IRIS. On affiche donc le <b>contexte social</b> — revenu médian par personne `+
      `après impôts et aides. Source : INSEE FILOSOFI 2021.`);
  }

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

  // Contexte social + déterminants du vote (FILOSOFI + recensement INSEE 2021).
  // Chaque valeur est confrontée à la référence nationale et régionale (sinon un % brut
  // ne dit rien). Refs : parts exactes par région, revenu/pauvreté pondérés par la pop.
  const refFr=window.__socioFr||{}, refRg=(window.__socioReg||{})[o.reg]||{};
  const fmtv=(v,u)=> u==="€"?Math.round(v).toLocaleString('fr')+" €":v+(u||"");
  const srow=(lab,k,u)=>{ const v=o[k]; if(v==null)return "";
    const fr=refFr[k], rg=refRg[k], r=[];
    if(fr!=null)r.push("France "+fmtv(fr,u)); if(rg!=null)r.push("région "+fmtv(rg,u));
    return `<div class="srow"><span class="sl">${lab}</span><span class="sv"><b>${fmtv(v,u)}</b>`+
      (r.length?`<span class="ref">${r.join(" · ")}</span>`:"")+`</span></div>`; };
  const rows=arr=>arr.map(x=>srow(x[0],x[1],x[2])).join("");

  const soc=rows([["Revenu médian (après impôts et aides)","rev","€"],
    ["Taux de pauvreté","pauv","%"],["Les 25 % les plus modestes en dessous de","q1","€"],
    ["Les 25 % les plus aisés au-dessus de","q3","€"],["Écart riches / pauvres","ridec"," ×"],
    ["Indice d'inégalité (Gini)","gini",""]]);
  if(soc)h+=exp(sec("Contexte social · 2021")+distBand(o)+soc,
    `<b>Revenu médian</b> (après impôts et aides) par personne, corrigé de la taille du foyer, et `+
    `<b>taux de pauvreté</b> (part vivant sous 60 % du revenu médian national). Chaque valeur est `+
    `comparée à la <b>moyenne France</b> et à la <b>moyenne de la région</b>. La barre montre la `+
    `répartition des revenus (barre épaisse = moitié des foyers autour de la médiane). Source : INSEE `+
    `FILOSOFI 2021. À l'échelle commune : médiane et seuils (moyenne des quartiers).`);
  const age=rows([["0-14 ans","a014","%"],["15-29 ans","a1529","%"],["30-44 ans","a3044","%"],
    ["45-59 ans","a4559","%"],["60-74 ans","a6074","%"],["75 ans et +","a75","%"]]);
  if(age)h+=exp(sec("Âge de la population · 2021")+age,
    `Répartition par tranche d'âge (INSEE 2021), comparée à la France et à la région. L'âge est `+
    `l'un des principaux déterminants du vote et de la participation.`);
  const csp=rows([["Cadres / prof. sup.","cad","%"],["Professions intermédiaires","pint","%"],
    ["Employés","emp","%"],["Ouvriers","ouv","%"],["Retraités","ret","%"],["Taux de chômage (15-64 ans)","chom","%"]]);
  if(csp)h+=exp(sec("Catégories sociales · 2021")+csp,
    `Composition socioprofessionnelle des 15 ans et plus (en % de cette population) et taux de chômage `+
    `des actifs (INSEE 2021), comparés à la France et à la région. Le métier (PCS) structure fortement le vote.`);
  const dip=rows([["Sans diplôme ou brevet seul","dipl0","%"],["Diplômé·e du supérieur","diplsup","%"]]);
  if(dip)h+=exp(sec("Diplômes · 2021")+dip,
    `Part des 15 ans et plus non scolarisés sans diplôme (ou brevet seul) et diplômés du supérieur `+
    `(INSEE 2021), comparée à la France et à la région.`);
  const log=rows([["Propriétaires","logprop","%"],["Locataires","logloc","%"],["Logement social (HLM)","loghlm","%"]]);
  if(log)h+=exp(sec("Logement · 2021")+log,
    `Statut d'occupation des résidences principales (INSEE 2021), comparé à la France et à la région. `+
    `Le mode d'habitat est un déterminant du vote.`);
  h+=adminPanel(o);
  if(estCommune)h+=actionPanel(o);
  // « les cartes en bas du truc d'Elia » (chantier 4) : vue d'ensemble locale à l'échelle GA,
  // remplie en asynchrone une fois la fiche posée (cf. 032_apercu.js).
  if(estCommune)h+=`<div class="csec">Vue d'ensemble locale · échelle Groupe d'action</div>`+
    `<div id="apercu" class="apercu"><div class="ahint">chargement…</div></div>`;
  info.classList.remove("collapsed");
  info.innerHTML=`<div class="sheet-handle"><span class="sh-name">${nom}</span></div>`+
    `<div class="slider"><div class="pane">${h}</div>`+
    `<div class="pane detpane"><div class="back">‹ Retour</div><div class="detbody"></div></div></div>`;
  showInfoSheet(info);
  if(estCommune&&code)fillApercu(code); }
