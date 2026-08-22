"""Atlas électoral militant — l'application n'est qu'UNE carte plein écran.

La carte est un composant Leaflet côté client (zoom continu et fluide, navigation sans
rechargement) servi en plein écran. Elle va chercher elle-même, depuis GitHub, les
contours et les valeurs par échelle (France → région → département → commune →
bureau de vote). Voir map.html et DOCUMENTATION.md.
"""

from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components

from build_map import assemble_map

st.set_page_config(
    page_title="Atlas électoral militant",
    page_icon="🗳️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Plein écran : on retire tout le chrome Streamlit (en-tête, marges, bordures).
# Le conteneur vertical de Streamlit espace ses enfants de 16 px : ce style (rendu comme un
# bloc de hauteur nulle) poussait donc l'iframe 16 px vers le bas — bande blanche en haut,
# 16 px de carte coupés en bas, et 116 px de défilement fantôme (l'élément conserve la
# hauteur demandée à components.html alors que l'iframe est ramenée à 100vh). D'où
# gap:0, la hauteur de l'élément alignée sur l'iframe, et le défilement de la page bloqué.
st.markdown(
    """<style>
    [data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stSidebar"],footer{display:none!important}
    .block-container,[data-testid="stAppViewContainer"],[data-testid="stAppViewBlockContainer"],
    [data-testid="stMainBlockContainer"]{padding:0!important;margin:0!important;max-width:100%!important}
    [data-testid="stVerticalBlock"]{gap:0!important}
    [data-testid="stElementContainer"]:has(iframe){height:100vh!important;overflow:hidden!important}
    section[data-testid="stMain"],[data-testid="stAppViewContainer"]{overflow:hidden!important}
    html,body,[data-testid="stApp"]{overflow:hidden!important;overscroll-behavior:none;background:#0f0d15}
    iframe{height:100vh!important;width:100vw!important;border:none!important;display:block}
    </style>""",
    unsafe_allow_html=True,
)

BASE = "https://raw.githubusercontent.com/dmenig/devoirs_maison/master/data_app"
components.html(assemble_map(BASE), height=1000, scrolling=False)
