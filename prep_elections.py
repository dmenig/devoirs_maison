"""Transforme les résultats électoraux bruts de hexagonal (un fichier parquet long
par scrutin, une ligne par candidat × bureau de vote) en tables compactes prêtes à
l'emploi, à toutes les échelles : bureau de vote, commune, circonscription,
département, région, France.

Indicateurs produits par (échelle × scrutin), comme demandé par la présentation :
- participation / abstention (% des inscrits)
- scores des 6 blocs de la « recomposition » (% des inscrits)
- scores des 3 blocs de la tripartition (% des inscrits)
- voix LFI / gauche (en valeur absolue, pour les réservoirs de voix)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from nuances import (
    BLOC6_ORDRE,
    FAMILLE_BLOC6,
    FAMILLE_TRIPARTITION,
    FAMILLES_GAUCHE,
    FAMILLES_LFI,
    TRIPARTITION_ORDRE,
    nuance_vers_famille,
)

FAMILLES = sorted(set(FAMILLE_BLOC6) | {"UDI"})


@dataclass(frozen=True)
class Scrutin:
    cle: str  # ex: "2022-presidentielle-1"
    annee: int
    type: str  # presidentielle / legislatives / europeenne / municipales / ...
    tour: int | None
    fichier: Path

    @property
    def libelle(self) -> str:
        noms = {
            "presidentielle": "Présidentielle",
            "legislatives": "Législatives",
            "europeenne": "Européennes",
            "municipales": "Municipales",
            "departementales": "Départementales",
            "regionales": "Régionales",
            "referendum": "Référendum",
        }
        base = f"{noms.get(self.type, self.type.title())} {self.annee}"
        return f"{base} (T{self.tour})" if self.tour else base


def lister_scrutins(dossier_clean: Path) -> list[Scrutin]:
    scrutins: list[Scrutin] = []
    for f in sorted(dossier_clean.glob("*-bureau_de_vote.parquet")):
        parts = f.stem.replace("-bureau_de_vote", "").split("-")
        annee = int(parts[0])
        type_ = parts[1]
        tour = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None
        cle = "-".join(parts)
        scrutins.append(Scrutin(cle, annee, type_, tour, f))
    return scrutins


def _par_bureau(scrutin: Scrutin) -> pd.DataFrame:
    """Renvoie une ligne par bureau de vote, avec voix ventilées par famille."""
    df = pd.read_parquet(scrutin.fichier)
    if "voix" not in df.columns:
        raise ValueError(f"{scrutin.cle}: colonnes manquantes {df.columns.tolist()}")
    if "code_commune" not in df.columns:
        if "code_secteur" not in df.columns:
            raise ValueError(f"{scrutin.cle}: ni code_commune ni code_secteur")
        # Paris/Lyon/Marseille : on rattache le secteur à sa commune principale.
        df["code_commune"] = df["code_secteur"].astype(str).str[:5]
    df["bureau_de_vote"] = df.get("bureau_de_vote", "")
    base_bv = df["code_secteur"] if "code_secteur" in df.columns else df["code_commune"]
    df["code_bv"] = base_bv.astype(str) + "_" + df["bureau_de_vote"].astype(str)

    nuance = df["nuance"] if "nuance" in df.columns else pd.Series([None] * len(df))
    nom = df["nom"] if "nom" in df.columns else pd.Series([None] * len(df))
    df["famille"] = [nuance_vers_famille(n, m) for n, m in zip(nuance, nom)]

    base_cols = ["code_bv", "code_commune", "bureau_de_vote"]
    if "circonscription" in df.columns:
        base_cols.append("circonscription")
    base = df.groupby("code_bv", as_index=False)[
        ["inscrits", "votants", "exprimes"]
    ].max()
    meta = df.groupby("code_bv", as_index=False)[base_cols[1:]].first()
    base = base.merge(meta, on="code_bv")

    voix = (
        df.pivot_table(
            index="code_bv", columns="famille", values="voix", aggfunc="sum", fill_value=0
        )
        .reset_index()
    )
    out = base.merge(voix, on="code_bv", how="left")
    for fam in FAMILLES:
        if fam not in out.columns:
            out[fam] = 0
    return out


def _indicateurs(g: pd.DataFrame) -> dict:
    """Calcule les indicateurs d'un groupe (déjà agrégé en sommes)."""
    inscrits = g["inscrits"]
    res: dict = {
        "inscrits": int(inscrits),
        "votants": int(g["votants"]),
        "exprimes": int(g["exprimes"]),
        "participation": round(100 * g["votants"] / inscrits, 2) if inscrits else None,
        "abstention": round(100 * (1 - g["votants"] / inscrits), 2) if inscrits else None,
    }
    fam_voix = {fam: g.get(fam, 0) for fam in FAMILLES}
    for bloc in BLOC6_ORDRE:
        v = sum(fam_voix[f] for f in FAMILLES if FAMILLE_BLOC6.get(f) == bloc)
        res[f"b6_{bloc}"] = round(100 * v / inscrits, 2) if inscrits else None
    for bloc in TRIPARTITION_ORDRE:
        v = sum(fam_voix[f] for f in FAMILLES if FAMILLE_TRIPARTITION.get(f) == bloc)
        res[f"tri_{bloc}"] = round(100 * v / inscrits, 2) if inscrits else None
    lfi = sum(fam_voix[f] for f in FAMILLES_LFI)
    gauche = sum(fam_voix[f] for f in FAMILLES_GAUCHE)
    res["lfi_voix"] = int(lfi)
    res["gauche_voix"] = int(gauche)
    res["lfi_pct"] = round(100 * lfi / inscrits, 2) if inscrits else None
    res["gauche_pct"] = round(100 * gauche / inscrits, 2) if inscrits else None
    return res


