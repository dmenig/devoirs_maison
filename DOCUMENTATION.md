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
| **Commune** | blocs + participation ; tableau de recomposition (comme la prez) | différentiels prés/euro/muni, taux de perte, reports | **revenu médian**, **taux de pauvreté** (FILOSOFI) ; **prix moyen au m²** et **effort d'accession** (DVF) ; **profil administratif INSEE** : pyramide des âges, statut d'occupation, déplacements domicile-travail, renouvellement de population, maire en exercice — comparés à la France |
| **IRIS** (quartier) — *vue par défaut sous la commune* | blocs + participation + recomposition, **estimés** par intersection avec les bureaux de vote (voir ci-dessous) | différentiels, reports, taux de perte, stock d'abstention — estimés eux aussi | **revenu médian**, **taux de pauvreté**, **quartiles (Q1/Q3)**, **déciles (D1/D9)**, **rapport interdécile**, **indice de Gini** par IRIS (carte choroplèthe + barre de dispersion dans la fiche) ; **prix au m²** et **effort d'accession** hérités de la commune (dits comme tels) |
| **Bureau de vote** | blocs + participation par BV, **carte choroplèthe nationale** ; le scrutin affiché (Vote LFI / Participation / RN / Gauche) suit le sélecteur ⚖️ → reproduit les cartes BV de la prez (LFI Europ. 2024, LFI Munic. 2026, Présid. 2022…) | **report LFI entre scrutins** (P22→E24, E24→M26…), **différentiel de participation**, **stock d'abstentionnistes** | — |

### Détail des réservoirs de voix (section « Aider à définir la stratégie »)

Calculés dynamiquement entre deux scrutins choisis, à **chaque échelle** disposant des voix
réelles (région, département, commune, bureau de vote) :

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
   des quartiers d'une commune redonne son résultat réel. C'est ce qui rattrape les bureaux
   dépourvus de contour (leurs électeurs sont redistribués au prorata) et évite qu'on lise
   deux totaux différents selon l'échelle.
   Le recalage porte sur les quartiers **servis** : quand `COUV_MIN` en écarte un, sa part
   n'est pas redistribuée sur les autres et la somme des quartiers reste alors **inférieure**
   au total communal. 76 communes sont concernées à plus de 1 % (au plus −8 700 inscrits) ;
   partout ailleurs l'égalité est exacte à l'arrondi près (au plus 8 électeurs, chaque
   quartier étant arrondi à l'unité).

**Deux garde-fous**, l'un géométrique, l'autre électoral. Dans les deux cas la zone
écartée n'a **aucune donnée électorale** : la fiche reste purement socio-économique et la
carte la laisse grise — pas de chiffre plutôt qu'un chiffre faux.

| Garde-fou | Ce qu'il mesure | Seuil | Écarté |
| --- | --- | --- | --- |
| `COUV_MIN` | part de l'aire de l'IRIS effectivement recouverte par des contours de bureaux | 99 % | **410 quartiers sur 49 343** (0,8 %) |
| `ELEC_MIN` | part de l'électorat de la commune portée par des bureaux localisables (le reste étant ce que le recalage extrapole) | 90 % | la commune entière, **scrutin par scrutin** |

Le second garde-fou existe parce que le recalage communal est un rattrapage tant que les
bureaux sans contour sont marginaux, mais devient une extrapolation quand ils font
l'essentiel de la commune : à Bordeaux, seuls 12 % de l'électorat sont localisables sur
les scrutins 2024-2026 (renumérotation des bureaux), et un « résultat estimé par
intersection » n'y serait rien d'autre que le résultat communal étalé sur la population.
Le filtre est appliqué **par scrutin** : Bordeaux garde donc ses estimations 2017-2022 et
perd 2024-2026, plutôt que tout ou rien.

Au total, **48 072 quartiers sur 49 343** sont estimés sur les européennes 2024, soit
**98,7 % de l'électorat métropolitain**. Le rapport de couverture par IRIS est conservé
dans `data_app/iris_bv_couverture.parquet`.

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
> quartiles pour 95 %. Le prix au m² manque pour **20,5 % des communes** (DVF, seuil de
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
la population communale, même convention que le revenu et la pauvreté). Les pastilles de
carte correspondantes ne s'affichent que sur une **carte de communes** (vue département) :
à l'IRIS, tous les quartiers d'une commune porteraient la même couleur. La fiche d'un
quartier, elle, affiche le prix en précisant qu'il vaut « à l'échelle de la commune ».

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
- **Découpage administratif** : INSEE **COG 2025** (communes, départements, régions).
- **Fonds de carte** : régions/départements/communes (france-geojson), contours de bureaux
  de vote (Voronoï data.gouv), contours IRIS 2025 (IGN, quand disponibles).

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
  les 27 scrutins. Les fichiers regroupant deux tours
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
- Un **compte de voix négatif** du fichier amont est réparé s'il s'explique par un
  débordement d'entier 16 bits ET que le compte rétabli redonne exactement les exprimés
  publiés du bureau ; sinon les voix du bureau sont déclarées non ventilables. Un seul cas
  dans le corpus : au 2e tour de la présidentielle 2012, le bureau des Français·es de
  l'étranger `ZZ006_0001` (107 077 inscrits) affichait **−32 541** voix pour Sarkozy
  (32 995 tronqué sur 16 bits), qui se soustrayaient du bloc LR-DVD national. C'est un
  défaut de la source (dépôt `hexagonal`), à corriger en amont.
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
