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
    SANS_NUANCE,
    TRIPARTITION_ORDRE,
    famille_de_liste,
    nuance_vers_famille,
)

FAMILLES = sorted(set(FAMILLE_BLOC6) | {"UDI"})
# colonnes pivotées : les familles ventilables + le fourre-tout « aucune nuance publiée »,
# qui sert à détecter les communes non ventilées et n'entre dans AUCUN bloc.
COLONNES_VOIX = [*FAMILLES, SANS_NUANCE]


PLM_COMMUNES = ("75056", "69123", "13055")

# Scrutins de liste 2026 (tour 1) pour lesquels la table des listes soutenues par LFI
# fait foi : la nuance du ministère sous-estime souvent l'implantation insoumise
# (une union FI–Écolos–PCF peut être étiquetée « LDVG »).
SCRUTINS_LISTES_LFI = ("2026-municipales-1", "2026-conseils-PLM-1")


def charger_listes_lfi(fichier: Path) -> set[tuple[str, int]]:
    """Clés (code_circonscription, numéro de panneau) des listes CONDUITES par LFI.

    On ne garde que les listes dont la tête de liste est étiquetée LFI
    (`étiquette_tdl == "LFI"`) : les listes d'union que LFI soutient sans les conduire
    (têtes DVG, PCF, PS, écolos…) relèvent de la gauche, pas du « vote LFI ».
    code_circonscription matche `code_commune` (communes) ou `code_secteur` (PLM,
    métropole de Lyon) ; le numéro de panneau identifie la liste au sein du scrutin."""
    df = pd.read_parquet(
        fichier, columns=["code_circonscription", "numéro_panneau", "étiquette_tdl"]
    )
    df = df.dropna(subset=["numéro_panneau"])
    df = df[df["étiquette_tdl"] == "LFI"]
    return {
        (str(c), int(p))
        for c, p in zip(df["code_circonscription"], df["numéro_panneau"])
    }


def _canon_suffix(s: pd.Series) -> pd.Series:
    """Numéro de bureau canonique = zéro-padding sur 4 chiffres ('1' → '0001'), pour
    matcher les contours et homogénéiser les scrutins entre eux (certains fichiers du
    ministère paddent, d'autres non : sans ça le même bureau a deux clés)."""
    s = s.astype(str)
    return s.where(~s.str.fullmatch(r"\d+"), s.str.zfill(4))


def _canon_commune(s: pd.Series) -> pd.Series:
    """Code commune canonique (INSEE, 5 caractères).

    Le fichier des européennes 2014 — et lui seul — code l'outre-mer sur SIX chiffres :
    département actuel (3) + chiffre du département d'alors (1) + numéro de commune (2),
    d'où « 974411 » pour Saint-Denis de La Réunion (97411) ou « 976501 » pour Acoua
    (97601, Mayotte étant encore le 985 en 2014). Aucun de ces codes ne rejoignait quoi
    que ce soit : ni contour, ni COG, ni les autres scrutins de la même commune. Les DOM
    disparaissaient donc de ce scrutin à TOUTES les échelles (1,37 M d'inscrits, 129
    communes, 2 308 bureaux), tandis que 215 entrées fantômes portaient seules leur
    résultat. Retirer le 4e caractère rétablit le code INSEE, sans jamais entrer en
    collision avec un code à 5 déjà présent."""
    s = s.astype(str)
    outremer = s.str.fullmatch(r"9[78]\d{4}")
    return s.where(~outremer, s.str[:3] + s.str[4:])


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
            "conseils-PLM": "Conseils de secteur (PLM)",
        }
        base = f"{noms.get(self.type, self.type.title())} {self.annee}"
        tours = {1: "1er tour", 2: "2e tour"}
        return (
            f"{base} ({tours.get(self.tour, f'tour {self.tour}')})"
            if self.tour
            else base
        )


