"""Mapping des nuances du ministère de l'Intérieur (et candidats de présidentielle)
vers les familles politiques, puis vers les regroupements utilisés par la présentation
de l'Institut La Boétie :

- bloc6 : la « recomposition » en 6 colonnes
  (LFI-PCF-EXG | PS-EELV | MoDem-EM | LR-DVD | RN-EXD | Autres)
- tripartition : les 3 blocs (social-écologique | libéral-progressiste | national-patriote)

Les codes nuance varient à chaque scrutin ; ce mapping est volontairement large.

Trois sorties possibles, et la distinction compte :
- une famille politique connue ;
- "DIV" (bloc "Autres") quand la liste ou le candidat est IDENTIFIÉ mais hors bloc
  (divers, animalistes, régionalistes…) ;
- SANS_NUANCE quand le ministère n'a publié AUCUNE nuance. Ce n'est pas « Autres » :
  c'est « non mesuré ». Les confondre revient à afficher 0 % pour tous les blocs là où
  la ventilation n'existe pas — ce que faisait cet atlas aux municipales 2026
  (24 816 communes à « LFI 0 % »), aux européennes 2019 et aux départementales 2021."""

from __future__ import annotations

import unicodedata

# Le ministère publie la colonne mais la laisse vide : aucune ventilation par liste
# n'existe pour ces voix (communes de moins de 1 000 habitants aux municipales).
SANS_NUANCE = "SANS_NUANCE"
NUANCES_NON_COMMUNIQUEES = {"NC", "LNC", "", "NAN", "NONE"}
# Départementales : la nuance porte sur le BINÔME et préfixe la famille par « BC- »
# (BC-UG, BC-RN, BC-UCD…). Sans ce retrait, 100 % des voix de 2021 tombaient en « Autres ».
PREFIXE_BINOME = "BC-"
# « UG » ne veut pas dire la même chose selon le scrutin : aux législatives c'est la
# coalition SANS bulletin LFI séparé (NUPES, NFP), donc un proxy du vote insoumis ; au
# binôme des départementales c'est une union de la gauche ordinaire, que LFI ne conduit
# pas. On la traite comme les listes d'union (UGL) : bloc de gauche, hors voix LFI.
NUANCE_BINOME = {"UG": "UGL"}


def _sans_accent(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", str(s)) if not unicodedata.combining(c)
    ).upper()


# --- nuance MI -> famille politique -----------------------------------------
NUANCE_FAMILLE: dict[str, str] = {
    # extrême gauche
    "EXG": "EXG",
    "LO": "EXG",
    "NPA": "EXG",
    "DXG": "EXG",
    "FRN": "EXG",
    # France insoumise
    "FI": "LFI",
    "LFI": "LFI",
    # coalitions législatives où LFI est un pôle moteur et n'a pas de bulletin
    # séparé (NUPES 2022 = NUP, NFP 2024 = UG) : le score de l'union sert de proxy
    # au vote LFI (affiché comme tel, couleurs NFP).
    "NUP": "UG",
    "UG": "UG",
    "UDG": "UG",
    # listes « union de la gauche » des scrutins de liste (LUG : européennes,
    # municipales, régionales). LFI y a une liste PROPRE à côté (nuance LFI, ou liste
    # conduite par LFI repérée par la table dédiée) : la liste d'union ne doit donc PAS
    # être comptée comme LFI. Ex. européennes 2024, LUG = liste Glucksmann/Place Publique.
    "LUG": "UGL",
    # « union de la gauche et des écologistes » : même statut que LUG. 11,5 % des voix
    # des régionales 2021 (T1) et 20,3 % au T2 tombaient en « Autres » faute de ce code.
    "UGE": "UGL",
    # « union du centre et de la gauche » : union à dominante sociale-démocrate.
    "UCG": "DVG",
    # communistes
    "COM": "PCF",
    # socialistes / radicaux de gauche / divers gauche
    "SOC": "SOC",
    "RDG": "SOC",
    "DVG": "DVG",
    "PRG": "SOC",
    "FG": "PCF",
    "PG": "PCF",  # Parti de Gauche (LPG, municipales 2014) : pôle Front de gauche
    # écologistes
    "VEC": "ECO",
    "ECO": "ECO",
    "EELV": "ECO",
    # centre / présidentiel
    "ENS": "ENS",
    "REM": "ENS",
    "MDM": "ENS",
    "MODEM": "ENS",
    "HOR": "ENS",
    "DVC": "ENS",
    "ECG": "ENS",
    "REN": "ENS",
    "UDI": "UDI",
    "UC": "UDI",
    # droite
    "LR": "LR",
    "UMP": "LR",
    "DVD": "DVD",
    "DLF": "DVD",
    "CEN": "UDI",
    # unions de la droite des scrutins de liste et des binômes : pendant EXACT de LUG
    # côté gauche, et jusqu'ici absentes du mapping. Elles pesaient 15,5 % des voix aux
    # régionales 2021 (T1), 19,8 % au T2, 16,8 % aux conseils PLM 2026 — toutes comptées
    # en « Autres », d'où un bloc LR-DVD à 0,0 % à Paris là où la liste Pécresse est
    # arrivée en tête. « UCD » (union du centre et de la droite) est menée par la droite.
    "UD": "UD",
    "UCD": "UD",
    # extrême droite
    "RN": "RN",
    "FN": "RN",
    "REC": "REC",
    "UXD": "EXD",
    "EXD": "EXD",
    "DXD": "EXD",
    "DSV": "EXD",
    # Union des droites pour la République (Ciotti) : alliée du RN depuis 2024,
    # rattachée au bloc national-patriote comme le reste de l'union des droites.
    "UDR": "UDR",
    # régionalistes / divers / autres
    "REG": "REG",
    "DIV": "DIV",
    "AUT": "DIV",
    "DVD?": "DVD",
    "ALLI": "DIV",
    "ECOL": "ECO",
}

