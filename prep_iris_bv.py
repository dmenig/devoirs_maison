"""Résultats électoraux ESTIMÉS à la maille IRIS, par intersection des contours IRIS
(IGN) et des contours de bureaux de vote (Voronoï data.gouv).

L'IRIS n'est pas une maille électorale : le ministère ne publie rien à ce niveau. On
répartit donc les voix de chaque bureau entre les IRIS qu'il recoupe, au prorata de la
POPULATION de chaque intersection (aire de l'intersection × densité de population de
l'IRIS, recensement 2021) plutôt qu'au prorata de la seule surface — un bureau qui
déborde sur une zone industrielle ou un parc n'y envoie pas d'électeurs.

Les estimations sont ensuite RECALÉES commune par commune sur les résultats communaux
réels : la somme des IRIS d'une commune redonne exactement son résultat, ce qui rattrape
aussi les bureaux dépourvus de contour (leurs électeurs sont redistribués au prorata).

Cela reste une estimation : les contours de bureaux sont eux-mêmes approchés, et rien ne
garantit que les électeurs d'un bureau se répartissent comme sa population résidente.

DEUX GARDE-FOUS, l'un géométrique et l'autre électoral :

- `COUV_MIN` — un IRIS n'est estimé que si les contours de bureaux le RECOUVRENT quasi
  intégralement. En dessous, la répartition porterait sur un morceau d'IRIS et donnerait
  un chiffre faux sans le dire.
- `ELEC_MIN` — le recalage communal redistribue au prorata les électeurs des bureaux
  DÉPOURVUS de contour. Tant qu'ils sont marginaux, c'est un rattrapage ; quand ils font
  l'essentiel de la commune (Bordeaux : 12 % seulement de son électorat est localisable),
  le « résultat estimé par intersection » n'est plus qu'un résultat communal étalé sur la
  population. On écarte alors la commune, scrutin par scrutin.

Dans les deux cas la zone écartée n'a AUCUNE donnée électorale : pas de chiffre plutôt
qu'un chiffre faux. Le rapport de couverture est conservé à côté des résultats.
"""

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

import nuances

LAMBERT = 2154  # projection métrique (les IRIS s'arrêtent à la métropole)
# Paris/Lyon/Marseille : l'IRIS porte le code d'ARRONDISSEMENT (751xx, 6938x, 132xx) là où
# le bureau porte celui de la commune INSEE agrégée — sans ce rabattement, aucun couple
# (IRIS, bureau) ne se rejoint dans ces trois villes.
PLM = {"751": "75056", "6938": "69123", "132": "13055"}
# Sous ce poids, l'intersection est un artefact de tessellation (sliver de quelques m²)
# et non un morceau de bureau : on l'écarte avant de renormaliser.
POIDS_MIN = 0.002
# Part de l'aire d'un IRIS que les contours de bureaux doivent recouvrir pour que
# l'estimation soit servie. Les deux sources (IGN / Voronoï data.gouv) ne partagent pas
# leurs frontières au mètre près : on tolère la marge de non-recouvrement, pas le trou.
COUV_MIN = 0.99
# Part de l'électorat d'une commune qui doit être portée par des bureaux effectivement
# localisés (contour présent et recoupant ses quartiers) pour que le recalage reste un
# rattrapage plutôt qu'une extrapolation. Sous ce seuil, la commune n'est pas estimée.
ELEC_MIN = 0.90

CNT = ["inscrits", "votants", "exprimes", "lfi_voix", "gauche_voix"]
PCT = [f"b6_{b}" for b in nuances.BLOC6_ORDRE] + [
    "tri_social_ecologique",
    "tri_liberal_progressiste",
    "tri_national_patriote",
    "tri_autres",
]
META = ["scrutin_libelle", "annee", "type", "tour"]


def commune_de_liris(codes: pd.Series) -> pd.Series:
    com = codes.str[:5]
    for prefixe, agg in PLM.items():
        com = com.mask(codes.str.startswith(prefixe), agg)
    return com


def _valide(g: gpd.GeoSeries) -> gpd.GeoSeries:
    mauvais = ~g.is_valid
    if mauvais.any():
        g = g.copy()
        g.loc[mauvais] = g.loc[mauvais].make_valid()
    return g


def _densites(iris: gpd.GeoDataFrame, pop: pd.Series) -> np.ndarray:
    """Densité de population par IRIS (hab/m²). Un IRIS sans population recensée hérite
    de la densité médiane de sa commune, à défaut de celle du département : le mettre à
    zéro le priverait de tout électeur alors qu'il en abrite."""
    aire = np.maximum(iris.geometry.area.values, 1.0)
    d = pd.Series(pop.reindex(iris["code_iris"]).values / aire).where(lambda s: s > 0)
    d = d.fillna(d.groupby(iris["com"].values).transform("median"))
    return d.fillna(d.median()).fillna(1.0).values


