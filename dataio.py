"""Chargement (mis en cache) des données préparées dans data_app/."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st

DATA = Path(__file__).parent / "data_app"
GEO = DATA / "geo"


@st.cache_data(show_spinner=False)
def manifest() -> dict:
    f = DATA / "manifest.json"
    return json.loads(f.read_text()) if f.exists() else {"scrutins": [], "niveaux": []}


@st.cache_data(show_spinner=False)
def resultats(niveau: str) -> pd.DataFrame:
    f = DATA / f"resultats_{niveau}.parquet"
    return pd.read_parquet(f) if f.exists() else pd.DataFrame()


@st.cache_data(show_spinner=False)
def socio_iris() -> pd.DataFrame:
    f = DATA / "socio_iris.parquet"
    return pd.read_parquet(f) if f.exists() else pd.DataFrame()


@st.cache_data(show_spinner=False)
def socio_commune() -> pd.DataFrame:
    f = DATA / "socio_commune.parquet"
    return pd.read_parquet(f) if f.exists() else pd.DataFrame()


@st.cache_data(show_spinner=False)
def ref(nom: str) -> pd.DataFrame:
    f = DATA / f"ref_{nom}.parquet"
    return pd.read_parquet(f) if f.exists() else pd.DataFrame()


@st.cache_data(show_spinner=False)
def geojson(nom: str) -> dict | None:
    f = GEO / f"{nom}.geojson"
    return json.loads(f.read_text()) if f.exists() else None


@st.cache_data(show_spinner=False)
def geojson_communes(dep: str) -> dict | None:
    f = GEO / "communes" / f"{dep}.geojson"
    return json.loads(f.read_text()) if f.exists() else None


@st.cache_data(show_spinner=False)
def geojson_iris(dep: str) -> dict | None:
    f = GEO / "iris" / f"{dep}.geojson"
    return json.loads(f.read_text()) if f.exists() else None


@st.cache_data(show_spinner=False)
def noms() -> dict[str, dict[str, str]]:
    """Tables code -> nom pour chaque niveau."""
    out: dict[str, dict[str, str]] = {}
    rc = ref("communes")
    if not rc.empty:
        out["commune"] = dict(zip(rc["code_commune"], rc["nom"]))
    rd = ref("departement")
    if not rd.empty:
        out["departement"] = dict(zip(rd["code_departement"], rd["nom"]))
    rr = ref("region")
    if not rr.empty:
        out["region"] = dict(zip(rr["code_region"], rr["nom"]))
    return out
