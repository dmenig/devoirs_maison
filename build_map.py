"""Assemblage de la carte : `map.html` (squelette) + `assets/map.css` + `assets/js/*.js`.

La carte est servie en UNE seule string inlinée dans le composant Streamlit (pas de
serveur d'assets), mais la source est éclatée en fichiers par responsabilité pour
permettre l'édition en parallèle. Les modules JS sont concaténés dans l'ordre des noms
(01_, 02_, …) : le résultat est identique au fichier monolithe d'origine.
"""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).parent
ASSETS = ROOT / "assets"
CSS_MARK = "/*__CSS__*/"
JS_MARK = "/*__JS__*/"


def assemble_map(base: str | None = None) -> str:
    css = (ASSETS / "map.css").read_text(encoding="utf-8")
    parts = [
        f.read_text(encoding="utf-8") for f in sorted((ASSETS / "js").glob("*.js"))
    ]
    js = "".join(p if p.endswith("\n") else p + "\n" for p in parts)
    html = (ROOT / "map.html").read_text(encoding="utf-8")
    if CSS_MARK not in html or JS_MARK not in html:
        raise ValueError("map.html : marqueurs __CSS__ / __JS__ introuvables")
    html = html.replace(CSS_MARK, css).replace(JS_MARK, js)
    if base is not None:
        html = html.replace("__BASE__", base)
    return html


if __name__ == "__main__":
    print(assemble_map())
