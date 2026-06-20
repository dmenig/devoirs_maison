"""Produit des fichiers de valeurs compacts (JSON, {code: {indicateur: valeur}}) pour
le rendu côté client (carte Leaflet). La géométrie reste dans les GeoJSON ; ces JSON
de valeurs sont joints par code dans le navigateur.

On expose un jeu d'indicateurs ciblé (scrutins à couverture nationale + réservoirs),
suffisant pour l'usage militant et léger à charger."""

from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

import indicators as ind
import nuances
import prep_admin


def _clean(o):
    """Remplace NaN/Infinity par None : JSON valide pour les navigateurs."""
    if isinstance(o, float):
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_clean(v) for v in o]
    return o


def _dumps(data) -> str:
    return json.dumps(
        _clean(data), ensure_ascii=False, separators=(",", ":"), allow_nan=False
    )


OUT = Path(__file__).parent / "data_app" / "values"

SCRUTINS = {  # clé courte -> clé de scrutin
    "P22": "2022-presidentielle-1",
    "E24": "2024-europeenne",
    "L24": "2024-legislatives-1",
    "M26": "2026-municipales-1",
}
COLS = {  # clé courte -> colonne
    "part": ("participation", "Participation"),
    "lfi": ("lfi_pct", "Vote LFI"),
    "gauche": ("tri_social_ecologique", "Bloc social-écologique"),
    "rn": ("b6_RN-EXD", "Bloc RN-EXD"),
    "em": ("b6_MoDem-EM", "Bloc MoDem-EM"),
    "lr": ("b6_LR-DVD", "Bloc LR-DVD"),
}
# tableau de recomposition (slide 23) : tous les scrutins disponibles, 6 blocs + abstention
BLOCS_RECOMPO = [f"b6_{b}" for b in nuances.BLOC6_ORDRE] + ["abstention"]
ORDRE_TYPE = {  # ordre de lecture dans une même année
    "presidentielle": 0,
    "legislatives": 1,
    "europeenne": 2,
    "municipales": 3,
    "conseils": 3,
    "departementales": 4,
    "regionales": 5,
    "referendum": 6,
}
TYPE_COURT = {
    "presidentielle": "Prés",
    "legislatives": "Lég",
    "europeenne": "Eur",
    "municipales": "Mun",
    "conseils": "PLM",
    "departementales": "Dép",
    "regionales": "Rég",
    "referendum": "Réf",
}
# réservoirs : clé -> (métrique, scrutin départ, scrutin arrivée)
RESERVOIRS = {
    "rep_lfi": ("report_lfi", "2022-presidentielle-1", "2024-europeenne"),
    "rep_lfi_em": ("report_lfi", "2024-europeenne", "2026-municipales-1"),
    "dpart": ("ratio_participation", "2022-presidentielle-1", "2024-europeenne"),
    "abst": ("stock_abstention", "2024-europeenne", "2024-europeenne"),
}


def catalogue() -> list[dict]:
    """Liste des indicateurs (clé, libellé) pour le menu du client."""
    cat = []
    for sc, scl in SCRUTINS.items():
        for c, (_col, lab) in COLS.items():
            cat.append(
                {
                    "key": f"{c}_{sc}",
                    "label": f"{lab} — {sc}",
                    "unit": "%",
                    "groupe": "Électoral",
                }
            )
    cat.append(
        {
            "key": "rep_lfi",
            "label": "Report LFI P2022→E2024",
            "unit": "%",
            "groupe": "Réservoirs",
        }
    )
    cat.append(
        {
            "key": "rep_lfi_em",
            "label": "Report LFI E2024→M2026",
            "unit": "%",
            "groupe": "Réservoirs",
        }
    )
    cat.append(
        {
            "key": "dpart",
            "label": "Différentiel particip. P2022→E2024",
            "unit": "%",
            "groupe": "Réservoirs",
        }
    )
    cat.append(
        {
            "key": "abst",
            "label": "Stock abstentionnistes E2024",
            "unit": "voix",
            "groupe": "Réservoirs",
        }
    )
    return cat


def ordre_scrutins(df: pd.DataFrame) -> tuple[list[str], list[dict[str, str]]]:
    """Ordre chronologique des scrutins + libellés courts/longs pour le client."""
    m = (
        df[["scrutin", "scrutin_libelle", "annee", "type", "tour"]]
        .drop_duplicates()
        .copy()
    )
    m["o"] = m["type"].map(ORDRE_TYPE).fillna(9)
    m = m.sort_values(["annee", "o", "tour"])
    ordre, meta = [], []
    for _, r in m.iterrows():
        court = f"{TYPE_COURT.get(r['type'], r['type'][:3])}{int(r['annee']) % 100:02d}"
        if pd.notna(r["tour"]):
            court += f"·{int(r['tour'])}"
        ordre.append(r["scrutin"])
        meta.append({"c": court, "l": r["scrutin_libelle"]})
    return ordre, meta


def scrutins_fiables(df: pd.DataFrame) -> list[str]:
    """Scrutins dont blocs + abstention bouclent ~100 % ; écarte les fichiers legacy
    multi-tours (2012-présidentielle, municipales) qui double-comptent les voix."""
    sommes = df.groupby("scrutin")[BLOCS_RECOMPO].first().sum(axis=1)
    return sommes[(sommes >= 50) & (sommes <= 105)].index.tolist()


