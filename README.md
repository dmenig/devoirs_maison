# Atlas électoral militant 🗳️

Carte de France **cliquable**, à **toutes les échelles** (France → région → département →
commune → IRIS / bureau de vote, + circonscriptions), qui met à disposition des
militant·es **toutes les données que la présentation « Analyse électorale » de l'Institut
La Boétie recommande de regarder** : recomposition en blocs, participation, **réservoirs
de voix** (reports, différentiels, abstention mobilisable), revenu médian et taux de
pauvreté.

➡️ Voir **[DOCUMENTATION.md](DOCUMENTATION.md)** : ce que le site montre à chaque granularité.

## Lancer en local

Les données (`data_app/`) sont générées sur la machine et **ne sont pas versionnées**
(trop volumineuses). Deux cas :

**A. Les données existent déjà** (`data_app/` présent) :

```bash
uv run --with streamlit --with streamlit-folium --with folium --with branca \
        --with pandas --with pyarrow streamlit run app.py
```

**B. Les régénérer depuis [hexagonal](https://github.com/) :**

```bash
# nécessite le dépôt hexagonal construit localement (résultats électoraux, FILOSOFI, COG)
uv run --project /chemin/vers/hexagonal python prepare_data.py   # tables + socio + contours
uv run --project /chemin/vers/hexagonal python regen_geo.py       # contours pleine résolution
```

## Architecture

| Fichier | Rôle |
| --- | --- |
| `app.py` | application Streamlit, navigation cliquable + recherche adaptative |
| `panels.py` | panneaux commune (IRIS + bureaux de vote) et circonscription |
| `viz.py` | cartes choroplèthes folium |
| `indicators.py` | catalogue d'indicateurs + calcul des réservoirs de voix |
| `nuances.py` | mapping nuances Min. Intérieur → blocs (recomposition / tripartition) |
| `dataio.py` | chargement (lazy, mis en cache) des données par zone |
| `prepare_data.py` | construit `data_app/` depuis hexagonal (élections, socio, référentiels) |
| `prep_*.py`, `regen_geo.py` | étapes de préparation (élections, socio, contours) |

Les contours sont chargés **paresseusement par zone** (un département / une commune à la
fois), en pleine résolution.

## Données

Tout provient du dépôt **hexagonal** : résultats Ministère de l'Intérieur (2012→2026, par
bureau de vote), INSEE FILOSOFI 2021 (revenu/pauvreté par IRIS), COG 2025, contours IGN /
INSEE / france-geojson.

## Déploiement

Streamlit Community Cloud / serveur : pointer sur `app.py`. Comme `data_app/` n'est pas
dans git, soit l'ajouter au déploiement (Git LFS ou stockage objet), soit régénérer via
`prepare_data.py`. Voir DOCUMENTATION.md pour les limites connues (contours de bureaux de
vote non disponibles nationalement, etc.).
