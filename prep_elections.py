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


# Codes départementaux d'avant la départementalisation, encore utilisés par les fichiers
# de 2012 et 2014 pour les DOM (ZA101 = Les Abymes, ZM514 = Ouangani). La lettre porte le
# département d'aujourd'hui, le chiffre qui suit celui d'alors.
DOM_LETTRE_DEP = {"ZA": "971", "ZB": "972", "ZC": "973", "ZD": "974", "ZM": "976"}


def _canon_commune(s: pd.Series) -> pd.Series:
    """Code commune canonique (INSEE, 5 caractères).

    Deux encodages hérités de l'outre-mer, l'un et l'autre bâtis sur le même principe —
    département actuel + chiffre du département d'alors + numéro de commune — et corrigés
    de la même façon : on retire le chiffre du milieu.

    1. Les européennes 2014 codent l'outre-mer sur SIX chiffres, d'où « 974411 » pour
       Saint-Denis de La Réunion (97411) ou « 976501 » pour Acoua (97601, Mayotte étant
       encore le 985 en 2014).
    2. La présidentielle 2012 et les municipales 2014 le codent par une LETTRE :
       « ZA101 » pour Les Abymes (97101), « ZM514 » pour Ouangani (97614). Ces codes
       ressemblent à ceux des Français·es de l'étranger (`ZZ…`) et du Pacifique, qui ne
       relèvent d'aucun département : les 129 communes des DOM tombaient donc hors des
       agrégats département et région (1,33 M d'inscrits, cinq régions entières absentes
       de ces quatre scrutins), et leur série s'ouvrait en 2017 faute de rejoindre le
       code INSEE des scrutins suivants.

    Aucune des deux réécritures n'entre en collision avec un code déjà présent : les
    fichiers concernés n'utilisent QUE la forme héritée pour l'outre-mer, et les codes
    dérivés recouvrent exactement les communes du COG (32 en Guadeloupe, 34 en
    Martinique, 22 en Guyane, 24 à La Réunion, 17 à Mayotte)."""
    s = s.astype(str)
    outremer = s.str.fullmatch(r"9[78]\d{4}")
    s = s.where(~outremer, s.str[:3] + s.str[4:])
    lettre = s.str.fullmatch(r"Z[ABCDM]\d{3}")
    return s.where(~lettre, s.str[:2].map(DOM_LETTRE_DEP) + s.str[3:])


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


