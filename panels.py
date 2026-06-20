"""Panneaux de détail : commune (avec IRIS + bureaux de vote) et entité agrégée
(circonscription)."""

from __future__ import annotations

import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

import dataio as io
import indicators as ind
import viz


def _selecteur_paire(scrutins: list[tuple[str, str]], cle: str) -> tuple[str, str]:
    lib = {c: l for c, l in scrutins}
    cles = [c for c, _ in scrutins]
    c1, c2 = st.columns(2)
    sa = c1.selectbox("De", cles, index=0, format_func=lib.get, key=cle + "a")
    sb = c2.selectbox(
        "À", cles, index=len(cles) - 1, format_func=lib.get, key=cle + "b"
    )
    return sa, sb


def _bloc_reservoirs(df: pd.DataFrame, code: str, scrutins, cle: str) -> None:
    st.markdown("##### Réservoirs de voix")
    sa, sb = _selecteur_paire(scrutins, cle)
    r = ind.reservoirs(df, code, sa, sb)
    if not r:
        st.info("Données indisponibles pour ce couple de scrutins.")
        return
    cols = st.columns(4)
    cols[0].metric(
        "Report voix LFI", f"{r['report_lfi']}%" if r["report_lfi"] is not None else "—"
    )
    cols[1].metric("Δ voix LFI", f"{r['diff_voix_lfi']:+d}")
    cols[2].metric(
        "Différentiel participation",
        f"{r['ratio_participation']}%" if r["ratio_participation"] is not None else "—",
    )
    cols[3].metric(
        "Stock abstention (arrivée)", f"{r['stock_abstention_b']:,}".replace(",", " ")
    )
    st.caption(
        "Report LFI = voix LFI(arrivée)/voix LFI(départ). "
        "Stock abstention = inscrits × taux d'abstention au scrutin d'arrivée."
    )


def panneau_entite(niveau: str, code: str, nom: str) -> None:
    df = io.resultats(niveau)
    scrutins = ind.scrutins_ordonnes(df[df["code"] == code])
    st.subheader(f"{nom}")
    st.markdown("##### Recomposition politique (en % des inscrits)")
    st.dataframe(ind.table_recomposition(df, code), width="stretch")
    if scrutins:
        _bloc_reservoirs(df, code, scrutins, "ent_" + code)


def _carte_iris(code_commune: str) -> None:
    dep = code_commune[:3] if code_commune.startswith("97") else code_commune[:2]
    gj = io.geojson_iris(dep)
    socio = io.socio_iris()
    if gj is None or socio.empty:
        st.info("Contours / données IRIS indisponibles pour cette commune.")
        return
    feats = [
        f
        for f in gj["features"]
        if str(f["properties"]["code_iris"]).startswith(code_commune)
    ]
    if not feats:
        st.info("Pas d'IRIS distinct (commune < 5 000 hab. ou hors métropole).")
        return
    indic = st.selectbox(
        "Indicateur IRIS", list(ind.INDICATEURS_SOCIO), key="iris_ind_" + code_commune
    )
    col, unit, pal, _ = ind.INDICATEURS_SOCIO[indic]
    sub = socio[socio["code_commune"] == code_commune]
    vals = dict(zip(sub["code_iris"], sub[col]))
    ref = socio[col].mean()  # moyenne nationale IRIS
    m = viz.choropleth(
        {"type": "FeatureCollection", "features": feats},
        vals,
        "code_iris",
        indic,
        unit,
        pal,
        reference=ref,
    )
    out = st_folium(
        m,
        key="iris_map_" + code_commune,
        height=460,
        use_container_width=True,
        returned_objects=["last_active_drawing"],
    )
    if out and out.get("last_active_drawing"):
        props = out["last_active_drawing"]["properties"]
        ligne = sub[sub["code_iris"] == props.get("_code")]
        if not ligne.empty:
            r = ligne.iloc[0]
            st.markdown(
                f"**IRIS {props.get('_nom')}** — "
                f"revenu médian {r['revenu_median']:.0f} € · "
                f"taux de pauvreté {r['taux_pauvrete']:.0f} %"
            )


