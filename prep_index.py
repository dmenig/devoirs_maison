"""Hiérarchie région→département + index communes pour la recherche, côté client."""

import json
from pathlib import Path
import pandas as pd

DA = Path(__file__).parent / "data_app"
OUT = DA / "values"
rc = pd.read_parquet(DA / "ref_communes.parquet")
rd = pd.read_parquet(DA / "ref_departement.parquet")
rr = pd.read_parquet(DA / "ref_region.parquet")
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
idx = [
    {
        "code": c,
        "nom": n,
        "dep": (d if pd.notna(d) else None),
        "region": (r if pd.notna(r) else None),
    }
    for c, n, d, r in zip(
        rc["code_commune"], rc["nom"], rc["code_departement"], rc["code_region"]
    )
]
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