# ---------------------------------------------------------------------------------
# Renumérotation communale des bureaux de vote (hors Paris/Lyon/Marseille)
# ---------------------------------------------------------------------------------
# Les contours data.gouv sont figés sur le REU du 1er juin 2022 : le fichier « latest »
# porte encore la numérotation de 2022. Une commune qui a renuméroté ses bureaux depuis
# (Bordeaux : 1101 → 1001, 1201 → 1021, 1301 → 1041…) voit donc ses scrutins 2024+ tomber
# sur des codes orphelins. Deux dégâts, dont le second est le pire :
#   1. les bureaux renumérotés disparaissent de la carte BV pour ces scrutins ;
#   2. les rares codes qui coïncident PAR ACCIDENT (18 sur 153 à Bordeaux) rattachent les
#      voix de 2024 au contour d'un AUTRE bureau — un chiffre faux, pas un chiffre absent.
# Et comme l'estimation par quartier exige que 90 % de l'électorat communal soit porté par
# des bureaux localisés (prep_iris_bv.ELEC_MIN), la commune entière sort de la carte IRIS :
# à Bordeaux, 12 % d'électorat localisable, donc 88 quartiers sans une seule valeur.
#
# On reconstruit l'appariement par ALIGNEMENT ORDONNÉ (Needleman-Wunsch) : la
# renumérotation préserve l'ordre des bureaux et se contente d'en intercaler de nouveaux,
# ce que l'alignement modélise exactement (les créations depuis 2022 restent non
# appariées). Le coût d'un couple est l'écart relatif d'INSCRITS entre le scrutin de
# référence ancien et le nouveau : deux fichiers indépendants des codes, donc un vrai
# témoin. À Bordeaux, l'alignement retrouve les 148 contours avec 2,1 % d'écart médian,
# là où l'appariement par code identique en affiche 63 à 74 % — la mesure même de sa
# fausseté.
#
# Trois garde-fous, dans l'esprit du crosswalk PLM (« sinon on s'abstient ») :
#   - on n'intervient QUE sur les communes que l'appariement par code laisse sous le seuil
#     d'estimation : ailleurs, un alignement même bon dégraderait un rattachement déjà juste ;
#   - l'écart médian d'inscrits doit rester sous ECART_MAX, calibré sur les communes SAINES
#     (appariement complet par code) : leur écart médian vaut 1,9 % en médiane et 6,0 % au
#     95e centile — au-delà, l'alignement n'est plus aussi cohérent qu'un vrai appariement ;
#   - le rattachement doit progresser franchement, sinon on garde l'existant.
# Sur les 93 communes qui déclenchent l'alignement, 7 le passent — dont Bordeaux, qui
# repasse de 12 % à 97 % d'électorat localisé.
CROSSWALK_REF_ANCIEN = ("2022-legislatives-1", "2022-presidentielle-1")
CROSSWALK_REF_NOUVEAU = "2024-europeenne"
# Année à partir de laquelle les fichiers portent la NOUVELLE numérotation. Le crosswalk
# ne doit surtout pas toucher aux scrutins antérieurs : à Bordeaux, ses clés (1101, 1201…)
# sont des codes 2022 parfaitement valides, qu'il renverrait sur le contour d'un voisin.
CROSSWALK_ANNEE_MIN = 2024
# Miroir de prep_iris_bv.ELEC_MIN : le seuil sous lequel une commune n'est plus estimée.
CROSSWALK_ELEC_MIN = 0.90
CROSSWALK_ECART_MAX = 0.06  # 95e centile de l'écart d'inscrits des communes saines
CROSSWALK_GAIN_MIN = 0.01
CROSSWALK_BV_MIN = 5  # sous 5 bureaux, l'alignement n'a plus de structure à exploiter
# Coût d'un bureau laissé non apparié. Au-dessus de l'écart d'inscrits typique d'un vrai
# couple (~2 %) et bien en-dessous de celui de deux bureaux distincts, il fait préférer
# l'appariement quand les effectifs concordent et la création quand ils ne concordent pas.
CROSSWALK_COUT_TROU = 0.35


def _inscrits_par_bureau(dossier_clean: Path, cle: str) -> dict[str, int]:
    """{code_bv → inscrits} d'un scrutin de référence, codes bâtis comme dans
    `_bureau_depuis_df` (canonisation comprise) pour être comparables aux contours."""
    src = dossier_clean / f"{cle}-bureau_de_vote.parquet"
    if not src.exists():
        return {}
    df = pd.read_parquet(src, columns=["code_commune", "bureau_de_vote", "inscrits"])
    codes = (
        _canon_commune(df["code_commune"])
        + "_"
        + _canon_suffix(df["bureau_de_vote"].astype(str))
    )
    return df.assign(code=codes).groupby("code")["inscrits"].max().to_dict()


