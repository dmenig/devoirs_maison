"""Atlas électoral militant — l'application n'est qu'UNE carte plein écran.

La carte est un composant Leaflet côté client (zoom continu et fluide, navigation sans
rechargement) servi en plein écran. Elle va chercher elle-même, depuis GitHub, les
contours et les valeurs par échelle (France → région → département → commune →
bureau de vote). Voir map.html et DOCUMENTATION.md.
"""

from __future__ import annotations

import pathlib

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Atlas électoral militant",
    page_icon="🗳️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Plein écran : on retire tout le chrome Streamlit (en-tête, marges, bordures).
st.markdown(
    """<style>
    [data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stSidebar"],footer{display:none!important}
    .block-container,[data-testid="stAppViewContainer"],[data-testid="stAppViewBlockContainer"],
    [data-testid="stMainBlockContainer"]{padding:0!important;margin:0!important;max-width:100%!important}
    iframe{height:100vh!important;width:100vw!important;border:none!important;display:block}
    </style>""",
    unsafe_allow_html=True,
)

BASE = "https://raw.githubusercontent.com/dmenig/devoirs_maison/master/data_app"
html = (
    pathlib.Path(__file__)
    .with_name("map.html")
    .read_text(encoding="utf-8")
    .replace("__BASE__", BASE)
)
components.html(html, height=1000, scrolling=False)
