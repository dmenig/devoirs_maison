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

Deux raffinements sur la maille, tous deux motivés par ce que le chiffre communal ne
disait pas :

- **PARIS, LYON, MARSEILLE**, où le jeu communal agrège toute la ville sous un seul code
  INSEE : le 16ᵉ et le 19ᵉ arrondissement affichaient le MÊME prix, à 9 674 €/m². Les
  arrondissements sont reconstitués depuis **DVF géolocalisé** (`_arrondissements`) ;
- les **communes à ventes rares**, écartées faute d'atteindre `VENTES_MIN` sur trois ans :
  la fenêtre s'élargit alors à cinq millésimes plutôt que de ne rien afficher
  (`FENETRE_LARGE`), et la fiche dit sur quelle période elle lit.

Restent absents de la source, et le resteront (droit local / champ DVF) : **Alsace-Moselle**
(57, 67, 68), qui relève du livre foncier, et l'**outre-mer**. Ces communes n'ont pas de
valeur — pas de chiffre plutôt qu'un chiffre faux. Le distinguo compte pour la fiche : y
écrire « trop peu de ventes » serait faux à Strasbourg, qui en compte des milliers."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

import prep_geo

# Jeu « Indicateurs Immobiliers par commune et par année » (data.gouv.fr, ODbL) : un
# fichier par millésime, URLs statiques.
URLS = {
    2020: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112251/dvf2020.csv",
    2021: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112251/dvf2021.csv",
    2022: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2022.csv",
    2023: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2021/20240418-112252/dvf2023.csv",
    2024: "https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv",
}
# FENÊTRE. Trois millésimes suffisent partout où l'on vend : c'est la fenêtre normale, la
# plus récente, et celle sur laquelle 27 834 communes ont un prix. En dessous de
# `VENTES_MIN` ventes cumulées, on ne renonce plus — on remonte à cinq millésimes, ce qui
# fait passer 3 032 communes de plus au-dessus du seuil (30 866 au total). Elles sont
# TOUJOURS rurales : nulle part ailleurs cinq ans de marché ne tiennent en cinq ventes.
# Le prix y est donc plus ancien (le m² national a pris ~9 % de 2020 à 2024) et la fiche
# le dit — la période lue est publiée avec la valeur (`fenetre`), elle n'est pas supposée.
# On ne recale PAS les vieux millésimes sur un indice national : un marché rural ne suit
# pas la courbe nationale, et corriger de 9 % un prix mesuré sur cinq ventes reviendrait à
# rendre plus précis un chiffre qui ne l'est pas.
FENETRE_RECENTE = (2022, 2023, 2024)
FENETRE_LARGE = (2020, 2021, 2022, 2023, 2024)
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

# ============================================================================
# Paris / Lyon / Marseille
# ============================================================================
# Le jeu communal ne connaît de ces trois villes que leur code INSEE agrégé : une ligne
# pour Paris entier, une pour Lyon, une pour Marseille. Or c'est là que vivent le plus de
# militant·es, et c'est là que l'écart intra-communal est le plus grand — de 7 900 €/m² au
# 19ᵉ à 15 400 € au 7ᵉ, soit un rapport de 1 à 2 que la fiche écrasait sur une seule
# moyenne de ville. Les arrondissements portent un code INSEE propre (751xx / 6938x /
# 132xx) et c'est CELUI-LÀ que portent les IRIS : la valeur ventilée retombe donc
# exactement sur la maille des quartiers, sans jointure approximative.
ARRONDISSEMENTS = {
    "75056": [f"751{i:02d}" for i in range(1, 21)],
    "69123": [f"6938{i}" for i in range(1, 10)],
    "13055": [f"132{i:02d}" for i in range(1, 17)],
}
# DVF géolocalisé (Etalab, ODbL) : les mutations une par une, un fichier par commune —
# 45 fichiers par millésime ici, quelques dizaines de Mo en tout, là où le DVF brut du
# millésime pèse plusieurs centaines de Mo pour la France entière.
GEO_DVF = "https://files.data.gouv.fr/geo-dvf/latest/csv/{annee}/communes/{dep}/{code}.csv"
# Bornes de vraisemblance du prix au m². DVF publie la valeur foncière DÉCLARÉE : on y
# trouve des ventes à l'euro symbolique entre parents et des mutations dont la surface
# saisie n'a rien à voir avec le bien. Les deux tirent une moyenne d'arrondissement bien
# plus loin qu'elles ne pèsent en nombre (0,6 % des mutations parisiennes retenues).
PM2_MIN, PM2_MAX = 500, 50_000


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
        sous["annee"] = annee
        morceaux.append(sous.dropna(subset=["ventes", "prixm2moyen"]))
    return pd.concat(morceaux) if morceaux else pd.DataFrame()


