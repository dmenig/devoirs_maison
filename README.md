# Atlas électoral militant 🗳️

Carte de France **cliquable**, à **toutes les échelles** (France → région → département →
circonscription → commune → IRIS / bureau de vote), qui met à disposition des
militant·es **toutes les données que la présentation « Analyse électorale » de l'Institut
La Boétie recommande de regarder** : recomposition en blocs, participation, **réservoirs
de voix** (reports, différentiels, abstention mobilisable), revenu médian, taux de
pauvreté et **dispersion des revenus** (quartiles, déciles, interdécile, Gini) par IRIS,
**prix du logement au m²** et **effort d'accession** par commune (DVF).
Les cartes par **bureau de vote** sont nationales et le scrutin affiché est sélectionnable
(LFI Europ. 2024, Munic. 2026, Présid. 2022…), comme dans la présentation.

➡️ Voir **[DOCUMENTATION.md](DOCUMENTATION.md)** : ce que le site montre à chaque granularité.

## En ligne

➡️ **<https://lfi-pee.github.io/devoirs_maison/>**

## Lancer en local

```bash
uv run python build_site.py && uv run python -m http.server -d _site
```

La carte ([map.html](map.html)) va chercher elle-même les données (versionnées dans `data_app/`)
via la variable `__BASE__` injectée par [build_site.py](build_site.py) — par défaut en ligne,
sur GitHub raw. Pour travailler sur des données locales, servir la racine du dépôt et pointer
la base dessus :

```bash
uv run python build_site.py --base ../data_app && uv run python -m http.server
```

puis <http://localhost:8000/_site/> — la base `../data_app` est relative à la page servie.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `map.html` | **squelette** de la carte servie : balisage des panneaux + marqueurs `/*__CSS__*/` et `/*__JS__*/` |
| `assets/map.css` | thème et mise en page de la carte |
| `assets/js/*.js` | logique de la carte, un fichier par responsabilité (config · data/geo · panneau info · panneau admin · panneau action · navigation · contrôles · recherche) ; concaténée dans l'ordre des noms (préfixe `NN_`) |
| `build_map.py` | `assemble_map(base)` : recolle squelette + CSS + JS en une string et injecte `__BASE__` |
| `build_site.py` | écrit `_site/index.html` = `assemble_map(BASE)` : le site statique publié |
| `.github/workflows/pages.yml` | publie `_site/` sur GitHub Pages à chaque push sur `master` |
| `prepare_data.py` | construit `data_app/` depuis hexagonal (élections, socio, admin INSEE, contours) |
| `regen_elections.py` | régénère les seules tables électorales après un correctif du pipeline — enchaîner `prep_bake.py`, qui écrit aussi `manifest.json` |
| `prep_bake.py` | bake les valeurs JSON par échelle (recompo, réservoirs, profil admin) lues par la carte |
| `prep_immo.py` | prix au m² (DVF) et effort d'accession par commune + références France/région |
| `prep_*.py`, `regen_geo.py` | étapes de préparation (élections, socio, admin, contours) |
| `indicators.py` | calcul des réservoirs de voix / recomposition (utilisé par le bake) |
| `prep_index.py` | hiérarchie + index de recherche ; redirige les anciens noms de communes fusionnées vers la commune nouvelle (`code_commune_parent` du COG) |
| `nuances.py` | mapping nuances Min. Intérieur → blocs (recomposition / tripartition) : nuance simple, nuance de liste `L…`, nuance de binôme `BC-…`, et listes européennes 2019 (seul fichier sans nuance) |
| `panels.py`, `viz.py`, `dataio.py` | **legacy** : prototype Streamlit natif (folium), non utilisé par le site — nécessite `--with streamlit,streamlit-folium` |

Les contours sont chargés **paresseusement par zone** (un département à la fois) par le
navigateur, en pleine résolution.

Toutes les échelles bouclent les unes sur les autres : `France = Σ communes = Σ bureaux`,
et `France = Σ départements` + les Français·es de l'étranger et les collectivités du
Pacifique, qui ne relèvent d'aucun département. Dans la fiche, `blocs + abstention +
non ventilé + blancs/nuls = 100 %` des inscrits.

## Données

Tout provient du dépôt **hexagonal** : résultats Ministère de l'Intérieur (2012→2026, par
bureau de vote), INSEE FILOSOFI 2021 (revenu/pauvreté par IRIS), COG 2025, contours IGN /
INSEE / france-geojson. Seule exception, téléchargée directement par le pipeline : la base
**DVF** agrégée par commune (prix au m², data.gouv.fr, ODbL).

## Déploiement

**GitHub Pages**, automatiquement : chaque push sur `master` déclenche
[pages.yml](.github/workflows/pages.yml), qui lance `build_site.py` et publie la page unique
qui en sort. La carte étant entièrement côté client, le site n'est QUE ce fichier — aucun
serveur applicatif, plus de Streamlit.

Les données restent hors du site publié : `data_app/` pèse ~1,4 Go, au-delà de la limite d'1 Go
d'un site Pages. Versionnées dans le dépôt, elles sont servies par GitHub raw (`__BASE__`),
comme du temps de Streamlit. Une mise à jour des données est donc visible sans republier la
page (cache CDN de raw : ~5 min). Seuls les intermédiaires volumineux et caches INSEE ne sont
pas versionnés, régénérables via `prepare_data.py` + `prep_bake.py`. Voir DOCUMENTATION.md pour les limites connues (contours
de bureaux de vote nationaux mais **approchés** — Voronoï data.gouv, rattachement commune↔circo approché, etc.).
