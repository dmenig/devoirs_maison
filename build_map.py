"""Assemblage de la carte : `map.html` (squelette) + `assets/map.css` + `assets/js/*.js`.

La carte est servie en UNE seule page autoportante (pas de serveur d'assets), mais la
source est éclatée en fichiers par responsabilité pour permettre l'édition en parallèle. Les modules JS sont concaténés dans l'ordre des noms
(01_, 02_, …) : le résultat est identique au fichier monolithe d'origine.

**Trois versions du site sortent de cette même source.** Elles ne diffèrent que par la
définition d'un indicateur — les « voix à conquérir » — et le numéro est figé DANS LA PAGE
au moment de la publication (`__VERSION__`), pas basculé à chaud par un bouton :

| Version | Page publiée | « Voix à conquérir » |
| --- | --- | --- |
| 1 | `index.html` | objectif arithmétique : exprimés × 20 % − socle LFI (historique) |
| 2 | `v2/index.html` | mesure modélisée : abstentionnistes conjoncturels × γ (2027) |
| 3 | `v3/index.html` | rentabilité de l'effort : voix gagnables par heure de porte-à-porte |

Chaque version est donc un SITE à part entière, avec sa propre URL — le sélecteur en haut
de carte n'est qu'un lien d'une page à l'autre, qui reporte l'état de la vue. Tout le reste
(données servies, navigation, fiches, contrôles) est rigoureusement identique : `data_app`
porte les clés des trois définitions côte à côte, chaque version n'en colorant qu'une.
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
# Versions publiées : numéro -> (chemin sous _site/, libellé du sélecteur, description).
# L'ordre fait celui des pastilles du sélecteur ; le chemin sert AUSSI au client pour
# fabriquer les liens d'une version à l'autre (cf. assets/js/15_version.js).
VERSIONS = {
    1: ("", "Objectif", "Objectif arithmétique : 20 % des exprimés, moins le socle LFI"),
    2: ("v2/", "Modèle 2027", "Voix réellement gagnables : abstentionnistes de gauche mobilisables"),
    3: ("v3/", "Rentabilité", "Voix gagnables par heure de porte-à-porte"),
}


# @cache : l'assemblage relit tous les modules et simplifie les contours de la vue France
# (~0,4 s). Payé une fois à la PUBLICATION (build_site.py), jamais par un visiteur.
@cache
def assemble_map(base: str | None = None, version: int = 1) -> str:
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
    if version not in VERSIONS:
        raise ValueError(f"version inconnue : {version} (attendu {sorted(VERSIONS)})")
    html = html.replace("__VERSION__", str(version))
    if base is not None:
        html = html.replace("__BASE__", base)
    return html


if __name__ == "__main__":
    print(assemble_map())
