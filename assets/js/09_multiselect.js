
// ============================================================================
// Sélection multiple de communes (retour Elia, point 4). En mode multi, cliquer une
// commune l'ajoute/retire d'une sélection ; la « fiche agrégée » somme les voix et
// recompose les pourcentages pondérés par les inscrits. Le SCORE MUNICIPALES est retiré
// de l'agrégat (incomparable d'une commune à l'autre : tête de liste LFI ou non).
// Pensée pour les GA à l'échelle interco / circo (territoires ruraux, beaucoup de communes).
// ⚠ Sélectionner une circonscription entière n'est pas possible côté client : la maille
// circonscription n'est pas bakée (scrutin national présidentiel) — à ajouter au pipeline.

function clearSel(){ if(selCodes.size)selCodes.clear(); selBarSync(); }

function repaintSel(){ if(layer&&layer.eachLayer)layer.eachLayer(l=>l.feature&&layer.resetStyle(l)); }

function toggleSel(code){ if(selCodes.has(code))selCodes.delete(code); else selCodes.add(code);
  repaintSel(); selBarSync(); }

function selBarSync(){ const bar=$("selbar"); if(!bar)return;
  bar.style.display=multiSel?"flex":"none";
  if(window.__syncLayout)window.__syncLayout();
  const n=selCodes.size;
  $("selcount").textContent=n?`${n} commune${n>1?"s":""} sélectionnée${n>1?"s":""}`
    :"Cliquez les communes à regrouper";
  $("selview").disabled=n<1; $("selclear").disabled=n<1;
  syncCircoSelect(); }

// niveau commune-choroplèthe affiché = on est ENTRÉ dans un département (sommet de pile).
const auNiveauCommunes=()=>{ const t=stack[stack.length-1]; return !!t&&t.niveau==="departement"; };

// Sélecteur de circonscription : peuplé avec les circos du département courant (mapping
// commune↔circo baké dans values/_circo.json, chargé paresseusement et mis en cache).
// « + Circo » ajoute toutes les communes de la circo choisie à la sélection.
let circoData=null, circoDep=null;
const circoLabel=c=>`${+c.split("-")[1]}ᵉ circonscription`;
async function syncCircoSelect(){ const sel=$("selcirco"), btn=$("seladdcirco"); if(!sel)return;
  const dep=(multiSel&&auNiveauCommunes())?stack[stack.length-1].code:null;
  const show=!!dep; sel.style.display=btn.style.display=show?"":"none";
  if(!show){ circoDep=null; return; }
  if(dep===circoDep)return; circoDep=dep;
  if(!circoData)circoData=await getJSON("values/_circo.json")||{};
  const circos=Object.keys(circoData).filter(c=>c.startsWith(dep+"-")).sort();
  sel.innerHTML=`<option value="">— circonscription —</option>`+
    circos.map(c=>`<option value="${c}">${circoLabel(c)}</option>`).join("");
  btn.disabled=!circos.length; }

// Agrégat de la sélection : voix/effectifs sommés, pourcentages pondérés par les inscrits
// (registre `insc_E24`, reconstitué du stock d'abstention en repli). On exclut tout *_M26
// (score municipales retiré) et le contexte social (une médiane de médianes n'a pas de sens).
function aggregateSelection(){
  const os=[...selCodes].map(c=>curVals[c]).filter(Boolean); if(!os.length)return null;
  const inscOf=inscRef;
  // Voix à conquérir 2027 : extensif (voix, conjoncturels, portes, heures, km) → somme ;
  // intensif (abstention prédite, plancher, gauche prédite) → moyenne pondérée par les
  // inscrits ; γ → moyenne pondérée par les CONJONCTURELS, sur lesquels il s'applique ;
  // part de portes en voiture → moyenne pondérée par les portes. Le rendement de la
  // version 3, lui, n'est jamais moyenné : il se recalcule en `mobn / mobh` sur l'agrégat.
  const MOB_CNT=new Set(["mob","mobc","mobn","mobp","mobh","mobk"]);
  const MOB_POND={mobg:"mobc",mobv:"mobp"};
  // `resinsc` est un solde SIGNÉ : le sommer sur une sélection donne le solde net du
  // territoire, où les communes d'origine des mal-inscrit·es compensent les villes qui les
  // accueillent. C'est la bonne agrégation, et elle n'était pas possible tant que les
  // écarts négatifs n'étaient pas servis. Tous les autres EFFECTIFS se somment aussi :
  // voix, registres et votant·es de chaque scrutin (`insc_`, `vot_` — ce sont eux qui
  // permettent de relire en personnes les pourcentages pondérés de la fiche agrégée),
  // population (`pop`) et corps électoral potentiel (`maj`).
  const isCount=k=>/^(lfiv_|gv_|insc_|vot_)/.test(k)||k==="abst"||k==="resinsc"
    ||k==="maj"||k==="pop"||MOB_CNT.has(k);
  const isPct=k=>/^(part|lfi|gauche|rn|em|lr)_/.test(k)||k==="moba"||k==="mobf"||k==="mobl";
  const agg={}, wsum={}, wnum={}; let inscTot=0;
  os.forEach(o=>{ const insc=inscOf(o); if(insc)inscTot+=insc;
    for(const k in o){ if(k.endsWith("_M26")||typeof o[k]!=="number")continue;
      const pk=MOB_POND[k], p=pk?o[pk]:null;
      if(isCount(k))agg[k]=(agg[k]||0)+o[k];
      else if(pk){ if(p){ wsum[k]=(wsum[k]||0)+o[k]*p; wnum[k]=(wnum[k]||0)+p; } }
      else if(isPct(k)&&insc){ wsum[k]=(wsum[k]||0)+o[k]*insc; wnum[k]=(wnum[k]||0)+insc; } } });
  for(const k in wsum)if(wnum[k])agg[k]=Math.round(wsum[k]/wnum[k]*10)/10;
  // Repli : là où aucune commune de la sélection ne porte `insc_E24`, le registre reste
  // reconstitué du stock d'abstention (cf. inscRef) — on le sert sous le même nom pour
  // que la fiche agrégée n'ait rien de particulier à savoir.
  if(inscTot&&agg[`insc_${SC_REGISTRE}`]==null)agg[`insc_${SC_REGISTRE}`]=inscTot;
  agg.reg=os[0].reg;
  return agg;
}

function openAggregate(){ const o=aggregateSelection(); if(!o)return;
  const n=selCodes.size;
  infoPanel(`${n} communes sélectionnées`,o,"multi",null); }

(function(){ const mt=$("multitoggle"); if(!mt)return;
  mt.onclick=()=>{ multiSel=!multiSel; mt.setAttribute("aria-pressed",String(multiSel));
    document.body.classList.toggle("multi",multiSel);
    if(!multiSel)selCodes.clear();
    repaintSel(); selBarSync(); };
  $("selclear").onclick=()=>{ selCodes.clear(); repaintSel(); selBarSync(); };
  $("selview").onclick=openAggregate;
  $("selall").onclick=()=>{ if(!auNiveauCommunes()||!layer)return;
    layer.eachLayer(l=>l.feature&&selCodes.add(l.feature.properties.__code));
    repaintSel(); selBarSync(); };
  $("seladdcirco").onclick=()=>{ const c=$("selcirco").value; if(!c||!circoData)return;
    (circoData[c]||[]).forEach(code=>{ if(curVals[code])selCodes.add(code); });
    repaintSel(); selBarSync(); };
  selBarSync(); })();
