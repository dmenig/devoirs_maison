# Atlas électoral militant 🗳️

Carte de France **cliquable**, à **toutes les échelles** (France → région → département →
circonscription → commune → IRIS / bureau de vote), qui met à disposition des
militant·es **toutes les données que la présentation « Analyse électorale » de l'Institut
La Boétie recommande de regarder** : recomposition en blocs, participation, **réservoirs
de voix** (reports, différentiels, abstention mobilisable), revenu médian et taux de
pauvreté.

➡️ Voir **[DOCUMENTATION.md](DOCUMENTATION.md)** : ce que le site montre à chaque granularité.

## Lancer en local

```bash
uv run --with streamlit streamlit run streamlit_app.py
```

La carte ([map.html](map.html)) va chercher elle-même les données (versionnées dans `data_app/`)
en ligne via la variable `__BASE__` injectée par [streamlit_app.py](streamlit_app.py).

## Architecture

| Fichier | Rôle |
| --- | --- |
| `map.html` | **squelette** de la carte servie : balisage des panneaux + marqueurs `/*__CSS__*/` et `/*__JS__*/` |
| `assets/map.css` | thème et mise en page de la carte |
| `assets/js/*.js` | logique de la carte, un fichier par responsabilité (config · data/geo · panneau info · panneau admin · panneau action · navigation · contrôles · recherche) ; concaténée dans l'ordre des noms (préfixe `NN_`) |
| `build_map.py` | `assemble_map(base)` : recolle squelette + CSS + JS en une string et injecte `__BASE__` |
| `streamlit_app.py` | wrapper plein écran : sert `assemble_map(BASE)` |
| `prepare_data.py` | construit `data_app/` depuis hexagonal (élections, socio, admin INSEE, contours) |
| `prep_bake.py` | bake les valeurs JSON par échelle (recompo, réservoirs, profil admin) lues par la carte |
| `prep_*.py`, `regen_geo.py` | étapes de préparation (élections, socio, admin, contours) |
| `indicators.py` | calcul des réservoirs de voix / recomposition (utilisé par le bake) |
| `nuances.py` | mapping nuances Min. Intérieur → blocs (recomposition / tripartition) |
| `panels.py`, `viz.py`, `dataio.py` | **legacy** : prototype Streamlit natif (folium), non utilisé par la carte servie |

Les contours sont chargés **paresseusement par zone** (un département à la fois) par le
navigateur, en pleine résolution.

## Données

Tout provient du dépôt **hexagonal** : résultats Ministère de l'Intérieur (2012→2026, par
bureau de vote), INSEE FILOSOFI 2021 (revenu/pauvreté par IRIS), COG 2025, contours IGN /
INSEE / france-geojson.

## Déploiement

Streamlit Community Cloud / serveur : pointer sur `streamlit_app.py`. Les valeurs et contours
(`data_app/values`, `data_app/geo`) étant versionnés, la carte les sert directement depuis
GitHub raw (`__BASE__`) ; seuls les intermédiaires volumineux et caches INSEE sont régénérables
via `prepare_data.py` + `prep_bake.py`. Voir DOCUMENTATION.md pour les limites connues (contours
de bureaux de vote non disponibles nationalement, rattachement commune↔circo approché, etc.).
