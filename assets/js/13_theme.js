// Bascule thème clair ⇄ sombre. Le thème est un attribut sur <html> (data-theme) : toutes
// les couleurs d'interface étant des tokens CSS (voir map.css), le basculement est immédiat
// et ne touche pas au DOM. Trois choses ne suivent pas d'elles-mêmes et sont reprises ici :
//   1. le fond de carte OpenFreeMap (style dark ⇄ positron) ;
//   2. les couleurs écrites par le JS (échelle de la choroplèthe, contours des polygones) :
//      syncColors() puis redessin de la couche courante SANS recadrer la caméra ;
//   3. la fiche ouverte, dont quelques couleurs sont posées en style inline à la génération.
// Le choix est mémorisé (localStorage) ; sans choix, le thème sombre reste celui du site.
(function () {
  const btn = $("themetoggle");
  // Au chargement, on ne redessine RIEN : l'attribut est déjà posé par le script d'entête et
  // init() est en train d'amorcer la vue (ou de restaurer un permalien) — un redessin d'ici
  // se disputerait la couche et la caméra avec cet amorçage.
  const paint = t => {
    document.documentElement.dataset.theme = t;
    btn.textContent = t === "light" ? "🌙" : "☀️";
    btn.title = t === "light" ? "Passer au thème sombre" : "Passer au thème clair";
    btn.setAttribute("aria-pressed", String(t === "light"));
    syncColors();
    // diff:false — par défaut MapLibre calcule un DIFF entre le style courant et le
    // nouveau, et n'émet alors pas `style.load` : les couches que shapeStyle avait retirées
    // reviendraient (fond dupliqué au-dessus des polygones, libellés anglicisés) sans que
    // rien ne les redécoupe. Un rechargement complet coûte ici quelques dizaines de ko de
    // JSON, les tuiles elles-mêmes étant déjà en cache.
    for (const couche of [tiles, labels, overprint]) {
      couche.getMaplibreMap().setStyle(OFM(t), { diff: false });
    }
  };
  paint(theme());
  btn.addEventListener("click", () => {
    const t = theme() === "light" ? "dark" : "light";
    paint(t);
    try { localStorage.setItem("atlas_theme", t); } catch (e) {}
    const top = stack[stack.length - 1];
    top ? render(top.niveau, top.code) : vueFrance(false);
    if (lastInfo) infoPanel(lastInfo.nom, lastInfo.o, lastInfo.niveau, lastInfo.code);
  });
})();
