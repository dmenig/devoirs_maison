# Plan d'amélioration — Atlas électoral militant

Objectif : rendre **immédiatement et facilement accessibles** sur le site
([map.html](map.html)) **toutes** les informations que la présentation « Analyse
électorale » (Institut La Boétie, juin 2026) demande à un·e militant·e de connaître sur
sa zone.

État actuel : le cœur (carte cliquable France → BV, réservoirs, contexte social) est
solide, mais ~50 % des informations exigées par la prez manquent — **dont une bonne part
déjà calculée dans `data_app/` mais jamais branchée** côté front.

---

## Constat structurant

- Le site servi est **uniquement** [map.html](map.html) (injecté par
  [streamlit_app.py](streamlit_app.py)). L'application Streamlit riche décrite dans
  [DOCUMENTATION.md](DOCUMENTATION.md) ([panels.py](panels.py), [indicators.py](indicators.py))
  **n'est pas livrée**. La doc surévalue le produit.
- Plusieurs indicateurs sont **bakés puis ignorés** (`dpart`, `abst`), pendant que le front
  recalcule des proxys plus faibles ([map.html](map.html), `rawVal`).

---

## Couverture vs. exigences de la prez

| Information exigée (slides) | État | Action |
| --- | --- | --- |
| Carte cliquable toutes échelles (30–34) | ✅ | — |
| Vote LFI par BV E24/M26 (33–34) | ✅ | — |
| Report LFI P22→E24 (45) | ✅ | — |
| Abstention mobilisable en **stock** (46, 57) | ✅ | #3 fait |
| **Tableau de recomposition 6 blocs × tous scrutins** (23) | ⚠️ | #2 |
| Différentiel participation P22→E24 par BV (44) | ✅ | #3 fait |
| Report LFI E24→M26 par BV (46) | ✅ | #3 fait |
| Taux de perte / différentiels par cycle (43) | ❌ | #4 |
| **IRIS : contours + revenu + pauvreté** (30–32) | ❌ baké, non navigable | #1 |
| Fiche circonscription INSEE — situation (24) | ❌ baké, non branché | #1 |
| Renouvellement de population (25) | ❌ absent du pipeline | #6 |
| Pyramide des âges (26) | ❌ absent du pipeline | #6 |
| Niveau de vie / propriétaires-locataires (27) | ❌ | #6 |
| Déplacements domicile-travail (28) | ❌ | #6 |
| Histoire électorale (maires, tradition) (22) | ❌ | #6 |
| Pont carte → action (quartier dense / logement social) (51) | ✅ | #5 |

---

## Chantiers, par ROI décroissant

### #1 — Brancher les niveaux IRIS et circonscription (déjà bakés)
La prez consacre 4 slides à l'IRIS et à la fiche circonscription. Les données et contours
existent (`values/iris.json`, `geo/iris/*`, `circonscription.geojson`,
`values/circonscription.json`) mais [map.html](map.html) ne descend jamais à ces niveaux.
- Ajouter IRIS sous la commune (revenu médian, taux de pauvreté par quartier, choroplèthe).
- Ajouter la circonscription comme échelle navigable.
- **Travail purement front** : aucun nouveau calcul.

### #2 — Reproduire le tableau de recomposition (artefact central de la prez)
Aujourd'hui réduit à un « rapport de force » E24 sur 4 barres ; **PS-EELV et LFI-PCF sont
fondus** dans un seul « gauche » (`tri_social_ecologique`).
- Baker les colonnes `b6_*` (6 blocs distincts) dans [prep_bake.py](prep_bake.py).
- Afficher dans le panneau un tableau **1 ligne par scrutin (2012→2026) × 6 blocs + Abs.**,
  en % des inscrits, comme slide 23.

### #3 — Exposer / corriger les réservoirs déjà calculés ✅ fait
- ✅ Pastilles `dpart` (différentiel de participation 22→24) et `abst` (**stock**
  d'abstentionnistes E24) ajoutées à [map.html](map.html).
- ✅ Métrique **report LFI E24→M26** (`rep_lfi_em`) ajoutée à `RESERVOIRS`
  ([prep_bake.py](prep_bake.py)), bakée à tous les niveaux + pastille dédiée.
- ✅ Proxys front supprimés (`reservoir_lfi`, `abst_pct`) : la carte et la fiche lisent
  désormais les valeurs bakées (taux de report en **voix réelles**, non en % d'inscrits).

### #4 — Sélecteur de deux scrutins
La logique de réservoir de la prez est « entre deux élections **choisies** ». Le site fige
P22→E24. Ajouter un sélecteur (scrutin A / scrutin B) recalculant report, différentiel de
participation et taux de perte à la volée.

### #5 — Pont « de la carte à l'action » (slide 51) ✅
Bloc « 🎯 De la carte à l'action » ajouté en bas de la fiche ([map.html](map.html), `actionPanel`) :
- Note contextuelle data-driven : recommandations de terrain déduites du profil de la zone
  (abstention massive → ramener aux urnes ; insoumis 2022 non remobilisés → renouer ;
  pauvreté élevée comme proxy quartier dense / logement social → porte-à-porte prioritaire).
- Légende permanente des 4 blocs (pastille couleur → composition).
- Invitation explicite à confronter les chiffres à la connaissance du terrain.
- **Front-only**, aucun nouveau calcul.

### #6 — Données administratives manquantes (nouveau pipeline INSEE)
Absentes des tables actuelles, à ajouter en amont :
- Renouvellement de population (lieu de résidence 1 an avant).
- Pyramide des âges (population par sexe et âge).
- Niveau de vie (pauvres/modestes/médians/aisés) + part propriétaires/locataires.
- Déplacements domicile-travail par mode de transport.
- Histoire électorale de la commune (maires successifs / tradition).

### #7 — Réconcilier la documentation
Mettre [DOCUMENTATION.md](DOCUMENTATION.md) et [README.md](README.md) en cohérence avec ce
que `map.html` livre réellement (ou livrer l'app riche). Aujourd'hui la doc décrit IRIS,
circonscription et tableau de recomposition qui ne sont pas dans le site.

---

## Séquencement suggéré

1. **#1 + #3** (front-only, données déjà là) → gain immédiat, ferme 6 lignes du tableau.
2. **#2** (bake `b6_*` + tableau) → restaure l'artefact central.
3. **#4 + #5** → fluidité et pont vers l'action.
4. **#6** (pipeline INSEE) → complète les données administratives.
5. **#7** → aligner la doc en fin de parcours.
