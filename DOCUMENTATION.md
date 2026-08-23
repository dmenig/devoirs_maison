# Atlas électoral militant — documentation

## À quoi sert ce site

Cet atlas met entre les mains des militant·es **toutes les données que la présentation
« Analyse électorale » de l'Institut La Boétie (juin 2026) recommande de regarder**,
pour **connaître son territoire**, **estimer les réservoirs de voix** et **servir
l'action** (cibler le porte-à-porte, lancer une campagne, sécuriser des voix).

Le principe de la présentation est repris tel quel :

> Le comportement électoral est un comportement social et matériel. Pour agir, il faut
> croiser, à chaque échelle, **données électorales**, **données administratives** et
> **données socio-économiques**.

On peut donc naviguer sur une **carte de France cliquable** et descendre, niveau par
niveau, jusqu'au bureau de vote et à l'IRIS.

## Les échelles (carte cliquable, du national au local)

```
France → Région → Département → Commune → IRIS / Bureau de vote
```

> L'échelle **circonscription législative** a été retirée : sans pertinence pour une
> présidentielle (scrutin national), elle créait en outre le problème des communes à cheval
> sur deux circos. Le département descend désormais directement aux communes.

On clique sur une entité pour descendre d'un niveau. Un fil d'Ariane permet de remonter.

