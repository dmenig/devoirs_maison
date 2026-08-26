"""Hiérarchie région→département + index communes pour la recherche, côté client.

Le COG garde les communes ANCIENNES sous leur code d'alors, sans département ni région
— 2 628 lignes de `ref_communes`. C'est utile : on cherche « Bellegarde-sur-Valserine »
bien plus souvent que « Valserhône ». Mais la recherche construisait alors le fil
d'Ariane avec ces cases vides, et ouvrir une de ces communes affichait
« 🇫🇷 France › null › null › Béon ». Or le code INSEE PORTE son département (les deux
ou trois premiers caractères), et le département donne sa région : on complète donc
plutôt que d'afficher du vide. On écarte en revanche les 537 entrées qui ne mènent à
rien du tout — ni résultat électoral, ni contour : de vraies impasses de recherche.
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


def _communes_atteignables() -> set[str]:
    """Communes qui ont quelque chose à montrer : un résultat électoral ou un contour."""
    codes = set(
        pd.read_parquet(DA / "resultats_commune.parquet", columns=["code"])["code"]
        .astype(str)
        .unique()
    )
    for f in (DA / "geo" / "communes").glob("*.geojson"):
        codes |= set(gpd.read_file(f, ignore_geometry=True)["code"].astype(str))
    return codes


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
atteignables = _communes_atteignables()
idx = []
for c, n, d, r in zip(
    rc["code_commune"], rc["nom"], rc["code_departement"], rc["code_region"]
):
    if str(c) not in atteignables:
        continue
    dep = str(d) if pd.notna(d) else _dep_du_code(str(c))
    idx.append(
        {
            "code": c,
            "nom": n,
            "dep": dep,
            "region": str(r) if pd.notna(r) else dep_region.get(dep),
        }
    )
print(f"index : {len(rc) - len(idx)} entrées écartées (aucun résultat, aucun contour)")
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