def _aligner_bureaux(
    anciens: list[str],
    nouveaux: list[str],
    insc_ancien: dict[str, int],
    insc_nouveau: dict[str, int],
) -> list[tuple[str, str, float]]:
    """Alignement ordonné {ancien, nouveau, écart} entre deux listes de codes triées.

    Programmation dynamique classique : à chaque pas, on apparie les deux têtes de liste
    ou on en saute une (bureau supprimé d'un côté, créé de l'autre). Ce sont les seules
    opérations que la renumérotation produit — elle ne réordonne pas.

    Les inscrits des deux côtés viennent de DEUX tables distinctes, et non d'une table
    fusionnée : un code renuméroté désigne un bureau à l'ancienne date et un AUTRE à la
    nouvelle. Fusionner les deux revenait à lire l'effectif de 2024 des deux côtés du
    couple pour les 18 faux amis de Bordeaux — l'écart tombait à 0 % et le garde-fou
    validait sa propre erreur."""
    n, m = len(anciens), len(nouveaux)
    trou = CROSSWALK_COUT_TROU
    cout = [
        [
            abs(insc_ancien[a] - insc_nouveau[b]) / max(insc_ancien[a], 1)
            for b in nouveaux
        ]
        for a in anciens
    ]
    d = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        d[i][0] = i * trou
    for j in range(1, m + 1):
        d[0][j] = j * trou
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(
                d[i - 1][j - 1] + cout[i - 1][j - 1],
                d[i - 1][j] + trou,
                d[i][j - 1] + trou,
            )
    i, j, couples = n, m, []
    while i > 0 and j > 0:
        if d[i][j] == d[i - 1][j - 1] + cout[i - 1][j - 1]:
            couples.append((anciens[i - 1], nouveaux[j - 1], cout[i - 1][j - 1]))
            i, j = i - 1, j - 1
        elif d[i][j] == d[i - 1][j] + trou:
            i -= 1
        else:
            j -= 1
    return couples[::-1]


