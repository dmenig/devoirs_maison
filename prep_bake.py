"""Produit des fichiers de valeurs compacts (JSON, {code: {indicateur: valeur}}) pour
le rendu côté client (carte Leaflet). La géométrie reste dans les GeoJSON ; ces JSON
de valeurs sont joints par code dans le navigateur.

On expose un jeu d'indicateurs ciblé (scrutins à couverture nationale + réservoirs),
suffisant pour l'usage militant et léger à charger."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import geopandas as gpd
import numpy as np
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
# Tableau de recomposition (slide 23) : tous les scrutins disponibles, 6 blocs +
# abstention + les suffrages que le ministère ne ventile par aucune liste. Cette dernière
# colonne est ce qui manquait pour que la barre boucle — 19,1 points en France aux
# municipales 2026 — et sans elle un lecteur ne pouvait pas distinguer « ce bloc ne fait
# rien ici » de « ce bloc n'est pas mesuré ici ». Tout est en % des INSCRITS, si bien que
# blocs + abstention + non ventilé + blancs/nuls = 100 % à toutes les échelles.
BLOCS_RECOMPO = [f"b6_{b}" for b in nuances.BLOC6_ORDRE] + ["abstention", "non_ventile"]
ORDRE_TYPE = {  # repli quand la date du scrutin n'est pas connue (cf. DATE_1ER_TOUR)
    "presidentielle": 0,
    "legislatives": 1,
    "europeenne": 2,
    "municipales": 3,
    "conseils-PLM": 3,
    "departementales": 4,
    "regionales": 5,
    "referendum": 6,
}
# La frise de recomposition se lit comme une CHRONOLOGIE : un rang par type ne suffit
# pas. Il plaçait les européennes 2024 (9 juin) après les législatives (30 juin) et les
# municipales 2014 (23 mars) après les européennes (25 mai) — soit l'évolution politique
# lue à l'envers à deux endroits. On date donc le 1er tour de chaque scrutin ; les deux
# tours d'un même scrutin restent côte à côte (on trie sur la date du 1er tour, pas sur
# celle du tour affiché), et un scrutin non listé retombe sur ORDRE_TYPE.
DATE_1ER_TOUR = {  # (année, type) -> mois-jour du 1er tour
    (2012, "presidentielle"): "04-22",
    (2014, "municipales"): "03-23",
    (2014, "europeenne"): "05-25",
    (2017, "presidentielle"): "04-23",
    (2017, "legislatives"): "06-11",
    (2019, "europeenne"): "05-26",
    (2020, "municipales"): "03-15",
    (2021, "departementales"): "06-20",
    (2021, "regionales"): "06-20",
    (2022, "presidentielle"): "04-10",
    (2022, "legislatives"): "06-12",
    (2024, "europeenne"): "06-09",
    (2024, "legislatives"): "06-30",
    (2026, "municipales"): "03-15",
    (2026, "conseils-PLM"): "03-15",
}
TYPE_COURT = {
    "presidentielle": "Prés",
    "legislatives": "Lég",
    "europeenne": "Eur",
    "municipales": "Mun",
    "conseils-PLM": "PLM",
    "departementales": "Dép",
    "regionales": "Rég",
    "referendum": "Réf",
}
# réservoirs : clé -> (métrique, scrutin départ, scrutin arrivée). Report LFI, taux de perte
# et différentiel de participation sont recalculés côté carte pour la paire choisie (voix
# bakées lfiv_*/gv_* + part_*) ; seul le stock d'abstention, indépendant d'une paire, est baké.
RESERVOIRS = {
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
    m["jour"] = [
        DATE_1ER_TOUR.get((int(a), t), f"{int(o):02d}-99")
        for a, t, o in zip(m["annee"], m["type"], m["o"])
    ]
    m = m.sort_values(["annee", "jour", "o", "tour"])
    ordre, meta = [], []
    for _, r in m.iterrows():
        tour = r["tour"]
        if pd.isna(
            tour
        ):  # tour parfois porté par le suffixe de clé (ex. 2026-conseils-PLM-2)
            suf = re.search(r"-(\d+)$", str(r["scrutin"]))
            tour = int(suf.group(1)) if suf else None
        court = f"{TYPE_COURT.get(r['type'], r['type'][:3])}{int(r['annee']) % 100:02d}"
        if pd.notna(tour):
            court += f"·{int(tour)}"
        ordre.append(r["scrutin"])
        meta.append({"c": court, "l": r["scrutin_libelle"]})
    return ordre, meta


def scrutins_fiables(df: pd.DataFrame) -> list[str]:
    """Garde-fou : ne garde que les scrutins dont blocs + abstention + non ventilé
    bouclent ~100 % (le reste étant les bulletins blancs et nuls). Les fichiers
    multi-tours sont désormais scindés par tour en amont (prep_elections), donc plus
    aucun ne double-compte ; ce filtre reste un filet de sécurité."""
    sommes = df.groupby("scrutin")[BLOCS_RECOMPO].first().sum(axis=1)
    return sommes[(sommes >= 50) & (sommes <= 105)].index.tolist()


def _recompo_par_code(
    df: pd.DataFrame, ordre: list[str], fiables: set[str]
) -> dict[str, dict[str, list]]:
    """Par code : {position scrutin -> [6 blocs, abstention, non ventilé]} (dict creux,
    % inscrits). Un bloc à None se lit « non mesuré ici », jamais « zéro voix »."""
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


def _codes_avec_contour(geo_dir: Path, dep: str, cle: str) -> set[str]:
    """Codes qui ont un contour dans ce département, pour les mailles infra-communales.

    La carte joint les valeurs aux polygones PAR CE CODE : tout ce qui n'a pas de
    contour est du poids mort intégral, jamais affichable. Bureaux de vote : 12 820
    entrées sur 81 431 (16 %) — numérotations abandonnées que seuls les vieux scrutins
    connaissent (Tours traînait 79 clés d'avant 2017, sans un seul indicateur courant),
    bureaux créés après le millésime des contours, et 15 départements sans contours du
    tout (outre-mer, Français de l'étranger). Quartiers : 1 960 entrées sur 50 442
    (3,9 %), dont les quatre départements d'outre-mer, que les contours IRIS de l'IGN
    ne couvrent pas."""
    f = geo_dir / f"{dep}.geojson"
    if not f.exists():
        return set()
    return set(gpd.read_file(f, ignore_geometry=True)[cle].astype(str))


def _filtrer_sur_contours(
    vals: dict[str, dict], geo_dir: Path, cle: str
) -> dict[str, dict]:
    contours: dict[str, set[str]] = {}
    garde: dict[str, dict] = {}
    for code, v in vals.items():
        dep = _dep(code)
        if dep not in contours:
            contours[dep] = _codes_avec_contour(geo_dir, dep, cle)
        if code in contours[dep]:
            garde[code] = v
    return garde


def _ecrire(nom: str, data: dict) -> None:
    (OUT / f"{nom}.json").write_text(_dumps(data))


def _dep(code: str) -> str:
    return code[:3] if code.startswith("97") else code[:2]


def _ecrire_par_dep(nom: str, vals: dict[str, dict]) -> int:
    """Un fichier par département : le client ne télécharge que la zone qu'il ouvre.
    Indispensable à l'IRIS depuis qu'il porte aussi l'électoral (le fichier national
    dépasserait les 70 Mo pour l'affichage d'un seul quartier)."""
    (OUT / nom).mkdir(exist_ok=True)
    par_dep: dict[str, dict] = {}
    for code, v in vals.items():
        par_dep.setdefault(_dep(code), {})[code] = v
    for dep, d in par_dep.items():
        (OUT / nom / f"{dep}.json").write_text(_dumps(d))
    return len(par_dep)


# FILOSOFI -> clés client compactes. Niveau de vie (revenu disponible par UC), seuil de
# pauvreté, et la dispersion (quartiles / déciles / interdécile / Gini) que la prez
# demande de regarder (slide « niveau de vie des ménages »). IRIS = jeu complet ;
# commune = revenu/pauvreté + quartiles (moyenne de ses IRIS).
_SOCIO_KEYS = {
    "revenu_median": ("rev", 0),
    "taux_pauvrete": ("pauv", 1),
    # part de la population que la moyenne de référence couvre réellement (cf.
    # prep_socio.construire_references) : sans elle, la fiche présentait « France 17,5 % »
    # de pauvreté comme le taux national, alors qu'il est de ≈ 14,5 %.
    "revenu_median_couverture": ("revcouv", 1),
    "taux_pauvrete_couverture": ("pauvcouv", 1),
    "q1": ("q1", 0),
    "q3": ("q3", 0),
    "d1": ("d1", 0),
    "d9": ("d9", 0),
    "rapport_interdecile": ("ridec", 1),
    "gini": ("gini", 3),
    # recensement 2021 : âge, CSP, chômage, diplômes, logement (% — déterminants du vote)
    "age_0014": ("a014", 1),
    "age_1529": ("a1529", 1),
    "age_3044": ("a3044", 1),
    "age_4559": ("a4559", 1),
    "age_6074": ("a6074", 1),
    "age_75p": ("a75", 1),
    "csp_cadres": ("cad", 1),
    "csp_interm": ("pint", 1),
    "csp_employes": ("emp", 1),
    "csp_ouvriers": ("ouv", 1),
    "csp_retraites": ("ret", 1),
    "taux_chomage": ("chom", 1),
    "part_sans_diplome": ("dipl0", 1),
    "part_sup": ("diplsup", 1),
    "part_proprietaires": ("logprop", 1),
    "part_locataires": ("logloc", 1),
    "part_hlm": ("loghlm", 1),
    # logement : prix de marché (DVF) et effort d'accession — cf. prep_immo.py. Publiés à
    # la COMMUNE seulement ; les quartiers en héritent (valeur communale, dite comme telle).
    "pxm2": ("pxm2", 0),
    "effort": ("effort", 1),
    "ventes": ("nvte", 0),
}


# Paris/Lyon/Marseille : le recensement (admin_commune) est ventilé par arrondissement
# (751xx / 6938x / 132xx) alors que l'électoral (inscrits) porte sur le code INSEE agrégé
# (75056 / 69123 / 13055). Sans réagrégation, ces trois villes — les plus densément
# militantes — n'auraient ni population ni estimation de non-/mal-inscription dans le Carnet.
PLM_AGG = {"75056": "751", "69123": "6938", "13055": "132"}


def _commune_de_iris(code_iris: str) -> str:
    """Commune d'un IRIS. À Paris/Lyon/Marseille les IRIS portent le code de
    l'arrondissement (751xx / 6938x / 132xx) : on remonte au code INSEE de la ville, seul
    présent dans les jeux communaux."""
    for agg, prefixe in PLM_AGG.items():
        if code_iris.startswith(prefixe):
            return agg
    return code_iris[:5]


def _socio_champs(row: dict) -> dict:
    out: dict = {}
    for col, (cle, dec) in _SOCIO_KEYS.items():
        v = row.get(col)
        if v is not None and pd.notna(v):
            out[cle] = round(float(v), dec) if dec else round(float(v))
    return out


SCRUTIN_REGISTRE = (
    "2024-europeenne"  # registre de référence (taille du corps électoral)
)


def _agreger_plm(adm: pd.DataFrame) -> pd.DataFrame:
    """Reconstitue une ligne recensement par ville PLM : population sommée, parts (âge,
    logement, migration…) pondérées par la population des arrondissements."""
    codes = adm.index.astype(str)
    num_cols = [
        c for c in adm.columns if c != "pop" and pd.api.types.is_numeric_dtype(adm[c])
    ]
    lignes: dict[str, dict] = {}
    for agg, prefixe in PLM_AGG.items():
        sub = adm[codes.str.startswith(prefixe)]
        if sub.empty:
            continue
        poids = sub["pop"].astype(float)
        total = poids.sum()
        ligne: dict[str, float | None] = {"pop": float(total)}
        for c in num_cols:
            vals = sub[c].astype(float)
            m = vals.notna() & poids.notna()
            w = poids[m].sum()
            ligne[c] = float((vals[m] * poids[m]).sum() / w) if w else None
        lignes[agg] = ligne
    return pd.DataFrame.from_dict(lignes, orient="index")


def _baker_carnet(com: dict[str, dict], rc: pd.DataFrame, da: Path) -> None:
    """Champs du Carnet de campagne (chantier 3) : inscrits (registre), population, et
    estimations de non-/mal-inscription — les réservoirs prioritaires :
    - non-inscription ≈ population majeure (recensement) − inscrits (borne haute : inclut
      les résident·es non éligibles) ;
    - mal-inscription ≈ population majeure × part des résident·es arrivé·es d'une autre
      commune depuis < 1 an (proxy IRAN : récemment installé·es donc souvent mal-inscrit·es).

    La non-inscription n'est PAS servie quand la population majeure estimée est inférieure
    aux inscrits : la soustraction n'y mesure plus rien. C'est le cas dans une commune sur
    deux (17 539 sur 34 906) — le recensement et la liste électorale ne comptent pas les
    mêmes gens (résidences secondaires, inscription au village d'origine), et l'écart
    dépasse 20 % des inscrits dans 1 345 communes. Un plancher à zéro affichait alors
    « ≈ 0 non-inscrit·es » sous « Priorité n°1 · le plus gros réservoir » : un chiffre
    présenté comme mesuré là où l'estimateur est muet. Absent = « on ne sait pas »."""
    insc = rc[rc["scrutin"] == SCRUTIN_REGISTRE].groupby("code")["inscrits"].first()
    for code, v in insc.items():
        if pd.notna(v):
            com.setdefault(str(code), {})["insc"] = int(v)
    f = da / "admin_commune.parquet"
    if not f.exists():
        return
    adm = pd.read_parquet(f).set_index("code_commune")
    adm = pd.concat([adm.drop(index="FRANCE", errors="ignore"), _agreger_plm(adm)])
    for code, row in adm.iterrows():
        o = com.get(str(code))
        if o is None or pd.isna(row.get("pop")):
            continue
        pop = float(row["pop"])
        o["pop"] = int(pop)
        # NaN est « truthy » en Python : `x or 0` laisserait passer un NaN et ferait
        # échouer round() plus bas. On coerce donc explicitement les champs absents à 0.
        num = lambda k: (lambda v: 0.0 if v is None or pd.isna(v) else float(v))(  # noqa: E731
            row.get(k)
        )
        # population majeure ≈ 15 ans et + moins les 15-17 ans (≈ 1/5 de la tranche 15-29)
        part_15p = sum(num(f"age{s}_{i}") for s in ("H", "F") for i in range(1, 6))
        part_1529 = num("ageH_1") + num("ageF_1")
        pop_majeur = pop * (part_15p - 0.2 * part_1529) / 100
        ins = o.get("insc")
        if ins is not None:
            # `pop_majeur > ins` ne suffit pas : un excédent de quelques dixièmes de
            # personne s'arrondit à 0 et réaffiche « ≈ 0 non-inscrit·es ». On exige au
            # moins une personne entière.
            manquants = round(pop_majeur - ins)
            if manquants >= 1:
                o["noninsc"] = manquants
        if pd.notna(row.get("mig_2")):
            taux = sum(num(f"mig_{i}") for i in (2, 3, 4)) / 100
            o["malinsc"] = round(pop_majeur * taux)


def _baker_iris_elec(
    iris_vals: dict[str, dict], da: Path, ordre: list[str], fiables: set[str]
) -> None:
    """Ajoute aux quartiers l'électoral ESTIMÉ par intersection avec les bureaux de vote
    (cf. prep_iris_bv). Le drapeau `est` marque ces valeurs : la fiche et l'infobulle
    doivent dire qu'elles sont estimées, jamais mesurées. Les IRIS que les contours de
    bureaux ne recouvrent pas (garde-fou COUV_MIN) sont absents du fichier et restent
    donc purement socio-économiques."""
    f = da / "resultats_iris.parquet"
    if not f.exists():
        print(
            "  ⚠ resultats_iris absent — quartiers sans électoral (lancer prep_iris_bv)"
        )
        return
    ri = pd.read_parquet(f)
    for code, vals in _valeurs_niveau(ri, ordre, fiables).items():
        o = iris_vals.setdefault(code, {})
        o.update(vals)
        o["est"] = 1
    insc = ri[ri["scrutin"] == SCRUTIN_REGISTRE].set_index("code")["inscrits"]
    for code, v in insc.items():
        o = iris_vals.get(str(code))
        if o is not None and pd.notna(v):
            o["insc"] = int(v)
    print(
        f"  ✓ électoral estimé sur {ri['code'].nunique()} quartiers (intersection BV)"
    )


def _immo(da: Path) -> dict[str, dict]:
    """Prix au m² / effort d'accession par commune (cf. prep_immo.py)."""
    f = da / "immo_commune.parquet"
    if not f.exists():
        return {}
    df = pd.read_parquet(f)
    out = {
        str(r.code_commune): _socio_champs(r._asdict())
        for r in df.itertuples(index=False)
    }
    print(f"  ✓ logement : prix au m² sur {len(out)} communes")
    return out


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


# Voix à conquérir 2027 — mesure modélisée (cf. prep_mobilisation.py). Clés servies :
#   mob  voix à conquérir (abstentionnistes conjoncturels × γ) — tous les bureaux de la zone
#   mobc abstentionnistes conjoncturels · mobg γ moyen (%) · moba abstention prédite (%)
#   mobf plancher d'abstention (%) · mobl niveau de gauche prédit (%)
#   mobn voix à conquérir des seuls bureaux CHIFFRABLES en porte-à-porte (ceux dont on
#        connaît l'aire) · mobp portes · mobh heures · mobk km · mobv part de portes en
#        voiture (%). Le score que colore la carte est `mobn / mobh` — calculé côté client,
#        pour qu'un agrégat soit bien « voix totales ÷ heures totales » et non une moyenne
#        de rapports.
# Extensif (sommé) vs intensif (moyenné) : la distinction est ce qui rend l'agrégation
# correcte à toutes les échelles. `w` permet d'éclater un bureau sur plusieurs quartiers
# (poids IRIS × bureau) sans dupliquer ses voix.
MOB_EXT = {"mob": "mob", "conj": "mobc", "portes": "mobp", "heures": "mobh", "km": "mobk"}
MOB_INT = {"pAB": "moba", "plancher": "mobf", "pG": "mobl"}
MOB_DEC = {"mobg": 1, "moba": 1, "mobf": 1, "mobl": 1, "mobk": 1, "mobv": 1}


def _mobilisation(da: Path) -> pd.DataFrame | None:
    f = da / "mobilisation_bv.parquet"
    if not f.exists():
        print("  ⚠ mobilisation_bv absent — pas de « voix à conquérir » 2027 "
              "(lancer prep_mobilisation.py)")
        return None
    return pd.read_parquet(f)


def _mob_par_code(
    mb: pd.DataFrame, codes: pd.Series, poids: pd.Series | None = None
) -> dict[str, dict[str, float]]:
    """Agrège les grandeurs de mobilisation par code de zone.

    `codes` (et `poids`) sont alignés sur les LIGNES de `mb` — une ligne par bureau, ou une
    ligne par couple (bureau, quartier) quand on éclate les bureaux sur les IRIS."""
    w = pd.Series(1.0, index=mb.index) if poids is None else poids
    d = pd.DataFrame({"code": codes.to_numpy(), "w": w.to_numpy()})
    for col in (*MOB_EXT, *MOB_INT):
        d[col] = mb[col].to_numpy()
    # Poids des moyennes intensives = inscrits (le corps électoral, pas le nb de bureaux) ;
    # sauf γ, moyenné sur les CONJONCTURELS — c'est sur eux qu'il s'applique.
    d["_wi"] = mb["insc"].to_numpy() * d["w"]
    d["_wc"] = mb["conj"].to_numpy() * d["w"]
    d["_gc"] = mb["gamma"].to_numpy() * d["_wc"]
    for col in MOB_EXT:
        d[col] = d[col] * d["w"]
    for col in MOB_INT:
        d[col] = d[col] * d["_wi"]
    # `mobn` : voix des seuls bureaux dont on sait chiffrer le porte-à-porte, pour que le
    # rendement `mobn / mobh` compare bien un numérateur et un dénominateur du même terrain.
    d["_n"] = np.where(np.isnan(mb["heures"].to_numpy()), 0.0, d["mob"])
    d["_pv"] = np.where(mb["voiture"].fillna(False).to_numpy(), d["portes"], 0.0)
    g = d.groupby("code").sum(numeric_only=True)

    out: dict[str, dict[str, float]] = {}
    for code, r in g.iterrows():
        o: dict[str, float] = {}
        for col, cle in MOB_EXT.items():
            if not math.isnan(r[col]):
                o[cle] = r[col]
        if r["_wi"] > 0:
            for col, cle in MOB_INT.items():
                o[cle] = r[col] / r["_wi"]
        if r["_wc"] > 0:
            o["mobg"] = r["_gc"] / r["_wc"]
        if r["heures"] > 0:
            o["mobn"] = r["_n"]
            if r["portes"] > 0:
                o["mobv"] = 100 * r["_pv"] / r["portes"]
        out[str(code)] = {
            k: (round(v, MOB_DEC[k]) if k in MOB_DEC else round(v)) for k, v in o.items()
        }
    return out


def mobilisation_par_niveau(
    da: Path, region_de, departements: set[str]
) -> dict[str, dict[str, dict]]:
    """Voix à conquérir 2027 à toutes les échelles servies, `{niveau: {code: champs}}`.

    Tout descend du même tableau par bureau : commune, département et région en sont des
    SOMMES (France = Σ départements = Σ communes = Σ bureaux, l'invariant du site), et les
    quartiers un éclatement du bureau par les poids IRIS × bureau de prep_iris_bv."""
    mb = _mobilisation(da)
    if mb is None:
        return {}
    com = mb["code_commune"]
    dep = com.map(_dep)
    out = {
        "bv": _mob_par_code(mb, mb["bureau"]),
        "commune": _mob_par_code(mb, com),
    }
    for niveau, codes in (
        ("departement", dep.where(dep.isin(departements))),
        ("region", com.map(region_de)),
    ):
        garde = codes.notna()
        out[niveau] = _mob_par_code(mb[garde], codes[garde])
    poids = da / "iris_bv_poids.parquet"
    if poids.exists():
        j = pd.read_parquet(poids).merge(mb, on="bureau", how="inner")
        out["iris"] = _mob_par_code(j, j["code_iris"].astype(str), j["w"])
    print(
        f"  ✓ voix à conquérir 2027 : {round(mb['mob'].sum()):,} voix sur "
        f"{len(mb)} bureaux, {len(out.get('iris', {}))} quartiers".replace(",", " ")
    )
    return out


def _fusionner(cible: dict[str, dict], ajout: dict[str, dict]) -> None:
    for code, v in ajout.items():
        cible.setdefault(code, {}).update(v)


def _rattachement_region(da: Path):
    """Renvoie `code commune → code région`, ou None si la commune ne relève d'aucune
    région (Français·es de l'étranger, collectivités du Pacifique et des Îles du Nord).

    Deux replis, pour les mêmes raisons que `prep_elections.rattachement_communal` : le
    COG liste les communes fusionnées deux fois — la seconde ligne, celle du nom d'avant
    fusion, sans région — et `to_dict()` retenait cette case vide ; et les scrutins
    anciens portent des codes de communes disparues, absents du COG. Sans les deux,
    2 362 communes étaient servies sans région : ni comparaison régionale dans leur
    fiche, ni participation aux « voix à conquérir » de leur région."""
    rc = pd.read_parquet(da / "ref_communes.parquet")
    direct = (
        rc.dropna(subset=["code_region"])
        .drop_duplicates("code_commune")
        .set_index("code_commune")["code_region"]
        .astype(str)
        .to_dict()
    )
    dep2reg = (
        pd.read_parquet(da / "ref_departement.parquet")
        .set_index("code_departement")["code_region"]
        .astype(str)
        .to_dict()
    )
    return lambda code: direct.get(str(code)) or dep2reg.get(_dep(str(code)))


def ecrire_manifest(da: Path) -> None:
    """Inventaire de `data_app/`, relu depuis les fichiers eux-mêmes.

    Il était écrit par prepare_data seul : une régénération électorale (regen_elections
    + prep_bake) le laissait donc en place, et il a dérivé — il annonçait 25 scrutins
    pour 27, dont deux clés (« 2012-presidentielle », « 2014-municipales ») que le
    découpage par tour avait fait disparaître. prep_bake terminant les deux chaînes,
    c'est ici qu'il doit être écrit."""
    scrutins = sorted(
        pd.read_parquet(da / "resultats_commune.parquet", columns=["scrutin"])[
            "scrutin"
        ].unique()
    )
    niveaux = sorted(
        f.stem.removeprefix("resultats_") for f in da.glob("resultats_*.parquet")
    )
    (da / "manifest.json").write_text(
        json.dumps(
            {
                "scrutins": scrutins,
                "niveaux": niveaux,
                "iris_contours": (da / "geo" / "iris").exists(),
                "admin_commune": (da / "admin_commune.parquet").exists(),
                "immo_commune": (da / "immo_commune.parquet").exists(),
                "iris_electoral_estime": (da / "resultats_iris.parquet").exists(),
                "mobilisation_2027": (da / "mobilisation_bv.parquet").exists(),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f"  ✓ manifest ({len(scrutins)} scrutins, {len(niveaux)} niveaux)")


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

    # région/département : bakés après les communes, pour y injecter la somme des « voix à
    # conquérir » communales (cf. plus bas) plutôt qu'un calcul sur les totaux agrégés.
    niveaux_agr = {
        niveau: _valeurs_niveau(
            pd.read_parquet(DA / f"resultats_{niveau}.parquet"), ordre, fiables
        )
        for niveau in ("region", "departement")
    }

    # communes : valeurs électorales + revenu/pauvreté, découpées par département
    rc_commune = pd.read_parquet(DA / "resultats_commune.parquet")
    com = _valeurs_niveau(rc_commune, ordre, fiables)
    sc = pd.read_parquet(DA / "socio_commune.parquet")
    for r in sc.itertuples(index=False):
        com.setdefault(str(r.code_commune), {}).update(_socio_champs(r._asdict()))
    immo = _immo(DA)
    for code, v in immo.items():
        com.setdefault(code, {}).update(v)
    _baker_admin(com, DA)
    _baker_carnet(com, rc_commune, DA)
    region_de = _rattachement_region(DA)
    # `_dep()` découpe un préfixe, pas un département : appliqué aux Français·es de
    # l'étranger et aux collectivités du Pacifique il fabriquait les clés « ZZ », « 98 »,
    # « 975 »… qu'aucun contour ne pouvait joindre. La liste de référence les écarte.
    departements = set(
        pd.read_parquet(DA / "ref_departement.parquet")["code_departement"].astype(str)
    )
    for code, vals in com.items():
        reg = region_de(code)
        if reg is not None:
            vals["reg"] = reg
    # Voix à conquérir 2027 (mesure modélisée), à toutes les échelles. Le déficit
    # arithmétique `conq` qui cohabitait ici — 20 % des exprimés estimés moins le socle LFI —
    # a disparu avec la version 1 du site : plus rien ne le lisait.
    mob = mobilisation_par_niveau(DA, region_de, departements)
    ref_mob = DA / "mobilisation_ref.json"
    if ref_mob.exists():
        # Hypothèses + repères nationaux du modèle : servis à part (et inlinés dans
        # l'amorce) parce que le volet « i » des versions 2 et 3 les affiche tels quels,
        # plutôt que de les recopier en dur dans le JavaScript de la carte.
        _ecrire("_mobilisation", json.loads(ref_mob.read_text(encoding="utf-8")))
    _fusionner(com, mob.get("commune", {}))
    _fusionner(niveaux_agr["region"], mob.get("region", {}))
    _fusionner(niveaux_agr["departement"], mob.get("departement", {}))
    for niveau, vals in niveaux_agr.items():
        _ecrire(niveau, vals)
        print(f"  ✓ values {niveau}")
    ref_f = DA / "socio_reference.json"
    if ref_f.exists():
        refs = json.loads(ref_f.read_text())
        _ecrire("_socio_fr", _socio_champs(refs.get("FR", {})))
        _ecrire(
            "_socio_reg", {k: _socio_champs(v) for k, v in refs.items() if k != "FR"}
        )
        print("  ✓ références socio (nationale + régions)")
    print(f"  ✓ values commune (par département, {_ecrire_par_dep('commune', com)})")

    iris = pd.read_parquet(DA / "socio_iris.parquet")
    iris_vals = {}
    for r in iris.itertuples(index=False):
        v = _socio_champs(r._asdict())
        reg = region_de(_commune_de_iris(str(r.code_iris)))
        if reg:
            v["reg"] = reg
        # prix/effort : publiés à la commune, hérités tels quels par ses quartiers (la
        # fiche dit « à l'échelle de la commune » ; aucune pastille de carte à l'IRIS,
        # qui serait uniforme sur toute la commune).
        v.update(immo.get(_commune_de_iris(str(r.code_iris)), {}))
        iris_vals[str(r.code_iris)] = v
    # Communes sans FILOSOFI infra-communal : leur unique contour {commune}0000 a bien une
    # ligne socio_iris (recensement) mais sans revenu/pauvreté. On rabat les champs FILOSOFI
    # communaux manquants (sans écraser les champs IRIS) pour ne pas afficher « — » (ex. Mortery).
    for r in sc.itertuples(index=False):
        cur = iris_vals.setdefault(f"{r.code_commune}0000", {})
        if "reg" not in cur and region_de(str(r.code_commune)):
            cur["reg"] = region_de(str(r.code_commune))
        for cle, val in _socio_champs(r._asdict()).items():
            cur.setdefault(cle, val)
        for cle, val in immo.get(str(r.code_commune), {}).items():
            cur.setdefault(cle, val)
    _baker_iris_elec(iris_vals, DA, ordre, fiables)
    _fusionner(iris_vals, mob.get("iris", {}))
    iris_vals = _filtrer_sur_contours(iris_vals, DA / "geo" / "iris", "code_iris")
    for obsolete in (OUT / "iris").glob("*.json"):
        obsolete.unlink()  # un département qui perd ses contours ne doit pas survivre
    print(f"  ✓ values iris (par département, {_ecrire_par_dep('iris', iris_vals)})")

    bv = pd.read_parquet(DA / "resultats_bureau.parquet")
    bv["dep"] = (
        bv["code"].str[:3].where(bv["code"].str.startswith("97"), bv["code"].str[:2])
    )
    dossier = OUT / "bv"
    dossier.mkdir(exist_ok=True)
    for obsolete in dossier.glob("*.json"):
        obsolete.unlink()  # un département qui perd ses contours ne doit pas survivre
    ecrits = 0
    for dep, sous in bv.groupby("dep"):
        contour = _codes_avec_contour(DA / "geo" / "bv", dep, "bureau")
        sous = sous[sous["code"].isin(contour)]
        if sous.empty:
            continue
        vals_bv = _valeurs_niveau(sous, ordre, fiables)
        _fusionner(vals_bv, {c: v for c, v in mob.get("bv", {}).items() if c in contour})
        (dossier / f"{dep}.json").write_text(_dumps(vals_bv))
        ecrits += 1
    print(f"  ✓ values bv (par département, {ecrits})")

    _ecrire("_catalogue", {"indicateurs": catalogue()})
    ecrire_manifest(DA)
    print("✓ prep_bake terminé")


if __name__ == "__main__":
    main()
