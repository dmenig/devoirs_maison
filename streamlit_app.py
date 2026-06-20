"""Atlas électoral militant — une carte de France, cliquable, à toutes les échelles.

France → Région → Département → Commune → IRIS / Bureau de vote (+ Circonscriptions).
L'interface est une carte : on survole une zone pour voir ses valeurs (en couleur
relative à la moyenne, pas en chiffres bruts), on clique pour entrer dans ses
subdivisions plus fines. Tous les réglages sont dans le volet latéral (replié par
défaut). Données : hexagonal. Voir DOCUMENTATION.md.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

import dataio as io
import indicators as ind
import viz
from panels import panneau_commune, panneau_entite

st.set_page_config(page_title="Atlas électoral militant", page_icon="🗳️",
                   layout="wide", initial_sidebar_state="collapsed")
st.markdown(
    "<style>.block-container{padding:0.6rem 1rem 0;} header{visibility:hidden;}</style>",
    unsafe_allow_html=True,
)
CONTINENTALE = [[41.3, -5.2], [51.2, 9.7]]


def init_state() -> None:
    st.session_state.setdefault("path", [])


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
    fil = " › ".join(["🇫🇷 France"] + [nom for _n, _c, nom in chemin])
    c1, c2 = st.columns([1, 9])
    if chemin and c1.button("⬅", help="Remonter d'un niveau", width="stretch"):
        remonter(len(chemin) - 1)
    c2.markdown(f"**{fil}**")


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
    disp = {f"{nom} · {code}": (code, nom) for code, nom in options}
    choix = st.sidebar.selectbox(f"🔎 {label}", ["—", *sorted(disp)], key=cle)
    if choix != "—":
        code, nom = disp[choix]
        if st.session_state.get(cle + "_done") != code:
            st.session_state[cle + "_done"] = code
            aller_a_commune(code) if niveau == "commune" else push(niveau, code, nom)


def gerer_clic(m, cle: str) -> str | None:
    out = st_folium(m, key=cle, height=760, use_container_width=True,
                    returned_objects=["last_active_drawing"])
    if out and out.get("last_active_drawing"):
        code = out["last_active_drawing"]["properties"].get("_code")
        if code and st.session_state.get("handled_" + cle) != code:
            st.session_state["handled_" + cle] = code
            return code
    return None


def selecteur_indicateur(niveau_socio: bool) -> dict:
    st.sidebar.markdown("### Réglages")
    familles = ["Électoral", "Réservoirs de voix"]
    if niveau_socio:
        familles.append("Socio-économique")
    famille = st.sidebar.radio("Indicateur cartographié", familles)
    scrutins = ind.scrutins_ordonnes(io.resultats("commune"))
    lib = {c: l for c, l in scrutins}
    cles = [c for c, _ in scrutins]
    # défauts = scrutins à couverture nationale complète (sinon la carte est vide)
    euro = [c for c in cles if c.endswith("-europeenne")]
    pres1 = [c for c in cles if c.endswith("-presidentielle-1")]
    def_scr = (euro or pres1 or cles)[-1]
    p: dict = {"famille": famille}
    if famille == "Électoral":
        p["scrutin"] = st.sidebar.selectbox("Scrutin", cles, index=cles.index(def_scr),
                                            format_func=lib.get)
        p["indic"] = st.sidebar.selectbox("Mesure", list(ind.INDICATEURS_ELECT))
    elif famille == "Réservoirs de voix":
        i_a = cles.index(pres1[-1]) if pres1 else 0
        i_b = cles.index(euro[-1]) if euro else len(cles) - 1
        p["sa"] = st.sidebar.selectbox("Scrutin de départ", cles, index=i_a, format_func=lib.get)
        p["sb"] = st.sidebar.selectbox("Scrutin d'arrivée", cles, index=i_b, format_func=lib.get)
        p["metrique"] = st.sidebar.selectbox(
            "Réservoir", ["report_lfi", "ratio_participation", "stock_abstention"],
            format_func={"report_lfi": "Report des voix LFI (%)",
                         "ratio_participation": "Différentiel de participation (%)",
                         "stock_abstention": "Stock d'abstentionnistes (voix)"}.get)
    else:
        p["indic"] = st.sidebar.selectbox("Mesure", list(ind.INDICATEURS_SOCIO))
    return p


def reference_nationale(p: dict) -> float | None:
    """Valeur France entière, pour colorer en écart à la moyenne nationale (cf. prez)."""
    fr = io.resultats("france")
    if p["famille"] == "Électoral":
        col = ind.INDICATEURS_ELECT[p["indic"]][0]
        row = fr[fr["scrutin"] == p["scrutin"]]
        return float(row.iloc[0][col]) if not row.empty else None
    if p["famille"] == "Réservoirs de voix":
        return ind.reservoirs_par_code(fr, p["sa"], p["sb"], p["metrique"]).get("FR")
    return None


def valeurs(df: pd.DataFrame, p: dict) -> tuple[dict, str, str]:
    if p["famille"] == "Électoral":
        col, unit, _, _ = ind.INDICATEURS_ELECT[p["indic"]]
        return ind.valeurs_par_code(df, p["scrutin"], col), p["indic"], unit
    v = ind.reservoirs_par_code(df, p["sa"], p["sb"], p["metrique"])
    lbl = {"report_lfi": "Report LFI", "ratio_participation": "Diff. participation",
           "stock_abstention": "Stock abstention"}[p["metrique"]]
    return v, lbl, "voix" if p["metrique"] == "stock_abstention" else "%"


def vue_france(p: dict) -> None:
    regs = io.ref("region")
    recherche_niveau("Rechercher une région", list(zip(regs["code_region"], regs["nom"])),
                     "region", "search_fr")
    vals, lbl, unit = valeurs(io.resultats("region"), p)
    m = viz.choropleth(io.geojson("regions"), vals, "code", lbl, unit, "",
                       bounds=CONTINENTALE, reference=reference_nationale(p))
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
    vals, lbl, unit = valeurs(io.resultats("departement"), p)
    code = gerer_clic(viz.choropleth(gj, vals, "code", lbl, unit, "",
                                     reference=reference_nationale(p)), "reg_" + code_reg)
    if code:
        push("departement", code, io.noms().get("departement", {}).get(code, code))


def vue_departement(code_dep: str, p: dict) -> None:
    rc = io.ref("communes")
    dans = rc[rc["code_departement"] == code_dep]
    recherche_niveau("Rechercher une commune", list(zip(dans["code_commune"], dans["nom"])),
                     "commune", "search_dep_" + code_dep)
    decoupe = st.sidebar.radio("Découper le département en", ["Communes", "Circonscriptions"])
    if decoupe == "Circonscriptions":
        gj = io.geojson("circonscriptions")
        if gj:
            gj = {"type": "FeatureCollection", "features": [
                f for f in gj["features"]
                if str(f["properties"]["code_circonscription"]).split("-")[0] == code_dep.zfill(2)]}
            vals, lbl, unit = valeurs(io.resultats("circonscription"), p)
            code = gerer_clic(viz.choropleth(gj, vals, "code_circonscription", lbl, unit, "",
                                             reference=reference_nationale(p)), "dep_circo_" + code_dep)
            if code:
                push("circonscription", code, f"Circo {code}")
        return
    gj = io.geojson_communes(code_dep)
    if not gj:
        st.warning("Contours communaux indisponibles pour ce département.")
        return
    if p["famille"] == "Socio-économique":
        col, unit, _, _ = ind.INDICATEURS_SOCIO[p["indic"]]
        sc = io.socio_commune()
        vals = dict(zip(sc["code_commune"], sc[col])) if not sc.empty else {}
        lbl, ref = p["indic"], (sc[col].mean() if not sc.empty else None)
    else:
        vals, lbl, unit = valeurs(io.resultats("commune"), p)
        ref = reference_nationale(p)
    code = gerer_clic(viz.choropleth(gj, vals, "code", lbl, unit, "", reference=ref), "dep_" + code_dep)
    if code:
        push("commune", code, io.noms().get("commune", {}).get(code, code))


def main() -> None:
    init_state()
    try:
        io.assurer_donnees()
    except Exception as e:
        st.error(f"Téléchargement des données impossible ({e}). Rechargez la page.")
        return
    if not io.manifest()["scrutins"]:
        st.error("Données présentes mais vides. Régénérez `prepare_data.py`.")
        return
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
