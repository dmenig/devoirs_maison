
// Export des données (chantier 5) : JSON COMPLET de la zone sélectionnée (la fiche
// ouverte) — l'intégralité du panneau, pas un CSV scalaire. On exporte tout l'objet baké
// `lastInfo.o`, y compris les champs composites que le CSV écartait (recomposition `rec`,
// profil INSEE `adm`), ainsi que les références de comparaison affichées (France / région).
const EXPORT_META={
  description:"Atlas électoral militant — export complet de la zone affichée (toutes les données du panneau)",
  scrutins:{P22:"Présid. 2022",E24:"Europ. 2024",L24:"Légis. 2024",M26:"Munic. 2026"},
  unites:"valeurs en % des inscrits sauf voix réelles (lfiv_*/gv_*/abst) et estimations (insc/pop/noninsc/malinsc)",
  sources:"Min. Intérieur ; INSEE FILOSOFI + recensement 2021. Non-/mal-inscription : estimations provisoires.",
};
function exportData(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const o=lastInfo.o||{}, lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const refs={ france:window.__socioFr||null, region:(window.__socioReg||{})[o.reg]||null,
    profilFrance:window.__adminFr||null };
  const payload={ _meta:EXPORT_META, niveau:lvl, code:lastInfo.code||"", nom:lastInfo.nom||"",
    donnees:o, references:refs };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`atlas_${lvl}_${code}.json`; a.click(); URL.revokeObjectURL(a.href);
}
$("exportbtn").onclick=exportData;
