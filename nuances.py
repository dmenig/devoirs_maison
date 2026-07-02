"""Mapping des nuances du ministère de l'Intérieur (et candidats de présidentielle)
vers les familles politiques, puis vers les regroupements utilisés par la présentation
de l'Institut La Boétie :

- bloc6 : la « recomposition » en 6 colonnes
  (LFI-PCF-EXG | PS-EELV | MoDem-EM | LR-DVD | RN-EXD | Autres)
- tripartition : les 3 blocs (social-écologique | libéral-progressiste | national-patriote)

Les codes nuance varient à chaque scrutin ; ce mapping est volontairement large.
Toute nuance inconnue tombe dans "DIV" (et le bloc "Autres")."""

from __future__ import annotations

import unicodedata


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
    # communistes
    "COM": "PCF",
    # socialistes / radicaux de gauche / divers gauche
    "SOC": "SOC",
    "RDG": "SOC",
    "DVG": "DVG",
    "PRG": "SOC",
    "FG": "PCF",
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
    # extrême droite
    "RN": "RN",
    "FN": "RN",
    "REC": "REC",
    "UXD": "EXD",
    "EXD": "EXD",
    "DSV": "EXD",
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
    "RN": "RN-EXD",
    "REC": "RN-EXD",
    "EXD": "RN-EXD",
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
    "RN": "national_patriote",
    "REC": "national_patriote",
    "EXD": "national_patriote",
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


def nuance_vers_famille(nuance: str | None, nom: str | None = None) -> str:
    """Renvoie la famille politique pour une nuance MI ; à défaut, tente le nom
    de candidat (présidentielle).

    Les scrutins de liste (européennes, municipales, régionales) préfixent la
    nuance par « L » (LFI, LRN, LUG…) : on retombe sur la nuance sans préfixe."""
    if nuance:
        code = str(nuance).strip().upper()
        fam = NUANCE_FAMILLE.get(code)
        if fam:
            return fam
        if len(code) > 1 and code.startswith("L"):
            fam = NUANCE_FAMILLE.get(code[1:])
            if fam:
                return fam
    if nom:
        fam = PRESIDENTIELLE_FAMILLE.get(_sans_accent(nom).strip())
        if fam:
            return fam
    return "DIV"