def lister_scrutins(dossier_clean: Path) -> list[Scrutin]:
    scrutins: list[Scrutin] = []
    for f in sorted(dossier_clean.glob("*-bureau_de_vote.parquet")):
        parts = f.stem.replace("-bureau_de_vote", "").split("-")
        annee = int(parts[0])
        # Le tour est le DERNIER segment s'il est numérique, et le type tout ce qui reste :
        # « 2026-conseils-PLM-1 » a un type en deux mots. En lisant `parts[1:3]` on prenait
        # « PLM » pour un tour, donc pas de tour du tout — et les deux tours des conseils
        # PLM se retrouvaient avec le même libellé dans le sélecteur de scrutins.
        tour = int(parts[-1]) if len(parts) > 2 and parts[-1].isdigit() else None
        type_ = "-".join(parts[1:-1] if tour is not None else parts[1:])
        cle = "-".join(parts)
        scrutins.append(Scrutin(cle, annee, type_, tour, f))
    return scrutins


# Les fichiers du ministère repris par hexagonal stockent parfois les voix sur un entier
# 16 bits signé : au-delà de 32 767 le compte « déborde » et ressort négatif.
DEBORDEMENT_INT16 = 65536


def _reparer_voix_negatives(
    df: pd.DataFrame, scrutin: Scrutin
) -> tuple[pd.DataFrame, pd.Series]:
    """Répare les comptes de voix négatifs, impossibles par construction.

    Le fichier de la présidentielle 2012 en contient un : au 2e tour, le bureau
    ZZ006_0001 (Français·es de l'étranger, 107 077 inscrits) donne **−32 541** voix à
    Sarkozy — 32 995 tronqué sur 16 bits. Non corrigé, ce compte se SOUSTRAYAIT du bloc
    LR-DVD national et laissait 65 536 suffrages hors de tout bloc : c'était le seul
    scrutin dont la barre ne bouclait pas (99,87 % au lieu de 100 %).

    On ne rétablit le compte que s'il redonne EXACTEMENT les exprimés publiés du bureau
    (ici 32 995 + 19 978 = 52 973 ✓). Sinon on ne devine pas : les voix du bureau sont
    déclarées non ventilables, et sa commune bascule en « non mesuré ».

    Renvoie le tableau corrigé et le masque des lignes à ne pas ventiler."""
    negatif = df["voix"] < 0
    if not negatif.any():
        return df, negatif
    df = df.copy()
    df["voix"] = df["voix"] + negatif * DEBORDEMENT_INT16
    touche = df["code_bv"].isin(df.loc[negatif, "code_bv"])
    somme = df.groupby("code_bv")["voix"].transform("sum")
    exprimes = df.groupby("code_bv")["exprimes"].transform("max")
    echec = touche & (somme != exprimes)
    retablis = df.loc[touche & ~echec, "code_bv"].nunique()
    print(
        f"  ⚠ {scrutin.cle}: {int(negatif.sum())} compte(s) de voix négatif(s) "
        f"(débordement 16 bits) — {retablis} bureau(x) rétabli(s), "
        f"{df.loc[echec, 'code_bv'].nunique()} laissé(s) non ventilé(s)"
    )
    return df, echec


