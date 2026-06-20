
// pastilles d'indicateurs (pas de menu déroulant) ; les pastilles « dyn_* » affichent
// la paire de scrutins choisie (ex. « Report LFI P22→E24 »).
const labelFor=k=>{ const p=PAST.find(x=>x[0]===k); if(!p)return k;
  return k.startsWith("dyn_")?`${p[1]} ${selA}→${selB}`:p[1]; };
// la paire de scrutins ne colore la carte que pour les indicateurs « dyn_* » : on allume
// le cadre ⚖️ quand l'un d'eux est l'indicateur actif, on le grise sinon.
const updatePairActive=()=>$("pairgroup").classList.toggle("active",indicKey.startsWith("dyn_"));
function setIndic(k){ const p=PAST.find(x=>x[0]===k); if(!p)return;
  indicKey=p[0]; indicLabel=labelFor(k); indicUnit=p[2]||""; $("legtitle").textContent=indicLabel;
  $("pastilles").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.k===k));
  updatePairActive(); }
function buildPastilles(){ const box=$("pastilles"), grp=$("pairgroup");
  PAST.forEach(([k])=>{ const c=document.createElement("span"); c.className="chip"+(k===indicKey?" on":"");
    c.textContent=labelFor(k); c.dataset.k=k;
    c.onclick=()=>{ setIndic(k); const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); };
    (k.startsWith("dyn_")?grp:box).appendChild(c); });
  $("legtitle").textContent=labelFor(indicKey); updatePairActive(); }
// sélecteur de deux scrutins : peuple A/B et recalcule réservoirs (carte + fiche) à la volée
function buildSelecteur(){
  for(const id of ["selA","selB"]){ const sel=$(id), cur=id==="selA"?selA:selB;
    sel.innerHTML=SCR.map(([c,l])=>`<option value="${c}"${c===cur?" selected":""}>${l}</option>`).join("");
    sel.onchange=()=>{ selA=$("selA").value; selB=$("selB").value; refreshPair(); }; } }
function refreshPair(){
  $("pastilles").querySelectorAll(".chip").forEach(c=>{ if(c.dataset.k.startsWith("dyn_"))c.textContent=labelFor(c.dataset.k); });
  if(indicKey.startsWith("dyn_")){ indicLabel=labelFor(indicKey); $("legtitle").textContent=indicLabel;
    const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); }
  if(lastInfo)infoPanel(lastInfo.nom,lastInfo.o); }
// clic sur une section : translate la fiche sur le côté pour révéler son détail (et retour)
$("info").addEventListener("click",e=>{ const sl=$("info").querySelector(".slider"); if(!sl)return;
  if(e.target.closest(".back")){ sl.classList.remove("on"); $("info").scrollTop=0; return; }
  const h=e.target.closest(".exph"); if(!h)return;
  sl.querySelector(".detbody").innerHTML=panelDetails[+h.dataset.di];
  sl.classList.add("on"); $("info").scrollTop=0; });
// bascule Bureaux de vote ⇄ Quartiers IRIS (au niveau commune)
$("subtoggle").querySelectorAll(".chip").forEach(c=>c.onclick=()=>{ const m=c.dataset.m; if(m===sousMode)return;
  sousMode=m; $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m===m));
  const socio=indicKey==="rev"||indicKey==="pauv";
  if(m==="iris"&&!socio)setIndic("rev"); else if(m==="bv"&&socio)setIndic("lfi_E24");
  const t=stack[stack.length-1]; if(t&&t.niveau==="commune")vueCommune(t.code); });