def _mutations_logement(fichier: Path) -> tuple[int, float]:
    """Nombre de ventes de logement exploitables dans un fichier DVF géolocalisé, et leur
    prix moyen au m². Une mutation ne compte que si elle porte UN SEUL local d'habitation :
    la valeur foncière est celle de l'acte entier, la diviser par la surface d'un seul lot
    quand l'acte en vend trois donnerait un prix au m² triple."""
    colonnes = [
        "id_mutation",
        "nature_mutation",
        "valeur_fonciere",
        "type_local",
        "surface_reelle_bati",
    ]
    d = pd.read_csv(fichier, usecols=colonnes, low_memory=False)
    d = d[
        (d["nature_mutation"] == "Vente")
        & d["type_local"].isin(("Appartement", "Maison"))
    ]
    seuls = d.groupby("id_mutation").size()
    d = d[d["id_mutation"].isin(seuls[seuls == 1].index)]
    d = d[(d["surface_reelle_bati"] > 0) & (d["valeur_fonciere"] > 0)]
    pm2 = d["valeur_fonciere"] / d["surface_reelle_bati"]
    pm2 = pm2[(pm2 >= PM2_MIN) & (pm2 <= PM2_MAX)]
    return len(pm2), float(pm2.mean()) if len(pm2) else float("nan")


def _arrondissements(cache: Path, communal: pd.DataFrame) -> pd.DataFrame:
    """Ventile le prix publié d'une ville PLM entre ses arrondissements, millésime par
    millésime, au format du jeu communal (`code_commune`, `ventes`, `prixm2moyen`, `annee`).

    On ne SUBSTITUE pas une source à l'autre. Le prix estimé ici depuis les mutations
    brutes ne vaut pas celui du jeu communal : ses filtres ne sont pas publiés, et sur
    Paris 2024 la même définition donne 10 158 €/m² là où le jeu communal en publie 9 674
    — 5 % d'écart, invisible dans une ville mais énorme entre deux communes voisines dont
    l'une serait mesurée d'une façon et l'autre de l'autre. On ne garde donc de DVF
    géolocalisé que la FORME (le rapport d'un arrondissement à sa ville) et on la cale sur
    le NIVEAU publié : le facteur `k` absorbe tout biais commun aux arrondissements, et la
    moyenne des arrondissements, repondérée par leurs ventes, redonne exactement le prix
    publié de la ville. Toute commune de France reste comparable à toute autre.

    Les ventes de la ville sont ventilées dans la même proportion : leur somme est
    conservée, et `VENTES_MIN` s'applique aux arrondissements comme au reste."""
    lignes = []
    publie = communal.set_index(["code_commune", "annee"])
    for ville, codes in ARRONDISSEMENTS.items():
        dep = codes[0][:2]
        for annee in FENETRE_RECENTE:
            if (ville, annee) not in publie.index:
                continue
            reference = publie.loc[(ville, annee)]
            mesures = {}
            for code in codes:
                dest = cache / "geo_dvf" / str(annee) / f"{code}.csv"
                url = GEO_DVF.format(annee=annee, dep=dep, code=code)
                if not dest.exists() and not prep_geo._telecharger(url, dest):
                    continue
                n, moyenne = _mutations_logement(dest)
                if n:
                    mesures[code] = (n, moyenne)
            total = sum(n for n, _ in mesures.values())
            if not total:
                print(f"   immo : aucune mutation géolocalisée pour {ville} en {annee}")
                continue
            # Prix de la ville reconstitué avec le MÊME estimateur que les arrondissements :
            # c'est la seule façon que le facteur de calage ne mesure que le biais de
            # méthode, et pas en plus la différence de composition entre les deux jeux.
            estime = sum(n * m for n, m in mesures.values()) / total
            k = float(reference["prixm2moyen"]) / estime
            for code, (n, moyenne) in mesures.items():
                lignes.append(
                    {
                        "code_commune": code,
                        "ventes": float(reference["ventes"]) * n / total,
                        "prixm2moyen": moyenne * k,
                        "annee": annee,
                    }
                )
    return pd.DataFrame(lignes)


