
// Export (chantier 5) : PDF de la FICHE telle qu'affichée pour la zone sélectionnée.
// html2canvas ne capture de façon fiable qu'un élément visible et stylé : on rend donc
// #info EN PLACE, en levant temporairement la contrainte de hauteur et en repliant le
// slider de détail sur sa vue principale, puis on restaure l'état initial.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  if(typeof html2pdf==="undefined"){ $("loading").textContent="export PDF indisponible"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const sl=info.querySelector(".slider"), pane2=sl&&sl.querySelectorAll(".pane")[1];
  const prev={ maxH:info.style.maxHeight, ovf:info.style.overflow, sw:info.scrollTop,
    on:sl&&sl.classList.contains("on"), slW:sl&&sl.style.width, p2:pane2&&pane2.style.display };
  // état « capture » : pleine hauteur, slider sur la vue principale, volet détail masqué
  if(sl){ sl.classList.remove("on"); sl.style.width="100%"; }
  if(pane2)pane2.style.display="none";
  info.style.maxHeight="none"; info.style.overflow="visible"; info.scrollTop=0;
  const restore=()=>{ info.style.maxHeight=prev.maxH; info.style.overflow=prev.ovf; info.scrollTop=prev.sw;
    if(sl){ sl.style.width=prev.slW||""; if(prev.on)sl.classList.add("on"); }
    if(pane2)pane2.style.display=prev.p2||""; };
  $("loading").textContent="génération du PDF…";
  const opt={ margin:8, filename:`atlas_${lvl}_${code}.pdf`,
    image:{type:"jpeg",quality:.96},
    html2canvas:{scale:2,backgroundColor:"#1a1624",useCORS:true,scrollX:0,scrollY:0,
      width:info.offsetWidth,windowWidth:info.offsetWidth},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
    pagebreak:{mode:["css","legacy"],avoid:[".exp",".act",".lever",".scn",".amini",".carnet"]} };
  html2pdf().set(opt).from(info).save()
    .then(()=>{ restore(); $("loading").textContent=""; })
    .catch(()=>{ restore(); $("loading").textContent="échec de l'export PDF"; });
}
$("exportbtn").onclick=exportPDF;
