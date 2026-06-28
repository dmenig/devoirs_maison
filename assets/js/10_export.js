
// Export (chantier 5) : PDF téléchargé directement (jsPDF), texte SÉLECTIONNABLE, thème
// sombre, barres dessinées. On parcourt le DOM RÉEL de la fiche (donc le texte et les
// chiffres sont exactement ceux affichés, non reformulés) et on embarque EN LIGNE le détail
// de chaque section (le PDF n'est pas interactif). La mise en page se recompose → aucune
// troncature.
function exportPDF(){ if(!lastInfo){ $("loading").textContent="cliquez une zone à exporter"; return; }
  const J=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
  if(!J){ $("loading").textContent="export PDF indisponible"; return; }
  const info=$("info");
  if(info.style.display!=="block"){ $("loading").textContent="aucune fiche ouverte à exporter"; return; }
  const pane=info.querySelector(".slider .pane")||info;
  const lvl=lastInfo.niveau||"zone", code=lastInfo.code||"zone";
  const doc=new J({unit:"mm",format:"a4"});
  const M=14, W=210, H=297, CW=W-2*M, BOT=H-12;
  const C={bg:[21,17,31], txt:[233,228,242], lav:[179,157,219], cram:[232,69,111],
    mut:[150,147,173], track:[44,38,64], line:[58,51,80]};
  let y=M;
  const bg=()=>{ doc.setFillColor(...C.bg); doc.rect(0,0,W,H,"F"); };
  bg();
  const need=h=>{ if(y+h>BOT){ doc.addPage(); bg(); y=M; } };
  const rgb=el=>{ const m=getComputedStyle(el).backgroundColor.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return m?[+m[1],+m[2],+m[3]]:C.mut; };
  const clean=s=>(s||"").replace(/\s+/g," ").trim();
  const lh=sz=>sz*0.42+1.6;
  const text=(s,o)=>{ o=o||{}; const sz=o.size||9.5, col=o.color||C.txt, x=o.x!=null?o.x:M, mw=o.mw||(W-M-(o.x!=null?o.x:M));
    s=clean(s); if(!s)return; doc.setFont("helvetica",o.font||"normal"); doc.setFontSize(sz); doc.setTextColor(...col);
    doc.splitTextToSize(s,mw).forEach(l=>{ need(lh(sz)); doc.text(l,o.align==="right"?x:x,y+sz*0.35,o.align?{align:o.align,maxWidth:mw}:undefined); y+=lh(sz); }); };
  const kv=(lab,val,ref)=>{ const sz=9.5; need(lh(sz)+(ref?lh(8):0));
    doc.setFont("helvetica","normal"); doc.setFontSize(sz); doc.setTextColor(...C.mut);
    const ll=doc.splitTextToSize(clean(lab),CW*0.6); ll.forEach((l,i)=>doc.text(l,M,y+sz*0.35+i*lh(sz)));
    doc.setFont("helvetica","bold"); doc.setTextColor(...C.txt); doc.text(clean(val),W-M,y+sz*0.35,{align:"right"});
    y+=Math.max(lh(sz),ll.length*lh(sz));
    if(ref){ doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.mut);
      doc.text(clean(ref),W-M,y+1.5,{align:"right"}); y+=lh(8); } y+=0.6; };
  const section=t=>{ need(9); y+=2.5; doc.setDrawColor(...C.line); doc.setLineWidth(.2); doc.line(M,y,W-M,y); y+=4;
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...C.mut); doc.text(clean(t).toUpperCase(),M,y); y+=4.6; };
  const barOf=el=>{ const i=el.querySelector("i"); if(!i)return; const pct=parseFloat(i.style.width)||0;
    need(4.6); doc.setFillColor(...C.track); doc.roundedRect(M,y,CW,2.6,1,1,"F");
    doc.setFillColor(...rgb(i)); doc.roundedRect(M,y,Math.max(1,CW*Math.min(1,pct/100)),2.6,1,1,"F"); y+=4.8; };
  const recbar=el=>{ const segs=el.querySelectorAll("i"); if(!segs.length)return; need(5); let x=M;
    segs.forEach(i=>{ const w=CW*(parseFloat(i.style.width)||0)/100; doc.setFillColor(...rgb(i)); doc.rect(x,y,Math.max(.3,w),3.4,"F"); x+=w; }); y+=5.4; };
  const detail=di=>{ const htmlStr=panelDetails[di]; if(htmlStr==null)return; const t=document.createElement("div"); t.innerHTML=htmlStr;
    const ps=t.querySelectorAll("p"); const parts=ps.length?Array.from(ps).map(p=>p.textContent):[t.textContent];
    y+=0.5; parts.forEach(p=>text(p,{size:8.3,color:[196,185,216],x:M+3,mw:CW-3})); y+=1.5; };

  const walk=node=>{ for(const el of node.children){ const k=el.classList;
    if(k.contains("sheet-handle"))continue;
    if(k.contains("exph")){ walk(el); if(el.dataset.di!=null)detail(+el.dataset.di); continue; }
    if(k.contains("exp")||k.contains("cols")||k.contains("apercu")||k.contains("aminis")||k.contains("compo")){ walk(el); continue; }
    if(k.contains("t")){ need(8); doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(...C.cram);
      doc.splitTextToSize(clean(el.textContent),CW).forEach(l=>{need(7);doc.text(l,M,y+5);y+=7;}); y+=1.5; continue; }
    if(k.contains("clead")){ text(el.textContent,{size:9,font:"bold",color:C.cram}); continue; }
    if(k.contains("lead")){ text(el.textContent,{size:8,color:C.mut}); continue; }
    if(k.contains("head")){ need(11); doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(...C.cram);
      doc.text(clean(el.textContent),M,y+7); y+=11; continue; }
    if(k.contains("sec")||k.contains("csec")){ section(el.textContent); continue; }
    if(k.contains("row")){ const sp=el.querySelector("span"), b=el.querySelector("b");
      kv(sp?sp.textContent:el.textContent, b?b.textContent:""); continue; }
    if(k.contains("srow")){ const sl=el.querySelector(".sl"), b=el.querySelector(".sv b"), r=el.querySelector(".ref");
      kv(sl?sl.textContent:"", b?b.textContent:"", r?r.textContent:""); continue; }
    if(k.contains("scn")){ const l=el.querySelector(".scl"), v=el.querySelector(".scv"), r=el.querySelector(".scr");
      kv(l?l.textContent:"", v?v.textContent:"", r?r.textContent:""); continue; }
    if(k.contains("lab")){ const sp=el.querySelector("span"), b=el.querySelector("b");
      kv(sp?sp.textContent:el.textContent, b?b.textContent:""); continue; }
    if(k.contains("bar")){ barOf(el); continue; }
    if(k.contains("recbar")){ recbar(el); continue; }
    if(k.contains("reclg")||k.contains("hint")||k.contains("hypnote")||k.contains("cfoot")||k.contains("ahint")||k.contains("inv")||k.contains("leg")){
      text(el.textContent,{size:8,color:C.mut}); continue; }
    if(k.contains("trend")){ el.querySelectorAll(".tcol").forEach(tc=>{ const v=tc.querySelector(".tv");
      kv(tc.lastElementChild?tc.lastElementChild.textContent:"", v?v.textContent:""); }); continue; }
    if(k.contains("act")){ need(6); doc.setFillColor(45,22,64); doc.roundedRect(M,y,CW,2,0,0,"F"); y+=3; walk(el); y+=2; continue; }
    if(k.contains("ah")){ text(el.textContent,{size:9,font:"bold",color:C.lav}); continue; }
    if(k.contains("levers")){ walk(el); continue; }
    if(k.contains("lever")){ const n=el.querySelector(".lvn"), tt=el.querySelector(".lvh b"),
        win=el.querySelector(".lvwin"), res=el.querySelector(".lvres"), body=el.querySelector(".lvb");
      text(`${n?n.textContent+". ":""}${tt?tt.textContent:""}${win?" ("+win.textContent+")":""}${res?" — "+res.textContent:""}`,{size:9,font:"bold",color:C.txt});
      if(body)text(body.textContent,{size:8.5,color:[222,212,240]}); y+=1; continue; }
    if(k.contains("amini")){ const cap=el.querySelector("figcaption");
      if(cap)text(cap.textContent,{size:8,font:"bold",color:C.mut});
      el.querySelectorAll(".arow").forEach(r=>{ const al=r.querySelector(".al"), b=r.querySelector("b");
        kv(al?al.textContent:"", b?b.textContent:""); }); continue; }
    if(el.children.length){ walk(el); continue; }
    const tx=clean(el.textContent); if(tx)text(tx); } };

  walk(pane);
  doc.setFont("helvetica","italic"); doc.setFontSize(7.5); doc.setTextColor(...C.mut); need(8); y+=2;
  doc.text("Sources : Min. Interieur ; INSEE FILOSOFI + recensement 2021. Atlas electoral militant.",M,y+3,{maxWidth:CW});
  $("loading").textContent="";
  doc.save(`atlas_${lvl}_${code||"zone"}.pdf`);
}
$("exportbtn").onclick=exportPDF;