# --- candidats de présidentielle (nom de famille en majuscules) -> famille ---
PRESIDENTIELLE_FAMILLE: dict[str, str] = {
    # 2012
    "MELENCHON": "LFI",
    "JOLY": "ECO",
    "HOLLANDE": "SOC",
    "POUTOU": "EXG",
    "ARTHAUD": "EXG",
    "BAYROU": "ENS",
    "SARKOZY": "LR",
    "DUPONT-AIGNAN": "DVD",
    "LE PEN": "RN",
    "CHEMINADE": "DIV",
    # 2017
    "HAMON": "SOC",
    "FILLON": "LR",
    "MACRON": "ENS",
    "ASSELINEAU": "DIV",
    "LASSALLE": "DIV",
    "FILLON FRANCOIS": "LR",
    # 2022
    "ROUSSEL": "PCF",
    "JADOT": "ECO",
    "HIDALGO": "SOC",
    "PECRESSE": "LR",
    "ZEMMOUR": "REC",
}

# --- famille -> bloc6 (recomposition de la prez) -----------------------------
FAMILLE_BLOC6: dict[str, str] = {
    "EXG": "LFI-PCF-EXG",
    "LFI": "LFI-PCF-EXG",
    "PCF": "LFI-PCF-EXG",
    "UG": "LFI-PCF-EXG",  # coalition de gauche, rattachée au pôle insoumis/gauche
    "UGL": "LFI-PCF-EXG",  # liste d'union de la gauche (recompo inchangée : pôle de gauche)
    "SOC": "PS-EELV",
    "ECO": "PS-EELV",
    "DVG": "PS-EELV",
    "ENS": "MoDem-EM",
    "UDI": "MoDem-EM",
    "LR": "LR-DVD",
    "DVD": "LR-DVD",
    "UD": "LR-DVD",
    "RN": "RN-EXD",
    "REC": "RN-EXD",
    "EXD": "RN-EXD",
    "UDR": "RN-EXD",
    "REG": "Autres",
    "DIV": "Autres",
}

# --- famille -> tripartition (3 blocs de la prez) ----------------------------
FAMILLE_TRIPARTITION: dict[str, str] = {
    "EXG": "social_ecologique",
    "LFI": "social_ecologique",
    "PCF": "social_ecologique",
    "UG": "social_ecologique",
    "UGL": "social_ecologique",
    "SOC": "social_ecologique",
    "ECO": "social_ecologique",
    "DVG": "social_ecologique",
    "ENS": "liberal_progressiste",
    "UDI": "liberal_progressiste",
    "LR": "national_patriote",
    "DVD": "national_patriote",
    "UD": "national_patriote",
    "RN": "national_patriote",
    "REC": "national_patriote",
    "EXD": "national_patriote",
    "UDR": "national_patriote",
    "REG": "autres",
    "DIV": "autres",
}

BLOC6_ORDRE = ["LFI-PCF-EXG", "PS-EELV", "MoDem-EM", "LR-DVD", "RN-EXD", "Autres"]
TRIPARTITION_ORDRE = [
    "social_ecologique",
    "liberal_progressiste",
    "national_patriote",
    "autres",
]

# Familles considérées comme "la gauche" (pour les réservoirs LFI/gauche)
FAMILLES_GAUCHE = {"EXG", "LFI", "PCF", "UG", "UGL", "SOC", "ECO", "DVG"}
# LFI proprement dite : bulletin LFI, ou union LÉGISLATIVE sans bulletin LFI séparé
# (NUPES/NFP = UG). Les listes d'union de la gauche (UGL) en sont exclues : aux scrutins
# de liste, LFI a son propre bulletin (nuance LFI / liste conduite par LFI).
FAMILLES_LFI = {"LFI", "UG"}


