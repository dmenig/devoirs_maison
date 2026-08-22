// Repères de mise en page mesurés (voir les tokens --top-b / --bar-b / --sub-w / --info-w
// dans map.css). Les panneaux flottants étaient ancrés à des décalages CONSTANTS (54 px,
// 92 px, 90 px) qui supposaient une barre du haut d'une seule ligne et aucune barre de
// sélection : dès que #top passait à deux ou trois lignes (écran étroit, fil d'Ariane long,
// mode multi), les indicateurs recouvraient le champ de recherche, la barre multi
// recouvrait les indicateurs et la bascule BV/IRIS recouvrait les pastilles. On mesure donc
// la géométrie réelle et on la publie en variables CSS.
//
// Un ResizeObserver suffit à couvrir presque tout : afficher/masquer un panneau ou changer
// son contenu change sa taille observée. Les cas restants (mêmes dimensions, panneau qui
// passe de display:none à visible sans changer de taille) sont couverts par les appels
// explicites depuis les bascules, via window.__syncLayout.
(function () {
  const root = document.documentElement;
  const px = v => Math.round(v) + "px";
  const vu = el => el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;

  function sync() {
    const top = $("top"), sel = $("selbar"), sub = $("subtoggle");
    const topB = top.getBoundingClientRect().bottom;
    // la barre de sélection s'installe juste sous #top : les pastilles doivent passer dessous
    const barB = vu(sel) ? Math.max(topB, sel.getBoundingClientRect().bottom) : topB;
    root.style.setProperty("--top-b", px(topB));
    root.style.setProperty("--bar-b", px(barB));
    // largeurs occupées à droite de la bande des pastilles (0 si le panneau est masqué)
    root.style.setProperty("--sub-w", px(vu(sub) ? sub.getBoundingClientRect().width + 8 : 0));
    // La fiche (desktop) démarre SOUS tout ce qui est ancré en haut — barres, indicateurs,
    // bascule BV/IRIS. Réserver plutôt une colonne à droite des pastilles ne marche pas :
    // sur un écran de 768 px, retirer la largeur de la fiche laissait aux pastilles une
    // largeur négative et les puces débordaient de leur panneau.
    const hauts = [$("pastilles"), sub].filter(vu).map(e => e.getBoundingClientRect().bottom);
    root.style.setProperty("--info-t", px(Math.max(barB, ...hauts) + 10));
  }
  // relancé au prochain rendu : une bascule de classe ne prend ses dimensions qu'après layout
  let raf = null;
  const schedule = () => { if (raf == null) raf = requestAnimationFrame(() => { raf = null; sync(); }); };
  window.__syncLayout = schedule;

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(schedule);
    ["top", "selbar", "subtoggle", "info", "banner"].forEach(id => { const e = $(id); if (e) ro.observe(e); });
  }
  addEventListener("resize", schedule);
  addEventListener("orientationchange", schedule);
  sync();
})();
