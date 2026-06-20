"""Hiérarchie région→département + index communes pour la recherche, côté client."""
import json
from pathlib import Path
import pandas as pd
DA = Path(__file__).parent / "data_app"; OUT = DA / "values"
rc = pd.read_parquet(DA / "ref_communes.parquet")
rd = pd.read_parquet(DA / "ref_departement.parquet")
rr = pd.read_parquet(DA / "ref_region.parquet")
hier = {"regions": dict(zip(rr["code_region"], rr["nom"])),
        "departements": [{"code": c, "nom": n, "region": r}
                         for c, n, r in zip(rd["code_departement"], rd["nom"], rd["code_region"])]}
(OUT / "_hierarchie.json").write_text(json.dumps(hier, ensure_ascii=False, separators=(",", ":")))
idx = [{"code": c, "nom": n, "dep": d, "region": r}
       for c, n, d, r in zip(rc["code_commune"], rc["nom"], rc["code_departement"], rc["code_region"])]
(OUT / "communes_index.json").write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")))
print("hierarchie + index communes:", len(idx), "communes")
