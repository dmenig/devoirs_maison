
// Export des données de la vue courante (chantier 5) : CSV téléchargeable, pour poursuivre
// l'analyse dans un tableur. Reprend les valeurs affichées à l'échelle en cours (curVals),
// jointes aux noms des zones dessinées. Les champs composites (rec/adm) sont écartés du tableau.
function exportRows(){
  const names={};
  if(layer)layer.eachLayer(l=>{ const p=l.feature&&l.feature.properties; if(p)names[p.__code]=p.__nom; });
  const rows=[];
  for(const code in curVals){ const o=curVals[code], r={code,nom:names[code]||""};
    for(const k in o){ const v=o[k]; if(v!=null&&typeof v!=="object")r[k]=v; }
    rows.push(r); }
  return rows;
}
function toCSV(rows){ if(!rows.length)return "";
  const cols=[], seen=new Set();
  rows.forEach(r=>Object.keys(r).forEach(k=>{ if(!seen.has(k)){ seen.add(k); cols.push(k); } }));
  const esc=v=>{ const s=String(v==null?"":v); return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  return cols.join(";")+"\n"+rows.map(r=>cols.map(c=>esc(r[c])).join(";")).join("\n");
}
function exportCSV(){ const rows=exportRows();
  if(!rows.length){ $("loading").textContent="rien à exporter ici"; return; }
  const t=stack.length?stack[stack.length-1]:null, lvl=t?t.niveau:"france";
  // en-tête de provenance : un export doit rester interprétable hors contexte
  const head=`# Atlas électoral militant — export ${lvl}${t?" · "+t.nom:""}\n`+
    `# scrutins : P22=Présid.2022 · E24=Europ.2024 · L24=Légis.2024 · M26=Munic.2026\n`+
    `# valeurs en % des inscrits sauf voix réelles (lfiv_*/gv_*/abst) et estimations (insc/pop/noninsc/malinsc)\n`+
    `# sources : Min. Intérieur ; INSEE FILOSOFI + recensement 2021. Non-/mal-inscription : estimations provisoires.\n`;
  const blob=new Blob(["﻿"+head+toCSV(rows)],{type:"text/csv;charset=utf-8"}); // BOM = Excel ouvre en UTF-8
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`atlas_${lvl}${t?"_"+t.code:""}.csv`; a.click(); URL.revokeObjectURL(a.href);
}
$("exportbtn").onclick=exportCSV;
