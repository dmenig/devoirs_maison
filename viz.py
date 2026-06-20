"""Construction des cartes choroplèthes cliquables (folium)."""

from __future__ import annotations

import branca.colormap as cm
import folium

# Palette divergente : bleu = sous la moyenne, rouge = au-dessus. On colore TOUJOURS
# l'écart à une référence (moyenne locale ou nationale), pour faire « ressortir » les
# zones plutôt que d'afficher des nombres bruts (cf. graphique 11.29 de la prez,
# exprimé en % de la moyenne nationale).
DIVERGENTE = ["#2166ac", "#67a9cf", "#f7f7f7", "#ef8a62", "#b2182b"]


def _bornes(features: list[dict]) -> list[list[float]] | None:
    xs: list[float] = []
    ys: list[float] = []

    def parcourir(coords):
        if isinstance(coords[0], (int, float)):
            xs.append(coords[0])
            ys.append(coords[1])
        else:
            for c in coords:
                parcourir(c)

    for f in features:
        geom = f.get("geometry")
        if geom and geom.get("coordinates"):
            parcourir(geom["coordinates"])
    if not xs:
        return None
    return [[min(ys), min(xs)], [max(ys), max(xs)]]


def _propre(v) -> float | None:
    """None pour les valeurs manquantes (None / NaN)."""
    if v is None or v != v:  # NaN != NaN
        return None
    return float(v)


def _diverging(
    values, reference: float | None
) -> tuple[cm.LinearColormap | None, float | None]:
    """Colormap divergente centrée sur une référence (moyenne). Si `reference` est
    None, on prend la moyenne des valeurs affichées (moyenne locale)."""
    vals = [x for x in (_propre(v) for v in values) if x is not None]
    if not vals:
        return None, None
    centre = reference if reference is not None else sum(vals) / len(vals)
    etendue = max(abs(max(vals) - centre), abs(centre - min(vals))) or 1.0
    vmin, vmax = centre - etendue, centre + etendue
    index = [vmin, centre - etendue / 2, centre, centre + etendue / 2, vmax]
    return cm.LinearColormap(DIVERGENTE, index=index, vmin=vmin, vmax=vmax), centre


def choropleth(
    gj: dict,
    values: dict,
    code_prop: str,
    label: str,
    unit: str,
    scheme: str,
    bounds: list[list[float]] | None = None,
    reference: float | None = None,
) -> folium.Map:
    cmap, centre = _diverging(values.values(), reference)
    feats = []
    for f in gj["features"]:
        code = str(f["properties"].get(code_prop))
        v = _propre(values.get(code))
        nf = {
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": dict(f["properties"]),
        }
        nf["properties"]["_code"] = code
        nf["properties"]["_nom"] = (
            f["properties"].get("nom") or f["properties"].get("nom_iris") or code
        )
        nf["properties"]["_val"] = None if v is None else round(v, 1)
        nf["properties"]["_ref"] = (
            "—"
            if (v is None or not centre)
            else f"{round(100 * v / centre)} % de la moyenne"
        )
        feats.append(nf)
    data = {"type": "FeatureCollection", "features": feats}

    m = folium.Map(tiles="cartodbpositron", zoom_control=True, control_scale=True)
    bornes = bounds or _bornes(feats)
    if bornes:
        m.fit_bounds(bornes)

    def style(feat):
        v = feat["properties"].get("_val")
        return {
            "fillColor": cmap(v) if (cmap and v is not None) else "#eeeeee",
            "color": "#444",
            "weight": 0.6,
            "fillOpacity": 0.82,
        }

    folium.GeoJson(
        data,
        style_function=style,
        highlight_function=lambda _f: {
            "weight": 2.5,
            "color": "#000",
            "fillOpacity": 0.95,
        },
        tooltip=folium.GeoJsonTooltip(
            fields=["_nom", "_val", "_ref"],
            aliases=["", f"{label} ({unit}) :", "Position :"],
            localize=True,
        ),
    ).add_to(m)

    if cmap:
        cmap.caption = f"{label} ({unit}) — bleu : sous la moyenne · rouge : au-dessus"
        cmap.add_to(m)
    return m
