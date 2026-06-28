
// Export (chantier 5) : PDF PROPRE de la fiche, composé directement depuis les données
// (jsPDF, fourni par le bundle html2pdf) — pas de capture d'écran du DOM (html2canvas
// tronquait/décentrait). Texte sélectionnable, mise en page maîtrisée, pagination auto.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const J=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
  if(!J){ $("loading").textContent="export PDF indisponible"; return; }
  const o=lastInfo.o||{}, nom=lastInfo.nom||"", niveau=lastInfo.niveau||"zone", code=lastInfo.code||"";
  const doc=new J({unit:"mm",format:"a4"}); const M=14, W=210, CW=W-2*M, BOT=282;
  const C={cram:[232,69,111], lav:[107,58,158], mut:[120,115,135], txt:[35,33,45]};
  let y=M;
  const fr=window.__socioFr||{}, rg=(window.__socioReg||{})[o.reg]||{};
  const num=v=>Math.round(v).toLocaleString('fr');
  const fmt=(v,u)=> v==null?"—":(u==="€"?num(v)+" €":u===" voix"?num(v)+" voix":v+(u||""));
  const ensure=h=>{ if(y+h>BOT){ doc.addPage(); y=M; } };
  const title=(t,sub)=>{ doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(...C.cram);
    doc.splitTextToSize(t,CW).forEach(l=>{ensure(8);doc.text(l,M,y+5);y+=7;});
    if(sub){ doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...C.mut);
      ensure(5); doc.text(sub,M,y+3); y+=6; } y+=2; };
  const sec=t=>{ ensure(10); y+=2.5; doc.setDrawColor(205); doc.setLineWidth(.2); doc.line(M,y,W-M,y); y+=4.5;
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...C.mut);
    doc.text(t.toUpperCase(),M,y); y+=5; };
  const big=(lab,val)=>{ ensure(14); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.setTextColor(...C.mut); doc.text(lab.toUpperCase(),M,y+2); y+=7;
    doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(...C.cram);
    doc.text(val,M,y+2); y+=10; };
  const row=(lab,val,ref)=>{ ensure(ref?9:6); doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.setTextColor(...C.mut); doc.text(String(lab),M,y+3);
    doc.setFont("helvetica","bold"); doc.setTextColor(...C.txt); doc.text(String(val),W-M,y+3,{align:"right"}); y+=4.6;
    if(ref){ doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.mut);
      doc.text(ref,W-M,y+1.5,{align:"right"}); y+=4; } y+=1; };
  const srow=(lab,k,u)=>{ const v=o[k]; if(v==null)return; const r=[];
    if(fr[k]!=null)r.push("Fr "+fmt(fr[k],u)); if(rg[k]!=null)r.push("reg. "+fmt(rg[k],u));
    row(lab,fmt(v,u),r.join("  /  ")||null); };
  const para=t=>{ doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...C.txt);
    doc.splitTextToSize(t,CW).forEach(l=>{ensure(5);doc.text(l,M,y+3);y+=4.4;}); y+=1.5; };

  title(nom,`${({region:"Région",departement:"Département",commune:"Commune",iris:"Quartier",bv:"Bureau de vote"})[niveau]||niveau} ${code}  ·  Atlas électoral militant`);

  const lfi=o.lfi_E24!=null?o.lfi_E24:(o.lfi_L24!=null?o.lfi_L24:o.lfi_P22);
  if(lfi!=null)big("Vote LFI · Europ. 2024",lfi+" % des inscrits");
  else if(o.rev!=null)big("Revenu médian · quartier · 2021",num(o.rev)+" € / pers. / an");

  if(SCR.some(([sc])=>o[`lfi_${sc}`]!=null)){ sec("Évolution du vote LFI (% des inscrits)");
    SCR.forEach(([sc,lab])=>{ if(o[`lfi_${sc}`]!=null)row(lab,o[`lfi_${sc}`]+" %"); }); }

  if(o.part_E24!=null){ sec("Participation · Europ. 2024");
    row("Participation",o.part_E24+" %"); row("Abstention",(Math.round((100-o.part_E24)*10)/10)+" %"); }

  if([o.gauche_E24,o.em_E24,o.lr_E24,o.rn_E24].some(v=>v!=null)){ sec("Rapport de force · Europ. 2024 (% inscrits)");
    [["Gauche (LFI-PS-EELV-PCF)","gauche_E24"],["Macron (Renaissance)","em_E24"],
     ["Droite (LR)","lr_E24"],["RN / extreme droite","rn_E24"]].forEach(([l,k])=>{ if(o[k]!=null)row(l,o[k]+" %"); }); }

  if(window.__scr&&o.rec){ const heads=["Scrutin","FI","PS","EM","LR","RN","Div","Abs"],
      X=[M,M+40,M+54,M+68,M+82,M+96,M+110,M+124];
    sec("Recomposition (blocs en % des inscrits, 2012->2026)");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.mut);
    ensure(5); heads.forEach((h,i)=>doc.text(h,X[i],y+2,i?{align:"right"}:undefined)); y+=4.5;
    doc.setFont("helvetica","normal"); doc.setTextColor(...C.txt);
    window.__scr.forEach((s,i)=>{ const rr=o.rec[i]; if(!rr)return; ensure(4.5);
      doc.text(String(s.c||s.l||""),X[0],y+2);
      rr.forEach((v,j)=>doc.text(v==null?"·":String(v),X[j+1],y+2,{align:"right"})); y+=4.2; }); y+=1; }

  const pm=pairMetrics(o), arr=`${selA}->${selB}`;
  const res=[]; if(pm.report!=null)res.push([`Voix LFI conservees ${arr}`,pm.report+" %"]);
  if(pm.dpart!=null)res.push([`Evolution participation ${arr}`,(pm.dpart>0?"+":"")+pm.dpart+" pts"]);
  if(pm.perte!=null)res.push([`Voix perdues a gauche ${arr}`,pm.perte+" %"]);
  if(o.abst!=null)res.push(["Abstentionnistes a remobiliser · E24",num(o.abst)+" voix"]);
  if(res.length){ sec(`Reservoirs de voix · ${arr}`); res.forEach(([l,v])=>row(l,v)); }

  const social=[["Revenu median (apres impots et aides)","rev","€"],["Taux de pauvrete","pauv","%"],
    ["25 % les plus modestes sous","q1","€"],["25 % les plus aises au-dessus de","q3","€"],
    ["Ecart riches / pauvres","ridec"," x"],["Indice d'inegalite (Gini)","gini",""]];
  if(social.some(([,k])=>o[k]!=null)){ sec("Contexte social · 2021"); social.forEach(([l,k,u])=>srow(l,k,u)); }
  const age=[["0-14 ans","a014"],["15-29 ans","a1529"],["30-44 ans","a3044"],
    ["45-59 ans","a4559"],["60-74 ans","a6074"],["75 ans et +","a75"]];
  if(age.some(([,k])=>o[k]!=null)){ sec("Age de la population · 2021"); age.forEach(([l,k])=>srow(l,k,"%")); }
  const csp=[["Cadres / prof. sup.","cad"],["Professions intermediaires","pint"],["Employes","emp"],
    ["Ouvriers","ouv"],["Retraites","ret"],["Taux de chomage (15-64 ans)","chom"]];
  if(csp.some(([,k])=>o[k]!=null)){ sec("Categories sociales · 2021"); csp.forEach(([l,k])=>srow(l,k,"%")); }
  const dip=[["Sans diplome ou brevet seul","dipl0"],["Diplome du superieur","diplsup"]];
  if(dip.some(([,k])=>o[k]!=null)){ sec("Diplomes · 2021"); dip.forEach(([l,k])=>srow(l,k,"%")); }
  const log=[["Proprietaires","logprop"],["Locataires","logloc"],["Logement social (HLM)","loghlm"]];
  if(log.some(([,k])=>o[k]!=null)){ sec("Logement · 2021"); log.forEach(([l,k])=>srow(l,k,"%")); }

  const a=o.adm;
  if(a&&a.maire){ sec("Maire en exercice · 2026");
    row(a.maire,[a.csp||"",a.maire_age!=null?a.maire_age+" ans":""].filter(Boolean).join(" · ")); }

  if(niveau==="commune"){ sec("Plan d'action (par ordre de priorite)");
    const inscRes=(o.noninsc!=null||o.malinsc!=null)?(o.noninsc||0)+(o.malinsc||0):null;
    para(`1. Inscription des non- et mal-inscrit·es (sept.->dec.)${inscRes!=null?` — reservoir ~ ${num(inscRes)} voix`:""}. Plus gros reservoir et le plus rentable : porte-a-porte d'inscription + permanences.`);
    const remob=(o.lfiv_P22!=null&&o.lfiv_E24!=null)?Math.max(0,o.lfiv_P22-o.lfiv_E24):null;
    para(`2. Remobiliser les electeur·ices LFI 2022 (sept.->avr.)${remob!=null?` — ${num(remob)} voix Melenchon 2022 non retrouvees en 2024`:""}. Le retour n'est pas automatique : renouer le contact.`);
    if(o.abst!=null)para(`3. Mobiliser les abstentionnistes (fevr.->avr.) — ${num(o.abst)} inscrit·es n'ont pas vote aux europeennes 2024. Tractage marches / lieux publics.`);
    para(`4. Aller vers les primo-votant·es (en continu)${o.a1529!=null?` — 15-29 ans : ${o.a1529} %`:""}. Presence lycees / facs / residences etudiantes.`); }

  doc.setFont("helvetica","italic"); doc.setFontSize(7.5); doc.setTextColor(...C.mut);
  ensure(8); y+=2;
  doc.text("Sources : Min. Interieur ; INSEE FILOSOFI + recensement 2021. Valeurs en % des inscrits sauf voix reelles et estimations.",
    M,y+3,{maxWidth:CW});

  $("loading").textContent="";
  doc.save(`atlas_${niveau}_${code||"zone"}.pdf`);
}
$("exportbtn").onclick=exportPDF;
