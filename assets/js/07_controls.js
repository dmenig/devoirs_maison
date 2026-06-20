
// pastilles d'indicateurs (pas de menu déroulant) ; les pastilles « dyn_* » affichent
// la paire de scrutins choisie (ex. « Report LFI P22→E24 »).
const usesPair=k=>k.startsWith("dyn_")||STAT.has(k);
const labelFor=k=>{ const p=PAST.find(x=>x[0]===k); if(!p)return k;
  if(k.startsWith("dyn_"))return `${p[1]} ${selA}→${selB}`;
  return STAT.has(k)?`${p[1]} · ${selB}`:p[1]; };
// le sélecteur ⚖️ pilote les réservoirs dyn_* (paire A→B) ET le scrutin affiché des
// pastilles statiques (instantané en B) : on allume le cadre quand l'indicateur actif
// dépend de la paire, on le grise sinon (Abstention / Revenu / Pauvreté).
const updatePairActive=()=>$("pairgroup").classList.toggle("active",usesPair(indicKey));
// Revenu/Pauvreté n'ont de données qu'en vue Quartiers IRIS : on n'affiche leurs pastilles
// que là, et on rebascule sur un indicateur électoral en quittant (sinon choroplèthe vide).
const socioActive=()=>$("subtoggle").style.display!=="none"&&sousMode==="iris";
function syncSocioChips(){ const on=socioActive();
  $("pastilles").querySelectorAll(".chip").forEach(c=>{
    if(SOCIO.has(c.dataset.k))c.style.display=on?"":"none"; });
  if(!on&&SOCIO.has(indicKey))setIndic("lfi"); }
function setIndic(k){ const p=PAST.find(x=>x[0]===k); if(!p)return;
  indicKey=p[0]; indicLabel=labelFor(k); indicUnit=p[2]||""; $("legtitle").textContent=indicLabel;
  $("pastilles").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.k===k));
  updatePairActive(); }
function buildPastilles(){ const box=$("pastilles"), grp=$("pairgroup");
  PAST.forEach(([k])=>{ const c=document.createElement("span"); c.className="chip"+(k===indicKey?" on":"");
    c.textContent=labelFor(k); c.dataset.k=k;
    c.onclick=()=>{ setIndic(k); const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); };
    (k.startsWith("dyn_")?grp:box).appendChild(c); });
  $("legtitle").textContent=labelFor(indicKey); updatePairActive(); syncSocioChips(); }
// sélecteur de deux scrutins : peuple A/B et recalcule réservoirs (carte + fiche) à la volée
function buildSelecteur(){
  for(const id of ["selA","selB"]){ const sel=$(id), cur=id==="selA"?selA:selB;
    sel.innerHTML=SCR.map(([c,l])=>`<option value="${c}"${c===cur?" selected":""}>${l}</option>`).join("");
    sel.onchange=()=>{ selA=$("selA").value; selB=$("selB").value; refreshPair(); }; } }
function refreshPair(){
  $("pastilles").querySelectorAll(".chip").forEach(c=>{ if(usesPair(c.dataset.k))c.textContent=labelFor(c.dataset.k); });
  if(usesPair(indicKey)){ indicLabel=labelFor(indicKey); $("legtitle").textContent=indicLabel;
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
  const socio=SOCIO.has(indicKey);
  if(m==="iris"&&!socio)setIndic("rev"); else if(m==="bv"&&socio)setIndic("lfi");
  syncSocioChips();
  const t=stack[stack.length-1]; if(t&&t.niveau==="commune")vueCommune(t.code); });
