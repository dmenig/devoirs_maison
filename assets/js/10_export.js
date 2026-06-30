
// Export (chantier 5) : PDF au rendu IDENTIQUE au panneau. Seul le rendu natif du
// navigateur reproduit exactement la fiche (vrais tableaux de recomposition, pyramide des
// âges, barres, thème sombre) AVEC un texte sélectionnable. On recopie le HTML EXACT de la
// fiche dans une fenêtre dédiée, on déplie EN LIGNE le détail de chaque section (le PDF est
// statique), puis on lance l'impression (« Enregistrer au format PDF »). La mise en page se
// recompose → aucune troncature ; print-color-adjust conserve le thème sombre.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const pane=info.querySelector(".slider .pane")||info;
  const clone=pane.cloneNode(true);
  // détails dépliés en ligne : chaque section cliquable (.exph[data-di]) reçoit son
  // explication (panelDetails) juste en dessous, dans le même style que l'app (.detbody).
  clone.querySelectorAll(".exph[data-di]").forEach(h=>{ const di=+h.dataset.di;
    const html=panelDetails[di]; if(html==null)return;
    const d=document.createElement("div"); d.className="detbody"; d.style.margin="7px 0 2px"; d.innerHTML=html;
    (h.closest(".exp")||h).insertAdjacentElement("afterend",d); });
  const content=clone.innerHTML;
  const css=Array.from(document.querySelectorAll("style")).map(s=>s.textContent).join("\n");
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8">`+
    `<title>atlas_${lvl}_${code}</title><style>${css}</style><style>`+
    `html,body{background:#15111f;margin:0;padding:0}`+
    `*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}`+
    `#info{position:static !important;display:block !important;width:auto !important;max-width:780px;`+
      `margin:0 auto !important;max-height:none !important;overflow:visible !important;box-shadow:none !important;`+
      `backdrop-filter:none !important;border:none !important;border-radius:0 !important;padding:16px 18px !important}`+
    `#info .cols{columns:1 !important;column-width:auto !important;column-gap:0 !important}`+
    `#info .detbody{display:block !important}`+
    `#info .spbody{display:block !important}#info .spcaret{display:none !important}`+
    `#info .exp .exph::after{display:none !important}`+
    `#info .rwrap{overflow:visible !important}`+
    `#info table.recompo{width:100% !important;font-size:7.5px !important;table-layout:fixed !important}`+
    `#info .back,#info .sheet-handle{display:none !important}`+
    `.exp,.act,.lever,.scn,.amini,.carnet,.sec,.pyr,.recbar,.trend,.bal,.dist,.detbody{break-inside:avoid}`+
    `@page{size:A4;margin:12mm}`+
    `</style></head><body><div id="info" class="panel">${content}</div>`+
    `<scr`+`ipt>window.onload=function(){setTimeout(function(){window.focus();window.print();},350);};</scr`+`ipt>`+
    `</body></html>`;
  const w=window.open("","_blank");
  if(!w){ $("loading").textContent="autorisez les pop-ups pour exporter en PDF"; return; }
  w.document.open(); w.document.write(html); w.document.close();
  $("loading").textContent="";
}
$("exportbtn").onclick=exportPDF;
