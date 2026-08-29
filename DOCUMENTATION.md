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
- **Part non ventilée** : les suffrages exprimés que le ministère ne répartit pas par
  liste (municipales des petites communes), rapportés aux inscrits — voir « Limites connues »

> **Un seul dénominateur** : tous ces pourcentages sont rapportés aux **inscrits** du
> territoire, jamais à un sous-ensemble. C'est ce qui permet d'additionner les blocs, de
> les empiler avec l'abstention jusqu'à 100 %, et de comparer deux territoires entre eux.
> Un bloc « non mesuré » s'affiche « · » et pèse dans la part **non ventilée**, pas zéro.

| Échelle | Données électorales | Réservoirs de voix | Socio-éco / administratif |
| --- | --- | --- | --- |
| **France** | blocs + participation, tous scrutins ; tableau de recomposition | différentiels nationaux présidentielle→européenne→municipale, taux de perte | — |
| **Région** | idem, agrégé région | différentiels et reports entre scrutins | — |
| **Département** | idem, agrégé département | différentiels, reports, taux de perte | — |
| **Commune** | blocs + participation ; tableau de recomposition (comme la prez) | différentiels prés/euro/muni, taux de perte, reports | **revenu médian**, **taux de pauvreté** (FILOSOFI) ; **prix moyen au m²** (fiche seulement) et **effort d'accession** (DVF) ; **profil administratif INSEE** : pyramide des âges, statut d'occupation, déplacements domicile-travail, renouvellement de population, maire en exercice — comparés à la France |
| **IRIS** (quartier) — *vue par défaut sous la commune* | blocs + participation + recomposition, **estimés** par intersection avec les bureaux de vote (voir ci-dessous) | différentiels, reports, taux de perte, stock d'abstention — estimés eux aussi | **revenu médian**, **taux de pauvreté**, **quartiles (Q1/Q3)**, **déciles (D1/D9)**, **rapport interdécile**, **indice de Gini** par IRIS (carte choroplèthe + barre de dispersion dans la fiche) ; **prix au m²** et **effort d'accession** hérités de la commune (dits comme tels, en fiche seulement) |
| **Bureau de vote** | blocs + participation par BV, **carte choroplèthe nationale** ; le scrutin affiché (Vote LFI / Participation / RN / Gauche) suit le sélecteur ⚖️ → reproduit les cartes BV de la prez (LFI Europ. 2024, LFI Munic. 2026, Présid. 2022…) | **report LFI entre scrutins** (P22→E24, E24→M26…), **différentiel de participation**, **stock d'abstentionnistes** | — |

### Détail des réservoirs de voix (section « Aider à définir la stratégie »)

Calculés dynamiquement entre deux scrutins choisis, à **chaque échelle** disposant des voix
réelles (région, département, commune, bureau de vote) :

