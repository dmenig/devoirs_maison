
// Export (chantier 5) : PDF reprenant le CONTENU EXACT de la fiche (thème sombre, barres,
// mini-cartes d'aperçu, toutes les sections) rendu en PDF. On recopie la vue principale du
// slider dans un conteneur #info à largeur fixe (donc sans le slider width:200% qui
// décentrait la capture), caché DERRIÈRE la carte (z-index:-1) pour éviter tout
// scintillement, sans backdrop-filter (sinon html2canvas rend une page blanche).
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  if(typeof html2pdf==="undefined"){ $("loading").textContent="export PDF indisponible"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const mainPane=info.querySelector(".slider .pane");
  const wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;top:0;left:0;z-index:-1;width:820px;overflow:hidden;background:#15111f";
  const root=document.createElement("div");
  root.id="info"; root.className="panel";
  root.style.cssText="position:static;display:block;width:820px;max-height:none;height:auto;"+
    "overflow:visible;box-shadow:none;backdrop-filter:none;border:none;border-radius:0;margin:0";
  root.innerHTML=mainPane?mainPane.innerHTML:info.innerHTML;
  wrap.appendChild(root); document.body.appendChild(wrap);
  $("loading").textContent="génération du PDF…";
  const opt={ margin:[8,8,8,8], filename:`atlas_${lvl}_${code}.pdf`,
    image:{type:"jpeg",quality:.96},
    html2canvas:{scale:2,backgroundColor:"#15111f",useCORS:true,logging:false},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
    pagebreak:{mode:["css","legacy"],avoid:[".exp",".act",".lever",".scn",".amini",".carnet",".srow",".row",".sec"]} };
  html2pdf().set(opt).from(root).save()
    .then(()=>{ wrap.remove(); $("loading").textContent=""; })
    .catch(()=>{ wrap.remove(); $("loading").textContent="échec de l'export PDF"; });
}
$("exportbtn").onclick=exportPDF;
