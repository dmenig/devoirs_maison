"""« Voix à conquérir » 2027 par bureau de vote — reprise du modèle *elections_predictions*.

Le score « voix à conquérir » historique de l'atlas (`prep_bake._conquerir`) est un objectif
ARITHMÉTIQUE : exprimés estimés × 20 % − socle LFI. Il ne dit rien de ce qui est réellement
gagnable — une commune où la gauche plafonne depuis vingt ans y affiche le même « déficit »
qu'une commune remplie d'abstentionnistes de gauche. Ce module fabrique la mesure que le
dépôt **elections_predictions** publie à la place, et qui repose, elle, sur un modèle estimé :

    voix à conquérir(b) = abstentionnistes CONJONCTURELS(b) × γ(niveau de gauche prédit de b)

- **Abstentionnistes conjoncturels** = abstention prédite au scrutin projeté MOINS le
  plancher d'abstention du bureau (quantile bas de son abstention aux législatives passées).
  On ne remobilise pas l'abstentionniste chronique : la frange gagnable est celle qui revient
  voter quand la participation monte.
- **γ (gamma)** = part de gauche du *votant marginal*, lue sur la courbe participation→parts
  des législatives (elections_predictions, MOVABILITY.md §11/§14). Ce n'est PAS le partage
  des exprimés locaux (circulaire, et surestime de 17 points en bastion) : c'est la
  composition mesurée des électeurs qui rentrent quand la participation grimpe.

Ce que ce module ne fait PAS : ré-estimer le modèle. Le pipeline complet d'elections_
predictions (56 scrutins au bureau, recensement INSEE, sondages, ridge par bloc) n'est pas
rejouable ici — ses caches de données sont hors dépôt. On repart donc des **sorties du
modèle telles qu'elles sont publiées** dans son site statique :

| Ce qu'on lit | Fichier | Grain |
| --- | --- | --- |
| déviations 2027 par bloc + plancher d'abstention | `report_app/2027/data/communes.json` | commune |
| ancres nationales du scénario de référence | `report_app/2027/data/summary.json` | France |
| courbe γ des législatives | `report_app/2027/data/gamma_curve.json` | France |
| prédictions par bureau (démonstration 2024) | `report_app/data/bv/*.geojson` | bureau |

Le millésime 2027 n'est publié qu'à la COMMUNE ; la texture INTRA-communale (quel bureau
de la ville est plus abstentionniste, plus à gauche, à quel plancher) vient du millésime
2024, servi au bureau. On recolle les deux en **ancrant** : la déviation 2027 d'un bureau
est la déviation 2027 de sa commune, plus l'écart du bureau à sa commune lu sur 2024. Par
construction, la moyenne pondérée des bureaux d'une commune redonne la valeur 2027 servie
par elections_predictions ; seule la dispersion interne vient de 2024. Les deux millésimes
sortent du même modèle, sur les mêmes bureaux, avec les mêmes variables : ce qui change
entre eux est le décalage des lags, qui déplace le NIVEAU d'un bureau bien plus qu'il ne
réordonne les bureaux d'une même commune.

Le module produit aussi le **budget-temps du porte-à-porte** (aire du bureau, nombre de
portes, kilomètres, minutes par porte), dont la version 3 du site tire une rentabilité en
voix par heure de terrain militant. Voir « Budget-temps du porte-à-porte » plus bas.

    uv run --project ./hexagonal python prep_mobilisation.py

Sortie : `data_app/mobilisation_bv.parquet` (une ligne par bureau) + `data_app/
mobilisation_ref.json` (hypothèses et totaux nationaux, servis à la fiche du site).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

import prep_elections

RACINE = Path(__file__).parent
SOURCE_DEFAUT = RACINE / "elections_predictions"

# Nombre d'électeurs inscrits par PORTE (logement). Sert à convertir un nombre d'inscrits en
# nombre de portes à frapper. C'est une constante nationale : elle fixe l'UNITÉ du rendement
# (voix par kilomètre) mais ne change pas le classement des bureaux — la porte et le
# kilomètre se déduisent tous deux des inscrits, et la constante se simplifie au facteur
# √k près, identique partout. Ordre de grandeur INSEE : ~2,2 personnes par ménage, dont
# ~1,8 majeur·es, dont ~90 % d'inscrit·es.
ELECTEURS_PAR_PORTE = 1.6

# Constante de Beardwood-Halton-Hammersley : la plus courte tournée passant par N points
# tirés uniformément sur une aire A mesure ≈ β·√(A·N) quand N est grand. C'est exactement la
# longueur d'un porte-à-porte exhaustif — on ne frappe pas les portes au hasard, on suit la
# rue. Un modèle de « distance moyenne au plus proche voisin » (0,5/√densité) donnerait la
# même loi d'échelle à 40 % près ; on prend la constante de la tournée, qui est celle du
# geste réellement accompli.
BHH = 0.7124

# Projection métrique pour les aires. Lambert-93 couvre la métropole ; l'outre-mer y est
# fortement déformé, mais l'aire d'un bureau de vote y sert de dénominateur à un rendement
# qu'on ne prétend pas comparer d'un océan à l'autre (cf. les limites, DOCUMENTATION.md).
CRS_METRIQUE = 2154

# Garde-fou de densité : plafond de portes au km². Les contours de bureaux sont des Voronoï
# calculés sur des points d'adresse ; quelques centaines d'entre eux dégénèrent en éclats de
# quelques ares au milieu d'une ville dense (Marseille, Paris), ce qui donnait des bureaux à
# 670 000 portes/km² et une rentabilité de porte-à-porte cent fois supérieure à leurs voisins
# — un artefact de tessellation, pas un terrain. 20 000 portes/km² valent ~44 000 habitants
# au km² : au-dessus de l'arrondissement parisien le plus dense, donc au-dessus de tout ce
# qui existe réellement. Au-delà, on retient l'aire qu'implique ce plafond.
PORTES_KM2_MAX = 20_000

# La courbe γ est publiée par type de scrutin. 2027 = législatives (le scrutin que le modèle
# d'elections_predictions projette) : c'est la courbe de CE type qu'il faut lire.
COURBE = "Legislatives_T1"

# --- Budget-temps du porte-à-porte -----------------------------------------------------
# La ressource rare d'une campagne n'est pas le kilomètre, c'est l'HEURE de militant·e. Le
# coût d'une porte se décompose donc en deux termes : la conversation, constante, et le
# déplacement jusqu'à la porte suivante, qui dépend du terrain.
MINUTES_CONVERSATION = 15.0
# Déplacement : on ne choisit pas le mode, on le DÉDUIT. Marcher coûte le temps de marche ;
# rouler coûte le temps de route PLUS un forfait par porte (se garer, sortir, remonter en
# voiture). On retient le moins cher des deux — ce qui bascule tout seul de la marche à la
# voiture autour de 160 m entre deux portes : dans Paris on marche, dans une commune rurale
# où les maisons sont à 500 m les unes des autres on roule, sans qu'aucun seuil ait été posé
# à la main. Vitesses « porte à porte » (arrêts compris), pas vitesses de croisière.
KMH_MARCHE = 4.0
KMH_VOITURE = 25.0
MINUTES_ARRET_VOITURE = 2.0


# --------------------------------------------------------------------------------------
# Lecture des sorties d'elections_predictions
# --------------------------------------------------------------------------------------


def ancres(source: Path) -> dict:
    """Ancres nationales 2027 (scénario par défaut) + courbe γ + métadonnées de traçabilité.

    Le site 2027 d'elections_predictions laisse l'utilisateur bouger le niveau national au
    curseur ; le modèle ne fournit que les DÉVIATIONS. L'atlas, lui, sert une carte figée :
    on fige donc le niveau national sur le **scénario de référence** du site source (celui
    qu'il ouvre par défaut, ancré sur les sondages législatifs 2027), et on le dit."""
    resume = json.loads((source / "report_app/2027/data/summary.json").read_text())
    scenarios = {s["key"]: s for s in resume["scenarios"]}
    sc = scenarios[resume["default_scenario"]]
    courbe = json.loads((source / "report_app/2027/data/gamma_curve.json").read_text())[
        COURBE
    ]
    return {
        "scenario": sc["key"],
        "scenario_label": sc["label"],
        "nat": sc["means"],
        "courbe": courbe,
        "n_bv_modele": resume["n_bv"],
        "r2_gauche": resume["proof_2024"]["r2"]["G"],
        "r2_abstention": resume["proof_2024"]["r2"]["AB"],
    }


def gamma(courbe: list[list[float]], niveau_gauche: np.ndarray) -> np.ndarray:
    """γ(niveau de gauche prédit), interpolation linéaire sur la courbe publiée, plateaux
    aux extrémités — MIROIR de `gammaAt` (report_app/2027/js/config.js)."""
    xs = np.array([p[0] for p in courbe], float)
    ys = np.array([p[1] for p in courbe], float)
    return np.interp(niveau_gauche, xs, ys)


def communes_2027(source: Path) -> pd.DataFrame:
    """Couche 2027 servie par elections_predictions, par commune : déviations de bloc
    (points d'écart au national), plancher d'abstention agrégé, inscrits, nb de bureaux."""
    brut = json.loads((source / "report_app/2027/data/communes.json").read_text())
    df = pd.DataFrame(brut)[["code_commune", "dG", "dAB", "af", "ins", "nbv"]]
    df["code_commune"] = df["code_commune"].astype(str)
    return df.set_index("code_commune")


def communes_recodees(da: Path) -> set[str]:
    """Communes dont un code de bureau ne désigne pas le même bureau selon la source qui
    le porte — renumérotées ou redécoupées (cf. prep_elections). Fichier absent = aucune,
    le pipeline ayant pu tourner avant que la liste ne soit écrite."""
    f = da / prep_elections.FICHIER_RECODEES
    return set(json.loads(f.read_text())) if f.exists() else set()


def texture_bv(source: Path, recodees: set[str] | None = None) -> pd.DataFrame:
    """Texture intra-communale, lue sur la démonstration 2024 servie au bureau de vote.

    Les communes RECODÉES en sont écartées. elections_predictions porte le même faux
    appariement que l'atlas avant correction : ses codes sont ceux des contours (2022) mais
    les valeurs celles des bureaux de 2024 — à Bordeaux, 18 entrées sur 147 contours, et
    `i` y vaut 1 349 inscrits là où le bureau 33063_1101 de 2022 en comptait 686. Les
    retenir reviendrait à recoller la texture d'un bureau sur son voisin. Sans elles, ces
    bureaux portent exactement la valeur communale 2027 — le comportement que `_ancrer`
    réserve déjà aux bureaux sans texture, « sans texture inventée ».

    Trois grandeurs par bureau : la gauche prédite `pg`, l'abstention prédite `pa`, et le
    plancher d'abstention — que le fichier ne porte pas directement mais qu'on RETROUVE
    exactement depuis les conjoncturels `cj` qu'il publie : elections_predictions borne le
    plancher à la prédiction (`_abst_floor`), donc `cj = inscrits × (pa − plancher) / 100`
    sans troncature, et le plancher s'en déduit. `cj` étant servi arrondi à l'unité, le
    plancher reconstruit porte un bruit d'arrondi — sans effet ici, où l'on ne garde de ces
    trois grandeurs que leur ÉCART À LA MOYENNE COMMUNALE (le niveau vient de 2027)."""
    ecartees = recodees or set()
    lignes = []
    for f in sorted((source / "report_app/data/bv").glob("*.geojson")):
        for ft in json.loads(f.read_text())["features"]:
            p = ft["properties"]
            code = str(p["l"])
            if code.partition("_")[0] in ecartees:
                continue
            insc = max(1, int(p["i"]))
            lignes.append(
                (
                    code,
                    float(p["pg"]),
                    float(p["pa"]),
                    float(p["pa"]) - 100.0 * float(p["cj"]) / insc,
                )
            )
    df = pd.DataFrame(lignes, columns=["bureau", "t_G", "t_AB", "t_plancher"])
    # Un même bureau peut apparaître dans deux fichiers départementaux (contours limitrophes
    # des collectivités) : on garde la première occurrence, les valeurs étant identiques.
    return df.drop_duplicates("bureau").set_index("bureau")


# --------------------------------------------------------------------------------------
# Géométrie du porte-à-porte
# --------------------------------------------------------------------------------------


def aires_km2(da: Path) -> tuple[pd.Series, pd.Series]:
    """Aire des contours de bureaux et de communes, en km², projetées en Lambert-93.

    Les contours de bureaux sont des Voronoï approchés (data.gouv) : ils pavent la commune,
    y compris champs et forêts. L'aire d'un bureau rural est donc l'aire de son TERRITOIRE,
    pas celle de son bâti — le kilométrage de porte-à-porte qu'on en tire est majoré à la
    campagne. C'est une limite assumée, dite dans la fiche."""

    def _lire(dossier: Path, cle: str) -> pd.Series:
        parts = []
        for f in sorted(dossier.glob("*.geojson")):
            g = gpd.read_file(f)
            if g.empty:
                continue
            g = g.to_crs(CRS_METRIQUE)
            parts.append(
                pd.Series(g.geometry.area.to_numpy() / 1e6, index=g[cle].astype(str))
            )
        s = pd.concat(parts) if parts else pd.Series(dtype=float)
        return s[~s.index.duplicated()]

    return _lire(da / "geo" / "bv", "bureau"), _lire(da / "geo" / "communes", "code")


# --------------------------------------------------------------------------------------
# Assemblage
# --------------------------------------------------------------------------------------


def _ancrer(valeurs: pd.Series, poids: pd.Series, groupes: pd.Series) -> pd.Series:
    """Écart de chaque bureau à la moyenne (pondérée par les inscrits) de sa commune.

    Un bureau sans texture 2024 (créé depuis, ou hors contours du dépôt source) reçoit 0 :
    il porte exactement la valeur communale 2027, sans texture inventée."""
    m = valeurs.notna()
    somme_p = (poids * m).groupby(groupes).transform("sum")
    somme_v = (valeurs.fillna(0) * poids).groupby(groupes).transform("sum")
    moyenne = np.where(somme_p > 0, somme_v / somme_p.replace(0, np.nan), 0.0)
    return pd.Series(np.where(m, valeurs.fillna(0) - moyenne, 0.0), index=valeurs.index)


def construire(source: Path, da: Path) -> tuple[pd.DataFrame, dict]:
    ref = ancres(source)
    nat = ref["nat"]
    com27 = communes_2027(source)
    recodees = communes_recodees(da)
    tex = texture_bv(source, recodees)
    if recodees:
        print(
            f"  ↻ texture 2024 écartée dans {len(recodees)} commune(s) recodée(s) : "
            "leurs bureaux portent la valeur communale 2027"
        )

    # Univers des bureaux = celui de l'atlas (registre européennes 2024), pas celui du
    # modèle : c'est lui que la carte sait dessiner et joindre.
    rb = pd.read_parquet(
        da / "resultats_bureau.parquet", columns=["code", "scrutin", "inscrits"]
    )
    rb = rb[rb["scrutin"] == "2024-europeenne"]
    df = pd.DataFrame({"bureau": rb["code"].astype(str), "insc": rb["inscrits"]})
    df = df[df["insc"].notna() & (df["insc"] > 0)].drop_duplicates("bureau")
    df["code_commune"] = df["bureau"].str.slice(0, 5)
    df = df[df["code_commune"].isin(com27.index)].set_index("bureau")
    df["insc"] = df["insc"].astype(float)

    for c in ("t_G", "t_AB", "t_plancher"):
        df[c] = tex[c].reindex(df.index)
    ecart = {
        c: _ancrer(df[c], df["insc"], df["code_commune"])
        for c in ("t_G", "t_AB", "t_plancher")
    }

    com = com27.reindex(df["code_commune"]).set_index(df.index)
    df["pG"] = np.clip(nat["G"] + com["dG"] + ecart["t_G"], 0, 100)
    df["pAB"] = np.clip(nat["AB"] + com["dAB"] + ecart["t_AB"], 0, 100)
    # Le plancher reste borné par l'abstention prédite : un « conjoncturel » négatif n'a pas
    # de sens, et un plancher au-dessus de la prédiction voudrait dire que le bureau n'a
    # jamais fait aussi peu — auquel cas il n'y a rien de conjoncturel à aller chercher.
    df["plancher"] = np.clip(com["af"] + ecart["t_plancher"], 0, df["pAB"])
    df["conj"] = df["insc"] * (df["pAB"] - df["plancher"]) / 100.0
    df["gamma"] = gamma(ref["courbe"], df["pG"].to_numpy())
    df["mob"] = df["conj"] * df["gamma"] / 100.0

    aire_bv, aire_com = aires_km2(da)
    a = aire_bv.reindex(df.index)
    # Bureau sans contour : on lui prête l'aire moyenne des bureaux de sa commune (aire
    # communale ÷ nombre de bureaux), sinon il sortirait du calcul de rendement et les
    # sommes départementales ne boucleraient plus sur les sommes communales.
    nbv = pd.Series(com27["nbv"].reindex(df["code_commune"]).to_numpy(), index=df.index)
    aire_c = pd.Series(aire_com.reindex(df["code_commune"]).to_numpy(), index=df.index)
    repli = aire_c / nbv.fillna(1).clip(lower=1)
    df["portes"] = df["insc"] / ELECTEURS_PAR_PORTE
    df["aire_km2"] = np.maximum(a.fillna(repli), df["portes"] / PORTES_KM2_MAX)
    # Aire inconnue (ni contour de bureau, ni contour de commune : outre-mer sans contours,
    # Français·es de l'étranger) → PAS de kilométrage, donc pas de rendement. `0` aurait
    # fabriqué une rentabilité infinie et placé ces bureaux en tête du classement.
    df["km"] = BHH * np.sqrt(df["aire_km2"] * df["portes"])

    # Pas moyen entre deux portes, puis coût en MINUTES d'une porte : conversation +
    # déplacement au mode le moins coûteux. `pas` (donc tout le budget-temps) est NaN quand
    # l'aire est inconnue : ces bureaux sortent du rendement, ils n'y entrent pas à 0.
    df["pas_km"] = df["km"] / df["portes"]
    marche = 60.0 * df["pas_km"] / KMH_MARCHE
    voiture = 60.0 * df["pas_km"] / KMH_VOITURE + MINUTES_ARRET_VOITURE
    df["min_trajet"] = np.minimum(marche, voiture)
    df["voiture"] = voiture < marche
    df["min_porte"] = MINUTES_CONVERSATION + df["min_trajet"]
    df["heures"] = df["portes"] * df["min_porte"] / 60.0

    df = df.drop(columns=["t_G", "t_AB", "t_plancher"]).reset_index()
    metropole = ~df["code_commune"].str.startswith(("97", "98", "99")) & ~df[
        "code_commune"
    ].str.match(r"^Z")
    ref |= {
        "electeurs_par_porte": ELECTEURS_PAR_PORTE,
        "bhh": BHH,
        "portes_km2_max": PORTES_KM2_MAX,
        "minutes_conversation": MINUTES_CONVERSATION,
        "kmh_marche": KMH_MARCHE,
        "kmh_voiture": KMH_VOITURE,
        "minutes_arret_voiture": MINUTES_ARRET_VOITURE,
        "pas_bascule_m": round(
            1000 * MINUTES_ARRET_VOITURE / (60 / KMH_MARCHE - 60 / KMH_VOITURE)
        ),
        "n_bv": len(df),
        "n_bv_texture": int(df["bureau"].isin(tex.index).sum()),
        "n_bv_km": int(df["heures"].notna().sum()),
        "mob_france": int(df["mob"].sum()),
        "mob_metropole": int(df.loc[metropole, "mob"].sum()),
        "conj_france": int(df["conj"].sum()),
        "insc_france": int(df["insc"].sum()),
        "km_france": round(float(df["km"].sum())),
        "portes_france": int(df["portes"].sum()),
        "heures_france": int(df["heures"].sum()),
        "part_voiture": round(
            100
            * float(df.loc[df["voiture"].fillna(False), "portes"].sum())
            / float(df.loc[df["heures"].notna(), "portes"].sum()),
            1,
        ),
        "rendement_france": round(
            float(df.loc[df["heures"].notna(), "mob"].sum() / df["heures"].sum()), 3
        ),
        "gamma_moyen": round(
            float(np.average(df["gamma"], weights=df["conj"].clip(lower=1e-9))), 1
        ),
    }
    return df, ref


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--source",
        type=Path,
        default=SOURCE_DEFAUT,
        help="racine du dépôt elections_predictions",
    )
    p.add_argument("--data-app", type=Path, default=RACINE / "data_app")
    args = p.parse_args()
    if not (args.source / "report_app/2027/data/communes.json").exists():
        raise SystemExit(
            f"{args.source} : sorties 2027 d'elections_predictions introuvables "
            "(cloner le dépôt ou pointer --source dessus)"
        )

    df, ref = construire(args.source, args.data_app)
    df.to_parquet(args.data_app / "mobilisation_bv.parquet", index=False)
    (args.data_app / "mobilisation_ref.json").write_text(
        json.dumps(ref, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(
        f"  ✓ mobilisation 2027 : {ref['n_bv']} bureaux, "
        f"{ref['mob_france']:,} voix à conquérir, γ moyen {ref['gamma_moyen']} %, "
        f"{ref['heures_france']:,} h de porte-à-porte "
        f"({ref['rendement_france']} voix/h, {ref['part_voiture']} % des portes en voiture)".replace(
            ",", " "
        )
    )


if __name__ == "__main__":
    main()