- **Taux de perte** de la gauche entre deux scrutins (`(voix_A − voix_B) / voix_A`)
- **Report LFI** entre deux scrutins (`voix_LFI_B / voix_LFI_A`)
- **Différentiel de participation** (`participation_B − participation_A`, en points d'inscrits)
- **Stock d'abstentionnistes mobilisables** (`inscrits × taux d'abstention`)

### Voix à conquérir : trois définitions, trois versions du site

Le site est publié en **trois versions**, à trois adresses, qui ne diffèrent que par la
façon de calculer les **« voix à conquérir »** — la pastille de carte affichée par défaut.
Tout le reste est identique : mêmes données, mêmes fiches, mêmes échelles. Le sélecteur en
haut de carte passe de l'une à l'autre sans quitter le territoire affiché.

| Version | Ce que le chiffre veut dire | Unité |
| --- | --- | --- |
| **1 · Objectif** (`/`) | Ce qu'il **faudrait** obtenir : 20 % des exprimés estimés (seuil de qualification au 1<sup>er</sup> tour), moins le socle de voix LFI déjà acquises (plancher sur Présid. 2022, Europ. 2024, Légis. 2024). `0` = objectif atteint. | voix |
| **2 · Modèle 2027** (`/v2/`) | Ce qu'il y a **réellement** à aller chercher : les abstentionnistes qu'une campagne peut ramener aux urnes **et** qui votent à gauche. | voix |
| **3 · Rentabilité** (`/v3/`) | Ce que **rapporte une heure** de porte-à-porte : le gisement de la version 2, divisé par le temps qu'il coûte à démarcher. | voix / heure |

La version 1 est un **objectif**, pas une mesure : une commune où la gauche plafonne depuis
vingt ans y affiche le même « déficit » qu'une commune pleine d'abstentionnistes de gauche.
Les versions 2 et 3 sont des **estimations**, et le disent : elles portent un bouton « i »
(légende de la carte pour la méthode générale, chiffre de tête de la fiche pour le calcul
détaillé, avec les valeurs de la zone ouverte).

Le changement ne s'arrête pas à la couleur de la carte : **tout ce qui, dans la fiche, chiffre
ce qu'il reste à aller chercher suit la version**. Dans le Carnet de campagne, le segment
« Voix potentielles » de la décomposition de l'électorat devient « **Voix gagnables** » en
versions 2 et 3 et porte exactement le nombre que colore la carte — la version 3 y ajoute le
temps de porte-à-porte que ce gisement représente. Dans le Plan d'action, le levier
« Mobiliser les abstentionnistes » garde son stock brut (un fait mesuré aux européennes 2024,
identique dans les trois versions) mais lui adosse, en versions 2 et 3, la part réellement
mobilisable à gauche — 4 030 sur 30 729 à Saint-Denis, soit 13 %. Deux chiffres nommés
pareil et calculés autrement sur le même écran, c'était l'incohérence à éviter.

**Version 2 — le gisement.** Pour chaque bureau de vote :

```
voix à conquérir = abstentionnistes conjoncturels × γ(niveau de gauche prédit)
```

- **Abstentionnistes conjoncturels** = `inscrits × (abstention prédite 2027 − plancher
  d'abstention du bureau)`. Le plancher est un quantile bas de l'abstention du bureau aux
  législatives passées : on ne remobilise pas l'abstentionniste **chronique**, seulement la
  frange qui revient voter quand la participation monte.
- **γ** = part de gauche du **votant marginal**, lue sur la courbe participation → parts des
  législatives : la couleur politique des électeur·ices qui *rentrent*, et non le score de la
  gauche sur place. Prendre le score local serait circulaire et surestimerait le gisement
  jusqu'à 17 points dans les bastions. γ vaut 40,1 % en moyenne nationale, de 23,7 % dans les
  bureaux les plus à droite à 56,4 % dans les plus à gauche.
- Total national : **2,23 millions de voix**, sur 5,58 millions d'abstentionnistes
  conjoncturels et 49,3 millions d'inscrit·es.

**Version 3 — la rentabilité.** La ressource rare d'une campagne n'est pas la voix théorique,
c'est l'**heure de militant·e** :

```
rentabilité = voix à conquérir ÷ heures de porte-à-porte
heures      = portes × (15 min de conversation + trajet jusqu'à la porte suivante)
```

- **Portes** = `inscrits ÷ 1,6` (nombre d'électeur·ices inscrit·es par logement). La constante
  fixe l'unité, pas le classement.
- **Trajet** : on ne choisit pas le mode, on retient le **moins coûteux** entre la marche
  (4 km/h) et la voiture (25 km/h + 2 min par porte pour se garer et redémarrer). La bascule
  tombe d'elle-même à **159 m** entre deux portes — on marche en ville, on roule à la campagne,
  sans qu'aucun seuil ait été posé à la main. 10,5 % des portes de France sont en voiture.
- **Écart entre deux portes** : déduit de l'aire du bureau et du nombre de logements, par la
  longueur d'une tournée optimale sur une surface donnée (`0,7124 × √(aire × portes)`).
- Moyenne nationale : **0,28 voix par heure** — une voix toutes les 3 h 30 de porte-à-porte.

Aux échelles d'ensemble, la rentabilité est **voix totales ÷ heures totales**, jamais une
moyenne de rapports : le rendement d'un département est celui de tout son terrain pris
ensemble. Les voix, elles, se somment comme le reste de l'atlas (France = Σ départements =
Σ communes = Σ bureaux).

**Provenance.** Le niveau de gauche et l'abstention prédits viennent du modèle par bureau de
vote du dépôt **elections_predictions** (prévision des législatives 2027, ~70 000 bureaux,
démographie INSEE + historique de vote, validé sur les législatives 2024 tenues à l'écart de
l'entraînement : R² de 0,82 sur la gauche, 0,56 sur l'abstention). Le niveau **national** est
celui de son scénario de référence (gauche 30,4 %, abstention 48,0 %) : une hypothèse de
conjoncture, pas une prédiction du résultat. Le modèle publie 2027 à la **commune** ; la
répartition entre les bureaux d'une même commune reprend celle qu'il produit sur 2024, si
bien que la moyenne pondérée des bureaux d'une commune redonne la valeur 2027 publiée.

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
   des quartiers d'une commune redonne son résultat réel. C'est ce qui rattrape les bureaux
   dépourvus de contour (leurs électeurs sont redistribués au prorata) et évite qu'on lise
   deux totaux différents selon l'échelle.
   Le recalage porte sur les quartiers **servis** : quand `COUV_MIN` en écarte un, sa part
   n'est pas redistribuée sur les autres et la somme des quartiers reste alors **inférieure**
   au total communal. 76 communes sont concernées à plus de 1 % (au plus −8 700 inscrits) ;
   partout ailleurs l'égalité est exacte à l'arrondi près (au plus 8 électeurs, chaque
   quartier étant arrondi à l'unité).

**Trois garde-fous** : géométrique, électoral, statistique. Dans les trois cas la zone
écartée n'a **aucune donnée électorale** : la fiche reste purement socio-économique et la
carte la laisse grise — pas de chiffre plutôt qu'un chiffre faux.

| Garde-fou | Ce qu'il mesure | Seuil | Écarté |
| --- | --- | --- | --- |
| `COUV_MIN` | part de l'aire de l'IRIS effectivement recouverte par des contours de bureaux | 99 % | **410 quartiers sur 49 343** (0,8 %) |
| `ELEC_MIN` | part de l'électorat de la commune portée par des bureaux localisables (le reste étant ce que le recalage extrapole) | 90 % | la commune entière, **scrutin par scrutin** |
| `INSCRITS_MIN` | électorat estimé du quartier | 30 inscrits | **251 quartiers** (0,8 % des lignes) |

Le troisième garde-fou est une affaire d'arrondi : chaque colonne est arrondie à l'unité,
si bien que sur un quartier de deux inscrits un seul blanc/nul pèse **50 points** et que la
barre de recomposition y affichait 148 %. Ces quartiers résiduels de la maille IRIS (zones
d'activité, emprises ferroviaires) n'ont de toute façon aucun usage militant. Le seuil
ramène les lignes qui manquent le bouclage de plus de 2 points de **1 744 à 153**, et
l'écart maximal de 48,6 à 12,3 points.

Le second garde-fou existe parce que le recalage communal est un rattrapage tant que les
bureaux sans contour sont marginaux, mais devient une extrapolation quand ils font
l'essentiel de la commune : à Bordeaux, seuls 12 % de l'électorat sont localisables sur
les scrutins 2024-2026 (renumérotation des bureaux), et un « résultat estimé par
intersection » n'y serait rien d'autre que le résultat communal étalé sur la population.
Le filtre est appliqué **par scrutin** : Bordeaux garde donc ses estimations 2017-2022 et
perd 2024-2026, plutôt que tout ou rien.

Au total, **47 707 quartiers sur 49 343** sont estimés sur les européennes 2024, soit
**95,9 % de l'électorat métropolitain** (44,06 M d'inscrits sur 45,95 M). Le rapport de
couverture par IRIS est conservé dans `data_app/iris_bv_couverture.parquet`.

Enfin, un quartier hérite du **régime de nuances** de sa commune : là où le ministère ne
ventile rien, ses blocs valent « non mesuré » (`·`) et non zéro, et les suffrages
concernés se lisent dans la part **non ventilée** — exactement comme aux autres échelles,
la barre bouclant à 100 %. C'est la même convention de bout en bout : 95 328 lignes
quartier × scrutin, dont 31 200 quartiers aux municipales 2026, portent un « · » là où
elles affichaient « LFI 0,00 % · PS 0,00 % · RN 0,00 % ».

### Détail socio-économique (FILOSOFI 2021)

- **Revenu médian disponible** par IRIS et par commune
- **Taux de pauvreté** (seuil 60 %) par IRIS et par commune
- **Dispersion des revenus** par IRIS : **quartiles Q1/Q3**, **déciles D1/D9**, **rapport interdécile
  D9/D1** et **indice de Gini** — l'écart riches/pauvres au sein du quartier, rendu par une barre de
  distribution dans la fiche (slide « niveau de vie des ménages »). À la commune : médiane, pauvreté et
  quartiles (moyenne des IRIS) ; déciles et Gini restent au seul niveau IRIS.

> **Couverture réelle** : FILOSOFI à l'IRIS n'existe que pour les communes de ≥ 5 000
> habitants, et le secret statistique retire le reste — **70 % des quartiers** n'ont ni
> revenu, ni pauvreté, ni quartiles, ni Gini (1 886 communes seulement portent au moins un
> quartier renseigné), et le **taux de pauvreté manque pour 87 % des communes**, les
> quartiles pour 95 %. Conséquence sur le **repère « France »** : il est une moyenne
> pondérée des seules communes où la valeur existe — **72,7 % de la population** pour le
> taux de pauvreté (98,6 % pour le revenu), et les plus peuplées, donc les plus pauvres.
> Il ressort à **17,5 %** quand le taux national INSEE est de **≈ 14,5 %**. La donnée
> manquante n'existe nulle part : on publie donc la couverture avec la valeur, et la fiche
> dit que le repère se lit « par rapport aux communes comparables », pas « la France ».
> À la **commune**, Q1/Q3 sont la moyenne des quartiles de ses quartiers, pas les quartiles
> de la commune (l'INSEE ne les publie qu'à l'IRIS) : la ligne le dit désormais. Le prix au m² manque pour **20,5 % des communes** (DVF, seuil de
> 5 ventes). La fiche le **dit** au lieu d'escamoter la rubrique ; aucune valeur n'est
> fabriquée à la place. Là où FILOSOFI ne descend pas à l'IRIS, la commune forme un seul
> quartier. Le revenu médian communal est ici la moyenne de ses IRIS
> (approximation), à confronter au terrain.

### Prix du logement et effort d'accession (DVF 2022-2024)

Le revenu ne dit qu'une moitié de la condition matérielle : l'autre est ce que coûte le
fait de se loger. Deux indicateurs, à l'échelle de la **commune** :

- **Prix moyen au m²** des logements — maisons et appartements confondus — réellement
  **vendus** dans la commune. Les trois millésimes sont mis en commun et pondérés par le
  nombre de ventes ; sous **5 ventes** cumulées, aucun prix n'est affiché (une moyenne
  tirée de deux mutations ne dit rien d'un marché local).
- **Effort d'accession** : part du revenu d'un ménage médian qu'absorberait la mensualité
  du crédit pour acheter **70 m²** dans la commune. C'est ce qui traduit un prix en
  *capacité réelle à se loger* — 70 m² à Paris et 70 m² dans la Creuse, ce n'est pas le
  même effort pour le même salaire. Hypothèses (`prep_immo.py`, reflétées dans
  `IMMO_HYP` côté client) : apport **10 %**, crédit sur **25 ans** à **3,5 %** hors
  assurance, revenu médian local rapporté au ménage (**1,55** unité de consommation,
  INSEE). Au-delà de **35 %**, la règle du HCSF conduit les banques à refuser le prêt.

Les deux valeurs sont comparées à la **France** et à la **région** (moyennes pondérées par
la population communale, même convention que le revenu et la pauvreté), et vivent toutes
deux dans la **fiche**, section « Prix du logement · commune ». La fiche d'un quartier les
affiche aussi, en précisant qu'elles valent « à l'échelle de la commune ».

Une seule des deux **colore la carte** : l'**effort d'accession**, et seulement sur une
carte de communes (vue département) — à l'IRIS, tous les quartiers d'une commune
porteraient la même couleur. Le **prix au m² n'est pas une pastille** : brut, il décrit un
marché immobilier, pas un territoire militant, et l'étaler sur le même dégradé que les
scores électoraux invitait à le lire comme eux. C'est l'effort d'accession qui le traduit
en capacité réelle à se loger — la grandeur qui, elle, dit quelque chose des gens qui
habitent là.

### Profil administratif de la commune (recensement INSEE 2021)

Reprend la **fiche circonscription INSEE** de la prez (slides 22, 25-28), ramenée à la
commune et comparée à la moyenne France :

- **Pyramide des âges** par sexe et tranche d'âge (slide 26)
- **Statut d'occupation** des résidences principales : propriétaires / locataires / logé·es
  à titre gratuit — ces trois parts font 100 %. Le **logement social (HLM)** est affiché
  ensuite comme un **sous-ensemble des locataires** (« dont »), pas comme une quatrième
  part : l'empiler faisait dépasser 100 % dans 45 % des communes (slide 27)
- **Déplacements domicile-travail** par mode (voiture, transports en commun, marche, vélo…) (slide 28)
- **Renouvellement de population** : lieu de résidence un an auparavant, 5 catégories (slide 25)
- **Maire en exercice** (nom, catégorie socio-professionnelle, **âge**), amorce de l'histoire
  électorale locale (slide 22)

> Agrégés à la commune depuis les **bases infracommunales (IRIS)** du recensement ; le
> renouvellement provient du **fichier détail « individus localisés »** (variable IRAN).

## Sources des données

Tout provient du dépôt **hexagonal** (agrégation France insoumise) :

- **Résultats électoraux** : Ministère de l'Intérieur / data.gouv, publiés **par bureau de
  vote** — scrutins 2012 → 2026. Toutes les autres échelles (commune, département, région,
  France) en sont **agrégées**, et bouclent donc exactement les unes sur les autres.
- **Socio-économique** : INSEE **FILOSOFI 2021** (revenu disponible par IRIS).
- **Prix du logement** : base **DVF** (Demandes de valeurs foncières, DGFiP), millésimes
  2022-2024, via le jeu « Indicateurs Immobiliers par commune et par année » (data.gouv.fr,
  ODbL). L'effort d'accession en est dérivé, croisé au revenu FILOSOFI.
- **Administratif (commune)** : **recensement INSEE 2021** — bases infracommunales (âges,
  logement, activité/déplacements) et fichier détail « individus localisés » (renouvellement) ;
  **Répertoire national des élus** (data.gouv) pour le maire en exercice.
- **Électoral par quartier (IRIS)** : **estimé** — croisement des résultats par bureau de
  vote et des contours IRIS, recalé sur les résultats communaux (voir plus haut).
- **Voix à conquérir 2027** (versions 2 et 3) : dépôt **elections_predictions** — modèle de
  déviation par bureau de vote (législatives 2027), courbe γ participation → parts, plancher
  d'abstention par bureau. On lit ses **sorties publiées** (site statique `report_app/`), on ne
  ré-estime rien. Le porte-à-porte (aire du bureau, portes, kilomètres, budget-temps) est
  calculé ici, dans `prep_mobilisation.py`.
- **Découpage administratif** : INSEE **COG 2025** (communes, départements, régions).
- **Fonds de carte** : régions/départements/communes (france-geojson), contours de bureaux
  de vote (Voronoï data.gouv), contours IRIS 2025 (IGN, quand disponibles).

## Limites connues

- Les **« voix à conquérir » des versions 2 et 3** sont une **prévision**, avec trois sources
  d'imprécision distinctes, à ne pas confondre. **(a)** Le modèle lui-même : R² de 0,82 sur la
  gauche et 0,56 sur l'abstention en validation hors échantillon — le classement des bureaux est
  bien plus fiable que la valeur absolue de chacun. **(b)** Le niveau **national** est posé par
  hypothèse (scénario de référence : gauche 30,4 %, abstention 48,0 %) ; une conjoncture 2027
  différente déplacerait tous les chiffres ensemble, sans réordonner la carte. **(c)** La
  répartition **entre les bureaux d'une même commune** est reprise du millésime 2024 du modèle,
  le millésime 2027 n'étant publié qu'à la commune : le total communal est exactement celui du
  modèle, la dispersion interne est une reprise.
- Le **budget-temps du porte-à-porte** (version 3) repose sur trois conventions assumées, toutes
  affichées dans le « i » : **15 minutes** par porte (ordre de grandeur d'un vrai échange, pas une
  mesure), **1,6 inscrit·e par logement** (le nombre de logements n'est pas compté, il est déduit),
  et l'aire du bureau prise pour surface à parcourir. Les contours Voronoï couvrant **tout** le
  territoire — champs compris — la distance entre deux portes est **majorée à la campagne**, où
  l'habitat est groupé au village. Ces approximations déplacent l'échelle du chiffre bien plus
  qu'elles ne réordonnent les zones. Un bureau dont on ne connaît pas l'aire (outre-mer sans
  contours, Français·es de l'étranger) n'a **pas** de rentabilité : la zone reste grise, plutôt
  qu'un rendement infini.
- Les **contours de bureaux de vote** sont servis **nationalement en choroplèthe** depuis le jeu
  data.gouv « Proposition de contours des bureaux de vote » (découpage **Voronoï** autour des adresses
  des électeurs, méthode Etalab). Ce sont donc des contours **approchés** (pas les périmètres
  administratifs officiels) ; et tout bureau n'a pas de contour (résultats présents mais non
  cartographiés là où le Voronoï n'a pu être calculé) — la zone reste alors non colorée.
  Un **filtre de fiabilité géométrique** (chantier 4) a été écrit pour masquer les tracés
  absurdes — polygones disjoints ou très peu compacts (Polsby-Popper) — mais il est
  **désactivé** : sa métrique confondait le bruit de tessellation Voronoï avec une vraie
  fragmentation et masquait à tort 25 à 40 % de bureaux parfaitement nets. **Tous** les
  contours disponibles sont donc peints aujourd'hui, y compris ceux au tracé douteux ; le
  filtre est à refondre en comptage tolérant aux fragments avant réactivation (les seuils
  restent dans `prep_bv.py`, le filtre client dans `02_data_geo.js`). Le bureau de vote est
  par ailleurs une maille d'**organisation** du travail (la maille de lecture pertinente
  pour un GA est plutôt la commune / le grand quartier).
- Les **contours IRIS** dépendent d'un téléchargement IGN parfois throttlé ; si absent, les
  données IRIS restent disponibles en tableau.
- Le total **France est supérieur à la somme des régions**, d'environ **2 millions
  d'inscrits** aux européennes 2024 (4 %). Ce n'est pas une perte : les **Français·es de
  l'étranger** (codes `Z…`) et les **collectivités du Pacifique**, de Saint-Pierre-et-Miquelon
  et des Îles du Nord ne relèvent d'aucun département ni d'aucune région. Ils comptent dans
  le total national et n'apparaissent à aucune échelle intermédiaire. Toutes les autres
  échelles bouclent **exactement** : France = Σ communes = Σ bureaux, et
  France = Σ départements + ces territoires.
- Les **résultats électoraux à l'IRIS sont estimés**, jamais mesurés (le vote se compte par
  bureau de vote). Ils héritent donc de l'approximation des contours Voronoï **et** de
  l'hypothèse que les électeurs d'un bureau se répartissent comme sa population résidente
  — ce qui est faux là où la structure d'âge ou la part de non-inscrits varie fortement
  d'un côté à l'autre d'un bureau. Un quartier mal recouvert n'est pas estimé du tout.
- Le **tableau de recomposition** affiche une colonne **« non ventilé » (NV)** : la part des
  **suffrages exprimés** que le ministère ne répartit par aucune liste, rapportée aux inscrits
  comme le reste de la barre. Aux **municipales**, les communes de moins de 1 000 habitants
  votent au scrutin **plurinominal** : on y vote pour des **noms**, pas pour des listes, et
  aucun score de bloc n'existe. Ces voix comptent dans la participation, jamais dans un bloc,
  et la ligne affiche « · » (non mesuré), pas « 0 ». La colonne pèse **19,1 points** en France
  aux municipales 2026 (17,5 en 2020, 12,0 en 2014) et bien plus dans un département rural.
  Sans elle la barre ne bouclait pas et les blocs manquants se lisaient comme des zéros :
  **blocs + abstention + non ventilé + blancs/nuls = 100 %** à toutes les échelles et pour
  les 27 scrutins. La part non ventilée se **compte** (somme des voix effectivement rangées
  dans une famille, retranchée des exprimés) au lieu de se déduire du régime de la commune :
  la publication des nuances est un régime communal et binaire, mais une nuance peut sortir
  du mapping dans une commune par ailleurs ventilée (`LNC` en Nouvelle-Calédonie, `LGJ` des
  gilets jaunes). Ces voix disparaissaient alors de la barre sans entrer dans le NV, et la
  recomposition s'arrêtait à 62 % dans 22 communes et 54 bureaux. Les fichiers regroupant deux tours
  (présidentielle 2012, municipales 2014) sont **scindés par tour en amont** : ils ne
  double-comptent plus. Un garde-fou (`scrutins_fiables`) reste en filet de sécurité.
- Le **régime de publication des nuances change d'un scrutin à l'autre**, et le mapping
  (`nuances.py`) doit suivre trois formats : la nuance simple (`FI`, `RN`), la nuance de
  **liste** préfixée `L` (`LFI`, `LUD`), et la nuance de **binôme** des départementales
  préfixée `BC-` (`BC-UG`, `BC-RN`). Les **européennes 2019** sont le seul scrutin du corpus
  dont le fichier ne porte **ni nuance ni nom de candidat** : les familles y sont dérivées du
  **numéro de panneau** (table `LISTE_EUROPEENNE_2019`). Les **unions** sont rattachées
  symétriquement : `LUG`/`UGE` (union de la gauche, avec ou sans les écologistes) au bloc
  `LFI-PCF-EXG` mais **hors** voix LFI, `LUD`/`UCD` (union de la droite, du centre et de la
  droite) au bloc `LR-DVD`, `UDR` (union des droites, alliée du RN depuis 2024) au bloc
  `RN-EXD`. Le bloc **« Autres »** ne contient plus que des listes réellement *divers*
  (animalistes, régionalistes, citoyennes…) : 0,1 % à 6 % des voix selon le scrutin.
  Le **patronyme** ne vaut nuance qu'à la **présidentielle**, où la table des candidat·es
  fait foi. Appliqué aux municipales — où le ministère publie une ligne par nom, sans
  nuance — il rangeait 285 000 voix dans un bloc sur la seule foi d'un homonyme
  (ROUSSEL → PCF, LASSALLE → divers, HAMON → PS) ; dix-neuf communes basculaient de ce fait
  du régime « non ventilé » au régime « mesuré » et affichaient un score de bloc entièrement
  fabriqué, jusqu'à 100 % des voix à Marquillies et à Vrigne-aux-Bois.
- Les **codes commune hérités de l'outre-mer** sont ramenés au code INSEE. Deux encodages,
  même principe : les européennes 2014 codent les DOM sur six chiffres (`974411` pour
  Saint-Denis de La Réunion), la présidentielle 2012 et les municipales 2014 les codent par
  une lettre (`ZA101` pour Les Abymes, `ZM514` pour Ouangani). Ces derniers ressemblaient
  aux codes des Français·es de l'étranger et du Pacifique, qui ne relèvent d'aucun
  département : les **129 communes des DOM** tombaient donc hors des agrégats département et
  région sur ces quatre scrutins — **1,33 M d'inscrits** et **cinq régions entières**
  (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte) absentes de la présidentielle 2012
  et des municipales 2014 — tandis que chaque fiche communale d'outre-mer ouvrait sa série
  en 2017. Les 18 régions et les 101 départements sont désormais présents à tous les
  scrutins qui les concernent.
- Un **compte de voix négatif** du fichier amont est réparé s'il s'explique par un
  débordement d'entier 16 bits ET que le compte rétabli redonne exactement les exprimés
  publiés du bureau ; sinon les voix du bureau sont déclarées non ventilables. Un seul cas
  dans le corpus : au 2e tour de la présidentielle 2012, le bureau des Français·es de
  l'étranger `ZZ006_0001` (107 077 inscrits) affichait **−32 541** voix pour Sarkozy
  (32 995 tronqué sur 16 bits), qui se soustrayaient du bloc LR-DVD national. C'est un
  défaut de la source (dépôt `hexagonal`), à corriger en amont.
- La **non-inscription** (population majeure recensée − inscrits) n'est **pas servie**
  quand la différence est négative : c'est le cas dans **une commune sur deux** (17 539 sur
  34 906), parce que le recensement et la liste électorale ne comptent pas les mêmes gens
  (résidences secondaires, inscription au village d'origine) ; l'écart dépasse 20 % des
  inscrits dans 1 345 communes. Un plancher à zéro affichait « ≈ 0 non-inscrit·es » sous
  « Priorité n°1 · le plus gros réservoir » — un chiffre là où l'estimateur est muet. Là
  où elle est servie, elle reste une **borne haute** (elle inclut les résident·es non
  éligibles). Le plan d'action le dit sur la fiche.
- **Chercher une commune fusionnée** ouvre désormais la commune **nouvelle**, pas le code
  mort : « Bellegarde-sur-Valserine » mène à Valserhône, « Corcelles » à
  Champdor-Corcelles. **2 180 anciens noms** restent cherchables comme alias (affichés
  « anc. … » dans la suggestion), et **tous** pointent vers un autre code. Auparavant
  ces entrées ouvraient une fiche quasi vide — 3,6 % portaient un revenu, 0,2 % un
  chiffre électoral courant — sur une carte qui ne bougeait pas, faute de contour.
  **Plus aucune** entrée de recherche n'est aujourd'hui dépourvue de contour.
- Le **fond communal** de france-geojson est un millésime figé : les communes nouvelles
  postérieures n'y sont pas. Treize communes du COG — Orée d'Anjou et ses 13 041 inscrits,
  Porte des Pierres Dorées, Conques-en-Rouergue, Aurseulles, Sannerville, Sainte-Florence,
  L'Oie, quatre communes du Cantal — avaient donc une fiche, des résultats et aucun
  polygone : la carte ne bougeait pas quand on les ouvrait. Leur contour est désormais
  complété une par une depuis **geo.api.gouv.fr** (`prep_geo.completer_communes`), la
  source qui sert déjà les DROM. Seuls les **45 arrondissements** de Paris, Lyon et
  Marseille restent sans polygone, à dessein : la maille cliquable est la commune INSEE
  agrégée.
- **Quatre bureaux** du corpus (sur 1,56 million) publient plus de voix ventilées que
  d'exprimés — le plus net à Tours, bureau `37261_1562` : 188 exprimés déclarés pour 481
  voix réparties entre les listes. Leur barre de recomposition dépasse alors 100 % (de 0,6
  à 31,8 points). Le défaut est dans le décompte amont, pas dans la ventilation, et rien
  ne permet de trancher lequel des deux chiffres est faux : on ne fabrique donc rien. La
  commune, elle, boucle.
- **Mayotte** n'a aucune moyenne régionale de référence (le recensement infracommunal ne
  la couvre pas) : ses fiches ne se comparent qu'à la France, et le disent.
- **Paris, Lyon et Marseille** (codés par secteur/arrondissement dans les bases infracommunales
  INSEE) n'ont pas de fiche « profil INSEE » à la commune.
- Le **renouvellement de population** est calculé au grain canton-ou-ville (maille la plus fine
  publiée pour la variable IRAN) puis rabattu sur la commune via son canton COG.
- Le **prix au m²** est un indicateur de **transaction** : il décrit ce qui s'est vendu, pas la
  valeur du parc existant, et il est d'autant plus bruité que les ventes sont rares (d'où le
  seuil de 5 ventes et la mise en commun de trois millésimes). C'est une **moyenne**, pas une
  médiane, et elle mêle maisons et appartements — dans une commune qui vend les deux, elle
  reflète leur mélange. Deux territoires sont **absents de la source** : l'**Alsace-Moselle**
  (57, 67, 68), régie par le livre foncier et hors champ DVF, et l'**outre-mer** ; 27 834
  communes sur ~34 900 portent un prix. L'**effort d'accession** dépend en outre de ses
  hypothèses de crédit (apport, durée, taux) : c'est un ordre de grandeur comparable d'une
  commune à l'autre, pas une simulation bancaire.
