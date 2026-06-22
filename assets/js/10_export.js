
// Export des données (chantier 5) : CSV de la SEULE zone sélectionnée (la fiche ouverte),
// pour poursuivre l'analyse dans un tableur. On reprend les valeurs bakées de cette zone
// (lastInfo) ; les champs composites (rec/adm) sont écartés du tableau.
function exportRow(){ if(!lastInfo)return null;
  const o=lastInfo.o, r={code:lastInfo.code||"",nom:lastInfo.nom||""};
  for(const k in o){ const v=o[k]; if(v!=null&&typeof v!=="object")r[k]=v; }
  return r;
}
function toCSV(rows){ if(!rows.length)return "";
  const cols=[], seen=new Set();
  rows.forEach(r=>Object.keys(r).forEach(k=>{ if(!seen.has(k)){ seen.add(k); cols.push(k); } }));
  const esc=v=>{ const s=String(v==null?"":v); return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  return cols.join(";")+"\n"+rows.map(r=>cols.map(c=>esc(r[c])).join(";")).join("\n");
}
function exportCSV(){ const row=exportRow();
  if(!row){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const lvl=lastInfo.niveau||"zone";
  // en-tête de provenance : un export doit rester interprétable hors contexte
  const head=`# Atlas électoral militant — export ${lvl} · ${row.nom}\n`+
    `# scrutins : P22=Présid.2022 · E24=Europ.2024 · L24=Légis.2024 · M26=Munic.2026\n`+
    `# valeurs en % des inscrits sauf voix réelles (lfiv_*/gv_*/abst) et estimations (insc/pop/noninsc/malinsc)\n`+
    `# sources : Min. Intérieur ; INSEE FILOSOFI + recensement 2021. Non-/mal-inscription : estimations provisoires.\n`;
  const blob=new Blob(["﻿"+head+toCSV([row])],{type:"text/csv;charset=utf-8"}); // BOM = Excel ouvre en UTF-8
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`atlas_${lvl}_${row.code||"zone"}.csv`; a.click(); URL.revokeObjectURL(a.href);
}
$("exportbtn").onclick=exportCSV;
