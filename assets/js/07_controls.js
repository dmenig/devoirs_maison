
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
// « on est en train d'afficher des quartiers IRIS » — indépendant du mode avancé : la
// bascule est masquée hors mode avancé, mais un permalien ?sm=bv rouvre bien la vue bureaux.
const socioActive=()=>{ const t=stack[stack.length-1];
  return sousMode==="iris"&&!!t&&t.niveau==="commune"; };
// Le quartier porte désormais les DEUX jeux : le social (FILOSOFI/recensement, publié à
// cette maille et à elle seule) et l'électoral ESTIMÉ depuis les bureaux de vote. Toutes
// les pastilles y sont donc pertinentes ; ailleurs, les pastilles sociales restent
// masquées (elles n'ont de valeurs qu'à l'IRIS) et on rebascule sur l'électoral.
// Prix au m² / effort d'accession : publiés à la COMMUNE (base DVF, cf. prep_immo.py). Leurs
// pastilles n'ont de sens que sur une carte de COMMUNES — la vue département : à l'IRIS, tous
// les quartiers d'une commune porteraient la même valeur, donc la même couleur. La fiche du
// quartier, elle, continue d'afficher le prix en le disant « à l'échelle de la commune ».
const immoActive=()=>{ const t=stack[stack.length-1]; return !!t&&t.niveau==="departement"; };
function syncSocioChips(){ const on=socioActive(), immo=immoActive();
  $("pastilles").querySelectorAll(".chip").forEach(c=>{ const k=c.dataset.k;
    c.style.display=(IMMO.has(k)?immo:(on||!SOCIO.has(k)))?"":"none"; });
  if((!on&&SOCIO.has(indicKey))||(!immo&&IMMO.has(indicKey)))setIndic("lfi"); else syncLegend();
  if(window.__syncLayout)window.__syncLayout(); }
// Les valeurs électorales d'un quartier sont estimées : la légende de la carte le dit,
// comme l'infobulle et la fiche. En versions 2 et 3, le titre porte en plus un « i » qui
// ouvre la notice de méthode (15_version.js) : le score y sort d'un modèle, et il doit
// s'expliquer AVANT qu'on ait cliqué une zone — c'est la coloration de la carte qu'on lit
// en premier. `textContent` ailleurs : rien à échapper, et rien de plus à montrer.
function syncLegend(){ const t=indicLabel+(socioActive()&&!SOCIO.has(indicKey)?" · estimé":"");
  const lg=$("legtitle");
  if(VERSION>1&&indicKey==="conquerir")
    lg.innerHTML=`${t} <span class="legi" role="button" tabindex="0" `+
      `title="Comment ce chiffre est calculé">i</span>`;
  else lg.textContent=t; }
function setIndic(k){ const p=PAST.find(x=>x[0]===k); if(!p)return;
  indicKey=p[0]; indicLabel=labelFor(k); indicUnit=p[2]||""; syncLegend();
  $("pastilles").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.k===k));
  updatePairActive();
  // le chiffre de tête de la fiche EST l'indicateur actif : une fiche déjà ouverte doit
  // suivre la pastille (sinon un clic sur « Vote RN » laisse un score LFI affiché).
  if(lastInfo)infoPanel(lastInfo.nom,lastInfo.o,lastInfo.niveau,lastInfo.code); }
function buildPastilles(){ const box=$("pastilles"), grp=$("pairgroup");
  PAST.forEach(([k])=>{ const c=document.createElement("span"); c.className="chip"+(k===indicKey?" on":"");
    c.textContent=labelFor(k); c.dataset.k=k;
    c.onclick=()=>{ setIndic(k); closeDrawer(); const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); };
    (k.startsWith("dyn_")?grp:box).appendChild(c); });
  indicLabel=labelFor(indicKey); syncLegend(); updatePairActive(); syncSocioChips(); }
// tiroir indicateurs (mobile) : le bouton 📊 déploie #pastilles ; sélectionner une
// pastille le referme pour redécouvrir la carte. Sans effet en desktop (#pastoggle masqué).
function closeDrawer(){ $("pastilles").classList.remove("open"); $("pastoggle").classList.remove("on"); $("pastoggle").setAttribute("aria-expanded","false"); }
$("pastoggle").onclick=()=>{ const open=$("pastilles").classList.toggle("open");
  $("pastoggle").classList.toggle("on",open); $("pastoggle").setAttribute("aria-expanded",String(open)); };
