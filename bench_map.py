"""Banc de mesure de la carte : combien de temps entre le CLIC et les polygones à l'écran.

Pilote la vraie carte dans un Chromium sans tête, descend France → région → département
→ commune (bureaux de vote) et chronomètre chaque palier de l'intérieur de la page :
données reçues, fin du vol, couche tracée. C'est le découpage qui compte — il dit si la
latence vient du réseau, de l'animation ou du tracé, et donc où il est inutile d'optimiser.

    uv run --with playwright bench_map.py                   # état courant
    uv run --with playwright bench_map.py --ref HEAD~1      # comparaison avant/après
    uv run --with playwright bench_map.py --fly 0.42 --fly 0.24   # balayage du vol

Nécessite un navigateur : `uv run --with playwright playwright install chromium`.
"""

from __future__ import annotations

import argparse
import re
import statistics
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from build_map import assemble_map

BASE = "https://raw.githubusercontent.com/dmenig/devoirs_maison/master/data_app"
ROOT = Path(__file__).parent

# Instrumentation posée dans la page : on enveloppe paintLayer (la seule fonction qui met
# des polygones à l'écran) et getJSON, et on écoute moveend. Tout est daté par rapport au
# clic, dans l'horloge de la page — aucune latence de pilotage ne vient polluer la mesure.
INSTRUMENT = """
() => {
  window.__m = {};
  const gj = window.getJSON;
  window.getJSON = function (p) { const r = gj(p);
    if (r && r.then) r.then(() => { if (window.__m.t0 != null) window.__m.donnees = performance.now() - window.__m.t0; });
    return r; };
  const paint = window.paintLayer;
  window.paintLayer = function (...a) {
    if (window.__m.t0 != null) window.__m.avantTrace = performance.now() - window.__m.t0;
    const r = paint.apply(this, a);
    if (window.__m.t0 != null) { window.__m.trace = performance.now() - window.__m.t0; window.__m.fini = true; }
    return r; };
  window.__map.on('moveend', () => {
    if (window.__m.t0 != null && window.__m.moveend == null) window.__m.moveend = performance.now() - window.__m.t0; });
  return true; }
"""

# centre conteneur d'un polygone dessiné, repéré par son nom — pour cliquer dedans
CENTRE = """
(nom) => { let r = null;
  window.__map.eachLayer(l => { if (!l.feature || r) return;
    if (l.feature.properties.__nom !== nom) return;
    const c = l.getBounds().getCenter(), p = window.__map.latLngToContainerPoint(c);
    r = { x: Math.round(p.x), y: Math.round(p.y) }; });
  return r; }
"""


@dataclass(frozen=True)
class Etape:
    nom: str
    niveau: str


@dataclass(frozen=True)
class Mesure:
    niveau: str
    donnees: float
    moveend: float
    trace: float


PARCOURS: list[Etape] = [
    Etape("Occitanie", "région"),
    Etape("Haute-Garonne", "département"),
    Etape("Toulouse", "bureaux de vote"),
]


def _page_html(dest: Path, fly: float | None) -> Path:
    """Assemble la carte, en forçant au besoin la durée du vol (balayage)."""
    html = assemble_map(BASE)
    if fly is not None:
        html, n = re.subn(r"const FLY_S=[0-9.]+,", f"const FLY_S={fly},", html, count=1)
        if not n:
            raise ValueError("FLY_S introuvable dans le JS assemblé")
    dest.write_text(html, encoding="utf-8")
    return dest


def _html_dune_ref(ref: str, dest: Path, tmp: Path) -> Path:
    """Même carte, mais avec les fichiers JS/CSS tels qu'ils sont à la révision `ref`."""
    for rel in [
        "map.html",
        "assets/map.css",
        *(f"assets/js/{f.name}" for f in sorted((ROOT / "assets" / "js").glob("*.js"))),
    ]:
        out = tmp / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(
            ["git", "-C", str(ROOT), "show", f"{ref}:{rel}"], capture_output=True
        )
        out.write_bytes(r.stdout if r.returncode == 0 else (ROOT / rel).read_bytes())
    css = (tmp / "assets" / "map.css").read_text(encoding="utf-8")
    js = "".join(
        (t if t.endswith("\n") else t + "\n")
        for t in (
            f.read_text(encoding="utf-8")
            for f in sorted((tmp / "assets" / "js").glob("*.js"))
        )
    )
    html = (tmp / "map.html").read_text(encoding="utf-8")
    dest.write_text(
        html.replace("/*__CSS__*/", css)
        .replace("/*__JS__*/", js)
        .replace("__BASE__", BASE),
        encoding="utf-8",
    )
    return dest


