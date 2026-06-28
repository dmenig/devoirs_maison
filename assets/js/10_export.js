
// Export (chantier 5) : PDF de la FICHE telle qu'affichée pour la zone sélectionnée.
// On clone #info hors-écran, on lève la contrainte de hauteur, on aplatit le slider de
// détail (on ne garde que la vue principale) puis on rend le clone en PDF via html2pdf.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const src=$("info");
  if(src.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  if(typeof html2pdf==="undefined"){ $("loading").textContent="export PDF indisponible"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const clone=src.cloneNode(true);
  clone.removeAttribute("id");
  clone.style.cssText="position:fixed;left:-99999px;top:0;display:block;width:820px;max-height:none;"+
    "height:auto;overflow:visible;background:#1a1624;box-shadow:none;backdrop-filter:none";
  // poignée mobile inutile ; slider ramené à la seule vue principale (on retire le volet détail)
  const sh=clone.querySelector(".sheet-handle"); if(sh)sh.remove();
  const sl=clone.querySelector(".slider");
  if(sl){ sl.classList.remove("on"); sl.style.transform="none"; sl.style.width="100%";
    const panes=sl.querySelectorAll(".pane"); if(panes[1])panes[1].remove();
    if(panes[0]){ panes[0].style.width="100%"; panes[0].style.flex="1 1 100%"; } }
  document.body.appendChild(clone);
  $("loading").textContent="génération du PDF…";
  const opt={ margin:8, filename:`atlas_${lvl}_${code}.pdf`,
    image:{type:"jpeg",quality:.96},
    html2canvas:{scale:2,backgroundColor:"#1a1624",useCORS:true},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
    pagebreak:{mode:["css","legacy"],avoid:[".exp",".act",".lever",".scn",".amini",".carnet"]} };
  html2pdf().set(opt).from(clone).save()
    .then(()=>{ clone.remove(); $("loading").textContent=""; })
    .catch(()=>{ clone.remove(); $("loading").textContent="échec de l'export PDF"; });
}
$("exportbtn").onclick=exportPDF;