// Mode « Avancé » (chantier 2) : révèle indicateurs + sélecteur de scrutins + bascule
// BV/IRIS. Replié par défaut → la prise en main se limite à cliquer son territoire.
$("advtoggle").onclick=()=>{ const on=document.body.classList.toggle("adv");
  $("advtoggle").setAttribute("aria-pressed",String(on)); closeDrawer();
  const t=stack[stack.length-1]; if(t&&t.niveau==="commune")subToggle(true);
  if(window.__syncLayout)window.__syncLayout(); };
// sélecteur de deux scrutins : peuple A/B et recalcule réservoirs (carte + fiche) à la volée
function buildSelecteur(){
  for(const id of ["selA","selB"]){ const sel=$(id), cur=id==="selA"?selA:selB;
    sel.innerHTML=SCR.map(([c,l])=>`<option value="${c}"${c===cur?" selected":""}>${l}</option>`).join("");
    sel.onchange=()=>{ selA=$("selA").value; selB=$("selB").value; refreshPair(); }; } }
function refreshPair(){
  $("pastilles").querySelectorAll(".chip").forEach(c=>{ if(usesPair(c.dataset.k))c.textContent=labelFor(c.dataset.k); });
  if(usesPair(indicKey)){ indicLabel=labelFor(indicKey); syncLegend();
    const t=stack[stack.length-1]; t?render(t.niveau,t.code):vueFrance(); }
  if(lastInfo)infoPanel(lastInfo.nom,lastInfo.o,lastInfo.niveau,lastInfo.code); }
// clic sur une section : translate la fiche sur le côté pour révéler son détail (et retour)
$("info").addEventListener("click",e=>{ const sl=$("info").querySelector(".slider"); if(!sl)return;
  if(e.target.closest(".back")){ sl.classList.remove("on"); $("info").scrollTop=sl._back||0; return; }
  const sp=e.target.closest(".sph"); if(sp){ sp.parentElement.classList.toggle("open"); return; }
  const h=e.target.closest(".exph"); if(!h)return;
  sl._back=$("info").scrollTop;
  sl.querySelector(".detbody").innerHTML=panelDetails[+h.dataset.di];
  sl.classList.add("on"); $("info").scrollTop=0; });
// poignée du bottom-sheet (mobile) : tap = bascule plié/déplié ; glissé vers le bas =
// plier, vers le haut = déplier. La poignée est recréée à chaque rendu → délégation sur
// #info (persistant), suivi du geste sur document le temps du drag.
(function(){ const info=$("info"); let y0=null,dy=0,moved=false;
  const onMove=e=>{ if(y0==null)return; dy=e.clientY-y0; if(Math.abs(dy)>4)moved=true;
    if(info.classList.contains("collapsed"))return;
    info.style.transition="none"; info.style.transform=`translateY(${Math.max(0,dy)}px)`; };
  const onUp=()=>{ if(y0==null)return;
    document.removeEventListener("pointermove",onMove); document.removeEventListener("pointerup",onUp);
    info.style.transition=""; info.style.transform="";
    const collapsed=info.classList.contains("collapsed");
    if(!moved)info.classList.toggle("collapsed");
    else if(!collapsed&&dy>50)info.classList.add("collapsed");
    else if(collapsed&&dy<-50)info.classList.remove("collapsed");
    y0=null; dy=0; moved=false; };
  info.addEventListener("pointerdown",e=>{ if(!e.target.closest(".sheet-handle"))return;
    y0=e.clientY; dy=0; moved=false;
    document.addEventListener("pointermove",onMove); document.addEventListener("pointerup",onUp); }); })();
// bascule Bureaux de vote ⇄ Quartiers IRIS (au niveau commune)
$("subtoggle").querySelectorAll(".chip").forEach(c=>c.onclick=()=>{ const m=c.dataset.m; if(m===sousMode)return;
  sousMode=m; $("subtoggle").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m===m));
  if(m==="bv"&&SOCIO.has(indicKey))setIndic("lfi");
  syncSocioChips();
  const t=stack[stack.length-1]; if(t&&t.niveau==="commune")vueCommune(t.code); });
