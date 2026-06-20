"""Atlas électoral militant — carte de France cliquable, toutes les échelles.

France → Région → Département → Commune → IRIS / Bureau de vote (+ Circonscriptions).
La recherche s'adapte à l'échelle affichée ; chercher une commune ouvre directement
ses IRIS et bureaux de vote cliquables. Données : hexagonal (Min. Intérieur, INSEE
FILOSOFI, COG, IGN). Voir DOCUMENTATION.md.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

import dataio as io
import indicators as ind
import viz
from panels import panneau_commune, panneau_entite

st.set_page_config(page_title="Atlas électoral militant", page_icon="🗳️", layout="wide")

# Cadrage France continentale au démarrage (les DOM restent accessibles via recherche).
CONTINENTALE = [[41.3, -5.2], [51.2, 9.7]]


def init_state() -> None:
    st.session_state.setdefault("path", [])  # liste de (niveau, code, nom)


def push(niveau: str, code: str, nom: str) -> None:
    st.session_state["path"].append((niveau, code, nom))
    st.rerun()


def remonter(n: int) -> None:
    st.session_state["path"] = st.session_state["path"][:n]
    st.rerun()


def aller_a_commune(code: str) -> None:
    rc = io.ref("communes")
    row = rc[rc["code_commune"] == code]
    if row.empty:
        return
    r = row.iloc[0]
    nm = io.noms()
    st.session_state["path"] = [
        ("region", r["code_region"], nm.get("region", {}).get(r["code_region"], r["code_region"])),
        ("departement", r["code_departement"],
         nm.get("departement", {}).get(r["code_departement"], r["code_departement"])),
        ("commune", code, r["nom"]),
    ]
    st.rerun()


def fil_ariane() -> None:
    chemin = st.session_state["path"]
    cols = st.columns([1] * (len(chemin) + 1) + [max(1, 6 - len(chemin))])
    if cols[0].button("🇫🇷 France", use_container_width=True):
        remonter(0)
    for i, (_niv, _code, nom) in enumerate(chemin):
        if cols[i + 1].button(nom, use_container_width=True):
            remonter(i + 1)


def recherche_commune_globale() -> None:
    rc = io.ref("communes")
    if rc.empty:
        return
    options = {f"{n} · {c}": c for c, n in zip(rc["code_commune"], rc["nom"])}
    choix = st.sidebar.selectbox("🔎 Aller à une commune", ["—", *sorted(options)],
                                 key="search_commune_globale")
    if choix != "—":
        code = options[choix]
        if st.session_state.get("_jumped") != code:
            st.session_state["_jumped"] = code
            aller_a_commune(code)


def recherche_niveau(label: str, options: list[tuple[str, str]], niveau: str, cle: str) -> None:
    """Recherche adaptée à l'échelle affichée (clic = même chose que sur la carte)."""
    disp = {f"{nom} · {code}": (code, nom) for code, nom in options}
    choix = st.selectbox(f"🔎 {label}", ["—", *sorted(disp)], key=cle)
    if choix != "—":
        code, nom = disp[choix]
        if st.session_state.get(cle + "_done") != code:
            st.session_state[cle + "_done"] = code
            if niveau == "commune":
                aller_a_commune(code)
            else:
                push(niveau, code, nom)


def gerer_clic(m, cle: str) -> str | None:
    out = st_folium(m, key=cle, height=600, use_container_width=True,
                    returned_objects=["last_active_drawing"])
    if out and out.get("last_active_drawing"):
        code = out["last_active_drawing"]["properties"].get("_code")
        if code and st.session_state.get("handled_" + cle) != code:
            st.session_state["handled_" + cle] = code
            return code
    return None


def selecteur_indicateur(niveau_socio: bool) -> dict:
    familles = ["Électoral", "Réservoirs de voix"]
    if niveau_socio:
        familles.append("Socio-économique")
    famille = st.sidebar.radio("Indicateur cartographié", familles)
    res = io.resultats("commune")
    scrutins = ind.scrutins_ordonnes(res)
    lib = {c: l for c, l in scrutins}
    cles = [c for c, _ in scrutins]
    p: dict = {"famille": famille}
    if famille == "Électoral":
        p["scrutin"] = st.sidebar.selectbox("Scrutin", cles, index=len(cles) - 1,
                                            format_func=lib.get)
        p["indic"] = st.sidebar.selectbox("Mesure", list(ind.INDICATEURS_ELECT))
    elif famille == "Réservoirs de voix":
        p["sa"] = st.sidebar.selectbox("Scrutin de départ", cles, index=0, format_func=lib.get)
        p["sb"] = st.sidebar.selectbox("Scrutin d'arrivée", cles, index=len(cles) - 1,
                                       format_func=lib.get)
        p["metrique"] = st.sidebar.selectbox(
            "Réservoir", ["report_lfi", "ratio_participation", "stock_abstention"],
            format_func={"report_lfi": "Report des voix LFI (%)",
                         "ratio_participation": "Différentiel de participation (%)",
                         "stock_abstention": "Stock d'abstentionnistes (voix)"}.get)
    else:
        p["indic"] = st.sidebar.selectbox("Mesure", list(ind.INDICATEURS_SOCIO))
    return p


