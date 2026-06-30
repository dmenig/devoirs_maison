
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
// (dérivés de l'abstention E24 quand le champ insc n'est pas baké). On exclut tout *_M26
// (score municipales retiré) et le contexte social (une médiane de médianes n'a pas de sens).
function aggregateSelection(){
  const os=[...selCodes].map(c=>curVals[c]).filter(Boolean); if(!os.length)return null;
  const inscOf=o=>o.insc!=null?o.insc
    :(o.abst!=null&&o.part_E24!=null&&o.part_E24<100)?Math.round(o.abst/(1-o.part_E24/100)):null;
  const isCount=k=>/^(lfiv_|gv_)/.test(k)||k==="abst"||k==="noninsc"||k==="malinsc";
  const isPct=k=>/^(part|lfi|gauche|rn|em|lr)_/.test(k);
  const agg={}, wsum={}, wnum={}; let inscTot=0;
  os.forEach(o=>{ const insc=inscOf(o); if(insc)inscTot+=insc;
    for(const k in o){ if(k.endsWith("_M26")||typeof o[k]!=="number")continue;
      if(isCount(k))agg[k]=(agg[k]||0)+o[k];
      else if(isPct(k)&&insc){ wsum[k]=(wsum[k]||0)+o[k]*insc; wnum[k]=(wnum[k]||0)+insc; } } });
  for(const k in wsum)if(wnum[k])agg[k]=Math.round(wsum[k]/wnum[k]*10)/10;
  if(inscTot)agg.insc=inscTot; agg.reg=os[0].reg;
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