def _bureau_depuis_df(
    df: pd.DataFrame,
    scrutin: Scrutin,
    crosswalk: dict[str, str],
    listes_lfi: set[tuple[str, int]],
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
    df["code_commune"] = _canon_commune(df["code_commune"])
    df["bureau_de_vote"] = df.get("bureau_de_vote", "")
    base_bv = df["code_secteur"] if "code_secteur" in df.columns else df["code_commune"]
    df["code_bv"] = base_bv.astype(str) + "_" + _canon_suffix(df["bureau_de_vote"])
    if crosswalk:
        df["code_bv"] = df["code_bv"].map(lambda c: crosswalk.get(c, c))
    df, voix_perdues = _reparer_voix_negatives(df, scrutin)

    nuance = df["nuance"] if "nuance" in df.columns else pd.Series([None] * len(df))
    nom = df["nom"] if "nom" in df.columns else pd.Series([None] * len(df))
    df["famille"] = [nuance_vers_famille(n, m) for n, m in zip(nuance, nom)]
    df.loc[voix_perdues, "famille"] = SANS_NUANCE
    # Européennes 2019 : le fichier ne porte ni nuance ni nom de candidat, seulement le
    # numéro de panneau et l'intitulé de la liste. Sans ce repli, tout le scrutin était
    # « non ventilé » (et, avant correction du mapping, entièrement versé dans « Autres »).
    if "numero_panneau" in df.columns:
        manque = df["famille"] == SANS_NUANCE
        if manque.any():
            depuis_liste = [
                famille_de_liste(scrutin.cle, p)
                for p in df.loc[manque, "numero_panneau"]
            ]
            df.loc[manque, "famille"] = [f or SANS_NUANCE for f in depuis_liste]
    if listes_lfi and scrutin.cle in SCRUTINS_LISTES_LFI and "numero_panneau" in df:
        est_lfi = [
            pd.notna(p) and (str(c), int(p)) in listes_lfi
            for c, p in zip(base_bv, df["numero_panneau"])
        ]
        df.loc[est_lfi, "famille"] = "LFI"

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
    for fam in COLONNES_VOIX:
        if fam not in out.columns:
            out[fam] = 0
    return _neutraliser_non_ventile(out)


# Une commune dont les voix dépassent de 10 % ses exprimés vote au scrutin plurinominal.
# La séparation est franche — les communes de liste bouclent à 1,00 exactement, les
# communes à panachage sont entre 5 et 15 (autant que de sièges) : seules 8 communes sur
# 35 000 tombent entre les deux. Un seuil lâche (> exprimés tout court) ferait basculer
# des communes entières sur un bureau au dénombrement d'exprimés bancal — Tours en a un.
RATIO_PLURINOMINAL = 1.10
# Part des voix d'une commune sans aucune nuance publiée au-delà de laquelle la
# ventilation est déclarée inconnue. La distribution est franchement bimodale (le
# ministère publie les nuances de TOUTE la commune ou d'AUCUNE : 31 554 communes à 100 %
# et 3 282 à 0 % aux municipales 2026, 3 communes entre les deux sur tout le corpus), le
# seuil est donc au milieu du vide.
SEUIL_SANS_NUANCE = 0.50


def _neutraliser_non_ventile(out: pd.DataFrame) -> pd.DataFrame:
    """Marque les communes où la ventilation par liste n'est pas mesurable.

    Deux régimes, un même verdict — la ventilation est INCONNUE (NaN), pas nulle :

    1. **Panachage** (municipales des communes de moins de 1 000 habitants). Le ministère
       y publie une ligne par CANDIDAT (un numéro de panneau chacun, pas de liste), et
       chaque électeur vote pour autant de noms qu'il y a de sièges — sommer ces voix par
       famille donnait 184 % des inscrits en 2014 et 135 % en 2020, contre 60 % et 43 %
       d'exprimés réels.
    2. **Nuance non publiée**. Le fichier des municipales 2026 ne gonfle plus les voix :
       le test de panachage ne se déclenchait donc plus, alors que la colonne `nuance` y
       est vide pour toutes les communes de moins de 1 000 habitants. Résultat, 24 816
       communes étaient servies avec « LFI 0 % · PS 0 % · RN 0 % » et 100 % du bloc
       « Autres » — des zéros affichés comme des mesures, là où 2020 disait « · ».

    `inscrits_nuances` (0 dans ces communes) sert de dénominateur aux blocs ; la
    participation et l'abstention, elles, restent mesurées et intactes. Les deux tests
    portent sur les totaux de la COMMUNE : la publication des nuances comme le panachage
    sont des régimes communaux, pas des accidents de bureau."""
    par_commune = (
        pd.DataFrame(
            {
                "code_commune": out["code_commune"],
                "voix": out[COLONNES_VOIX].sum(axis=1),
                "sans": out[SANS_NUANCE],
                "exp": out["exprimes"],
            }
        )
        .groupby("code_commune")[["voix", "sans", "exp"]]
        .sum()
    )
    panachage = par_commune["voix"] > RATIO_PLURINOMINAL * par_commune["exp"]
    sans_nuance = par_commune["sans"] > SEUIL_SANS_NUANCE * par_commune["voix"].clip(
        lower=1
    )
    inconnu = set(par_commune.index[panachage | sans_nuance])
    connu = ~out["code_commune"].isin(inconnu)
    out.loc[~connu, FAMILLES] = float("nan")
    out["inscrits_nuances"] = out["inscrits"].where(connu, 0)
    # Les EXPRIMÉS ventilables, à distinguer des inscrits ventilables : c'est le suffrage
    # qui manque à la barre de recomposition, pas le corps électoral. L'abstention de ces
    # communes est déjà comptée dans l'abstention générale.
    out["exprimes_nuances"] = out["exprimes"].where(connu, 0)
    return out


def _par_bureau(
    scrutin: Scrutin, crosswalk: dict[str, str], listes_lfi: set[tuple[str, int]]
) -> list[tuple[Scrutin, pd.DataFrame]]:
    """Lit le fichier d'un scrutin et renvoie un (scrutin, table BV) par tour. Les fichiers
    legacy regroupant plusieurs tours (présidentielle 2012, municipales 2014) sont séparés
    en un scrutin par tour : sans cela, le pivot somme les voix des deux tours et double-compte."""
    df = pd.read_parquet(scrutin.fichier)
    if "numero_tour" in df.columns and df["numero_tour"].nunique(dropna=True) > 1:
        sorties = []
        for t, sub in df.groupby("numero_tour"):
            sc = replace(scrutin, cle=f"{scrutin.cle}-{int(t)}", tour=int(t))
            sorties.append((sc, _bureau_depuis_df(sub, sc, crosswalk, listes_lfi)))
        return sorties
    return [(scrutin, _bureau_depuis_df(df, scrutin, crosswalk, listes_lfi))]


def _indicateurs(g: pd.DataFrame) -> dict:
    """Calcule les indicateurs d'un groupe (déjà agrégé en sommes).

    UN SEUL dénominateur, `inscrits`, pour tout ce qui est exprimé en pourcentage :
    participation, abstention, blocs, voix LFI/gauche. `inscrits_nuances` — les inscrits
    dont la ventilation par liste existe — ne sert qu'à décider si les blocs sont
    MESURÉS (cf. _neutraliser_non_ventile) : à 0, ils valent None et non zéro.

    Les blocs étaient auparavant rapportés à `inscrits_nuances`. À la commune les deux
    coïncident (une commune est ventilée ou ne l'est pas), mais dès qu'on agrège les
    deux populations divergent et les pourcentages cessaient d'être additionnables :
    la barre de recomposition des municipales 2026 totalisait 133 % en France. Le poids
    d'un bloc se lit désormais sur le corps électoral ENTIER, `non_ventile` portant les
    EXPRIMÉS que le ministère ne ventile pas (rapportés aux inscrits) — barre bouclée à
    100 % avec l'abstention et les blancs/nuls, échelles comparables entre elles, et pas
    de dénominateur qui change avec le territoire.

    Participation et abstention exigent en plus des comptages qui se tiennent
    (exprimés ≤ votants ≤ inscrits). Deux bureaux du fichier des municipales 2026 les
    contredisent — 212 votants pour 209 inscrits au Mesnil-sur-Bulles, 79 exprimés pour
    0 votant à Saint-Cyr-du-Gault : on préfère ne rien afficher à une participation de
    101 %."""
    inscrits = g["inscrits"]
    nuances_base = g["inscrits_nuances"]
    coherent = 0 <= g["exprimes"] <= g["votants"] <= inscrits
    res: dict = {
        "inscrits": int(inscrits),
        "votants": int(g["votants"]),
        "exprimes": int(g["exprimes"]),
        "inscrits_nuances": int(nuances_base),
        "participation": round(100 * g["votants"] / inscrits, 2)
        if inscrits and coherent
        else None,
        "abstention": round(100 * (1 - g["votants"] / inscrits), 2)
        if inscrits and coherent
        else None,
        "non_ventile": round(
            100 * (g["exprimes"] - g["exprimes_nuances"]) / inscrits, 2
        )
        if inscrits
        else None,
    }
    fam_voix = {fam: g.get(fam, 0) for fam in FAMILLES}
    mesure = bool(nuances_base) and bool(inscrits)
    for bloc in BLOC6_ORDRE:
        v = sum(fam_voix[f] for f in FAMILLES if FAMILLE_BLOC6.get(f) == bloc)
        res[f"b6_{bloc}"] = round(100 * v / inscrits, 2) if mesure else None
    for bloc in TRIPARTITION_ORDRE:
        v = sum(fam_voix[f] for f in FAMILLES if FAMILLE_TRIPARTITION.get(f) == bloc)
        res[f"tri_{bloc}"] = round(100 * v / inscrits, 2) if mesure else None
    lfi = sum(fam_voix[f] for f in FAMILLES_LFI)
    gauche = sum(fam_voix[f] for f in FAMILLES_GAUCHE)
    res["lfi_voix"] = int(lfi) if mesure else None
    res["gauche_voix"] = int(gauche) if mesure else None
    res["lfi_pct"] = round(100 * lfi / inscrits, 2) if mesure else None
    res["gauche_pct"] = round(100 * gauche / inscrits, 2) if mesure else None
    return res


def _agreger(
    bv: pd.DataFrame, cle_groupe: str, niveau: str, scrutin: Scrutin
) -> pd.DataFrame:
    cols_somme = [
        "inscrits",
        "votants",
        "exprimes",
        "inscrits_nuances",
        "exprimes_nuances",
        *FAMILLES,
    ]
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


def _departement_du_code(code: str) -> str:
    """Le code INSEE d'une commune PORTE son département (2 caractères, 3 en outre-mer)."""
    code = str(code)
    return code[:3] if code.startswith("97") else code[:2]


def rattachement_communal(
    communes: pd.DataFrame,
) -> tuple[dict[str, str], dict[str, str]]:
    """{commune → département} et {département → région}, résistants au COG.

    Deux pièges, qui coûtaient 3 569 708 inscrits (7,2 % du corps électoral) aux niveaux
    département et région des européennes 2024 — le Maine-et-Loire y perdait 39 % de ses
    électeurs, la Seine-Saint-Denis toute la commune de Saint-Denis :

    1. Le COG liste une commune fusionnée DEUX fois : sous son nom actuel (avec son
       département) et sous son nom d'avant fusion (sans département, pour la recherche).
       `set_index(...).to_dict()` garde la DERNIÈRE ligne, donc la case vide. On ne garde
       donc que les lignes rattachées.
    2. Les scrutins anciens portent des codes de communes disparues, absents du COG. Le
       code INSEE porte son département : on le dérive, à condition qu'il désigne un
       département réel (sinon les codes « ZZ » des Français de l'étranger et « 98 » du
       Pacifique fabriqueraient des départements fantômes)."""
    rattachees = communes.dropna(subset=["code_departement"])
    com2dep = (
        rattachees.drop_duplicates("code_commune")
        .set_index("code_commune")["code_departement"]
        .to_dict()
    )
    dep2reg = (
        rattachees.dropna(subset=["code_region"])
        .drop_duplicates("code_departement")
        .set_index("code_departement")["code_region"]
        .to_dict()
    )
    return com2dep, dep2reg


def departements_de(
    codes: pd.Series, com2dep: dict[str, str], dep2reg: dict[str, str]
) -> pd.Series:
    """Département de chaque code commune : le COG d'abord, le préfixe du code ensuite."""
    depuis_code = codes.map(_departement_du_code)
    return codes.map(com2dep).fillna(depuis_code.where(depuis_code.isin(dep2reg)))


def construire_resultats(
    dossier_clean: Path,
    communes: pd.DataFrame,
    geo_dir: Path | None = None,
    listes_lfi_fichier: Path | None = None,
) -> dict[str, pd.DataFrame]:
    """Construit un dict {niveau: DataFrame} agrégeant tous les scrutins."""
    crosswalk = construire_crosswalk_plm(dossier_clean, geo_dir) if geo_dir else {}
    listes_lfi = charger_listes_lfi(listes_lfi_fichier) if listes_lfi_fichier else set()
    com2dep, dep2reg = rattachement_communal(communes)
    accum: dict[str, list[pd.DataFrame]] = {
        n: [] for n in ("bureau", "commune", "departement", "region", "france")
    }
    for scrutin in lister_scrutins(dossier_clean):
        try:
            bureaux = _par_bureau(scrutin, crosswalk, listes_lfi)
        except Exception as e:  # un scrutin atypique ne doit pas tout bloquer
            print(f"  ⚠ {scrutin.cle} ignoré : {e}")
            continue
        for sc, bv in bureaux:
            bv["code_departement"] = departements_de(
                bv["code_commune"], com2dep, dep2reg
            )
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