def _recompo_par_code(
    df: pd.DataFrame, ordre: list[str], fiables: set[str]
) -> dict[str, dict[str, list]]:
    """Par code : {position scrutin -> [6 blocs + abstention]} (dict creux, % inscrits)."""
    pos = {cle: i for i, cle in enumerate(ordre) if cle in fiables}
    sub = df[df["scrutin"].isin(pos)][["code", "scrutin", *BLOCS_RECOMPO]]
    out: dict[str, dict[str, list]] = {}
    for code, g in sub.groupby("code", sort=False):
        rec: dict[str, list] = {}
        for row in g.itertuples(index=False):
            vals = [round(float(v), 1) if pd.notna(v) else None for v in row[2:]]
            if any(v is not None for v in vals):
                rec[str(pos[row[1]])] = vals
        if rec:
            out[str(code)] = rec
    return out


def _valeurs_niveau(
    df: pd.DataFrame, ordre: list[str], fiables: set[str]
) -> dict[str, dict[str, float]]:
    out: dict[str, dict[str, float]] = {}
    for sc, scl in SCRUTINS.items():
        sub = df[df["scrutin"] == scl]
        for c, (col, _lab) in COLS.items():
            for code, v in zip(sub["code"], sub[col]):
                if pd.notna(v):
                    out.setdefault(str(code), {})[f"{c}_{sc}"] = round(float(v), 1)
        for code, lv, gv in zip(sub["code"], sub["lfi_voix"], sub["gauche_voix"]):
            o = out.setdefault(
                str(code), {}
            )  # voix réelles : report/perte recalculés pour toute paire choisie
            if pd.notna(lv):
                o[f"lfiv_{sc}"] = int(lv)
            if pd.notna(gv):
                o[f"gv_{sc}"] = int(gv)
    for key, (metr, sa, sb) in RESERVOIRS.items():
        for code, v in ind.reservoirs_par_code(df, sa, sb, metr).items():
            out.setdefault(str(code), {})[key] = v
    for code, rec in _recompo_par_code(df, ordre, fiables).items():
        out.setdefault(code, {})["rec"] = rec
    return out


def _ecrire(nom: str, data: dict) -> None:
    (OUT / f"{nom}.json").write_text(_dumps(data))


def _baker_admin(com: dict[str, dict], da: Path) -> None:
    """Fusionne admin_commune dans les valeurs communales + écrit la référence France."""
    f = da / "admin_commune.parquet"
    if not f.exists():
        return
    df = pd.read_parquet(f).set_index("code_commune")
    if "FRANCE" in df.index:
        _ecrire("_admin_fr", prep_admin.champs_client(df.loc["FRANCE"]))
    for code, row in df.drop(index="FRANCE", errors="ignore").iterrows():
        com.setdefault(str(code), {})["adm"] = prep_admin.champs_client(row)
    print(f"  ✓ admin communes fusionnées ({len(df) - 1})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DA = Path(__file__).parent / "data_app"

    fr = pd.read_parquet(DA / "resultats_france.parquet")
    ordre, scrutins_meta = ordre_scrutins(fr)
    fiables = set(scrutins_fiables(fr))
    ecartes = [c for c in ordre if c not in fiables]
    if ecartes:
        print(
            f"  ⚠ recompo : scrutins écartés (double-comptage multi-tours) : {ecartes}"
        )
    _ecrire("_scrutins", scrutins_meta)

    for niveau in ("region", "departement", "circonscription"):
        df = pd.read_parquet(DA / f"resultats_{niveau}.parquet")
        _ecrire(niveau, _valeurs_niveau(df, ordre, fiables))
        print(f"  ✓ values {niveau}")

    # communes : valeurs électorales + revenu/pauvreté, découpées par département
    com = _valeurs_niveau(
        pd.read_parquet(DA / "resultats_commune.parquet"), ordre, fiables
    )
    sc = pd.read_parquet(DA / "socio_commune.parquet")
    for code, rev, pauv in zip(
        sc["code_commune"], sc["revenu_median"], sc["taux_pauvrete"]
    ):
        o = com.setdefault(str(code), {})
        if pd.notna(rev):
            o["rev"] = int(rev)
        if pd.notna(pauv):
            o["pauv"] = round(float(pauv), 1)
    _baker_admin(com, DA)
    (OUT / "commune").mkdir(exist_ok=True)
    par_dep: dict[str, dict] = {}
    for code, vals in com.items():
        dep = code[:3] if code.startswith("97") else code[:2]
        par_dep.setdefault(dep, {})[code] = vals
    for dep, d in par_dep.items():
        (OUT / "commune" / f"{dep}.json").write_text(_dumps(d))
    print(f"  ✓ values commune (par département, {len(par_dep)})")

    iris = pd.read_parquet(DA / "socio_iris.parquet")
    _ecrire(
        "iris",
        {
            str(c): {
                "rev": (round(r) if pd.notna(r) else None),
                "pauv": (round(p, 1) if pd.notna(p) else None),
            }
            for c, r, p in zip(
                iris["code_iris"], iris["revenu_median"], iris["taux_pauvrete"]
            )
        },
    )
    print("  ✓ values iris")

    bv = pd.read_parquet(DA / "resultats_bureau.parquet")
    bv["dep"] = (
        bv["code"].str[:3].where(bv["code"].str.startswith("97"), bv["code"].str[:2])
    )
    (OUT / "bv").mkdir(exist_ok=True)
    for dep, sous in bv.groupby("dep"):
        (OUT / "bv" / f"{dep}.json").write_text(
            _dumps(_valeurs_niveau(sous, ordre, fiables))
        )
    print("  ✓ values bv (par département)")

    _ecrire("_catalogue", {"indicateurs": catalogue()})
    print("✓ prep_bake terminé")


if __name__ == "__main__":
    main()
