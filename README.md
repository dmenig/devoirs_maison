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

## Trois versions du site

Une même branche publie **trois sites**, qui ne diffèrent que par la définition d'un
indicateur — les **« voix à conquérir »**. Tout le reste (données servies, navigation,
fiches, contrôles) est rigoureusement identique. Le sélecteur en haut de carte passe de
l'une à l'autre en gardant le territoire affiché ; ce sont de vrais liens, on peut donc
ouvrir deux versions dans deux onglets et comparer les cartes.

| Version | URL | « Voix à conquérir » |
| --- | --- | --- |
| 1 · **Objectif** | [`/`](https://lfi-pee.github.io/devoirs_maison/) | Objectif arithmétique : 20 % des exprimés estimés, moins le socle LFI déjà acquis. Ne repose sur aucune mesure de ce qui est gagnable. |
| 2 · **Modèle 2027** | [`/v2/`](https://lfi-pee.github.io/devoirs_maison/v2/) | **Abstentionnistes conjoncturels × γ** : les électeur·ices qu'une campagne peut ramener aux urnes ET qui votent à gauche, d'après le modèle par bureau de vote de [`elections_predictions`](https://github.com/lfi-pee/elections_predictions) (législatives 2027). |
| 3 · **Rentabilité** | [`/v3/`](https://lfi-pee.github.io/devoirs_maison/v3/) | **Voix par heure de porte-à-porte** : le score de la version 2 divisé par le temps qu'il faut pour aller le chercher (15 min de conversation par porte + trajet, à pied ou en voiture selon la densité du bureau). |

Les versions 2 et 3 portent un **bouton « i »** — dans la légende de la carte pour la
méthode générale, sur le chiffre de tête de la fiche pour le calcul détaillé avec les
valeurs de la zone ouverte. Voir [DOCUMENTATION.md](DOCUMENTATION.md#voix-à-conquérir--trois-définitions-trois-versions-du-site).

## Lancer en local

```bash
uv run python build_site.py && uv run python -m http.server -d _site
```

La carte ([map.html](map.html)) va chercher elle-même les données (versionnées dans `data_app/`)
via la variable `__BASE__` injectée par [build_site.py](build_site.py) — par défaut en ligne,
sur GitHub raw. Pour travailler sur des données locales, servir la racine du dépôt et pointer
la base dessus :

```bash
uv run python build_site.py --base /data_app && uv run python -m http.server
```

puis <http://localhost:8000/_site/> (et `/_site/v2/`, `/_site/v3/`). La base est résolue
par le navigateur depuis la page servie : `/data_app` (absolu) vaut pour les trois
versions, là où un chemin relatif (`../data_app`) ne serait juste que pour la version 1,
qui seule est à la racine du site.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `map.html` | **squelette** de la carte servie : balisage des panneaux + marqueurs `/*__CSS__*/` et `/*__JS__*/` |
| `assets/map.css` | thème et mise en page de la carte |
| `assets/js/*.js` | logique de la carte, un fichier par responsabilité (config · data/geo · panneau info · panneau admin · panneau action · navigation · contrôles · recherche · **méthode des voix à conquérir** · **sélecteur de version**) ; concaténée dans l'ordre des noms (préfixe `NN_`) |
| `build_map.py` | `assemble_map(base, version)` : recolle squelette + CSS + JS en une string, injecte `__BASE__` et le numéro de `__VERSION__` |
| `build_site.py` | écrit les **trois** pages publiées : `_site/index.html`, `_site/v2/index.html`, `_site/v3/index.html` |
| `.github/workflows/pages.yml` | publie `_site/` sur GitHub Pages à chaque push sur `master` |
| `prepare_data.py` | construit `data_app/` depuis hexagonal (élections, socio, admin INSEE, contours) |
| `regen_elections.py` | régénère les seules tables électorales après un correctif du pipeline — enchaîner `prep_bake.py`, qui écrit aussi `manifest.json` |
| `prep_bake.py` | bake les valeurs JSON par échelle (recompo, réservoirs, profil admin) lues par la carte |
| `prep_immo.py` | prix au m² (DVF) et effort d'accession par commune + références France/région |
| `prep_mobilisation.py` | « voix à conquérir » 2027 par bureau de vote (versions 2 et 3) : reprend les sorties du modèle **elections_predictions** et y ajoute la géométrie du porte-à-porte (portes, kilomètres, budget-temps) |
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

Les « voix à conquérir » des versions 2 et 3 viennent en plus d'un **second dépôt**,
[`elections_predictions`](https://github.com/lfi-pee/elections_predictions), dont on lit
les sorties déjà publiées (site statique `report_app/`) — on ne ré-estime pas son modèle.
Cloner ce dépôt à côté de celui-ci (ou pointer `--source` dessus) puis :

```bash
uv run --project ./hexagonal python prep_mobilisation.py && uv run --project ./hexagonal python prep_bake.py
```

## Déploiement

**GitHub Pages**, automatiquement : chaque push sur `master` déclenche
[pages.yml](.github/workflows/pages.yml), qui lance `build_site.py` et publie les trois
pages qui en sortent (`/`, `/v2/`, `/v3/`). La carte étant entièrement côté client, le
site n'est QUE ces fichiers — aucun serveur applicatif, plus de Streamlit.

Les données restent hors du site publié : `data_app/` pèse ~1,4 Go, au-delà de la limite d'1 Go
d'un site Pages. Versionnées dans le dépôt, elles sont servies par GitHub raw (`__BASE__`),
comme du temps de Streamlit. Une mise à jour des données est donc visible sans republier la
page (cache CDN de raw : ~5 min). Seuls les intermédiaires volumineux et caches INSEE ne sont
pas versionnés, régénérables via `prepare_data.py` + `prep_bake.py`. Voir DOCUMENTATION.md pour les limites connues (contours
de bureaux de vote nationaux mais **approchés** — Voronoï data.gouv, rattachement commune↔circo approché, etc.).
