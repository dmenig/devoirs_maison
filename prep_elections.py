"""Transforme les résultats électoraux bruts de hexagonal (un fichier parquet long
par scrutin, une ligne par candidat × bureau de vote) en tables compactes prêtes à
l'emploi, à toutes les échelles : bureau de vote, commune, département, région, France.

Indicateurs produits par (échelle × scrutin), comme demandé par la présentation :
- participation / abstention (% des inscrits)
- scores des 6 blocs de la « recomposition » (% des inscrits)
- scores des 3 blocs de la tripartition (% des inscrits)
- voix LFI / gauche (en valeur absolue, pour les réservoirs de voix)
"""

from __future__ import annotations

import collections
from dataclasses import dataclass, replace
from pathlib import Path

import geopandas as gpd
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


PLM_COMMUNES = ("75056", "69123", "13055")


def _canon_suffix(s: pd.Series) -> pd.Series:
    """Numéro de bureau canonique = zéro-padding sur 4 chiffres ('1' → '0001'), pour
    matcher les contours et homogénéiser les scrutins entre eux (certains fichiers du
    ministère paddent, d'autres non : sans ça le même bureau a deux clés)."""
    s = s.astype(str)
    return s.where(~s.str.fullmatch(r"\d+"), s.str.zfill(4))


def construire_crosswalk_plm(dossier_clean: Path, geo_dir: Path) -> dict[str, str]:
    """Crosswalk {code_bv continu → code_bv local} pour Paris/Lyon/Marseille.

    Depuis 2024 le ministère numérote les bureaux de façon continue à l'intérieur d'un
    secteur (à Paris, les arr. 1-4 fusionnés : arr2 commence à 11, arr3 à 21…) au lieu
    de repartir de 01 à chaque arrondissement. Les contours et les scrutins ≤ 2022
    utilisent la numérotation locale : sans remappage, les bureaux 2024+ tombent sur des
    codes orphelins (« none » sur la carte). On aligne par rang, par (commune, arr.),
    uniquement là où les effectifs coïncident — sinon on s'abstient (un mauvais
    remappage attribuerait les voix d'un bureau au contour d'un autre)."""
    geo_by: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    for dep in ("75", "69", "13"):
        f = geo_dir / f"{dep}.geojson"
        if not f.exists():
            continue
        for code in gpd.read_file(f, ignore_geometry=True)["bureau"].astype(str):
            com, _, suf = code.partition("_")
            if com in PLM_COMMUNES and suf.isdigit():
                geo_by[(com, suf[:2])].append(suf)
    src = dossier_clean / "2024-europeenne-bureau_de_vote.parquet"
    if not src.exists():
        return {}
    df = pd.read_parquet(src, columns=["code_commune", "bureau_de_vote"])
    df = df[df["code_commune"].astype(str).isin(PLM_COMMUNES)].drop_duplicates()
    cont_by: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    for com, bv in zip(
        df["code_commune"].astype(str), df["bureau_de_vote"].astype(str)
    ):
        if bv.isdigit():
            suf = bv.zfill(4)
            cont_by[(com, suf[:2])].append(suf)
    crosswalk: dict[str, str] = {}
    for key, conts in cont_by.items():
        com, _ = key
        locs = sorted(geo_by.get(key, []))
        conts = sorted(conts)
        if len(conts) == len(locs):
            crosswalk.update(
                {f"{com}_{c}": f"{com}_{l}" for c, l in zip(conts, locs) if c != l}
            )
    return crosswalk


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


def _bureau_depuis_df(
    df: pd.DataFrame, scrutin: Scrutin, crosswalk: dict[str, str]
) -> pd.DataFrame:
    """Renvoie une ligne par bureau de vote, avec voix ventilées par famille."""
    df = df.copy()
    if "voix" not in df.columns:
        raise ValueError(f"{scrutin.cle}: colonnes manquantes {df.columns.tolist()}")
    if "code_commune" not in df.columns:
        if "code_secteur" not in df.columns:
            raise ValueError(f"{scrutin.cle}: ni code_commune ni code_secteur")
        # Paris/Lyon/Marseille : on rattache le secteur à sa commune principale.
        df["code_commune"] = df["code_secteur"].astype(str).str[:5]
    df["bureau_de_vote"] = df.get("bureau_de_vote", "")
    base_bv = df["code_secteur"] if "code_secteur" in df.columns else df["code_commune"]
    df["code_bv"] = base_bv.astype(str) + "_" + _canon_suffix(df["bureau_de_vote"])
    if crosswalk:
        df["code_bv"] = df["code_bv"].map(lambda c: crosswalk.get(c, c))

    nuance = df["nuance"] if "nuance" in df.columns else pd.Series([None] * len(df))
    nom = df["nom"] if "nom" in df.columns else pd.Series([None] * len(df))
    df["famille"] = [nuance_vers_famille(n, m) for n, m in zip(nuance, nom)]

    base_cols = ["code_bv", "code_commune", "bureau_de_vote"]
    base = df.groupby("code_bv", as_index=False)[
        ["inscrits", "votants", "exprimes"]
    ].max()
    meta = df.groupby("code_bv", as_index=False)[base_cols[1:]].first()
    base = base.merge(meta, on="code_bv")

    voix = df.pivot_table(
        index="code_bv", columns="famille", values="voix", aggfunc="sum", fill_value=0
    ).reset_index()
    out = base.merge(voix, on="code_bv", how="left")
    for fam in FAMILLES:
        if fam not in out.columns:
            out[fam] = 0
    return out


