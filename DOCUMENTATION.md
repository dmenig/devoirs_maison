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
France → Région → Département → Circonscription législative → Commune → IRIS / Bureau de vote
```

On clique sur une entité pour descendre d'un niveau. Un fil d'Ariane permet de remonter.

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
| **Circonscription** | blocs + participation par circo ; tableau de recomposition | reports LFI entre scrutins, capacité de mobilisation | — |
| **Commune** | blocs + participation ; tableau de recomposition (comme la prez) | différentiels prés/euro/muni, taux de perte, reports | **revenu médian**, **taux de pauvreté** (FILOSOFI) ; **profil administratif INSEE** : pyramide des âges, statut d'occupation, déplacements domicile-travail, renouvellement de population, maire en exercice — comparés à la France |
| **IRIS** (quartier) | — (l'IRIS n'est pas une maille électorale) | — | **revenu médian**, **taux de pauvreté** par IRIS (carte choroplèthe) |
| **Bureau de vote** | blocs + participation par BV ; carte/tableau | **report LFI entre scrutins** (P22→E24, E24→M26…), **différentiel de participation**, **stock d'abstentionnistes** | — |

### Détail des réservoirs de voix (section « Aider à définir la stratégie »)

Calculés dynamiquement entre deux scrutins choisis, à **chaque échelle** disposant des voix
réelles (région, département, circonscription, commune, bureau de vote) :

- **Taux de perte** de la gauche entre deux scrutins (`(voix_A − voix_B) / voix_A`)
- **Report LFI** entre deux scrutins (`voix_LFI_B / voix_LFI_A`)
- **Différentiel de participation** (`participation_B − participation_A`, en points d'inscrits)
- **Stock d'abstentionnistes mobilisables** (`inscrits × taux d'abstention`)

### Détail socio-économique (FILOSOFI 2021)

- **Revenu médian disponible** par IRIS et par commune
- **Taux de pauvreté** (seuil 60 %) par IRIS et par commune

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
- **Maire en exercice** (nom + catégorie socio-professionnelle), amorce de l'histoire
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
- **Découpage administratif** : INSEE **COG 2025** (communes, départements, régions).
- **Fonds de carte** : régions/départements/communes (france-geojson), circonscriptions
  législatives (INSEE), contours IRIS 2025 (IGN, quand disponibles).

## Limites connues

- Les **contours polygonaux de bureaux de vote** n'existent pas nationalement (seul Paris
  les publie) : au niveau BV, les résultats sont servis en **tableau** (et points quand le
  REU fournit les coordonnées), pas en choroplèthe.
- Les **contours IRIS** dépendent d'un téléchargement IGN parfois throttlé ; si absent, les
  données IRIS restent disponibles en tableau.
- Le rattachement bureau de vote → circonscription utilise la table de correspondance 2024.
- En vue **circonscription**, les communes affichées sont rattachées à leur circo par leur
  **centre géométrique** (rattachement approché, côté carte) : une commune scindée entre
  plusieurs circonscriptions apparaît dans celle qui contient son centre.
- Les données de circonscription ne couvrent que les scrutins disponibles à cette maille
  (présidentielle 2022, législatives 2024) ; les indicateurs européennes/municipales y sont vides.
- Le **tableau de recomposition** écarte les scrutins legacy multi-tours qui double-comptent
  les voix (présidentielle 2012, municipales 2014/2020) : ils ne sont jamais affichés, pour
  garantir des totaux blocs + abstention ≤ 100 %.
- **Paris, Lyon et Marseille** (codés par secteur/arrondissement dans les bases infracommunales
  INSEE) n'ont pas de fiche « profil INSEE » à la commune.
- Le **renouvellement de population** est calculé au grain canton-ou-ville (maille la plus fine
  publiée pour la variable IRAN) puis rabattu sur la commune via son canton COG.