def poids_dep(
    iris_f: Path, bv_f: Path, pop: pd.Series
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Renvoie ({code_iris, bureau, w}, {code_iris, couv}) : `w` = part des électeurs du
    bureau attribuée à l'IRIS, `couv` = part de l'aire de l'IRIS effectivement recouverte
    par des contours de bureaux (le garde-fou COUV_MIN).
    Les couples sont restreints à une même commune (les contours des deux sources ne
    coïncident pas au millimètre : sans ça, un bureau déborderait sur la commune voisine)."""
    iris = gpd.read_file(iris_f).to_crs(LAMBERT).reset_index(drop=True)
    bv = gpd.read_file(bv_f).to_crs(LAMBERT).reset_index(drop=True)
    iris["geometry"] = _valide(iris.geometry)
    bv["geometry"] = _valide(bv.geometry)
    iris["com"] = commune_de_liris(iris["code_iris"].astype(str))
    bv["com"] = bv["code_commune"].astype(str).str.zfill(5)

    paires = gpd.sjoin(
        iris[["com", "geometry"]].rename(columns={"com": "com_i"}),
        bv[["com", "geometry"]].rename(columns={"com": "com_b"}),
        predicate="intersects",
    )
    paires = paires[paires["com_i"] == paires["com_b"]]
    vide = pd.DataFrame(columns=["code_iris", "bureau", "w"])
    couv_nulle = pd.DataFrame({"code_iris": iris["code_iris"], "couv": 0.0})
    if paires.empty:
        return vide, couv_nulle
    pi, pb = paires.index.values, paires["index_right"].values
    aire = shapely.area(
        shapely.intersection(
            np.asarray(iris.geometry.values)[pi], np.asarray(bv.geometry.values)[pb]
        )
    )
    out = pd.DataFrame(
        {
            "code_iris": iris["code_iris"].values[pi],
            "bureau": bv["bureau"].values[pb],
            "aire": aire,
            "w": aire * _densites(iris, pop)[pi],
        }
    )
    # Couverture mesurée sur les aires BRUTES, avant pondération par la densité : c'est une
    # question de géométrie (le contour existe-t-il ?), pas de peuplement.
    couv = (
        out.groupby("code_iris")["aire"].sum()
        / iris.set_index("code_iris").geometry.area
    )
    couv = couv.reindex(iris["code_iris"]).fillna(0.0).clip(upper=1.0)
    out = out[out["w"] > 0].drop(columns="aire")
    out["w"] /= out.groupby("bureau")["w"].transform("sum")
    out = out[out["w"] >= POIDS_MIN].copy()
    out["w"] /= out.groupby("bureau")["w"].transform("sum")
    return out, couv.rename("couv").reset_index()


def _en_comptes(df: pd.DataFrame) -> pd.DataFrame:
    """Les blocs sont publiés en % des inscrits : on repasse en voix pour pouvoir les
    répartir et les resommer (un pourcentage ne s'additionne pas)."""
    out = df[["code", "scrutin", *CNT]].astype({c: float for c in CNT}).copy()
    ins = df["inscrits"].astype(float)
    for c in PCT:
        out[c] = df[c].astype(float) * ins / 100.0
    return out


def _recaler(g: pd.DataFrame, com: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    """Recale les IRIS d'une commune sur le résultat communal réel, colonne par colonne :
    la somme des estimations IRIS redonne alors exactement le résultat de la commune.

    Renvoie aussi, par ligne, la PART de l'électorat communal réellement portée par des
    bureaux localisés (le complément est ce que le recalage extrapole) : c'est la mesure
    que `ELEC_MIN` arbitre."""
    cols = CNT + PCT
    somme = g.groupby(["com", "scrutin"])[cols].transform("sum")
    cible = (
        _en_comptes(com)
        .set_index(["code", "scrutin"])[cols]
        .reindex(pd.MultiIndex.from_arrays([g["com"], g["scrutin"]]))
    )
    facteur = np.divide(
        cible.values,
        somme.values,
        out=np.ones_like(somme.values, dtype=float),
        where=somme.values > 0,
    )
    facteur = np.where(np.isfinite(facteur), facteur, 1.0)
    part = np.divide(
        somme["inscrits"].values,
        cible["inscrits"].values,
        out=np.zeros(len(g)),
        where=np.nan_to_num(cible["inscrits"].values) > 0,
    )
    g[cols] = g[cols].values * facteur
    return g, part


def resultats_iris(
    bvres: pd.DataFrame,
    poids: pd.DataFrame,
    comres: pd.DataFrame,
    servis: set[str],
) -> pd.DataFrame:
    """Table longue (une ligne par IRIS × scrutin), au schéma des resultats_<niveau>.

    `servis` = IRIS assez recouverts pour être publiés. Les autres participent quand même
    à la répartition (les électeurs de leurs bureaux doivent aller quelque part et le
    recalage communal en dépend) mais leurs lignes sont écartées à la sortie."""
    df = _en_comptes(bvres).merge(poids, left_on="code", right_on="bureau")
    cols = CNT + PCT
    df[cols] = df[cols].values * df["w"].values[:, None]
    g = df.groupby(["code_iris", "scrutin"], as_index=False)[cols].sum()
    g["com"] = commune_de_liris(g["code_iris"])
    g, part = _recaler(g, comres)
    assez = part >= ELEC_MIN
    perdues = sorted(set(g.loc[~assez, "com"]))
    if perdues:
        print(
            f"  ⚠ électorat localisable < {ELEC_MIN:.0%} : {len(perdues)} communes écartées "
            f"(bureaux sans contour) — ex. {perdues[:5]}"
        )
    g = g[assez & (g["inscrits"] >= 1) & g["code_iris"].isin(servis)]

    ins = g["inscrits"]
    out = pd.DataFrame(
        {"niveau": "iris", "code": g["code_iris"], "scrutin": g["scrutin"]}
    )
    for c in CNT:
        out[c] = g[c].round().astype(int)
    out["participation"] = (100 * g["votants"] / ins).round(2)
    out["abstention"] = (100 - out["participation"]).round(2)
    for c in PCT:
        out[c] = (100 * g[c] / ins).round(2)
    out["lfi_pct"] = (100 * g["lfi_voix"] / ins).round(2)
    out["gauche_pct"] = (100 * g["gauche_voix"] / ins).round(2)
    meta = bvres[["scrutin", *META]].drop_duplicates("scrutin")
    return out.merge(meta, on="scrutin", how="left")


def construire(data_app: Path) -> pd.DataFrame:
    geo = data_app / "geo"
    pop = (
        pd.read_parquet(data_app / "pop_iris.parquet")
        .set_index("code_iris")["pop"]
        .astype(float)
    )
    poids, couvs = [], []
    for iris_f in sorted((geo / "iris").glob("*.geojson")):
        bv_f = geo / "bv" / iris_f.name
        if not bv_f.exists():
            # Département sans contours de bureaux : aucun IRIS n'y est estimable.
            codes = gpd.read_file(iris_f, columns=["code_iris"], ignore_geometry=True)
            couvs.append(pd.DataFrame({"code_iris": codes["code_iris"], "couv": 0.0}))
            print(f"  {iris_f.stem}: contours BV absents — {len(codes)} IRIS écartés")
            continue
        p, c = poids_dep(iris_f, bv_f, pop)
        poids.append(p)
        couvs.append(c)
        ko = int((c["couv"] < COUV_MIN).sum())
        print(f"  {iris_f.stem}: {len(c)} IRIS, {len(p)} couples, {ko} sous-recouverts")
    poids = pd.concat(poids, ignore_index=True)
    couv = pd.concat(couvs, ignore_index=True)
    poids.to_parquet(data_app / "iris_bv_poids.parquet", index=False)
    couv.to_parquet(data_app / "iris_bv_couverture.parquet", index=False)
    servis = set(couv.loc[couv["couv"] >= COUV_MIN, "code_iris"])
    ecartes = len(couv) - len(servis)
    print(
        f"  ⚠ couverture BV insuffisante (< {COUV_MIN:.0%}) : {ecartes}/{len(couv)} IRIS "
        f"écartés — aucune donnée électorale ne sera servie pour eux"
    )

    bvres = pd.read_parquet(data_app / "resultats_bureau.parquet")
    comres = pd.read_parquet(data_app / "resultats_commune.parquet")
    res = resultats_iris(bvres, poids, comres, servis)
    res.to_parquet(data_app / "resultats_iris.parquet", index=False)
    return res


def main() -> None:
    res = construire(Path(__file__).parent / "data_app")
    print(
        f"✓ resultats_iris : {res['code'].nunique()} IRIS × {res['scrutin'].nunique()} scrutins"
    )


if __name__ == "__main__":
    main()
