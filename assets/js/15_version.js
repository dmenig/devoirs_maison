
// ============================================================================
// Sélecteur de version + notice de méthode de la légende.
//
// Les trois versions de l'atlas sont trois SITES (index.html, v2/, v3/), publiés côte à
// côte par build_site.py depuis la même source. Le sélecteur n'est donc pas un interrupteur
// d'affichage mais une NAVIGATION : de vrais liens, qu'on peut ouvrir dans deux onglets pour
// comparer les cartes, et qui reportent l'état de la vue (?e=, ?z=, ?ll=, ?f=…) d'une
// version à l'autre — on change de définition du score sans quitter son territoire.

// Racine du site depuis la page courante : la version 1 est à la racine, les autres un
// cran plus bas. Chemins RELATIFS — le site tourne aussi bien sur github.io/<dépôt>/ que
// derrière `python -m http.server -d _site`.
const vRacine=()=>VERSION===1?"./":"../";
const vHref=v=>{ const dest=(VERSIONS.find(x=>x[0]===v)||[,""])[1];
  return vRacine()+dest+location.search+location.hash; };

function buildVersions(){ const box=$("vchips"); if(!box)return;
  box.innerHTML=VERSIONS.map(([v,,lab,desc])=>
    `<a class="vchip${v===VERSION?" on":""}" href="${vHref(v)}" title="${desc.replace(/"/g,"&quot;")}"`+
    `${v===VERSION?' aria-current="page"':""}>${lab}</a>`).join("");
  // L'URL est réécrite en continu par le permalien (replaceState) : les liens doivent
  // partir de l'état COURANT, pas de celui du chargement. On les rafraîchit au dernier
  // moment plutôt qu'à chaque déplacement de carte.
  box.addEventListener("pointerdown",()=>{
    box.querySelectorAll(".vchip").forEach((a,i)=>{ a.href=vHref(VERSIONS[i][0]); }); });
}
buildVersions();

// --- Notice de méthode (versions 2 et 3) ---------------------------------------------
// Le « i » de la légende répond à « c'est quoi, ce que je regarde ? » avant tout clic. Le
// « i » de la fiche, lui, décompose le chiffre de la zone ouverte (cf. 034_mobilisation.js).
function ouvrirModal(html){ const m=$("modal"); if(!m)return;
  $("modalbody").innerHTML=html; m.style.display="block"; }
function fermerModal(){ const m=$("modal"); if(m)m.style.display="none"; }
(function(){ const b=$("modalclose"); if(b)b.onclick=fermerModal;
  document.addEventListener("keydown",e=>{ if(e.key==="Escape")fermerModal(); });
  // Délégation : #legtitle est réécrit à chaque changement d'indicateur (syncLegend).
  const lg=$("legend"); if(lg)lg.addEventListener("click",e=>{
    if(e.target.closest(".legi"))ouvrirModal(mobResume()); }); })();