def _mediane(xs: list[float]) -> float:
    ys = sorted(xs)
    k = len(ys)
    return (
        1.0 if not k else (ys[k // 2] if k % 2 else (ys[k // 2 - 1] + ys[k // 2]) / 2)
    )


def construire_crosswalk_renumerotation(
    dossier_clean: Path, geo_dir: Path
) -> tuple[dict[str, str], frozenset[str]]:
    """Crosswalk {code_bv 2024+ → code_bv des contours} pour les communes ayant
    renuméroté leurs bureaux depuis le REU de 2022 (cf. le commentaire ci-dessus).

    Renvoie aussi l'ensemble des communes réalignées : dans celles-là, l'alignement fait
    autorité pour TOUS les bureaux, y compris ceux qu'il n'a pas placés (cf. _remapper).

    Ne retient que les communes où l'alignement est à la fois NÉCESSAIRE (l'appariement
    par code les prive d'estimation), COHÉRENT (écart d'inscrits sous le seuil des
    communes saines) et UTILE (le rattachement progresse). Ailleurs : rien."""
    contours: dict[str, set[str]] = collections.defaultdict(set)
    for f in sorted(geo_dir.glob("*.geojson")):
        for code in gpd.read_file(f, ignore_geometry=True)["bureau"].astype(str):
            com, _, _ = code.partition("_")
            if com and com not in PLM_COMMUNES:
                # 59 codes portent DEUX features (bureau au contour éclaté) : sans
                # dédoublonnage, l'alignement apparie deux bureaux 2024 au même polygone.
                contours[com].add(code)
    if not contours:
        return {}, frozenset()
    insc_new = _inscrits_par_bureau(dossier_clean, CROSSWALK_REF_NOUVEAU)
    insc_old: dict[str, int] = {}
    for cle in CROSSWALK_REF_ANCIEN:
        for code, v in _inscrits_par_bureau(dossier_clean, cle).items():
            insc_old.setdefault(code, v)
    if not insc_new or not insc_old:
        print("  ⚠ crosswalk renumérotation : scrutins de référence absents — ignoré")
        return {}, frozenset()

    nouveaux_par_com: dict[str, list[str]] = collections.defaultdict(list)
    for code in insc_new:
        nouveaux_par_com[code.partition("_")[0]].append(code)

    crosswalk: dict[str, str] = {}
    retenues: list[tuple[str, float, float, float]] = []
    for com, nouveaux in nouveaux_par_com.items():
        anciens = sorted(c for c in contours.get(com, ()) if c in insc_old)
        nouveaux = sorted(nouveaux)
        if len(anciens) < CROSSWALK_BV_MIN or len(nouveaux) < CROSSWALK_BV_MIN:
            continue
        total = sum(insc_new[c] for c in nouveaux)
        if total <= 0:
            continue
        avec_contour = set(contours.get(com, ()))
        avant = sum(insc_new[c] for c in nouveaux if c in avec_contour) / total
        if avant >= CROSSWALK_ELEC_MIN:
            continue  # la commune est déjà estimée : ne pas déranger un appariement qui tient
        couples = _aligner_bureaux(anciens, nouveaux, insc_old, insc_new)
        if not couples:
            continue
        apres = sum(insc_new[b] for _, b, _ in couples) / total
        ecart = _mediane([e for _, _, e in couples])
        if ecart > CROSSWALK_ECART_MAX or apres < avant + CROSSWALK_GAIN_MIN:
            continue
        crosswalk.update({b: a for a, b, _ in couples if a != b})
        retenues.append((com, avant, apres, ecart))
    for com, avant, apres, ecart in sorted(retenues, key=lambda r: r[1]):
        print(
            f"  ↻ {com} : bureaux renumérotés depuis 2022 — électorat localisé "
            f"{avant:.0%} → {apres:.0%} (écart d'inscrits médian {ecart:.1%})"
        )
    if retenues:
        print(f"  ↻ crosswalk renumérotation : {len(crosswalk)} bureaux réappariés")
    return crosswalk, frozenset(com for com, *_ in retenues)


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


def _remapper(
    codes: pd.Series, crosswalk: dict[str, str], renumerotees: frozenset[str]
) -> pd.Series:
    """Applique le crosswalk, puis prive de contour les bureaux qu'il ne place pas dans
    une commune réalignée.

    Ces bureaux-là sont des créations postérieures au millésime des contours, et le code
    qu'ils portent aujourd'hui peut être celui d'un ANCIEN bureau : le laisser tel quel
    les dessinerait sur le polygone d'un voisin — le faux appariement qu'on est
    précisément en train de défaire. La règle vaut pour tous les scrutins récents, et pas
    seulement pour celui qui a servi de référence : les municipales 2026 ont créé à leur
    tour des bureaux que le crosswalk, bâti sur 2024, ne connaît pas.

    Le suffixe `+` ne fait que retirer le contour : prep_bake écarte de la carte tout code
    qui n'en a pas, et les voix continuent de compter dans les agrégats commune,
    département et région, qui ne passent pas par le bureau."""
    if not crosswalk and not renumerotees:
        return codes

    def un(c: str) -> str:
        vise = crosswalk.get(c)
        if vise is not None:
            return vise
        return f"{c}+" if c.partition("_")[0] in renumerotees else c

    return codes.map(un)


def _bureau_depuis_df(
    df: pd.DataFrame,
    scrutin: Scrutin,
    crosswalk: dict[str, str],
    listes_lfi: set[tuple[str, int]],
    communes_renumerotees: frozenset[str] = frozenset(),
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
    df["code_bv"] = _remapper(df["code_bv"], crosswalk, communes_renumerotees)
    df, voix_perdues = _reparer_voix_negatives(df, scrutin)

    nuance = df["nuance"] if "nuance" in df.columns else pd.Series([None] * len(df))
    nom = df["nom"] if "nom" in df.columns else pd.Series([None] * len(df))
    # Le patronyme ne vaut nuance qu'à la présidentielle, où la table des candidat·es fait
    # foi ; ailleurs c'est un homonyme (cf. nuance_vers_famille).
    patronymes = scrutin.type == "presidentielle"
    df["famille"] = [nuance_vers_famille(n, m, patronymes) for n, m in zip(nuance, nom)]
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
# ventilation est déclarée inconnue. La distribution de cette part est franchement bimodale
# (le ministère publie les nuances de TOUTE la commune ou d'AUCUNE : aux municipales 2026,
# 31 554 communes sont à 100 % de voix SANS nuance et 3 282 à 0 % ; 3 communes seulement
# tombent entre les deux sur tout le corpus), le seuil est donc au milieu du vide.
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
    #
    # Ils se COMPTENT (somme des voix rangées dans une famille) au lieu de se déduire du
    # régime communal. Les deux tests ci-dessus sont communaux et binaires : une commune
    # est ventilée ou ne l'est pas. Poser alors `exprimes_nuances = exprimes` supposait
    # que toute voix d'une commune ventilée trouve sa famille — faux dès qu'une nuance
    # sort du mapping (`LNC` en Nouvelle-Calédonie, `LGJ` des gilets jaunes) ou qu'une
    # ligne n'en porte aucune : ces voix disparaissaient de la barre SANS entrer dans la
    # part non ventilée, qui restait à 0. La recomposition s'arrêtait à 62 % à La Foa et
    # dans 21 autres communes (54 bureaux, jusqu'à −40 points). Comptées, elles bouclent.
    ventiles = out[FAMILLES].sum(axis=1).where(connu, 0)
    out["exprimes_nuances"] = ventiles.clip(lower=0, upper=out["exprimes"])
    return out


def _par_bureau(
    scrutin: Scrutin,
    crosswalk: dict[str, str],
    listes_lfi: set[tuple[str, int]],
    communes_renumerotees: frozenset[str] = frozenset(),
) -> list[tuple[Scrutin, pd.DataFrame]]:
    """Lit le fichier d'un scrutin et renvoie un (scrutin, table BV) par tour. Les fichiers
    legacy regroupant plusieurs tours (présidentielle 2012, municipales 2014) sont séparés
    en un scrutin par tour : sans cela, le pivot somme les voix des deux tours et double-compte."""
    df = pd.read_parquet(scrutin.fichier)
    if "numero_tour" in df.columns and df["numero_tour"].nunique(dropna=True) > 1:
        sorties = []
        for t, sub in df.groupby("numero_tour"):
            sc = replace(scrutin, cle=f"{scrutin.cle}-{int(t)}", tour=int(t))
            sorties.append(
                (
                    sc,
                    _bureau_depuis_df(
                        sub, sc, crosswalk, listes_lfi, communes_renumerotees
                    ),
                )
            )
        return sorties
    return [
        (
            scrutin,
            _bureau_depuis_df(
                df, scrutin, crosswalk, listes_lfi, communes_renumerotees
            ),
        )
    ]


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
        # publié pour que l'estimation par quartier puisse répartir et recaler la part
        # non ventilée comme n'importe quel comptage (cf. prep_iris_bv)
        "exprimes_nuances": int(g["exprimes_nuances"]),
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
    # Le crosswalk de renumérotation ne vaut QUE pour les scrutins qui portent la nouvelle
    # numérotation : appliqué aux scrutins antérieurs, ses clés (des codes 2022 valides)
    # renverraient les voix d'un bureau sur le contour d'un autre. D'où deux tables, et le
    # choix par année au moment de lire le fichier.
    renum, renumerotees = (
        construire_crosswalk_renumerotation(dossier_clean, geo_dir)
        if geo_dir
        else ({}, frozenset())
    )
    crosswalk_recent = {**crosswalk, **renum}
    listes_lfi = charger_listes_lfi(listes_lfi_fichier) if listes_lfi_fichier else set()
    com2dep, dep2reg = rattachement_communal(communes)
    accum: dict[str, list[pd.DataFrame]] = {
        n: [] for n in ("bureau", "commune", "departement", "region", "france")
    }
    for scrutin in lister_scrutins(dossier_clean):
        try:
            recent = scrutin.annee >= CROSSWALK_ANNEE_MIN
            bureaux = _par_bureau(
                scrutin,
                crosswalk_recent if recent else crosswalk,
                listes_lfi,
                renumerotees if recent else frozenset(),
            )
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
