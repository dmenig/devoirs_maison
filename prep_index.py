"""Hiérarchie région→département + index communes pour la recherche, côté client.

Le COG garde les communes ANCIENNES sous leur code d'alors, sans département ni région
— 2 628 lignes de `ref_communes`. C'est utile : on cherche « Bellegarde-sur-Valserine »
bien plus souvent que « Valserhône ». Mais la recherche construisait alors le fil
d'Ariane avec ces cases vides, et ouvrir une de ces communes affichait
« 🇫🇷 France › null › null › Béon ». Or le code INSEE PORTE son département (les deux
ou trois premiers caractères), et le département donne sa région : on complète donc
plutôt que d'afficher du vide. On écarte en revanche les entrées qui ne mènent à rien
du tout — ni résultat électoral, ni contour : de vraies impasses de recherche.

Garder l'ancien nom cherchable ne suffisait pas : le chercher OUVRAIT l'ancien code, et
donc une fiche morte. Sur les 1 091 entrées sans contour, 3,6 % portaient un revenu et
0,2 % un chiffre électoral courant — « Corcelles » (01119) ne contenait que son
historique de recomposition, sur une carte qui ne bougeait pas faute de polygone à
cadrer. Le COG donne pourtant la sortie : `code_commune_parent` désigne la commune
NOUVELLE. On redirige donc ces 1 065 entrées vers elle en conservant l'ancien nom
comme alias de recherche (`anc`), affiché dans la suggestion pour que l'on comprenne
où l'on atterrit. Les 26 restantes (parent inconnu ou lui-même sans contour) sont
laissées telles quelles.
"""

import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

DA = Path(__file__).parent / "data_app"
OUT = DA / "values"
rc = pd.read_parquet(DA / "ref_communes.parquet")
rd = pd.read_parquet(DA / "ref_departement.parquet")
rr = pd.read_parquet(DA / "ref_region.parquet")


def _dep_du_code(code: str) -> str:
    return code[:3] if code.startswith("97") else code[:2]


def _contours() -> set[str]:
    """Communes qui ont un polygone : les seules que la carte sait cadrer et peindre."""
    codes: set[str] = set()
    for f in (DA / "geo" / "communes").glob("*.geojson"):
        codes |= set(gpd.read_file(f, ignore_geometry=True)["code"].astype(str))
    return codes


def _communes_atteignables(contours: set[str]) -> set[str]:
    """Communes qui ont quelque chose à montrer : un résultat électoral ou un contour."""
    codes = set(
        pd.read_parquet(DA / "resultats_commune.parquet", columns=["code"])["code"]
        .astype(str)
        .unique()
    )
    return codes | contours


hier = {
    "regions": dict(zip(rr["code_region"], rr["nom"])),
    "departements": [
        {"code": c, "nom": n, "region": (r if pd.notna(r) else None)}
        for c, n, r in zip(rd["code_departement"], rd["nom"], rd["code_region"])
    ],
}
(OUT / "_hierarchie.json").write_text(
    json.dumps(hier, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
)
dep_region = {
    str(c): (r if pd.notna(r) else None)
    for c, r in zip(rd["code_departement"], rd["code_region"])
}
contours = _contours()
atteignables = _communes_atteignables(contours)
noms = {
    str(c): n
    for c, n, d in zip(rc["code_commune"], rc["nom"], rc["code_departement"])
    if pd.notna(d)
}
parents = (
    {
        str(c): str(p)
        for c, p in zip(rc["code_commune"], rc["code_commune_parent"])
        if pd.notna(p)
    }
    if "code_commune_parent" in rc.columns
    else {}
)
idx = []
vus: set[tuple[str, str, str | None]] = set()
redirigees = alias = 0
for c, n, d, r in zip(
    rc["code_commune"], rc["nom"], rc["code_departement"], rc["code_region"]
):
    code = str(c)
    if code not in contours:
        cible = parents.get(code)
        if cible and cible != code and cible in contours:
            code = cible
            redirigees += 1
    # Nom AFFICHÉ = celui de la commune réellement ouverte ; le nom porté par la ligne
    # devient un alias quand il en diffère. Cela couvre les deux formes de fusion : celle
    # qui change le code (Corcelles → Champdor-Corcelles) et celle qui garde le code en
    # renommant la commune (Bellegarde-sur-Valserine → Valserhône, tous deux en 01033).
    nom = noms.get(code, n)
    ancien = n if n != nom else None
    if code not in atteignables or (code, nom, ancien) in vus:
        continue
    vus.add((code, nom, ancien))
    alias += ancien is not None
    dep = str(d) if pd.notna(d) else _dep_du_code(code)
    entree = {
        "code": code,
        "nom": nom,
        "dep": dep,
        "region": str(r) if pd.notna(r) else dep_region.get(dep),
    }
    if ancien:
        entree["anc"] = ancien
    idx.append(entree)
print(
    f"index : {len(rc) - len(idx)} entrées écartées (doublon, ou aucun résultat et aucun "
    f"contour) ; {alias} anciens noms conservés cherchables, dont {redirigees} redirigés "
    f"vers le code de leur commune nouvelle"
)
(OUT / "communes_index.json").write_text(
    json.dumps(idx, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
)


# Échelle circonscription retirée (présidentielle) : index région → département → commune.
search: list[dict[str, str | None]] = []
search += [
    {"code": c, "nom": n, "niveau": "region", "dep": None, "region": c}
    for c, n in zip(rr["code_region"], rr["nom"])
]
search += [
    {
        "code": c,
        "nom": n,
        "niveau": "departement",
        "dep": c,
        "region": (r if pd.notna(r) else None),
    }
    for c, n, r in zip(rd["code_departement"], rd["nom"], rd["code_region"])
]
search += [{**e, "niveau": "commune"} for e in idx]
(OUT / "search_index.json").write_text(
    json.dumps(search, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
)
print(
    f"hierarchie + index : {len(idx)} communes, "
    f"{len(search)} zones recherchables (toutes granularités)"
)