def _agreger(bv: pd.DataFrame, cle_groupe: str, niveau: str, scrutin: Scrutin) -> pd.DataFrame:
    cols_somme = ["inscrits", "votants", "exprimes", *FAMILLES]
    grp = bv.groupby(cle_groupe, as_index=False)[cols_somme].sum()
    lignes = [
        {"niveau": niveau, "code": row[cle_groupe], "scrutin": scrutin.cle,
         "scrutin_libelle": scrutin.libelle, "annee": scrutin.annee,
         "type": scrutin.type, "tour": scrutin.tour, **_indicateurs(row)}
        for _, row in grp.iterrows()
    ]
    return pd.DataFrame(lignes)


def construire_resultats(
    dossier_clean: Path, communes: pd.DataFrame, corr_circo: pd.DataFrame | None
) -> dict[str, pd.DataFrame]:
    """Construit un dict {niveau: DataFrame} agrégeant tous les scrutins."""
    com2dep = communes.set_index("code_commune")["code_departement"].to_dict()
    dep2reg = (
        communes.drop_duplicates("code_departement")
        .set_index("code_departement")["code_region"]
        .to_dict()
    )
    accum: dict[str, list[pd.DataFrame]] = {
        n: [] for n in ("bureau", "commune", "circonscription", "departement", "region", "france")
    }
    for scrutin in lister_scrutins(dossier_clean):
        try:
            bv = _par_bureau(scrutin)
        except Exception as e:  # un scrutin atypique ne doit pas tout bloquer
            print(f"  ⚠ {scrutin.cle} ignoré : {e}")
            continue
        bv["code_departement"] = bv["code_commune"].map(com2dep)
        bv["code_region"] = bv["code_departement"].map(dep2reg)
        bv["france"] = "FR"
        if "circonscription" not in bv.columns and corr_circo is not None:
            bv = bv.merge(corr_circo, on=["code_commune", "bureau_de_vote"], how="left")

        accum["bureau"].append(_agreger(bv, "code_bv", "bureau", scrutin))
        accum["commune"].append(_agreger(bv, "code_commune", "commune", scrutin))
        accum["departement"].append(_agreger(bv, "code_departement", "departement", scrutin))
        accum["region"].append(_agreger(bv, "code_region", "region", scrutin))
        accum["france"].append(_agreger(bv, "france", "france", scrutin))
        if "circonscription" in bv.columns and bv["circonscription"].notna().any():
            accum["circonscription"].append(
                _agreger(bv[bv["circonscription"].notna()], "circonscription", "circonscription", scrutin)
            )
        print(f"  ✓ {scrutin.cle}: {len(bv)} bureaux")
    return {n: pd.concat(parts, ignore_index=True) for n, parts in accum.items() if parts}