# --- européennes 2019 : numéro de panneau -> famille ------------------------
# Seul scrutin du corpus dont le fichier du ministère ne porte NI nuance NI nom de
# candidat (colonnes liste_court / liste_long uniquement) : les 100 % des voix tombaient
# donc en « Autres », et l'atlas servait « LFI 0 % · PS 0 % · RN 0 % » pour tout le pays.
# Le numéro de panneau est national et stable sur tout le fichier.
LISTE_EUROPEENNE_2019: dict[int, str] = {
    1: "LFI",  # La France insoumise
    2: "DIV",  # Une France royale au cœur de l'Europe
    3: "DIV",  # La ligne claire
    4: "DIV",  # Parti pirate
    5: "ENS",  # Renaissance (LREM-MoDem)
    6: "DIV",  # Démocratie représentative
    7: "EXD",  # Ensemble patriotes et gilets jaunes
    8: "DIV",  # PACE
    9: "ECO",  # Urgence écologie
    10: "EXD",  # Liste de la reconquête
    11: "UDI",  # Les Européens (UDI)
    12: "SOC",  # Envie d'Europe (PS - Place publique)
    13: "DIV",  # Parti fédéraliste européen
    14: "DIV",  # Mouvement pour l'initiative citoyenne
    15: "DVD",  # Debout la France
    16: "DIV",  # Allons enfants
    17: "ECO",  # Décroissance 2019
    18: "EXG",  # Lutte ouvrière
    19: "PCF",  # Pour l'Europe des gens (PCF)
    20: "DIV",  # Ensemble pour le Frexit (UPR)
    21: "SOC",  # Printemps européen (Génération.s)
    22: "DIV",  # À voix égales
    23: "RN",  # Prenez le pouvoir (RN)
    24: "DIV",  # Neutre et actif
    25: "EXG",  # Parti révolutionnaire communistes
    26: "DIV",  # Espéranto
    27: "DIV",  # Évolution citoyenne
    28: "DIV",  # Alliance jaune
    29: "LR",  # Union de la droite et du centre (LR)
    30: "ECO",  # Europe Écologie (EELV)
    31: "DIV",  # Parti animaliste
    32: "DIV",  # Les oubliés de l'Europe
    33: "DIV",  # UDLEF
    34: "DIV",  # Une Europe au service des peuples
}
LISTES_PAR_SCRUTIN: dict[str, dict[int, str]] = {
    "2019-europeenne": LISTE_EUROPEENNE_2019
}


def _texte(v) -> str:
    """Normalise une cellule pandas (None / NaN / '' donnent une chaîne vide)."""
    s = "" if v is None else str(v).strip()
    return "" if s.lower() in ("nan", "none", "<na>") else s


def famille_de_liste(scrutin: str, panneau) -> str | None:
    """Famille d'une liste repérée par son numéro de panneau, pour les scrutins dont le
    fichier du ministère ne publie pas de nuance (européennes 2019)."""
    table = LISTES_PAR_SCRUTIN.get(scrutin)
    if table is None or panneau is None or panneau != panneau:
        return None
    return table.get(int(panneau))


def nuance_vers_famille(
    nuance: str | None, nom: str | None = None, patronymes: bool = False
) -> str:
    """Renvoie la famille politique pour une nuance MI ; à défaut, et SEULEMENT à la
    présidentielle (`patronymes`), tente le nom du candidat.

    Les scrutins de liste (européennes, municipales, régionales) préfixent la
    nuance par « L » (LFI, LRN, LUG…) et les départementales par « BC- » (binôme) :
    on retombe sur la nuance nue.

    `patronymes` existe parce que la table des candidat·es de présidentielle ne
    distingue pas un homonyme d'un candidat national : appliquée aux municipales, où le
    ministère publie une ligne par nom sans nuance, elle a rangé 285 000 voix dans un
    bloc sur la seule foi d'un patronyme (ROUSSEL → PCF, LASSALLE → divers, HAMON → PS).
    Dix-neuf communes basculaient de ce fait du régime « non ventilé » au régime
    « mesuré » et affichaient un score de bloc entièrement fabriqué — 100 % des voix à
    Marquillies (59210) et à Vrigne-aux-Bois (08302). Un patronyme n'identifie une
    famille QU'au scrutin où la table des candidats fait foi.

    Renvoie SANS_NUANCE — et non "DIV" — quand rien n'est publié : ni nuance, ni nuance
    « NC » (non communiqué), ni nom de candidat. Une voix non ventilée n'est pas une
    voix « divers »."""
    code = _texte(nuance).upper()
    binome = code.startswith(PREFIXE_BINOME)
    if binome:
        code = code[len(PREFIXE_BINOME) :]
    if code in NUANCES_NON_COMMUNIQUEES:
        code = ""
    if code:
        fam = NUANCE_BINOME.get(code) if binome else None
        if not fam:
            fam = NUANCE_FAMILLE.get(code)
        if not fam and len(code) > 1 and code.startswith("L"):
            fam = NUANCE_FAMILLE.get(code[1:])
        if fam:
            return fam
    nom = _texte(nom)
    if patronymes and nom:
        fam = PRESIDENTIELLE_FAMILLE.get(_sans_accent(nom).strip())
        if fam:
            return fam
    # Un nom hors table n'identifie RIEN : aux municipales plurinominales le ministère
    # publie une ligne par candidat·e, sans nuance — ces voix ne sont pas « divers »,
    # elles ne sont pas ventilables. Les candidat·es de présidentielle hors bloc
    # (Lassalle, Asselineau, Cheminade) sont, eux, listés explicitement en "DIV".
    return "DIV" if code else SANS_NUANCE
