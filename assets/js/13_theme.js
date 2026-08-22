// Bascule thème clair ⇄ sombre. Le thème est un attribut sur <html> (data-theme) : toutes
// les couleurs d'interface étant des tokens CSS (voir map.css), le basculement est immédiat
// et ne touche pas au DOM. Trois choses ne suivent pas d'elles-mêmes et sont reprises ici :
//   1. le fond de carte CARTO (variante dark_/light_nolabels) ;
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
    // setUrl() sans noRedraw appelle redraw(), qui recale `_tileZoom` sur le zoom COURANT
    // sans l'arrondir. Avec zoomSnap:0 ce zoom est fractionnaire (12.2858…) : Leaflet le
    // met tel quel dans l'URL des tuiles, CARTO répond n'importe quoi et on se retrouvait
    // avec des libellés d'Algérie par-dessus Toulouse. On change donc l'URL SANS redraw,
    // on vide les tuiles, et on laisse la carte refaire une pose de grille propre
    // (viewreset → _resetView, qui lui arrondit le niveau de tuiles).
    for (const [couche, url] of [[tiles, tileURL(t)], [labels, labelURL(t)], [overprint, tileURL(t)]]) {
      couche.setUrl(url, true);
      couche._removeAllTiles();
    }
    map.fire("viewreset");
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
