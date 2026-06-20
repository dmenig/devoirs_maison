"""Données administratives INSEE (recensement 2021) par commune, pour la « fiche
circonscription » de la prez (slides 25-28) ramenée à l'échelle communale :
pyramide des âges, statut d'occupation (propriétaires/locataires), déplacements
domicile-travail par mode, et — depuis le RNE — le maire en exercice.

Sources : bases infracommunales (IRIS) du recensement, agrégées à la commune via
la colonne COM, + Répertoire national des élus (data.gouv). On télécharge dans un
cache local ; chaque jeu est optionnel (téléchargement raté → colonnes absentes)."""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

import prep_geo

BASE_IC = {  # jeu -> (id page INSEE, nom de fichier zip CSV)
    "pop": ("8268806", "base-ic-evol-struct-pop-2021_csv.zip"),
    "log": ("8268838", "base-ic-logement-2021_csv.zip"),
    "act": ("8268843", "base-ic-activite-residents-2021_csv.zip"),
}
INSEE = "https://www.insee.fr/fr/statistiques/fichier"

AGES = ["0014", "1529", "3044", "4559", "6074", "75P"]  # 6 tranches (slide 26)
TRANSPORTS = ["PAS", "MAR", "VELO", "2ROUESMOT", "VOIT", "TCOM"]  # slide 28
# IRAN (résidence un an avant) -> 5 catégories de la slide 25, dans l'ordre d'affichage :
# même logement / autre logement même commune / autre commune du dépt / hors dépt en
# France (autre dépt, hors région, DOM, COM) / à l'étranger (UE + hors UE). Z = sans objet.
IRAN_CAT = {"1": 0, "2": 1, "3": 2, "4": 3, "5": 3, "6": 3, "7": 3, "8": 4, "9": 4}


@dataclass(frozen=True)
class AdminTables:
    commune: pd.DataFrame  # une ligne / commune + une ligne code_commune="FRANCE"


def _lire_base_ic(zip_path: Path) -> pd.DataFrame:
    with zipfile.ZipFile(zip_path) as z:
        nom = next(
            n
            for n in z.namelist()
            if n.upper().endswith(".CSV") and not n.startswith("meta")
        )
        with z.open(nom) as f:
            return pd.read_csv(
                f, sep=";", dtype={"COM": str}, encoding="utf-8", low_memory=False
            )


