
// Export (chantier 5) : PDF de la FICHE telle qu'affichée pour la zone sélectionnée.
// On clone #info dans un conteneur placé DERRIÈRE la carte (z-index:-1) : html2canvas rend
// le sous-arbre cloné (pas une capture d'écran), donc la fiche visible ne bouge pas — aucun
// scintillement. On neutralise sur le clone les propriétés qui rendent html2canvas blanc
// (backdrop-filter surtout, + box-shadow/transform) et on replie le slider de détail.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  if(typeof html2pdf==="undefined"){ $("loading").textContent="export PDF indisponible"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;top:0;left:0;z-index:-1;width:820px;background:#1a1624";
  const clone=info.cloneNode(true);
  clone.style.cssText="position:static;display:block;width:820px;max-height:none;height:auto;"+
    "overflow:visible;box-shadow:none;backdrop-filter:none;border:none;margin:0";
  const sh=clone.querySelector(".sheet-handle"); if(sh)sh.remove();
  const sl=clone.querySelector(".slider");
  if(sl){ sl.classList.remove("on"); sl.style.transform="none"; sl.style.width="100%";
    const panes=sl.querySelectorAll(".pane"); if(panes[1])panes[1].remove();
    if(panes[0]){ panes[0].style.width="100%"; panes[0].style.flex="1 1 100%"; } }
  wrap.appendChild(clone); document.body.appendChild(wrap);
  $("loading").textContent="génération du PDF…";
  const opt={ margin:8, filename:`atlas_${lvl}_${code}.pdf`,
    image:{type:"jpeg",quality:.96},
    html2canvas:{scale:2,backgroundColor:"#1a1624",useCORS:true,logging:false},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
    pagebreak:{mode:["css","legacy"],avoid:[".exp",".act",".lever",".scn",".amini",".carnet"]} };
  html2pdf().set(opt).from(clone).save()
    .then(()=>{ wrap.remove(); $("loading").textContent=""; })
    .catch(()=>{ wrap.remove(); $("loading").textContent="échec de l'export PDF"; });
}
$("exportbtn").onclick=exportPDF;
