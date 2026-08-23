"""Assemblage de la carte : `map.html` (squelette) + `assets/map.css` + `assets/js/*.js`.

La carte est servie en UNE seule string inlinée dans le composant Streamlit (pas de
serveur d'assets), mais la source est éclatée en fichiers par responsabilité pour
permettre l'édition en parallèle. Les modules JS sont concaténés dans l'ordre des noms
(01_, 02_, …) : le résultat est identique au fichier monolithe d'origine.
"""

from __future__ import annotations

import pathlib
from functools import cache

from prep_seed import amorce

ROOT = pathlib.Path(__file__).parent
ASSETS = ROOT / "assets"
CSS_MARK = "/*__CSS__*/"
JS_MARK = "/*__JS__*/"
# le marqueur INCLUT le `{}` par défaut : sans lui, l'injection laissait `={...}{};`
# derrière elle — une erreur de syntaxe, et l'amorce passait silencieusement à la trappe.
SEED_MARK = "/*__SEED__*/{}"


# @cache : l'assemblage relit tous les modules et simplifie les contours de la vue France
# (~0,4 s). C'est un coût de DÉMARRAGE, pas de session : Streamlit rappelle le script à
# chaque interaction, et le refaire à chaque fois se paierait sur chaque visiteur.
@cache
def assemble_map(base: str | None = None) -> str:
    css = (ASSETS / "map.css").read_text(encoding="utf-8")
    parts = [
        f.read_text(encoding="utf-8") for f in sorted((ASSETS / "js").glob("*.js"))
    ]
    js = "".join(p if p.endswith("\n") else p + "\n" for p in parts)
    html = (ROOT / "map.html").read_text(encoding="utf-8")
    if CSS_MARK not in html or JS_MARK not in html:
        raise ValueError("map.html : marqueurs __CSS__ / __JS__ introuvables")
    # amorce AVANT le JS : le marqueur vit dans un <script> qui précède celui de la carte
    if SEED_MARK not in html:
        raise ValueError("map.html : marqueur __SEED__ introuvable")
    html = html.replace(SEED_MARK, amorce(ROOT / "data_app").json)
    html = html.replace(CSS_MARK, css).replace(JS_MARK, js)
    if base is not None:
        html = html.replace("__BASE__", base)
    return html


if __name__ == "__main__":
    print(assemble_map())
