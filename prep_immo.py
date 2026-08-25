"""Prix du logement et effort d'accession par commune, dérivés de la base **DVF**
(Demandes de valeurs foncières, DGFiP) agrégée par commune et par année sur data.gouv.fr
(ODbL). Deux indicateurs :

- **prix moyen au m²** des logements vendus (maisons + appartements confondus) ;
- **taux d'effort d'accession** : part du revenu du ménage qu'absorberait le crédit d'un
  logement de référence dans la commune — le prix brut ne dit rien sans le revenu local.

Le prix est un indicateur de *transaction* : il n'existe que là où l'on vend, et il est
d'autant plus bruité que les ventes sont rares. On met donc les années en commun
(pondérées par le nombre de ventes) et on écarte les communes sous `VENTES_MIN` ventes
plutôt que d'afficher une moyenne tirée de deux mutations.

Absents de la source (droit local / champ DVF) : **Alsace-Moselle** (57, 67, 68), livre
foncier, et l'**outre-mer**. Ces communes n'ont pas de valeur — pas de chiffre plutôt
qu'un chiffre faux."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

import prep_geo

# Jeu « Indicateurs Immobiliers par commune et par année » (data.gouv.fr, ODbL) : un
# fichier par millésime, URLs statiques (les trois derniers exercices publiés).
URLS = {
    2022: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2022.csv",
    2023: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2023.csv",
    2024: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv",
}
VENTES_MIN = (
    5  # sous ce nombre de ventes cumulées, la moyenne communale n'a pas de sens
)

# Hypothèses du taux d'effort d'accession, regroupées pour rester ajustables (même parti
# pris que CARNET_HYP côté client). Elles sont affichées dans la fiche : un taux d'effort
# n'est lisible que si l'on dit pour quel logement, quel crédit et quel ménage.
SURFACE = (
    70.0  # m² : logement de référence (≈ surface moyenne d'un bien vendu en France)
)
APPORT = 0.10  # part du prix payée comptant
TAUX = 0.035  # taux nominal annuel du crédit (hors assurance)
DUREE_ANS = 25
UC_MENAGE = 1.55  # unités de consommation par ménage (INSEE) : FILOSOFI publie par UC


def _mensualite(capital: float) -> float:
    i = TAUX / 12
    n = DUREE_ANS * 12
    return capital * i / (1 - (1 + i) ** -n)


def _charger(cache: Path) -> pd.DataFrame:
    """Concatène les millésimes téléchargés (colonnes nommées différemment d'une année à
    l'autre : on normalise en minuscules)."""
    morceaux = []
    for annee, url in URLS.items():
        dest = cache / f"dvf_{annee}.csv"
        if not dest.exists() and not prep_geo._telecharger(url, dest):
            print(f"   immo : téléchargement {annee} échoué — millésime ignoré")
            continue
        df = pd.read_csv(dest, dtype=str)
        df.columns = [c.strip().lower() for c in df.columns]
        sous = df[["insee_com", "nb_mutations", "prixm2moyen"]].rename(
            columns={"insee_com": "code_commune", "nb_mutations": "ventes"}
        )
        sous = sous.dropna(subset=["code_commune"])
        for c in ("ventes", "prixm2moyen"):
            sous[c] = pd.to_numeric(sous[c], errors="coerce")
        morceaux.append(sous.dropna(subset=["ventes", "prixm2moyen"]))
    return pd.concat(morceaux) if morceaux else pd.DataFrame()


def construire_immo(cache: Path, socio_commune: pd.DataFrame) -> pd.DataFrame:
    """Une ligne par commune : prix moyen au m² (moyenne des millésimes pondérée par les
    ventes), nombre de ventes cumulées, taux d'effort d'accession."""
    brut = _charger(cache)
    if brut.empty:
        return pd.DataFrame(columns=["code_commune", "pxm2", "ventes", "effort"])
    brut["poids"] = brut["ventes"] * brut["prixm2moyen"]
    g = brut.groupby("code_commune").agg(
        poids=("poids", "sum"), ventes=("ventes", "sum")
    )
    g = g[g["ventes"] >= VENTES_MIN]
    immo = pd.DataFrame(
        {"pxm2": (g["poids"] / g["ventes"]).round(), "ventes": g["ventes"].astype(int)}
    )
    rev = socio_commune.set_index("code_commune")["revenu_median"]
    immo["effort"] = taux_effort(immo["pxm2"], rev.reindex(immo.index)).round(1)
    return immo.reset_index()


def taux_effort(pxm2: pd.Series, revenu_median: pd.Series) -> pd.Series:
    """Mensualité du crédit ÷ revenu mensuel du ménage, en %. `revenu_median` est le
    niveau de vie annuel par unité de consommation (FILOSOFI)."""
    mensualite = _mensualite(pxm2 * SURFACE * (1 - APPORT))
    return 100 * mensualite / (revenu_median * UC_MENAGE / 12)


def references_immo(
    immo: pd.DataFrame,
    communes: pd.DataFrame,
    refs: dict[str, dict],
    population: pd.Series,
) -> None:
    """Ajoute prix au m² et taux d'effort aux références (France + régions), en place :
    un prix ne se lit que comparé. Moyenne pondérée par la POPULATION communale — même
    convention que le revenu et la pauvreté (cf. prep_socio.construire_references) : c'est
    le prix auquel est confronté l'habitant·e moyen·ne, non celui de la transaction
    moyenne. L'effort est recalculé depuis ce prix et le revenu médian de la même zone.
    Les codes absents de `population` (arrondissements de Paris/Lyon/Marseille, ventilés
    par le recensement mais agrégés dans DVF) ne pèsent pas dans la moyenne."""
    if immo.empty:
        return
    reg = (
        communes.drop_duplicates("code_commune")
        .set_index("code_commune")["code_region"]
        .astype(str)
    )
    d = immo.set_index("code_commune")
    d["region"] = reg.reindex(d.index).values
    d["poids"] = pd.to_numeric(population.reindex(d.index), errors="coerce")

    def bloc(sub: pd.DataFrame, cle: str) -> None:
        cible = refs.get(cle)
        m = sub["poids"].notna() & (sub["poids"] > 0)
        if cible is None or not m.any():
            return
        pxm2 = round(
            (sub.loc[m, "pxm2"] * sub.loc[m, "poids"]).sum() / sub.loc[m, "poids"].sum()
        )
        cible["pxm2"] = pxm2
        revenu = cible.get("revenu_median")
        if revenu:
            cible["effort"] = round(
                float(taux_effort(pd.Series([pxm2]), pd.Series([revenu])).iloc[0]), 1
            )

    bloc(d, "FR")
    for r, grp in d.groupby("region"):
        if r and r != "nan":
            bloc(grp, r)
