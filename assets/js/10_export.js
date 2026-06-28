
// Export (chantier 5) : PDF reprenant le CONTENU EXACT de la fiche (texte non reformulé,
// sélectionnable ; thème sombre ; barres, mini-cartes, toutes les sections). On recopie le
// HTML de la vue principale de la fiche dans une fenêtre dédiée et on lance l'impression
// navigateur (« Enregistrer au format PDF ») : rendu vectoriel, texte sélectionnable, pas
// de troncature (la mise en page se recompose). print-color-adjust conserve le thème sombre.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const mainPane=info.querySelector(".slider .pane");
  const content=mainPane?mainPane.innerHTML:info.innerHTML;
  const css=Array.from(document.querySelectorAll("style")).map(s=>s.textContent).join("\n");
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8">`+
    `<title>atlas_${lvl}_${code}</title><style>${css}</style><style>`+
    `html,body{background:#15111f;margin:0;padding:0}`+
    `*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}`+
    `#info{position:static !important;display:block !important;width:auto !important;max-width:760px;`+
      `margin:0 auto !important;max-height:none !important;overflow:visible !important;`+
      `box-shadow:none !important;backdrop-filter:none !important;border:none !important;`+
      `border-radius:0 !important;padding:16px 18px !important}`+
    `#info .cols{columns:1 !important;column-width:auto !important;column-gap:0 !important}`+
    `#info .slider{width:100% !important;transform:none !important}`+
    `#info .pane{width:100% !important;flex:1 1 100% !important}`+
    `.exp,.act,.lever,.scn,.amini,.carnet,.sec,.srow,.row{break-inside:avoid}`+
    `@page{size:A4;margin:12mm}`+
    `</style></head><body><div id="info" class="panel">${content}</div>`+
    `<scr`+`ipt>window.onload=function(){setTimeout(function(){window.focus();window.print();},300);};</scr`+`ipt>`+
    `</body></html>`;
  const w=window.open("","_blank");
  if(!w){ $("loading").textContent="autorisez les pop-ups pour exporter en PDF"; return; }
  w.document.open(); w.document.write(html); w.document.close();
  $("loading").textContent="";
}
$("exportbtn").onclick=exportPDF;
