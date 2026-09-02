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

## « Prioritaire » : la rentabilité du porte-à-porte, notée sur 100

La pastille qui colore la carte s'appelle **« Prioritaire »** et donne une **note sur
100** : `0` sur le terrain le moins rentable de France, **`50` sur le terrain médian**,
`100` sur le meilleur. Elle classe donc les territoires les uns par rapport aux autres — ce
qu'une carte sert à faire — sans obliger le lecteur à savoir ce qu'est une bonne valeur.
Saint-Denis note `60`, Paris `52`, la Creuse `46`.

Ce qu'elle mesure, c'est le **nombre de voix gagnables par heure de porte-à-porte** — là
où l'heure militante rapporte le plus, et non là où il y a le plus de voix : les deux ne
coïncident pas. Ce chiffre-là (en voix/h) n'est plus écrit sur la carte : il est à un clic,
dans le bouton « i ».

- **Numérateur** — les **abstentionnistes conjoncturels × γ** : les électeur·ices qu'une
  campagne peut ramener aux urnes ET qui votent à gauche, d'après le modèle par bureau de
  vote de [`elections_predictions`](https://github.com/lfi-pee/elections_predictions)
  (législatives 2027).
- **Dénominateur** — un **budget-temps** : 15 min de conversation par porte, plus le
  trajet jusqu'à la suivante, à pied ou en voiture selon la densité du bureau.

Un **bouton « i »** donne la méthode — et, la note ne disant que le rang, c'est le seul
endroit où on lit ce qui la fabrique : dans la légende de la carte pour la méthode
générale, sur le chiffre de tête de la fiche pour le calcul détaillé (en voix par heure,
avec les valeurs de la zone ouverte). Voir [DOCUMENTATION.md](DOCUMENTATION.md).

Le site a publié un temps **trois versions** côte à côte (`/`, `/v2/`, `/v3/`) pour
départager trois définitions du score : l'objectif arithmétique (20 % des exprimés
estimés moins le socle LFI, qui ne mesurait rien de ce qui est gagnable), les voix
modélisées, et leur rentabilité. Seule la troisième subsiste, à la racine ; `/v2/` et
`/v3/` ne répondent plus.

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

puis <http://localhost:8000/_site/>. La base est résolue par le navigateur depuis la page
servie : `/data_app` (absolu) vaut depuis n'importe quelle profondeur, là où un chemin
relatif dépendrait de l'emplacement de la page.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `map.html` | **squelette** de la carte servie : balisage des panneaux + marqueurs `/*__CSS__*/` et `/*__JS__*/` |
| `assets/map.css` | thème et mise en page de la carte |
| `assets/js/*.js` | logique de la carte, un fichier par responsabilité (config · data/geo · panneau info · panneau admin · panneau action · navigation · contrôles · recherche · **méthode des voix à conquérir** · notice modale) ; concaténée dans l'ordre des noms (préfixe `NN_`) |
| `build_map.py` | `assemble_map(base)` : recolle squelette + CSS + JS en une string et injecte `__BASE__` |
| `build_site.py` | écrit la page publiée : `_site/index.html` |
| `.github/workflows/pages.yml` | publie `_site/` sur GitHub Pages à chaque push sur `master` |
| `prepare_data.py` | construit `data_app/` depuis hexagonal (élections, socio, admin INSEE, contours) |
| `regen_elections.py` | régénère les seules tables électorales après un correctif du pipeline — enchaîner `prep_bake.py`, qui écrit aussi `manifest.json` |
| `prep_bake.py` | bake les valeurs JSON par échelle (recompo, réservoirs, profil admin) lues par la carte |
| `prep_immo.py` | prix au m² (DVF) et effort d'accession par commune — par arrondissement à Paris/Lyon/Marseille — + références France/région |
| `prep_mobilisation.py` | « voix à conquérir » 2027 par bureau de vote : reprend les sorties du modèle **elections_predictions** et y ajoute la géométrie du porte-à-porte (portes, kilomètres, budget-temps) |
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

Les « voix à conquérir » viennent en plus d'un **second dépôt**,
[`elections_predictions`](https://github.com/lfi-pee/elections_predictions), dont on lit
les sorties déjà publiées (site statique `report_app/`) — on ne ré-estime pas son modèle.
Cloner ce dépôt à côté de celui-ci (ou pointer `--source` dessus) puis :

```bash
uv run --project ./hexagonal python prep_mobilisation.py && uv run --project ./hexagonal python prep_bake.py
```

## Déploiement

**GitHub Pages**, automatiquement : chaque push sur `master` déclenche
[pages.yml](.github/workflows/pages.yml), qui lance `build_site.py` et publie la page qui
en sort. La carte étant entièrement côté client, le
site n'est QUE ces fichiers — aucun serveur applicatif, plus de Streamlit.

Les données restent hors du site publié : `data_app/` pèse ~1,4 Go, au-delà de la limite d'1 Go
d'un site Pages. Versionnées dans le dépôt, elles sont servies par GitHub raw (`__BASE__`),
comme du temps de Streamlit. Une mise à jour des données est donc visible sans republier la
page (cache CDN de raw : ~5 min). Seuls les intermédiaires volumineux et caches INSEE ne sont
pas versionnés, régénérables via `prepare_data.py` + `prep_bake.py`. Voir DOCUMENTATION.md pour les limites connues (contours
de bureaux de vote nationaux mais **approchés** — Voronoï data.gouv, rattachement commune↔circo approché, etc.).