def _par_bureau(
    scrutin: Scrutin, crosswalk: dict[str, str]
) -> list[tuple[Scrutin, pd.DataFrame]]:
    """Lit le fichier d'un scrutin et renvoie un (scrutin, table BV) par tour. Les fichiers
    legacy regroupant plusieurs tours (présidentielle 2012, municipales 2014) sont séparés
    en un scrutin par tour : sans cela, le pivot somme les voix des deux tours et double-compte."""
    df = pd.read_parquet(scrutin.fichier)
    if "numero_tour" in df.columns and df["numero_tour"].nunique(dropna=True) > 1:
        sorties = []
        for t, sub in df.groupby("numero_tour"):
            sc = replace(scrutin, cle=f"{scrutin.cle}-{int(t)}", tour=int(t))
            sorties.append((sc, _bureau_depuis_df(sub, sc, crosswalk)))
        return sorties
    return [(scrutin, _bureau_depuis_df(df, scrutin, crosswalk))]


def _indicateurs(g: pd.DataFrame) -> dict:
    """Calcule les indicateurs d'un groupe (déjà agrégé en sommes)."""
    inscrits = g["inscrits"]
    res: dict = {
        "inscrits": int(inscrits),
        "votants": int(g["votants"]),
        "exprimes": int(g["exprimes"]),
        "participation": round(100 * g["votants"] / inscrits, 2) if inscrits else None,
        "abstention": round(100 * (1 - g["votants"] / inscrits), 2)
        if inscrits
        else None,
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


def _agreger(
    bv: pd.DataFrame, cle_groupe: str, niveau: str, scrutin: Scrutin
) -> pd.DataFrame:
    cols_somme = ["inscrits", "votants", "exprimes", *FAMILLES]
    grp = bv.groupby(cle_groupe, as_index=False)[cols_somme].sum()
    lignes = [
        {
            "niveau": niveau,
            "code": row[cle_groupe],
            "scrutin": scrutin.cle,
            "scrutin_libelle": scrutin.libelle,
            "annee": scrutin.annee,
            "type": scrutin.type,
            "tour": scrutin.tour,
            **_indicateurs(row),
        }
        for _, row in grp.iterrows()
    ]
    return pd.DataFrame(lignes)


def construire_resultats(
    dossier_clean: Path,
    communes: pd.DataFrame,
    geo_dir: Path | None = None,
) -> dict[str, pd.DataFrame]:
    """Construit un dict {niveau: DataFrame} agrégeant tous les scrutins."""
    crosswalk = construire_crosswalk_plm(dossier_clean, geo_dir) if geo_dir else {}
    com2dep = communes.set_index("code_commune")["code_departement"].to_dict()
    dep2reg = (
        communes.drop_duplicates("code_departement")
        .set_index("code_departement")["code_region"]
        .to_dict()
    )
    accum: dict[str, list[pd.DataFrame]] = {
        n: [] for n in ("bureau", "commune", "departement", "region", "france")
    }
    for scrutin in lister_scrutins(dossier_clean):
        try:
            bureaux = _par_bureau(scrutin, crosswalk)
        except Exception as e:  # un scrutin atypique ne doit pas tout bloquer
            print(f"  ⚠ {scrutin.cle} ignoré : {e}")
            continue
        for sc, bv in bureaux:
            bv["code_departement"] = bv["code_commune"].map(com2dep)
            bv["code_region"] = bv["code_departement"].map(dep2reg)
            bv["france"] = "FR"
            accum["bureau"].append(_agreger(bv, "code_bv", "bureau", sc))
            accum["commune"].append(_agreger(bv, "code_commune", "commune", sc))
            accum["departement"].append(
                _agreger(bv, "code_departement", "departement", sc)
            )
            accum["region"].append(_agreger(bv, "code_region", "region", sc))
            accum["france"].append(_agreger(bv, "france", "france", sc))
            print(f"  ✓ {sc.cle}: {len(bv)} bureaux")
    return {
        n: pd.concat(parts, ignore_index=True) for n, parts in accum.items() if parts
    }