def _table_bureaux(code_commune: str) -> None:
    bv = io.resultats("bureau")
    bv = bv[bv["code"].str.startswith(code_commune + "_")]
    if bv.empty:
        st.info("Pas de résultats par bureau de vote.")
        return
    scrutins = ind.scrutins_ordonnes(bv)
    lib = {c: l for c, l in scrutins}
    cles = [c for c, _ in scrutins]

    st.markdown("##### Résultats par bureau de vote")
    scr = st.selectbox(
        "Scrutin",
        cles,
        index=len(cles) - 1,
        format_func=lib.get,
        key="bv_scr_" + code_commune,
    )
    sub = bv[bv["scrutin"] == scr].copy()
    sub["bureau"] = sub["code"].str.split("_").str[-1]
    cols = [
        "bureau",
        "inscrits",
        "participation",
        "lfi_pct",
        "b6_LFI-PCF-EXG",
        "b6_PS-EELV",
        "b6_MoDem-EM",
        "b6_LR-DVD",
        "b6_RN-EXD",
    ]
    ren = {
        "participation": "Particip.",
        "lfi_pct": "LFI %",
        "b6_LFI-PCF-EXG": "LFI-PCF-EXG",
        "b6_PS-EELV": "PS-EELV",
        "b6_MoDem-EM": "MoDem-EM",
        "b6_LR-DVD": "LR-DVD",
        "b6_RN-EXD": "RN-EXD",
    }
    st.dataframe(
        sub[cols].rename(columns=ren).sort_values("bureau"),
        width="stretch",
        hide_index=True,
    )

    st.markdown("##### Réservoirs de voix par bureau de vote")
    st.caption(
        "Où cibler le porte-à-porte : reports, participation, abstentionnistes "
        "mobilisables, bureau par bureau."
    )
    sa, sb = _selecteur_paire(scrutins, "bvres_" + code_commune)
    metrique = st.selectbox(
        "Réservoir",
        ["report_lfi", "ratio_participation", "stock_abstention"],
        format_func={
            "report_lfi": "Report des voix LFI (%)",
            "ratio_participation": "Différentiel de participation (%)",
            "stock_abstention": "Stock d'abstentionnistes (voix)",
        }.get,
        key="bvres_m_" + code_commune,
    )
    vals = ind.reservoirs_par_code(bv, sa, sb, metrique)
    if not vals:
        st.info("Données indisponibles pour ce couple de scrutins.")
        return
    asc = metrique == "ratio_participation"  # faibles reports = à reconquérir d'abord
    tab = pd.DataFrame(
        {"bureau": [c.split("_")[-1] for c in vals], "valeur": list(vals.values())}
    ).sort_values("valeur", ascending=asc)
    st.dataframe(
        tab,
        width="stretch",
        hide_index=True,
        column_config={
            "valeur": st.column_config.NumberColumn(
                {
                    "report_lfi": "Report LFI (%)",
                    "ratio_participation": "Δ participation (%)",
                    "stock_abstention": "Abstentionnistes (voix)",
                }[metrique]
            )
        },
    )


def panneau_commune(code: str, nom: str, p: dict) -> None:
    sc = io.socio_commune()
    row = sc[sc["code_commune"] == code]
    socio_txt = ""
    if not row.empty:
        r = row.iloc[0]
        rm = (
            f"{int(r['revenu_median']):,} €".replace(",", " ")
            if pd.notna(r["revenu_median"])
            else "—"
        )
        tp = f"{r['taux_pauvrete']:.0f} %" if pd.notna(r["taux_pauvrete"]) else "—"
        socio_txt = f" — revenu médian {rm} · pauvreté {tp}"
    st.caption(
        f"📍 **{nom}** ({code}){socio_txt} — quartiers (IRIS) ci-dessous, "
        "détails par scrutin et par bureau de vote dans les volets dépliables."
    )

    _carte_iris(code)

    df = io.resultats("commune")
    scrutins = ind.scrutins_ordonnes(df[df["code"] == code])
    with st.expander("📊 Recomposition politique & réservoirs (commune)"):
        st.dataframe(ind.table_recomposition(df, code), width="stretch")
        if scrutins:
            _bloc_reservoirs(df, code, scrutins, "com_" + code)
    with st.expander("🗳️ Bureaux de vote (résultats & réservoirs)"):
        _table_bureaux(code)
