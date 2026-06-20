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
| **Commune** | blocs + participation ; tableau de recomposition (comme la prez) | différentiels prés/euro/muni, taux de perte, reports | **revenu médian**, **taux de pauvreté** (FILOSOFI, moyenne des IRIS) |
| **IRIS** (quartier) | — (l'IRIS n'est pas une maille électorale) | — | **revenu médian**, **taux de pauvreté**, **écarts interdéciles** par IRIS (carte choroplèthe) |
| **Bureau de vote** | blocs + participation par BV ; carte/tableau | **report LFI entre scrutins** (P22→E24, E24→M26…), **différentiel de participation**, **stock d'abstentionnistes** | — |

### Détail des réservoirs de voix (section « Aider à définir la stratégie »)

Calculés dynamiquement entre deux scrutins choisis, à l'échelle commune **et** bureau de vote :

- **Différentiel de voix** entre élections d'un même cycle (présidentielle → européenne → municipale)
- **Taux de perte** présidentielle vs autre scrutin (`(voix_A − voix_B) / voix_A`)
- **Report LFI** entre deux scrutins (`voix_LFI_B / voix_LFI_A`)
- **Différentiel de participation** (`participation_B / participation_A`)
- **Stock d'abstentionnistes mobilisables** (`inscrits × taux d'abstention`)

### Détail socio-économique (FILOSOFI 2021)

- **Revenu médian disponible** par IRIS et par commune
- **Taux de pauvreté** (seuil 60 %) par IRIS et par commune
- **Écarts** : 1er/3e quartile, 1er/9e décile, rapport interdécile, indice de Gini (IRIS)

> Note : FILOSOFI à l'IRIS n'existe que pour les communes de ≥ 5 000 habitants ; ailleurs
> la commune forme un seul IRIS. Le revenu médian communal est ici la moyenne de ses IRIS
> (approximation), à confronter au terrain.

## Sources des données

Tout provient du dépôt **hexagonal** (agrégation France insoumise) :

- **Résultats électoraux** : Ministère de l'Intérieur / data.gouv (par bureau de vote,
  commune, circonscription) — scrutins 2012 → 2026.
- **Socio-économique** : INSEE **FILOSOFI 2021** (revenu disponible par IRIS).
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
