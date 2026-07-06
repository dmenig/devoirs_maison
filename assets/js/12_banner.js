// Bandeau d'accueil : rappelle en une ligne à quoi sert l'atlas. Refermable (✕), choix
// mémorisé (localStorage). Sa hauteur réelle pilote --banner-h, qui décale les panneaux
// ancrés en haut (barre, indicateurs, contrôle de zoom) pour qu'aucun ne le recouvre —
// y compris quand le texte passe sur plusieurs lignes en mobile.
(function () {
  const bar = $("banner");
  if (!bar) return;
  const root = document.documentElement;
  const stored = () => { try { return localStorage.getItem("atlas_banner"); } catch (e) { return null; } };
  const sync = () =>
    root.style.setProperty("--banner-h", bar.classList.contains("hidden") ? "0px" : bar.offsetHeight + "px");
  if (stored() === "0") bar.classList.add("hidden");
  $("bnrclose").addEventListener("click", () => {
    bar.classList.add("hidden");
    sync();
    try { localStorage.setItem("atlas_banner", "0"); } catch (e) {}
  });
  sync();
  addEventListener("resize", sync);
})();