def valeurs(df: pd.DataFrame, p: dict) -> tuple[dict, str, str, str]:
    if p["famille"] == "Électoral":
        col, unit, pal, _ = ind.INDICATEURS_ELECT[p["indic"]]
        return ind.valeurs_par_code(df, p["scrutin"], col), p["indic"], unit, pal
    v = ind.reservoirs_par_code(df, p["sa"], p["sb"], p["metrique"])
    lbl = {"report_lfi": "Report LFI", "ratio_participation": "Diff. participation",
           "stock_abstention": "Stock abstention"}[p["metrique"]]
    unit = "voix" if p["metrique"] == "stock_abstention" else "%"
    pal = "Greens" if p["metrique"] == "ratio_participation" else "Reds"
    return v, lbl, unit, pal


def vue_france(p: dict) -> None:
    regs = io.ref("region")
    recherche_niveau("Rechercher une région", list(zip(regs["code_region"], regs["nom"])),
                     "region", "search_fr")
    gj = io.geojson("regions")
    vals, lbl, unit, pal = valeurs(io.resultats("region"), p)
    st.subheader("France — cliquez (ou cherchez) une région")
    m = viz.choropleth(gj, vals, "code", lbl, unit, pal, bounds=CONTINENTALE)
    code = gerer_clic(m, "fr")
    if code:
        push("region", code, io.noms().get("region", {}).get(code, code))


def vue_region(code_reg: str, p: dict) -> None:
    deps = io.ref("departement")
    dans = deps[deps["code_region"] == code_reg]
    recherche_niveau("Rechercher un département", list(zip(dans["code_departement"], dans["nom"])),
                     "departement", "search_reg_" + code_reg)
    codes = set(dans["code_departement"])
    gj = io.geojson("departements")
    gj = {"type": "FeatureCollection",
          "features": [f for f in gj["features"] if f["properties"]["code"] in codes]}
    vals, lbl, unit, pal = valeurs(io.resultats("departement"), p)
    st.subheader("Région — cliquez (ou cherchez) un département")
    code = gerer_clic(viz.choropleth(gj, vals, "code", lbl, unit, pal), "reg_" + code_reg)
    if code:
        push("departement", code, io.noms().get("departement", {}).get(code, code))


def vue_departement(code_dep: str, p: dict) -> None:
    rc = io.ref("communes")
    dans = rc[rc["code_departement"] == code_dep]
    recherche_niveau("Rechercher une commune", list(zip(dans["code_commune"], dans["nom"])),
                     "commune", "search_dep_" + code_dep)
    decoupe = st.radio("Découper en", ["Communes", "Circonscriptions"], horizontal=True)
    if decoupe == "Circonscriptions":
        gj = io.geojson("circonscriptions")
        if gj:
            gj = {"type": "FeatureCollection", "features": [
                f for f in gj["features"]
                if str(f["properties"]["code_circonscription"]).split("-")[0] == code_dep.zfill(2)]}
            vals, lbl, unit, pal = valeurs(io.resultats("circonscription"), p)
            code = gerer_clic(viz.choropleth(gj, vals, "code_circonscription", lbl, unit, pal),
                              "dep_circo_" + code_dep)
            if code:
                push("circonscription", code, f"Circo {code}")
        return
    gj = io.geojson_communes(code_dep)
    if not gj:
        st.warning("Contours communaux indisponibles pour ce département.")
        return
    if p["famille"] == "Socio-économique":
        col, unit, pal, _ = ind.INDICATEURS_SOCIO[p["indic"]]
        sc = io.socio_commune()
        vals = dict(zip(sc["code_commune"], sc[col])) if not sc.empty else {}
        lbl = p["indic"]
    else:
        vals, lbl, unit, pal = valeurs(io.resultats("commune"), p)
    st.subheader("Département — cliquez (ou cherchez) une commune")
    code = gerer_clic(viz.choropleth(gj, vals, "code", lbl, unit, pal), "dep_" + code_dep)
    if code:
        push("commune", code, io.noms().get("commune", {}).get(code, code))


def main() -> None:
    init_state()
    st.title("🗳️ Atlas électoral militant")
    st.caption("Connaître le territoire à toutes les échelles — d'après la présentation "
               "« Analyse électorale » de l'Institut La Boétie. Voir DOCUMENTATION.md.")
    if not io.assurer_donnees() or not io.manifest()["scrutins"]:
        st.error("Données indisponibles. En local : lancez `prepare_data.py`. "
                 "En ligne : vérifiez l'accès à la release de données.")
        return
    recherche_commune_globale()
    fil_ariane()
    path = st.session_state["path"]
    niveau = path[-1][0] if path else "france"
    p = selecteur_indicateur(niveau_socio=niveau in ("departement", "commune"))

    if niveau == "france":
        vue_france(p)
    elif niveau == "region":
        vue_region(path[-1][1], p)
    elif niveau == "departement":
        vue_departement(path[-1][1], p)
    elif niveau == "circonscription":
        panneau_entite("circonscription", path[-1][1], path[-1][2])
    elif niveau == "commune":
        panneau_commune(path[-1][1], path[-1][2], p)


if __name__ == "__main__":
    main()