Sous la commune, la vue servie par défaut est le **quartier (IRIS)** : c'est la maille de
lecture du terrain (revenu, sociologie, logement — et désormais l'électoral estimé), là où
le bureau de vote est une maille d'**organisation** du travail militant. La bascule
**🗳️ Bureaux de vote** reste à un clic, en mode avancé.

## Ce qui est montré à chaque granularité

Toutes les échelles partagent le **socle électoral** (calculé en **% des inscrits**,
comme dans la prez), pour **chaque scrutin disponible** (2012 → 2026) :

- **Participation / abstention**
- **Recomposition en 6 blocs** : `LFI-PCF-EXG`, `PS-EELV`, `MoDem-EM`, `LR-DVD`,
  `RN-EXD`, `Autres`
- **Tripartition sociale** : bloc social-écologique / libéral-progressiste /
  national-patriote
- **Voix LFI et voix de gauche** (en valeur absolue, pour les réservoirs)

| Échelle | Données électorales | Réservoirs de voix | Socio-éco / administratif |
| --- | --- | --- | --- |
| **France** | blocs + participation, tous scrutins ; tableau de recomposition | différentiels nationaux présidentielle→européenne→municipale, taux de perte | — |
| **Région** | idem, agrégé région | différentiels et reports entre scrutins | — |
| **Département** | idem, agrégé département | différentiels, reports, taux de perte | — |
| **Commune** | blocs + participation ; tableau de recomposition (comme la prez) | différentiels prés/euro/muni, taux de perte, reports | **revenu médian**, **taux de pauvreté** (FILOSOFI) ; **profil administratif INSEE** : pyramide des âges, statut d'occupation, déplacements domicile-travail, renouvellement de population, maire en exercice — comparés à la France |
| **IRIS** (quartier) — *vue par défaut sous la commune* | blocs + participation + recomposition, **estimés** par intersection avec les bureaux de vote (voir ci-dessous) | différentiels, reports, taux de perte, stock d'abstention — estimés eux aussi | **revenu médian**, **taux de pauvreté**, **quartiles (Q1/Q3)**, **déciles (D1/D9)**, **rapport interdécile**, **indice de Gini** par IRIS (carte choroplèthe + barre de dispersion dans la fiche) |
| **Bureau de vote** | blocs + participation par BV, **carte choroplèthe nationale** ; le scrutin affiché (Vote LFI / Participation / RN / Gauche) suit le sélecteur ⚖️ → reproduit les cartes BV de la prez (LFI Europ. 2024, LFI Munic. 2026, Présid. 2022…) | **report LFI entre scrutins** (P22→E24, E24→M26…), **différentiel de participation**, **stock d'abstentionnistes** | — |

### Détail des réservoirs de voix (section « Aider à définir la stratégie »)

Calculés dynamiquement entre deux scrutins choisis, à **chaque échelle** disposant des voix
réelles (région, département, circonscription, commune, bureau de vote) :

- **Taux de perte** de la gauche entre deux scrutins (`(voix_A − voix_B) / voix_A`)
- **Report LFI** entre deux scrutins (`voix_LFI_B / voix_LFI_A`)
- **Différentiel de participation** (`participation_B − participation_A`, en points d'inscrits)
- **Stock d'abstentionnistes mobilisables** (`inscrits × taux d'abstention`)

### Résultats électoraux estimés à l'IRIS (quartier)

Le quartier est la maille de lecture du terrain : c'est la seule à porter le revenu, la
sociologie et le logement. Mais **l'IRIS n'est pas une maille électorale** — le ministère
n'y publie rien, le vote se compte par **bureau de vote**. L'atlas y sert donc des
résultats **estimés**, jamais mesurés, et le dit partout où ils apparaissent (légende de
la carte, infobulle, bandeau et intitulé du chiffre de tête dans la fiche).

Méthode (`prep_iris_bv.py`) :

1. **Intersection géométrique** des contours IRIS (IGN 2025) et des contours de bureaux de
   vote (Voronoï data.gouv), couple par couple, à l'intérieur d'une même commune.
2. **Répartition au prorata de la population** : les voix d'un bureau sont distribuées
   entre les quartiers que son contour recoupe, pondérées par `aire de l'intersection ×
   densité de population de l'IRIS` (recensement INSEE 2021) — pas par la seule surface,
   sans quoi un bureau qui déborde sur un parc ou une zone industrielle y enverrait des
   électeurs.
3. **Recalage sur la commune** : chaque colonne est remise à l'échelle pour que la somme
   des quartiers d'une commune redonne **exactement** son résultat réel. C'est ce qui
   rattrape les bureaux dépourvus de contour (leurs électeurs sont redistribués au
   prorata) et garantit qu'on ne lit pas deux totaux différents selon l'échelle.

**Deux garde-fous**, l'un géométrique, l'autre électoral. Dans les deux cas la zone
écartée n'a **aucune donnée électorale** : la fiche reste purement socio-économique et la
carte la laisse grise — pas de chiffre plutôt qu'un chiffre faux.

| Garde-fou | Ce qu'il mesure | Seuil | Écarté |
| --- | --- | --- | --- |
| `COUV_MIN` | part de l'aire de l'IRIS effectivement recouverte par des contours de bureaux | 99 % | **392 quartiers sur 48 512** (0,8 %) |
| `ELEC_MIN` | part de l'électorat de la commune portée par des bureaux localisables (le reste étant ce que le recalage extrapole) | 90 % | la commune entière, **scrutin par scrutin** |

Le second garde-fou existe parce que le recalage communal est un rattrapage tant que les
bureaux sans contour sont marginaux, mais devient une extrapolation quand ils font
l'essentiel de la commune : à Bordeaux, seuls 12 % de l'électorat sont localisables sur
les scrutins 2024-2026 (renumérotation des bureaux), et un « résultat estimé par
intersection » n'y serait rien d'autre que le résultat communal étalé sur la population.
Le filtre est appliqué **par scrutin** : Bordeaux garde donc ses estimations 2017-2022 et
perd 2024-2026, plutôt que tout ou rien.

Au total, **47 308 quartiers sur 48 512** sont estimés sur les européennes 2024, soit
**96 % de l'électorat métropolitain contouré**. Le rapport de couverture par IRIS est
conservé dans `data_app/iris_bv_couverture.parquet`.

### Détail socio-économique (FILOSOFI 2021)

- **Revenu médian disponible** par IRIS et par commune
- **Taux de pauvreté** (seuil 60 %) par IRIS et par commune
- **Dispersion des revenus** par IRIS : **quartiles Q1/Q3**, **déciles D1/D9**, **rapport interdécile
  D9/D1** et **indice de Gini** — l'écart riches/pauvres au sein du quartier, rendu par une barre de
  distribution dans la fiche (slide « niveau de vie des ménages »). À la commune : médiane, pauvreté et
  quartiles (moyenne des IRIS) ; déciles et Gini restent au seul niveau IRIS.

> Note : FILOSOFI à l'IRIS n'existe que pour les communes de ≥ 5 000 habitants ; ailleurs
> la commune forme un seul IRIS. Le revenu médian communal est ici la moyenne de ses IRIS
> (approximation), à confronter au terrain.

### Profil administratif de la commune (recensement INSEE 2021)

Reprend la **fiche circonscription INSEE** de la prez (slides 22, 25-28), ramenée à la
commune et comparée à la moyenne France :

- **Pyramide des âges** par sexe et tranche d'âge (slide 26)
- **Statut d'occupation** des résidences principales : propriétaires / locataires / HLM (slide 27)
- **Déplacements domicile-travail** par mode (voiture, transports en commun, marche, vélo…) (slide 28)
- **Renouvellement de population** : lieu de résidence un an auparavant, 5 catégories (slide 25)
- **Maire en exercice** (nom, catégorie socio-professionnelle, **âge**), amorce de l'histoire
  électorale locale (slide 22)

> Agrégés à la commune depuis les **bases infracommunales (IRIS)** du recensement ; le
> renouvellement provient du **fichier détail « individus localisés »** (variable IRAN).

## Sources des données

Tout provient du dépôt **hexagonal** (agrégation France insoumise) :

- **Résultats électoraux** : Ministère de l'Intérieur / data.gouv (par bureau de vote,
  commune, circonscription) — scrutins 2012 → 2026.
- **Socio-économique** : INSEE **FILOSOFI 2021** (revenu disponible par IRIS).
- **Administratif (commune)** : **recensement INSEE 2021** — bases infracommunales (âges,
  logement, activité/déplacements) et fichier détail « individus localisés » (renouvellement) ;
  **Répertoire national des élus** (data.gouv) pour le maire en exercice.
- **Électoral par quartier (IRIS)** : **estimé** — croisement des résultats par bureau de
  vote et des contours IRIS, recalé sur les résultats communaux (voir plus haut).
- **Découpage administratif** : INSEE **COG 2025** (communes, départements, régions).
- **Fonds de carte** : régions/départements/communes (france-geojson), circonscriptions
  législatives (INSEE), contours IRIS 2025 (IGN, quand disponibles).

## Limites connues

- Les **contours de bureaux de vote** sont servis **nationalement en choroplèthe** depuis le jeu
  data.gouv « Proposition de contours des bureaux de vote » (découpage **Voronoï** autour des adresses
  des électeurs, méthode Etalab). Ce sont donc des contours **approchés** (pas les périmètres
  administratifs officiels) ; et tout bureau n'a pas de contour (résultats présents mais non
  cartographiés là où le Voronoï n'a pu être calculé) — la zone reste alors non colorée.
  Un **filtre de fiabilité géométrique** (chantier 4) masque en outre les contours au tracé
  absurde — polygones disjoints (fragmentation) ou très peu compacts (Polsby-Popper) — plutôt
  que d'afficher un découpage faux : le bureau n'est alors pas peint, et ses résultats restent
  accessibles via l'export. Le bureau de vote est par ailleurs une maille d'**organisation** du
  travail (la maille de lecture pertinente pour un GA est plutôt la commune / le grand quartier).
- Les **contours IRIS** dépendent d'un téléchargement IGN parfois throttlé ; si absent, les
  données IRIS restent disponibles en tableau.
- Les **résultats électoraux à l'IRIS sont estimés**, jamais mesurés (le vote se compte par
  bureau de vote). Ils héritent donc de l'approximation des contours Voronoï **et** de
  l'hypothèse que les électeurs d'un bureau se répartissent comme sa population résidente
  — ce qui est faux là où la structure d'âge ou la part de non-inscrits varie fortement
  d'un côté à l'autre d'un bureau. Un quartier mal recouvert n'est pas estimé du tout.
- Le **tableau de recomposition** écarte les **municipales** (2014, 2020) : le scrutin
  plurinominal (panachage, listes) y gonfle les voix bien au-delà des inscrits, rendant les
  blocs en % d'inscrits non comparables. Un garde-fou (`scrutins_fiables`) ne retient que les
  scrutins dont blocs + abstention bouclent ≤ 105 %. Les fichiers regroupant deux tours
  (présidentielle 2012, municipales 2014) sont désormais **scindés par tour en amont** : ils
  ne double-comptent plus, et la présidentielle 2012 est de nouveau affichée.
- **Paris, Lyon et Marseille** (codés par secteur/arrondissement dans les bases infracommunales
  INSEE) n'ont pas de fiche « profil INSEE » à la commune.
- Le **renouvellement de population** est calculé au grain canton-ou-ville (maille la plus fine
  publiée pour la variable IRAN) puis rabattu sur la commune via son canton COG.