def _agreger(brut: pd.DataFrame) -> pd.DataFrame:
    """Met les millésimes en commun : prix moyen pondéré par les ventes, ventes sommées."""
    poids = brut["ventes"] * brut["prixm2moyen"]
    g = brut.assign(poids=poids).groupby("code_commune").agg(
        poids=("poids", "sum"), ventes=("ventes", "sum")
    )
    return pd.DataFrame(
        {"pxm2": (g["poids"] / g["ventes"]).round(), "ventes": g["ventes"].round()}
    )


def construire_immo(cache: Path, socio_commune: pd.DataFrame) -> pd.DataFrame:
    """Une ligne par commune (et par arrondissement PLM) : prix moyen au m², nombre de
    ventes cumulées, fenêtre de millésimes lue, taux d'effort d'accession."""
    brut = _charger(cache)
    if brut.empty:
        return pd.DataFrame(
            columns=["code_commune", "pxm2", "ventes", "fenetre", "effort"]
        )
    brut = pd.concat([brut, _arrondissements(cache, brut)], ignore_index=True)

    # La fenêtre récente d'abord, la large en RATTRAPAGE des seules communes qu'elle laisse
    # sous le seuil : partout où trois ans suffisent, on n'ira pas chercher un prix plus
    # vieux pour le plaisir d'en avoir cinq ans.
    recent = _agreger(brut[brut["annee"].isin(FENETRE_RECENTE)])
    recent = recent[recent["ventes"] >= VENTES_MIN]
    recent["fenetre"] = len(FENETRE_RECENTE)
    large = _agreger(brut[brut["annee"].isin(FENETRE_LARGE)])
    large = large[(large["ventes"] >= VENTES_MIN) & ~large.index.isin(recent.index)]
    large["fenetre"] = len(FENETRE_LARGE)
    immo = pd.concat([recent, large])
    immo["ventes"] = immo["ventes"].astype(int)

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

    Le recensement ventile Paris, Lyon et Marseille par ARRONDISSEMENT : leur code INSEE
    agrégé (75056…) n'a donc pas de population et ne pèse pas dans la moyenne — c'est
    l'arrondissement qui pèse, depuis qu'il a un prix (`_arrondissements`). Avant lui, les
    trois villes manquaient purement et simplement à la moyenne France."""
    if immo.empty:
        return
    # dropna d'abord : le COG liste une commune fusionnée deux fois, la seconde sans
    # région (cf. prep_elections.rattachement_communal) — garder la ligne vide selon
    # l'ordre du fichier serait un hasard, pas une règle.
    reg = (
        communes.dropna(subset=["code_region"])
        .drop_duplicates("code_commune")
        .set_index("code_commune")["code_region"]
        .astype(str)
    )
    d = immo.set_index("code_commune")
    region = reg.reindex(d.index)
    # Les arrondissements ne sont pas des communes du COG : leur région est celle de leur
    # ville. Sans ce report ils compteraient dans la France et dans aucune région.
    for ville, codes in ARRONDISSEMENTS.items():
        if ville in reg.index:
            region.loc[region.index.isin(codes)] = reg.loc[ville]
    d["region"] = region.values
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