def _une_passe(navigateur: object, url: str, survol_ms: int) -> list[Mesure]:
    page = navigateur.new_page(viewport={"width": 1500, "height": 900})  # type: ignore[attr-defined]
    page.goto(url)
    page.wait_for_function(
        "() => window.__feats && window.__feats().length > 0", timeout=40000
    )
    page.evaluate(INSTRUMENT)
    mesures: list[Mesure] = []
    for etape in PARCOURS:
        pt = page.evaluate(CENTRE, etape.nom)
        if pt is None:
            raise RuntimeError(f"{etape.nom} n'est pas dessiné — parcours à revoir")
        # on entre par un bord puis le centre : le survol doit déclencher le préchargement
        page.mouse.move(pt["x"] - 8, pt["y"] - 8)
        page.mouse.move(pt["x"], pt["y"])
        page.wait_for_timeout(survol_ms)
        page.evaluate("window.__m = {t0: performance.now()}")
        page.mouse.click(pt["x"], pt["y"])
        page.wait_for_function("() => window.__m.fini", timeout=90000)
        m = page.evaluate("window.__m")
        mesures.append(
            Mesure(
                etape.niveau,
                m.get("donnees") or 0.0,
                m.get("moveend") or 0.0,
                m["trace"],
            )
        )
    page.close()
    return mesures


def _mediane(passes: list[list[Mesure]], niveau: str, champ: str) -> float:
    return statistics.median(
        getattr(m, champ) for p in passes for m in p if m.niveau == niveau
    )


def _tableau(titre: str, passes: list[list[Mesure]]) -> None:
    print(f"\n{titre}")
    print(f"  {'niveau':17s} {'données':>9s} {'fin du vol':>11s} {'tracé':>9s}")
    for etape in PARCOURS:
        n = etape.niveau
        print(
            f"  {n:17s} {_mediane(passes, n, 'donnees'):8.0f}ms "
            f"{_mediane(passes, n, 'moveend'):10.0f}ms {_mediane(passes, n, 'trace'):8.0f}ms"
        )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ref", help="révision git à comparer (ex. HEAD~1)")
    ap.add_argument(
        "--fly", type=float, action="append", help="forcer FLY_S (répétable)"
    )
    ap.add_argument("--passes", type=int, default=4)
    ap.add_argument(
        "--survol", type=int, default=250, help="ms de survol avant le clic"
    )
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    with tempfile.TemporaryDirectory() as td, sync_playwright() as pw:
        tmp = Path(td)
        nav = pw.chromium.launch()
        if args.ref:
            url = _html_dune_ref(args.ref, tmp / "ref.html", tmp / "src").as_uri()
            _tableau(
                f"### {args.ref} ({args.passes} passes, survol {args.survol} ms)",
                [_une_passe(nav, url, args.survol) for _ in range(args.passes)],
            )
        for fly in args.fly or [None]:
            url = _page_html(tmp / f"now{fly}.html", fly).as_uri()
            libelle = "état courant" if fly is None else f"vol forcé à {fly} s"
            _tableau(
                f"### {libelle} ({args.passes} passes, survol {args.survol} ms)",
                [_une_passe(nav, url, args.survol) for _ in range(args.passes)],
            )
        nav.close()
    print(
        "\nLecture : « données » = fichiers reçus (le préchargement au survol doit le garder "
        "sous ~60 ms),\n« fin du vol » = l'animation, « tracé » = construction de la couche. "
        "La couche n'est peinte\nqu'à la fin du vol (peindre pendant produit des bandes "
        "partielles) : le vol est donc le plancher."
    )


if __name__ == "__main__":
    main()
