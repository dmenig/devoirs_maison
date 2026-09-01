
// ============================================================================
// Notice de méthode de la légende.
//
// Le « i » de la légende répond à « c'est quoi, ce que je regarde ? » avant tout clic. Le
// « i » de la fiche, lui, décompose le chiffre de la zone ouverte (cf. 034_mobilisation.js).
//
// Ce module portait aussi le sélecteur de version, du temps où l'atlas publiait trois
// pages concurrentes (index.html, v2/, v3/) pour départager trois définitions des « voix à
// conquérir ». La rentabilité du porte-à-porte l'ayant emporté, il n'y a plus qu'une page,
// à la racine, et plus rien à sélectionner.
function ouvrirModal(html){ const m=$("modal"); if(!m)return;
  $("modalbody").innerHTML=html; m.style.display="block"; }
function fermerModal(){ const m=$("modal"); if(m)m.style.display="none"; }
(function(){ const b=$("modalclose"); if(b)b.onclick=fermerModal;
  document.addEventListener("keydown",e=>{ if(e.key==="Escape")fermerModal(); });
  // Délégation : #legtitle est réécrit à chaque changement d'indicateur (syncLegend).
  const lg=$("legend"); if(lg)lg.addEventListener("click",e=>{
    if(e.target.closest(".legi"))ouvrirModal(mobResume()); }); })();