def _telecharger_bases(cache: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    for jeu, (page, fichier) in BASE_IC.items():
        dest = cache / fichier
        if dest.exists() or prep_geo._telecharger(f"{INSEE}/{page}/{fichier}", dest):
            out[jeu] = dest
    return out


def _agreger(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Somme des effectifs (estimés, flottants) par commune (COM) + total France."""
    g = df.groupby("COM")[cols].sum()
    g.loc["FRANCE"] = df[cols].sum()
    return g


def _pop_par_age(pop: pd.DataFrame) -> pd.DataFrame:
    cols = [f"P21_{s}{a}" for s in ("H", "F") for a in AGES] + ["P21_POP"]
    g = _agreger(pop, cols)
    out = pd.DataFrame(index=g.index)
    out["pop"] = g["P21_POP"].round().astype(int)
    base = g["P21_POP"].replace(0, float("nan"))
    for s in ("H", "F"):
        for i, a in enumerate(AGES):
            out[f"age{s}_{i}"] = (100 * g[f"P21_{s}{a}"] / base).round(2)
    return out


def _logement(log: pd.DataFrame) -> pd.DataFrame:
    cols = ["P21_RP", "P21_RP_PROP", "P21_RP_LOC", "P21_RP_LOCHLMV", "P21_RP_GRAT"]
    g = _agreger(log, cols)
    base = g["P21_RP"].replace(0, float("nan"))
    return pd.DataFrame(
        {
            "prop": (100 * g["P21_RP_PROP"] / base).round(1),
            "loc": (100 * g["P21_RP_LOC"] / base).round(1),
            "hlm": (100 * g["P21_RP_LOCHLMV"] / base).round(1),
            "grat": (100 * g["P21_RP_GRAT"] / base).round(1),
        },
        index=g.index,
    )


def _transport(act: pd.DataFrame) -> pd.DataFrame:
    cols = [f"C21_ACTOCC15P_{m}" for m in TRANSPORTS]
    g = _agreger(act, cols)
    base = g[cols].sum(axis=1).replace(0, float("nan"))
    out = pd.DataFrame(index=g.index)
    for i, m in enumerate(TRANSPORTS):
        out[f"tr_{i}"] = (100 * g[f"C21_ACTOCC15P_{m}"] / base).round(1)
    return out


def _migration_canton(cache: Path) -> pd.DataFrame:
    """Renouvellement de population (slide 25) : répartition des résidents selon leur
    lieu de résidence un an avant (IRAN), pondérée par IPONDI. Les fichiers détail
    « individus localisés » ne sont géographiés qu'au **canton-ou-ville** (CANTVILLE,
    confidentialité) : on agrège donc à ce grain (+ ligne FRANCE). Optionnel."""
    parts = sorted(cache.glob("ilc_*.zip"))
    if not parts:
        return pd.DataFrame()
    acc: dict[str, list[float]] = {}
    fr = [0.0] * 5
    for part in parts:
        with zipfile.ZipFile(part) as z:
            nom = next(n for n in z.namelist() if n.upper().endswith(".CSV"))
            for chunk in pd.read_csv(
                z.open(nom),
                sep=";",
                usecols=["CANTVILLE", "IRAN", "IPONDI"],
                dtype={"CANTVILLE": str, "IRAN": str},
                chunksize=2_000_000,
            ):
                chunk["cat"] = chunk["IRAN"].map(IRAN_CAT)
                chunk = chunk.dropna(subset=["cat"])
                for (cv, cat), poids in (
                    chunk.groupby(["CANTVILLE", "cat"])["IPONDI"].sum().items()
                ):
                    acc.setdefault(cv, [0.0] * 5)[int(cat)] += poids
                    fr[int(cat)] += poids
    acc["FRANCE"] = fr
    out = pd.DataFrame.from_dict(
        acc, orient="index", columns=[f"mig_{i}" for i in range(5)]
    )
    tot = out.sum(axis=1).replace(0, float("nan"))
    return out.div(tot, axis=0).mul(100).round(1)


def _migration_communes(canton: pd.DataFrame, communes: pd.DataFrame) -> pd.DataFrame:
    """Rabat le profil de renouvellement (canton-ou-ville) sur chaque commune via son
    canton COG ; repli sur le pseudo-canton « <dépt>ZZ » (Paris, Lyon, grandes villes
    d'outre-mer). Index = code_commune (+ ligne FRANCE)."""
    prof = canton.to_dict("index")
    cols = [f"mig_{i}" for i in range(5)]
    lignes: dict[str, dict] = {"FRANCE": prof["FRANCE"]}
    for code, canton_code, dep in zip(
        communes["code_commune"], communes["code_canton"], communes["code_departement"]
    ):
        p = prof.get(canton_code) or prof.get(f"{dep}ZZ")
        if p:
            lignes[str(code)] = p
    return pd.DataFrame.from_dict(lignes, orient="index")[cols].rename_axis("COM")


def _maires(cache: Path) -> pd.DataFrame:
    """Maire en exercice (nom + CSP) par commune, depuis le RNE."""
    dest = cache / "elus-maires.csv"
    url = (
        "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/"
        "20260505-152119/elus-maires-mai.csv"
    )
    if not dest.exists() and not prep_geo._telecharger(url, dest):
        return pd.DataFrame(columns=["maire", "maire_csp"]).rename_axis("COM")
    df = pd.read_csv(dest, sep=";", dtype=str)
    df = df.rename(
        columns={
            "Code de la commune": "COM",
            "Nom de l'élu": "nom",
            "Prénom de l'élu": "prenom",
            "Libellé de la catégorie socio-professionnelle": "maire_csp",
        }
    )
    df["maire"] = (
        df["prenom"].str.strip() + " " + df["nom"].str.title().str.strip()
    ).str.strip()
    return df.set_index("COM")[["maire", "maire_csp"]]


def champs_client(row: pd.Series) -> dict:
    """Champs administratifs (slides 25-28) prêts pour le client, à partir d'une ligne
    d'admin_commune (commune ou ligne « FRANCE »). Listes compactes + maire."""

    def g(c: str) -> float | None:
        return round(float(row[c]), 1) if c in row and pd.notna(row[c]) else None

    d: dict = {
        "ageh": [g(f"ageH_{i}") for i in range(6)],
        "agef": [g(f"ageF_{i}") for i in range(6)],
        "tr": [g(f"tr_{i}") for i in range(6)],
        "prop": g("prop"),
        "loc": g("loc"),
        "hlm": g("hlm"),
    }
    if "mig_0" in row and pd.notna(row.get("mig_0")):
        d["mig"] = [g(f"mig_{i}") for i in range(5)]
    if "maire" in row and pd.notna(row.get("maire")):
        d["maire"] = str(row["maire"])
        if pd.notna(row.get("maire_csp")):
            d["csp"] = str(row["maire_csp"])
    return d


def construire_admin(cache: Path, communes: pd.DataFrame) -> AdminTables:
    """`communes` : table COG (code_commune, code_canton, code_departement) servant à
    rabattre le renouvellement (grain canton-ou-ville) sur chaque commune."""
    cache.mkdir(parents=True, exist_ok=True)
    bases = _telecharger_bases(cache)
    morceaux: list[pd.DataFrame] = []
    if "pop" in bases:
        morceaux.append(_pop_par_age(_lire_base_ic(bases["pop"])))
    if "log" in bases:
        morceaux.append(_logement(_lire_base_ic(bases["log"])))
    if "act" in bases:
        morceaux.append(_transport(_lire_base_ic(bases["act"])))
    if not morceaux:
        return AdminTables(pd.DataFrame())
    commune = pd.concat(morceaux, axis=1)
    canton = _migration_canton(cache)
    if not canton.empty:
        commune = commune.join(_migration_communes(canton, communes), how="left")
    commune = commune.join(_maires(cache), how="left")
    commune = commune.reset_index().rename(
        columns={"COM": "code_commune", "index": "code_commune"}
    )
    return AdminTables(commune)
