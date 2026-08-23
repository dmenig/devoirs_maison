"""Amorce inlinée dans la page : la vue France, prête à l'emploi, sans aucun aller-retour.

La vue France est le seul affichage que rien ne peut masquer — il n'y a pas encore eu de
survol à précharger, et c'est celui que tout visiteur paie. Ses deux fichiers sont donc
lus SUR LE SERVEUR au démarrage et inlinés dans le HTML, où ils amorcent directement le
cache mémoire du client (`window.__seed`, cf. 01_config.js). Le premier tracé ne demande
plus rien au réseau.

`geo/regions.geojson` pèse 1,4 Mo pour 13 polygones (76 000 sommets) alors qu'il s'affiche
entre les zooms 6 et 9, soit 1700 à 212 m par pixel : on le réduit ici à la précision que
ces zooms peuvent RÉELLEMENT rendre (tolérance 200 m = 0,12 px au zoom 6, 0,94 px au zoom
9 — invisible), ce qui le ramène à ~370 Ko. Rien n'est réécrit dans data_app : les fichiers
servis restent intacts, seule la copie inlinée est allégée.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cache
from pathlib import Path

# tolérance de simplification, en degrés (~200 m) : sous le pixel jusqu'au zoom 9, au-delà
# duquel un clic a de toute façon fait basculer sur la couche des départements.
TOL_DEG = 200 / 111_000
# 4 décimales ≈ 11 m, soit encore ~1/20 de pixel au zoom 6. Au-delà on n'encode que du bruit.
DECIMALES = 4
# fichiers de la vue France, tels que le client les demanderait (clés du cache mémoire)
AMORCE = ("geo/regions.geojson", "values/region.json")


@dataclass(frozen=True)
class Amorce:
    json: str
    octets: int


def _rdp(pts: list[list[float]], tol: float) -> list[list[float]]:
    """Douglas-Peucker, en pur Python (pas de shapely à installer au déploiement) et
    ITÉRATIF : la version récursive descend d'un cran par sommet conservé dans le pire cas,
    et un anneau côtier suffirait à faire sauter la pile — au démarrage du serveur."""
    n = len(pts)
    if n < 3:
        return pts
    garder = [False] * n
    garder[0] = garder[n - 1] = True
    pile = [(0, n - 1)]
    seuil = tol * tol
    while pile:
        i0, i1 = pile.pop()
        if i1 - i0 < 2:
            continue
        x0, y0 = pts[i0]
        dx, dy = pts[i1][0] - x0, pts[i1][1] - y0
        norme = dx * dx + dy * dy
        pire, idx = -1.0, i0
        for i in range(i0 + 1, i1):
            px, py = pts[i]
            if norme == 0:
                d = (px - x0) ** 2 + (py - y0) ** 2
            else:
                t = ((px - x0) * dx + (py - y0) * dy) / norme
                t = 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
                d = (px - x0 - t * dx) ** 2 + (py - y0 - t * dy) ** 2
            if d > pire:
                pire, idx = d, i
        if pire > seuil:
            garder[idx] = True
            pile.append((i0, idx))
            pile.append((idx, i1))
    return [p for p, k in zip(pts, garder) if k]


def _anneau(anneau: list[list[float]], tol: float) -> list[list[float]]:
    """Un anneau reste FERMÉ et garde au moins un triangle, sinon le polygone disparaît."""
    simple = _rdp(anneau, tol)
    if len(simple) < 4:
        simple = anneau[:: max(1, len(anneau) // 4)] + [anneau[0]]
    if simple[0] != simple[-1]:
        simple.append(simple[0])
    return [[round(x, DECIMALES), round(y, DECIMALES)] for x, y in simple]


def _coords(c: list, tol: float, profondeur: int) -> list:
    """Descend jusqu'aux anneaux (profondeur 1 = un anneau) sans présumer Polygon/Multi."""
    if profondeur == 1:
        return _anneau(c, tol)
    return [_coords(sous, tol, profondeur - 1) for sous in c]


def _profondeur(c: list) -> int:
    n = 0
    while not isinstance(c[0], (int, float)):
        c, n = c[0], n + 1
    return n


def simplifier(geo: dict, tol: float = TOL_DEG) -> dict:
    for feat in geo["features"]:
        g = feat["geometry"]
        g["coordinates"] = _coords(g["coordinates"], tol, _profondeur(g["coordinates"]))
    geo.pop("crs", None)
    return geo


@cache
def amorce(data_dir: Path) -> Amorce:
    """Objet JSON `{chemin: contenu}` prêt à être inliné ; vide si data_app est absent."""
    seed: dict[str, object] = {}
    for rel in AMORCE:
        src = data_dir / rel
        # Absent = on n'inline rien et le client télécharge comme avant. C'est une
        # optimisation, pas une source de vérité : elle ne doit pas empêcher la carte
        # de tourner sur un déploiement sans data_app local.
        if not src.exists():
            continue
        contenu = json.loads(src.read_text(encoding="utf-8"))
        seed[rel] = simplifier(contenu) if rel.endswith(".geojson") else contenu
    texte = json.dumps(seed, separators=(",", ":"), ensure_ascii=False)
    return Amorce(texte, len(texte.encode("utf-8")))


if __name__ == "__main__":
    a = amorce(Path(__file__).parent / "data_app")
    print(f"amorce : {a.octets / 1024:.0f} Ko pour {', '.join(AMORCE)}")
