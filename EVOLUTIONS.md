# Atlas électoral militant — évolutions à mener

## Conversation de retoursur la V1 : 
"le produit est super prometteur, merci
quelques remarques :
1) à mon avis il faut simplifier l'interface au maximum, en l'état les néophytes risquent d'être dépassés et de ne pas l'utiliser. imo le seul choix auquel ils doivent être exposés en prenant en main l'outil pour la 1e fois doit être de sélectionner leur territoire sur la carte. le reste (données utilisées, élections comparées etc) doit être intégré d'office
2) les villes à cheval sur 2 circos ne sont intégrées à la sélection que sur une circo (Saint-Denis n'apparaît pas dans une des 2 circos par ex). le shenanigan utilisé pour Paris pour régler ce pb est top, on peut l'étendre aux autres communes concernées je pense
3) à mon avis on doit davantage orienter les scripts : on sait (au PEE) que les pratiques de campagne les plus prometteuses électoralement pour nous sont, pour presque tous les territoires,

- la mobilisation des non- et des mal-inscrits

- la remobilisation de gens qui ont déjà voté pour nous (je mets l'accent sur la remobilisation: ça n'est pas automatique, contrairement à ce que bcp de cadres locaux ont l'air de penser cf. "les gens qui ont voté pour nous en 2022 vont revenir à la maison" que j'ai encore entendu plusieurs fois hier)

- seulement après, la mobilisation des primo-électeurs

- seulement de façon bcp plus marginale, la mobilisation d'électorats proches de nous, type PS 2024

ton output met déjà ça en avant de façon assez générique mais il faut y aller encore plus fort à mon avis, surtout sur la non- et la mal-inscription
(j'envoie un exemple de ce à quoi je pense dans pas longtemps je suis dessus)
quelques remarques de ma part :
1) enlever l'échelle circonscription qui n'aura pas beaucoup de pertinence pour la campagne présidentielle : ça règle le problème n°2 soulevé par Elia
2) le découpage des bureaux de vote va poser des problèmes dans les petites villes. Même dans des endroits où les bureaux de vote sont clairement découpés (comme Paris), il y a plein de polygones disjoints et/ou absurdes, et ça ne m'inspire pas une grande confiance. Je pense qu'il faudra une métrique et un cutoff pour ne pas afficher les bureaux de vote dans les endroits où les polygones obtenus sont trop absurdes (car les bureaux n'ont pas été répartis via un SIG par exemple)
3) un mode export des données me paraît pertinent. certains groupes voudront poursuivre les analyses de leur côté et ça leur facilitera la vie
dans l'idée qqchose comme ça https://exemple-slide-commune-lfipee.netlify.app/
Ha ok donc on ne pense pas que c'est utile d'avoir une vue d'ensemble locale (comparer aux voisins, checker la geographie tout ça) ?
(et à plusieurs échelles)
oh ça paraît idéal ça
pas convaincue pour le niveau BDV dans le sens où ça sera utilisé à l'échelle des GA et que les GA sont à minima à l'échelle d'arrondissement/de grand quartier
je pense qu'il faut ajouter les cartes en bas du truc d'Elia
en mode vue générale au niveau le plus pertinent pour un GA
oui je suis d'accord, ce que j'ai envoyé peut n'être que la fenêtre qui s'ouvre quand on clique sur une commune
puis zoom sur les BDV/IRIS pour pouvoir organiser le travail
Ha ok ok
plus écran d'export pour pouvoir charger les données dans un fichier excel
Je pompe tout ça"

Ce sont els retours qu'on m'a donné sur le code actuel. 

Synthèse actionnable des retours (Elia + relecture campagne + arbitrages du fil de discussion).

**La référence de ce qu'on veut produire pour chaque zone** est le *Carnet de campagne*
(maquette : <https://exemple-slide-commune-lfipee.netlify.app/>) : une fiche **générée
automatiquement par commune** à partir des données électorales et sociodémographiques, qui
traduit les chiffres en **plan d'action de terrain chiffré et daté**.

## Vision cible (architecture & parcours)

On **garde la carte multi-échelle** : la vue d'ensemble locale (se comparer aux voisins,
lire la géographie) est jugée utile, à plusieurs échelles. Mais elle devient la **porte
d'entrée / le navigateur**, pas le cœur du produit.

Parcours type :

1. **Carte d'ensemble** (France → Région → Département → Commune) — repérage, comparaison aux
   voisins, choix de son territoire. Interface dépouillée (cf. chantier 2).
2. **Clic sur une commune → le Carnet de campagne s'ouvre** (la « fenêtre » qu'évoque Elia) :
   c'est la fiche riche de la maquette (chantier 3). C'est la **maille d'action de référence**.
3. **Zoom dans la commune → BV / IRIS** pour **organiser le travail** (quels quartiers, quels
   bureaux). Maille secondaire, d'organisation — pas la maille de lecture stratégique.
4. **Écran d'export** pour récupérer les données dans un fichier Excel (chantier 5).

> **Maille des Groupes d'Action (GA).** Un GA opère au minimum à l'échelle d'un
> **arrondissement / grand quartier**, pas du bureau de vote isolé. Conséquence transverse :
> les **cartes de vue générale** doivent s'afficher à la **maille pertinente pour un GA**
> (commune ; arrondissement / grand quartier dans les grandes villes), le BV/IRIS restant le
> niveau de drill-down pour l'organisation. Cela relativise le chantier 4 (voir plus bas).

Ordre de priorité conseillé : **1 → 2 → 3 → 4 → 5**.

---

## 1. Supprimer l'échelle « circonscription »

**Pourquoi.** Inutile pour une présidentielle (scrutin national). Et c'est elle qui crée le bug
des **communes à cheval sur deux circos** (Saint-Denis n'apparaît que dans une de ses deux) :
supprimer l'échelle **dissout** le problème au lieu de le rustiner.

> Remplace le retour Elia n°2 (« étendre le shenanigan Paris ») : sans échelle circo, plus de
> rattachement commune↔circo à corriger.

**Quoi.**
- Hiérarchie cible : `France → Région → Département → Commune → IRIS / Bureau de vote`.
- [assets/js/06_navigation.js](assets/js/06_navigation.js) : `vueDepartement()` descend
  **directement aux communes** (réutiliser `vueDeptCommunes()`) ; supprimer `vueCirconscription()`
  et la branche `circonscription` de `render()` / `entrer()`.
- [assets/js/02_data_geo.js](assets/js/02_data_geo.js) : supprimer `circoNom()` + le rattachement
  par centroïde (`centroid`, `ringArea`, `ptInGeom`, `ptInRing`) s'il ne sert qu'à la circo.
- [assets/js/01_config.js:27](assets/js/01_config.js#L27) : **recaler `ZIN`/`ZOUT` de 5 → 4
  niveaux**, sinon les seuils de zoom auto sont décalés.
- Données : retirer `values/circonscription.json` et `geo/circ/*` de
  [prepare_data.py](prepare_data.py) / [prep_bake.py](prep_bake.py).
- Mettre à jour [DOCUMENTATION.md](DOCUMENTATION.md) (échelle circo + limite « rattachement approché »).

---

## 2. Simplifier la prise en main (la carte = navigateur dépouillé)

**Pourquoi.** Le néophyte est noyé sous les contrôles (sélecteur ⚖️, ~10 pastilles, bascule
BV/IRIS). **Au premier contact, le seul geste doit être : cliquer sur son territoire.** Le reste
(données utilisées, scrutins comparés) est **choisi d'office**. La carte reste multi-échelle pour
la comparaison, mais sans réglages exposés.

**Quoi.**
- **Masquer par défaut** : sélecteur de paire de scrutins ⚖️ (`buildSelecteur`, `#pairgroup`),
  pastilles d'indicateurs (`PAST` / `buildPastilles`), bascule BV ⇄ IRIS (`#subtoggle`) —
  [07_controls.js](assets/js/07_controls.js), [01_config.js](assets/js/01_config.js).
- **Défauts imposés** : `selA="P22"`, `selB="E24"` ([01_config.js:23](assets/js/01_config.js#L23)) ;
  indicateur d'entrée orienté action (proposition : participation/abstention).
- **Mode avancé** : regrouper ces contrôles derrière un dépliant « Avancé » **replié par défaut**
  (les experts gardent tout).
- La carte affiche une **coloration de vue d'ensemble** par défaut (un seul indicateur lisible),
  le détail venant du **clic** (→ chantier 3).

---

## 3. Le « Carnet de campagne » : la fiche qui s'ouvre au clic sur une commune

**Pourquoi.** C'est **la** représentation de référence de ce qu'un·e militant·e doit savoir sur sa
zone (maquette LFI-PEE ci-dessus). On y va **fort** sur la non-/mal-inscription, la
**remobilisation** (pas le « retour automatique à la maison »), puis les primo-électeurs, et de
façon marginale les électorats proches. La fiche actuelle ([03_panel_info.js](assets/js/03_panel_info.js)
+ [05_panel_action.js](assets/js/05_panel_action.js)) est trop générique → la refondre sur le
modèle de la maquette.

**Structure cible de la fiche (reprend la maquette).**

1. **En-tête** : « Carnet de campagne — Présidentielle 2027 », nom de la commune + population.
2. **3 scénarios de seuils** en colonnes : *1ᵉʳ tour* · *2ᵉ tour vs Bardella/RN* · *2ᵉ tour vs
   candidat macroniste*. Pour chacun : **objectif de voix** (chiffre central), **fourchette
   estimée** (± marge d'erreur) et rappel de la base (nb d'électeurs potentiels).
3. **Historique électoral** (dépliable) : 2017 · 2019 · 2022 · 2024 (voix + %).
4. **Décomposition de l'électorat** en 4 segments visualisés :
   - **voix garanties**,
   - **voix potentielles**,
   - **bloc abstention / non-inscription / mauvaise inscription**,
   - **voix inaccessibles**.
5. **Plan d'action priorisé et daté** (4 leviers, dans cet ordre — c'est le cœur stratégique) :
   1. **Inscription (sept.–déc.)** — non-inscrits + mal-inscrits ; objectif chiffré de
      porte-à-porte → voix mobilisables. *Priorité n°1, à marteler.*
   2. **Remobilisation des électeurs Mélenchon 2022 (sept.–avr.)** — distinguer la part de
      **retour spontané** de la part **à reconquérir à l'effort** (contrer le « ils reviendront »).
   3. **Abstentionnistes (févr.–avr.)** — plutôt tractage marchés/lieux publics (porte-à-porte
      moins efficace ici).
   4. **Primo-électeurs (en continu)** — résidences étudiantes / CROUS.
   Chaque levier renvoie à un **mode d'emploi** (porte-à-porte, outil de canvassing, tractage
   marché, scripts primo-votants).
6. **Pied de page** : attribution PEE + « document généré automatiquement ».

**Quoi (implémentation & données).**
- Refondre `infoPanel()` / `actionPanel()` pour produire cette fiche structurée (pas une liste
  plate de tips).
- **Non-inscription** : estimation = *population majeure éligible* (tranches d'âge recensement,
  `age_*` déjà bakées dans [prep_bake.py](prep_bake.py)) **−** inscrits. Approximation → l'étiqueter.
- **Mal-inscription** : proxy via le **renouvellement de population** (variable IRAN déjà bakée,
  slide 25) = arrivées récentes potentiellement mal-inscrites. À cadrer.
- **Remobilisation** : on a `dyn_report` (report LFI A→B) et `dyn_perte` (voix perdues). Les
  réutiliser pour la part spontanée vs à l'effort, avec un texte qui insiste sur la non-automaticité.
- **Primo-électeurs** : proxy `age_1529` (nouveaux majeurs).
- **Segments & seuils** : nécessitent un **modèle d'estimation** (base électeurs, participation
  attendue, conversion porte-à-porte → voix). La maquette annonce des **chiffres fictifs** → il
  faut une **méthodologie défensable, à fournir par le PEE**, avant de chiffrer.

**Questions ouvertes (à trancher avec le PEE / Elia).**
- Méthodo des 3 scénarios de seuils et des fourchettes (participation attendue, marge d'erreur).
- Méthodo de la décomposition garanties / potentielles / inaccessibles.
- Taux de conversion « porte-à-porte → voix mobilisables » utilisés dans le plan d'action.
- Source/fiabilité de l'estimation **mal-inscription** (IRAN suffit-il ?).
- Où héberger les **modes d'emploi** liés (contenus à sourcer).

---

## 4. Mailles d'affichage : commune / quartier-GA d'abord, BV en drill-down

**Pourquoi.** Les contours BV sont des **Voronoï** (data.gouv/Etalab) : polygones disjoints/absurdes,
y compris à Paris. **Et** les GA opèrent au minimum à l'échelle **arrondissement / grand quartier**.
Donc le BV isolé n'est **pas** la maille de lecture : c'est un niveau d'**organisation du travail**.

**Quoi.**
- **Vue générale embarquée en bas du Carnet** (chantier 3) : petites cartes de comparaison locale
  à la **maille pertinente pour un GA** — commune, ou **arrondissement / grand quartier** dans les
  grandes villes (PLM + grandes communes). Prévoir une **agrégation BV → arrondissement/grand
  quartier** (l'agrégation lisse au passage les Voronoï aberrants).
- **Drill-down BV/IRIS** conservé pour organiser le terrain (quels bureaux, quels quartiers),
  branche BV de `vueCommune()` ([06_navigation.js](assets/js/06_navigation.js)).
- **Cutoff de fiabilité BV** (priorité abaissée car BV = secondaire) : taguer au bake
  ([prep_bv.py](prep_bv.py)/[prep_bake.py](prep_bake.py)) un **drapeau de fiabilité géométrique**
  (fragmentation = nb de polygones disjoints ; compacité Polsby-Popper ; aire/inscrits). Sous le
  seuil : masquer les polygones, afficher les données BV **en tableau** + bandeau « contours peu
  fiables ici ».

**Questions ouvertes.**
- Définition opérationnelle du « grand quartier » / de la maille GA (IRIS ? regroupement de BV ?
  arrondissement pour PLM ?).
- Métrique et valeur de cutoff BV (calibrer sur Paris + petites communes).

---

## 5. Écran d'export (vers Excel)

**Pourquoi.** Certains GA voudront **poursuivre les analyses dans un tableur**.

**Quoi.**
- **Écran / bouton d'export** des données de la zone et de l'échelle affichées.
- Format prioritaire : **Excel / CSV** ; GeoJSON en option (données + contours pour SIG).
- Contenu : valeurs de la fiche — blocs de recomposition, participation/abstention, réservoirs
  (report, perte, différentiel, stock abstention, **non-/mal-inscription**), socio-éco, profil
  admin. Données déjà en JSON dans [data_app/values](data_app) → assemblage CSV plat direct.
- **En-tête de provenance** (scrutins, millésimes, sources) pour un export interprétable hors contexte.

**Question ouverte.** Granularité : zone affichée seulement, ou tout le département / toute la
France à l'échelle courante ?

---

## Récapitulatif

| # | Chantier | Priorité | Dépend de | Règle / intègre |
| - | -------- | -------- | --------- | --------------- |
| 1 | Retirer l'échelle circonscription | Haute | — | retour Elia n°2 (communes à cheval) |
| 2 | Simplifier la carte (navigateur dépouillé, multi-échelle conservé) | Haute | — | retour Elia n°1 |
| 3 | **Carnet de campagne** au clic sur une commune (maquette LFI-PEE) | Haute | méthodo PEE | retour Elia n°3 + exemple |
| 4 | Mailles commune / quartier-GA d'abord, BV en drill-down + cutoff | Moyenne | 3 | relecture n°2 + arbitrage GA |
| 5 | Écran d'export vers Excel | Moyenne | — | relecture n°3 |

---

## État d'implémentation

> Tout le code des 5 chantiers est écrit (front + pipeline). **Rien n'est commité** ; les
> nouveaux champs de données (`insc`, `pop`, `noninsc`, `malinsc`, `fiable` des BV) exigent une
> régénération `prepare_data.py` + `prep_bake.py` + `regen_bv.py` puis un push sur `master`
> pour être servis en ligne — la carte tire ses données de `raw.githubusercontent.com/.../master`.
> En attendant, le front **dégrade proprement** : il dérive les inscrits du stock d'abstention
> et calcule la fiabilité des contours BV côté client, donc le Carnet et le filtre BV
> fonctionnent dès aujourd'hui (sans les estimations non-/mal-inscription tant que non rebakées).

| # | Statut | Détail |
| - | ------ | ------ |
| 1 | ✅ Fait | Hiérarchie France→Région→Dép→Commune ; circo retirée de la nav, du zoom, de la recherche, du bake, des contours et de la doc. |
| 2 | ✅ Fait | Bouton **⚙️ Avancé** (replié par défaut) masque pastilles + sélecteur ⚖️ + bascule BV/IRIS ; indicateur d'entrée = participation. |
| 3 | ✅ Fait | `031_carnet.js` (3 scénarios + décomposition 4 segments) en tête de fiche ; `05_panel_action.js` réécrit en plan priorisé/daté (non-/mal-inscription → remobilisation → abstention → primo, PS marginal) ; bake des estimations dans `prep_bake.py`. Seuils/segments regroupés dans `CARNET_HYP`. |
| 4 | ✅ Fait | Cutoff de fiabilité BV (heuristique client + drapeau `fiable` baké dans `prep_bv.py`), repli via export. **Vue d'ensemble locale embarquée en bas de la fiche commune** (`032_apercu.js`) : small-multiples SVG de la commune dans son voisinage (LFI / participation / RN · Europ. 2024, contour blanc = commune courante) ; pour Paris/Lyon/Marseille, comparaison **par arrondissement** (la maille d'un GA) — bureaux de vote agrégés par arrondissement (préfixe du code BV) et pondérés par les inscrits, mêmes indicateurs (LFI/participation/RN, Europ. 2024). Reste ouvert : définition fine du « grand quartier » hors PLM. |
| 5 | ✅ Fait | Bouton **⬇️ Export** : CSV (séparateur `;`, BOM Excel) de la **zone sélectionnée** (la fiche ouverte) + en-tête de provenance. GeoJSON déféré (optionnel). |

---

## Second tour de relecture (retours 16-19)

| # | Retour | Statut | Détail |
| - | ------ | ------ | ------ |
| 16 | Ajouter les **définitions des CSP** sur la fenêtre cliquable | ✅ Fait | Le volet de détail de la section « Catégories sociales » ([03_panel_info.js](assets/js/03_panel_info.js)) liste désormais la nomenclature INSEE PCS (cadres PCS 3, prof. intermédiaires PCS 4, employés PCS 5, ouvriers PCS 6, retraités PCS 7), + mention des PCS 1/2 non affichés. Style `.defs` dans [map.css](assets/map.css). |
| 17 | Préciser que le **renouvellement** est mesuré **sur un an** (2020→2021) | ✅ Fait | Titre de section → « Renouvellement de population · sur 1 an (2020→2021) » et détail explicite (variable IRAN, RP 2021, comparaison 2020↔2021) dans [04_panel_admin.js](assets/js/04_panel_admin.js). |
| 18 | **Outre-mer** : validation politique douteuse si indispo ; warning ou standardisation ? | ⚠️ Parti-pris : **warning, pas de fabrication** | Bandeau de transparence (`omBanner`, [03_panel_info.js](assets/js/03_panel_info.js)) affiché sur les territoires ultramarins (codes 97-/98-, régions DOM) : « peu de stats publiques, recos avec précaution ». **Choix assumé : ne PAS standardiser des chiffres manquants** — fabriquer des estimations sans source est indéfendable pour un outil cherchant une validation politique, et la transparence sur le manque protège mieux le produit. **À trancher avec le PEE** : faut-il purement masquer le Carnet outre-mer, ou le garder avec le bandeau ? |
| 19 | Lien cliquable vers les **GA les plus proches** de la ville | ✅ Fait (lien à confirmer) | Lien en bas de la fiche commune (`galink`, [03_panel_info.js](assets/js/03_panel_info.js)) vers l'annuaire Action Populaire `actionpopulaire.fr/groupes/?q=<commune>`. **Ouvert** : le paramètre de recherche exact de la plateforme (SPA, non vérifiable à distance) reste à confirmer avec quelqu'un ayant accès au back-office LFI ; le lien dégrade proprement vers l'annuaire si `?q=` est ignoré. |

---

## Vue par défaut sous la commune : le quartier (IRIS), électoral compris

> Retour Elia : « pas convaincue pour le niveau BDV dans le sens où ça sera utilisé à
> l'échelle des GA et que les GA sont à minima à l'échelle d'arrondissement/de grand
> quartier ».

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **L'IRIS devient la sous-maille servie par défaut** sous la commune (`SOUS_DEFAUT`, [01_config.js](assets/js/01_config.js)) ; la bascule 🗳️ Bureaux de vote reste à un clic en mode avancé. Le quartier n'était jusque-là qu'une fiche sociale : il porte désormais aussi **l'analyse électorale**. |
| ✅ Fait | **Électoral estimé à l'IRIS** ([prep_iris_bv.py](prep_iris_bv.py)) : intersection des contours IRIS (IGN) et des bureaux de vote (Voronoï data.gouv), répartition des voix **au prorata de la population** de chaque intersection, puis **recalage sur le résultat communal réel** (la somme des quartiers redonne exactement la commune). Toutes les pastilles électorales et le sélecteur ⚖️ sont désormais actifs en vue quartiers. |
| ✅ Fait | **Deux garde-fous, aucune donnée plutôt qu'une fausse** : `COUV_MIN` (99 % de l'aire de l'IRIS doit être recouverte par des contours de bureaux → 392 quartiers écartés sur 48 512) et `ELEC_MIN` (90 % de l'électorat communal doit être porté par des bureaux localisables, sinon le recalage extrapole au lieu de rattraper → commune écartée scrutin par scrutin, ex. Bordeaux 2024-2026). Rapport conservé dans `data_app/iris_bv_couverture.parquet`. |
| ✅ Fait | **L'estimation est dite partout** : « · estimé » dans la légende de la carte et dans l'intitulé du chiffre de tête, « (estimé) » dans l'infobulle, bandeau en tête de l'analyse électorale et méthodologie complète dans le volet de détail. |
| ✅ Fait | `values/iris.json` (14 Mo, national) **découpé par département** (`values/iris/<dep>.json`) : porteur de l'électoral, le fichier national aurait dépassé 70 Mo pour afficher un seul quartier. |
| 🐛 Corrigé au passage | `gotoZone` ([08_search.js](assets/js/08_search.js)) empilait la commune **après** l'avoir rendue : la sous-maille et la légende étaient calculées comme si l'on était encore au département (arrivée par la recherche ou par permalien). La commune est désormais empilée avant le rendu, comme au clic. |

---

## Coût du logement : prix au m² et effort d'accession

> « On n'a pas le prix au m² ? » — le revenu ne dit qu'une moitié de la condition
> matérielle ; l'autre est ce que coûte le fait de se loger.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **[prep_immo.py](prep_immo.py)** : prix moyen au m² par commune depuis la base **DVF** (Demandes de valeurs foncières, DGFiP) agrégée par commune et par année (data.gouv.fr, ODbL). Les millésimes **2022-2024** sont mis en commun et pondérés par le nombre de ventes ; garde-fou `VENTES_MIN = 5` — sous 5 ventes cumulées, aucun prix (une moyenne tirée de deux mutations ne décrit aucun marché). **27 834 communes** portent un prix. |
| ✅ Fait | **Effort d'accession** : mensualité du crédit pour **70 m²** ÷ revenu mensuel du ménage médian, en %. C'est ce qui traduit un prix en *capacité réelle à se loger* — 70 m² à Paris (84 %) et 70 m² dans la Creuse (14 %), ce n'est pas le même effort pour le même salaire. Hypothèses regroupées dans `IMMO_HYP` (apport 10 %, 25 ans à 3,5 % hors assurance, 1,55 UC par ménage), **miroir Python/JS** à garder synchronisé, et affichées dans la fiche : un taux d'effort sans ses hypothèses ne veut rien dire. |
| ✅ Fait | **Références France et région** ([prep_immo.references_immo](prep_immo.py)) injectées dans `socio_reference.json` : un prix ne se lit que comparé. Moyennes pondérées par la **population** communale (même convention que le revenu et la pauvreté), pas par le nombre de ventes — c'est le prix auquel est confronté l'habitant·e moyen·ne, non celui de la transaction moyenne. France **3 172 €/m²** et **33 %** d'effort ; Île-de-France 5 517 €/m² et 51 %. |
| ✅ Fait | **Fiche** : section « Prix du logement · commune » ([03_panel_info.js](assets/js/03_panel_info.js)), deux lignes comparées à la France et à la région, + nombre de ventes ayant servi à la moyenne. Chaque ligne porte un **« i » d'explication** : **survol** = définition courte (infobulle CSS `.hint`, [map.css](assets/map.css)), **clic** = volet méthodo complet (sources, hypothèses, limites) — le clic remonte à l'entête `.exph` déjà en place. Sur écran tactile, où le survol n'existe pas, l'infobulle est masquée et le tap ouvre directement le volet. |
| ✅ Fait | **Pastille de carte** « Effort logement » réservée à la **carte des communes** (vue département, `immoActive()` dans [07_controls.js](assets/js/07_controls.js)) : la donnée étant communale, une choroplèthe IRIS serait uniforme sur toute la commune. La fiche d'un quartier affiche quand même le prix, en disant « à l'échelle de la commune ». |
| ✅ Fait | **Le prix au m² n'est plus une pastille de carte** — il ne l'est resté que le temps de constater ce qu'il colorait : un marché immobilier, étalé sur le même dégradé bleu-rouge que les scores électoraux, donc invitant à se lire comme eux. Un prix brut ne décrit pas un territoire militant ; c'est l'**effort d'accession** qui le traduit en capacité réelle à se loger, et lui seul garde sa carte. Le prix reste entier dans la fiche, section « Prix du logement · commune », à côté de l'effort et de sa méthodo. |
| ⚠️ Limite assumée | La source **ignore l'Alsace-Moselle** (57, 67, 68 — livre foncier, hors champ DVF) et l'**outre-mer** : ces communes n'ont pas de valeur, pas de chiffre estimé à la place. Le prix est par ailleurs une **moyenne** (pas une médiane) de **transactions** (pas du parc), maisons et appartements confondus. |

---

## Audit de cohérence : ce qui ne bouclait pas

> Question posée : « des incohérences ? sommes pas à 100 % ? régions manquantes ? » —
> passage au crible des invariants, échelle par échelle et scrutin par scrutin.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Le quartier affichait « LFI 0 % » là où personne n'a compté.** Les blocs valent `NaN` (« non mesuré ») dans les communes que le ministère ne ventile pas, mais `groupby().sum()` rend **0** pour un groupe entièrement `NaN` : la nullité était perdue à l'agrégation IRIS, le garde-fou `non_ventile` ne se déclenchait jamais et **95 902 lignes quartier × scrutin** — 31 200 quartiers et 16,0 M d'inscrits aux seules municipales 2026 — servaient des zéros pour des mesures, sur une barre qui s'arrêtait à 40 %. `sum(min_count=1)` ([prep_iris_bv.py](prep_iris_bv.py)) rétablit la distinction, et `exprimes_nuances` — désormais publié à toutes les échelles — porte la part non ventilée jusqu'au quartier. C'était la maille **servie par défaut** sous la commune. |
| ✅ Corrigé | **Cinq régions absentes de quatre scrutins.** La présidentielle 2012 et les municipales 2014 codent les DOM par une lettre (`ZA101` = Les Abymes, `ZM514` = Ouangani), forme voisine des codes des Français·es de l'étranger et du Pacifique, qui ne relèvent d'aucun département : Guadeloupe, Martinique, Guyane, La Réunion et Mayotte — **129 communes, 1,33 M d'inscrits** — tombaient hors des agrégats région et département, et chaque fiche communale d'outre-mer ouvrait sa série en 2017. `_canon_commune` ([prep_elections.py](prep_elections.py)) ramène ces codes au code INSEE, comme il le faisait déjà pour les six chiffres des européennes 2014. Les **18 régions et 101 départements** sont maintenant présents à tous les scrutins qui les concernent, et l'écart France − Σ régions est bien ce que la documentation annonce : l'étranger, le Pacifique, Saint-Pierre-et-Miquelon et les Îles du Nord, rien d'autre. |
| ✅ Corrigé | **Des blocs fabriqués depuis un patronyme.** La table des candidat·es de présidentielle était consultée à **tous** les scrutins dès que la nuance manquait : aux municipales, où le ministère publie une ligne par nom sans nuance, elle a rangé **285 000 voix** dans un bloc sur la seule foi d'un homonyme (ROUSSEL → PCF, LASSALLE → divers, HAMON → PS). Dix-neuf communes basculaient de ce fait du régime « non ventilé » au régime « mesuré » et affichaient un score entièrement fabriqué — 100 % des voix à Marquillies et à Vrigne-aux-Bois. Le patronyme ne vaut nuance qu'à la présidentielle (`patronymes`, [nuances.py](nuances.py)). |
| ✅ Corrigé | **La part non ventilée se compte au lieu de se déduire.** `exprimes_nuances` valait « tous les exprimés » dès que la commune était ventilée — vrai seulement si toute voix y trouve sa famille. Une nuance hors mapping (`LNC` en Nouvelle-Calédonie, `LGJ`) disparaissait alors de la barre **sans** entrer dans le NV : la recomposition s'arrêtait à 62 % dans **22 communes et 54 bureaux** (jusqu'à −40 points). Elle est maintenant la somme des voix effectivement rangées dans une famille : 1 ligne commune et 4 lignes bureau sur 2,35 millions manquent encore le bouclage, et par **excès** — voir la limite ci-dessous. |
| ✅ Corrigé | **Treize communes sans polygone.** Le fond france-geojson est un millésime figé : Orée d'Anjou (13 041 inscrits), Porte des Pierres Dorées, Conques-en-Rouergue, Aurseulles, Sannerville, Sainte-Florence, L'Oie et quatre communes du Cantal avaient une fiche, des résultats et aucun contour — la carte ne bougeait pas quand on les ouvrait. `prep_geo.completer_communes` complète le fond depuis **geo.api.gouv.fr**, la source qui sert déjà les DROM. Plus **aucune** entrée de recherche n'est dépourvue de contour (26 auparavant) ; seuls les 45 arrondissements de Paris, Lyon et Marseille restent sans polygone, à dessein. |
| ✅ Corrigé | **Troisième garde-fou à l'IRIS : `INSCRITS_MIN = 30`.** Chaque colonne étant arrondie à l'unité, un quartier de deux inscrits transformait un unique blanc/nul en 50 points et affichait une barre à 148 %. 251 quartiers résiduels de la maille (zones d'activité, emprises ferroviaires) sont écartés — 0,8 % des lignes, aucun usage militant — et les lignes qui manquent le bouclage de plus de 2 points passent de 1 744 à 153, l'écart maximal de 48,6 à 12,3 points. |
| ⚠️ Limite assumée | **Quatre bureaux publient plus de voix que d'exprimés** (sur 1,56 million) : à Tours, le bureau `37261_1562` déclare 188 exprimés pour 481 voix réparties entre les listes. Leur barre dépasse 100 % de 0,6 à 31,8 points. Le défaut est dans le décompte amont, et rien ne dit lequel des deux chiffres est faux : on ne fabrique rien, la commune boucle. |
| ⚠️ Limite assumée | **La Mayenne est absente du 2e tour des municipales 2026** et la Guyane du 2e tour de 2020 : zéro ligne dans le fichier du ministère repris par `hexagonal`, pas un défaut de l'atlas. Les absences de 2021 (Paris, Corse, Martinique et Guyane aux départementales, Mayotte aux régionales) sont, elles, conformes au droit. |
| ✅ Vérifié | Bouclage **exact** de `blocs + abstention + non ventilé + blancs/nuls = 100 %` aux échelles France, région et département pour les **27 scrutins** (écart maximal 0,05 point) ; **France = Σ communes = Σ bureaux** à l'unité près pour les 27 scrutins ; aucun doublon `(code, scrutin)` à aucune échelle ; aucun pourcentage négatif, aucune participation supérieure à 100 %. |

### Second passage : ce que la carte affichait encore de travers

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **« NaN% » en chiffre de tête et dans l'infobulle.** `pairMetrics` ([02_data_geo.js](assets/js/02_data_geo.js)) ne testait que le DÉNOMINATEUR du report : `voixB / voixA` avec un numérateur ABSENT — les municipales des communes de moins de 1 000 habitants ne publient aucune voix par liste — valait `NaN`, et `NaN` n'est pas `null`. Choisir « Munic. 2026 » comme scrutin B avec la pastille « Voix LFI conservées » ou « Voix de gauche perdues » écrivait donc « NaN% » sur **31 542 communes** et sur tous leurs quartiers. Les deux scrutins doivent être ventilés ; à défaut, « — ». `fmtVal` ([01_config.js](assets/js/01_config.js)) refuse en outre `NaN` comme il refusait déjà `null`, pour que la classe entière de bug ne puisse plus atteindre l'écran. |
| ✅ Corrigé | **La recherche proposait 23 fois la même commune.** Une commune porte une entrée d'index par nom cherchable : le sien, plus un par nom absorbé. Quand la requête répondait déjà sur le nom ACTUEL, les entrées alias étaient des doublons — « Livarot » sortait **23 lignes** identiques, « Paris » 21, sur un budget de 50 suggestions que les vraies zones se voyaient ainsi confisquer. L'alias ne s'affiche plus que si c'est lui qui répond ([08_search.js](assets/js/08_search.js)) : « Livarot » → 1 suggestion, « Paris » → 11 (dont Seyssinet-Pariset et Damparis), et « Bellegarde-sur-Valserine » mène toujours à « Valserhône (anc. Bellegarde-sur-Valserine) ». |
| ✅ Corrigé | **« Paris (anc. Paris 11e Arrondissement) ».** Les 45 arrondissements de Paris, Lyon et Marseille se rattachent à la commune agrégée par le même `code_commune_parent` que les communes déléguées, et héritaient donc du libellé « ancien nom » — un arrondissement n'est pas un nom mort. Le COG les marque `ARM` : `type_commune` est désormais publié dans `ref_communes.parquet` et [prep_index.py](prep_index.py) les sort sous la clé `arr`, rendue « Paris · 11e Arrondissement ». |
| ✅ Corrigé | **La documentation décrivait un filtre désactivé.** Le filtre de fiabilité géométrique des contours de bureaux (chantier 4) est commenté dans le client depuis qu'on a mesuré qu'il masquait à tort 25 à 40 % de bureaux nets, mais `DOCUMENTATION.md` continuait d'affirmer qu'un tracé absurde n'est pas peint. La limite est réécrite pour dire ce que le code fait. |
| ✅ Vérifié | Les poids IRIS × bureau somment à **1,000000** pour les 68 471 bureaux pondérés, sans poids négatif ni bureau orphelin. Tout contour de bureau a des résultats, et `values/bv` ne contient **aucune** entrée sans contour. `values/commune`, `values/iris` et `values/bv` reproduisent les parquets **au dixième près** sur les 23 000 comparaisons testées. Les « voix à conquérir » agrégées sont **exactement** la somme des déficits communaux (101 départements, 18 régions). L'effort d'accession se recalcule à **0,0 pt** d'écart depuis le prix et le revenu. `IMMO_HYP` et `CARNET_HYP` sont fidèles à leurs miroirs Python. Les 27 scrutins passent le garde-fou `scrutins_fiables` (bouclage national de 91,4 à 99,1 %, le reste étant les blancs et nuls). Aucun pourcentage hors [0, 100] dans les fichiers servis, aucune commune sans région ni département dans l'index, `tour` n'est vide que pour les trois européennes — qui n'ont qu'un tour. |
| ⚠️ Limite assumée | 59 bureaux ont une cellule Voronoï en **plusieurs morceaux**, stockés en autant de features (jusqu'à 30 pour `10386_0001`) : la carte les peint tous, avec la même valeur et le même libellé. Ce sont de vrais îlots disjoints, pas des artefacts — le plus gros ne pèse que 69 % de la cellule. |
| ⚠️ Limite assumée | La **non-inscription** dépasse le nombre d'inscrits dans 24 communes. C'est la borne haute assumée de l'estimateur (recensement − inscrits) là où le recensement compte des résident·es inscrit·es ailleurs, déjà documentée comme telle. |

### Troisième passage : les calculs de la fiche

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Le « levier marginal · type PS 2024 » se lisait sur les municipales 2026.** Le libellé nommait un scrutin, l'arithmétique en lisait un autre — et précisément celui où le ministère ne publie aucune ventilation par liste dans les communes de moins de 1 000 habitants : le levier n'était calculable que dans **9 % des communes**, et disparaissait de la fiche agrégée (qui écarte tout `*_M26` à dessein). Aux municipales, « gauche hors LFI » est de surcroît surtout faite de listes locales, pas d'un électorat PS. Calculé sur les **législatives 2024**, il couvre **94 %** des communes ([05_panel_action.js](assets/js/05_panel_action.js)). |
| ✅ Corrigé | **« Rien à remobiliser » là où l'on ne sait pas.** Dans la décomposition du Carnet de campagne, `remob` valait `(lfiv_P22||0) − (lfiv_E24||0)` : un scrutin ABSENT devenait zéro voix, soit un socle 2022 entier compté comme perdu, soit un réservoir nul affiché comme une mesure. 33 communes n'ont qu'un des deux scrutins. Le panneau d'action utilisait déjà le bon garde-fou ; le carnet le partage désormais ([031_carnet.js](assets/js/031_carnet.js)). |
| ⚠️ Limite assumée | **L'amorce inlinée rend 8 régions sur 18 géométriquement invalides** (auto-intersections) : les cinq DROM, la Bretagne, les Hauts-de-France et la Corse. C'est le prix du Douglas-Peucker en pur Python de [prep_seed.py](prep_seed.py) (pas de shapely au déploiement), qui simplifie anneau par anneau sans vérifier la topologie de l'ensemble. La surface ne bouge que de **0,32 % au pire**, aucune partie ne disparaît (`_anneau` garde toujours un triangle), et Leaflet ne valide pas la topologie : l'écart reste sous le pixel aux zooms 6 à 9, les seuls que l'amorce sert. À reprendre si l'on veut un jour servir ce fond plus bas. |
| ✅ Vérifié | Le tableau de recomposition lit les huit colonnes **dans l'ordre exact** où `BLOCS_RECOMPO` les bake (six blocs, abstention, non ventilé) : aucun bloc mal étiqueté. Le panneau administratif masque les sections entièrement non mesurées au lieu d'y dessiner des barres à zéro (104 communes pour les déplacements, 82 pour le renouvellement, 6 pour l'occupation). L'export PDF **clone le HTML de la fiche** : il ne peut pas en diverger par construction. Les agrégats de sélection multiple et l'aperçu par arrondissement PLM font des **moyennes pondérées par les inscrits**, jamais des moyennes de pourcentages. Les sept règles de « conclusions opérationnelles » ont toutes leur référence France. Un balayage du motif `||0` sur tout le JS ne laisse que des usages légitimes (initialisation d'accumulateur, largeur de barre, plancher documenté de l'électorat potentiel). |

---

## « Voix à conquérir » : remplacer l'objectif par une mesure — et publier trois versions

> Constat : le score « voix à conquérir » de la V1 est un **objectif arithmétique**
> (20 % des exprimés estimés − socle LFI). Il ne repose sur aucune estimation de ce qui est
> gagnable : une commune où la gauche plafonne depuis vingt ans y affiche le même « déficit »
> qu'une commune pleine d'abstentionnistes de gauche. Le dépôt **elections_predictions**
> produit, lui, la mesure qui manquait — par bureau de vote, pour les législatives 2027.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Trois versions publiées depuis une seule branche**, et non un commutateur d'affichage. `build_site.py` écrit `_site/index.html`, `_site/v2/index.html` et `_site/v3/index.html` depuis la même source, le numéro figé dans la page (`__VERSION__`, cf. [build_map.py](build_map.py)). Comparer deux définitions du score, c'est comparer deux **sites** : chacun a son URL, s'ouvre dans son onglet, et une URL partagée décrit sans ambiguïté ce qu'a vu celui qui l'envoie. Le sélecteur en haut de carte ([15_version.js](assets/js/15_version.js)) n'est qu'un jeu de liens, qui reporte l'état de la vue (zone, zoom, fiche) d'une version à l'autre. Un seul `data_app` sert les trois : les clés des trois définitions y sont bakées côte à côte, chaque version n'en colorant qu'une. |
| ✅ Fait | **Version 2 — le gisement.** `voix à conquérir = abstentionnistes conjoncturels × γ`. Les conjoncturels sont l'abstention prédite 2027 **moins** le plancher d'abstention du bureau (on ne remobilise pas l'abstentionniste chronique) ; γ est la part de gauche du **votant marginal**, lue sur la courbe participation → parts des législatives — la couleur de ceux qui *rentrent*, et non le score local, qui serait circulaire et surestimerait le gisement jusqu'à 17 points en bastion. **2,23 M de voix** au national, contre 5,58 M d'abstentionnistes conjoncturels. |
| ✅ Fait | **Version 3 — la rentabilité.** La ressource rare d'une campagne n'est pas la voix théorique, c'est l'**heure de militant·e** : `rentabilité = voix à conquérir ÷ heures de porte-à-porte`, où chaque porte coûte **15 min de conversation + le trajet vers la suivante**. Le mode de déplacement n'est pas choisi à la main : on retient le moins coûteux entre la marche (4 km/h) et la voiture (25 km/h + 2 min d'arrêt par porte), ce qui bascule tout seul à **159 m** entre deux portes — on marche à Paris, on roule dans l'Allier. **0,28 voix/h** au national, soit une voix toutes les 3 h 30. Aux échelles d'ensemble, le rendement est `Σ voix ÷ Σ heures`, jamais une moyenne de rapports. |
| ✅ Fait | **Un bouton « i » à deux niveaux**, présent en versions 2 et 3 seulement (le score de la V1 se lit sans notice). Dans la **légende de la carte** : la méthode générale et les repères nationaux, avant tout clic — c'est la coloration qu'on lit en premier. Sur le **chiffre de tête de la fiche** : le calcul décomposé **avec les valeurs de la zone ouverte** (conjoncturels, γ, plancher, portes, chance par porte, temps par porte, mode de déplacement), plus la lecture (« une voix toutes les 1,9 h ici, contre 0,28 voix/h en France ») et les limites. Aucune hypothèse n'est recopiée dans le JavaScript : la notice lit `values/_mobilisation.json`, écrit par le pipeline — changer une hypothèse dans [prep_mobilisation.py](prep_mobilisation.py) change le texte, sans risque de divergence. |
| ✅ Fait | **Le modèle n'est pas ré-estimé**, ses sorties publiées sont reprises ([prep_mobilisation.py](prep_mobilisation.py)) : déviations 2027 par commune, courbe γ, ancre nationale du scénario de référence, et prédictions par bureau du millésime 2024 pour la texture intra-communale. Ancrage par construction : la moyenne pondérée des bureaux d'une commune redonne la valeur 2027 publiée par elections_predictions. Le porte-à-porte (aire du bureau, portes, kilomètres, budget-temps) est calculé ici. |
| ✅ Vérifié | Σ bureaux = **2 234 544** voix, contre **2 237 763** calculées directement sur la couche communale du modèle : **0,14 %** d'écart, imputable aux non-linéarités (`max(0, ·)` sur les conjoncturels, courbe γ). Les cinq échelles servies (bureau, quartier, commune, département, région) descendent toutes du même tableau par bureau — l'invariant `France = Σ départements = Σ communes = Σ bureaux` tient donc pour ce score comme pour les autres. Les trois pages passent `node --check` ; les notices des versions 2 et 3 rendent sans `undefined` ni `NaN` sur des valeurs réelles de bureau, de commune et de région, et rendent `null` (zone grise) là où le modèle ne dit rien. |
| ⚠️ Limite assumée | **Le millésime 2027 n'est publié qu'à la commune.** La dispersion **entre les bureaux d'une même commune** est donc reprise du millésime 2024 du même modèle, sur les mêmes bureaux et les mêmes variables. Le total communal reste exactement celui du modèle 2027 ; seule la répartition interne est datée. |
| ⚠️ Limite assumée | **Le dénominateur de la version 3 est une convention**, pas une mesure : 15 minutes par porte, 1,6 inscrit·e par logement, et l'aire du bureau — Voronoï, donc champs compris — prise pour surface à parcourir. À la campagne, l'écart entre deux portes est ainsi **majoré**, puisque l'habitat y est groupé au village. Ces choix déplacent l'échelle du chiffre bien plus qu'ils ne réordonnent les zones. Un garde-fou de densité (20 000 portes/km², au-dessus de l'arrondissement parisien le plus dense) neutralise les **155 cellules Voronoï dégénérées** qui affichaient jusqu'à 670 000 portes/km² et une rentabilité cent fois supérieure à celle de leurs voisines. |
| ✅ Corrigé | **Le Carnet de campagne contredisait la carte.** Sa décomposition de l'électorat affichait « Voix potentielles » calculées par l'heuristique de la version 1 — écart entre le meilleur et le pire score de la gauche, plus les insoumis 2022 non retrouvés en 2024 — dans les TROIS versions : on lisait 20 354 voix potentielles à Saint-Denis sous une carte qui en annonçait 4 030, pour le même territoire et le même mot. Le segment suit désormais la version ([031_carnet.js](assets/js/031_carnet.js)) et se nomme « Voix gagnables » en versions 2 et 3, où il porte exactement le nombre de la pastille ; la version 3 y ajoute l'effort que ce gisement représente (« ≈ 7 846 heures de porte-à-porte, soit 0,51 voix/h »). Une zone que le modèle ne couvre pas perd le segment plutôt que d'afficher un « 0 » qui se lirait « rien à gagner ». |
| ✅ Fait | **Les objectifs arithmétiques du Carnet ne sont plus servis qu'en version 1.** Les trois cartes de seuil — 20 % des exprimés pour la qualification, 50 % au second tour — SONT la formule dont le score de la version 1 est tiré (`score = cible du 1ᵉʳ tour − socle LFI`). Affichées dans les trois versions, elles remettaient ce calcul sous les yeux du lecteur juste au-dessus du chiffre censé le remplacer : « qualification : 6 553 voix » au-dessus de « Voix gagnables : 4 030 » se lit « il en manque 6 553 ». Hors version 1, le Carnet s'ouvre désormais sur les voix LFI réellement obtenues, puis sur la décomposition. Vérifié dynamiquement, et pas seulement à la lecture : en piégeant `CARNET_HYP.qualif1T`, `CARNET_HYP.maj2T` et la clé bakée `conq` derrière un Proxy, puis en rendant le score et le Carnet complet sur une grande ville, une petite commune, une région et un bureau de vote — les versions 2 et 3 n'y touchent **jamais**. |
| ✅ Fait | **Le Carnet annonçait un scrutin et en chiffrait un autre.** Ses objectifs sont ceux d'une présidentielle, d'où son titre « Carnet de campagne · Présidentielle 2027 » ; mais en versions 2 et 3, ces objectifs disparus, le seul chiffre projeté qui y reste vient du modèle — qui porte sur les **législatives** 2027. Le titre suit la version ([031_carnet.js](assets/js/031_carnet.js)). |
| ✅ Fait | **Le levier « abstentionnistes » du plan d'action ne dit plus que le stock brut.** Les 30 729 inscrit·es qui n'ont pas voté aux européennes 2024 sont un fait mesuré, identique dans les trois versions — mais les présenter seuls laissait croire que tout ce monde était à prendre, l'erreur même que le modèle 2027 corrige. En versions 2 et 3, le stock est adossé à sa part réellement mobilisable à gauche ([05_panel_action.js](assets/js/05_panel_action.js)) : 4 030 sur 30 729, soit 13 %, le reste étant l'abstention chronique. |
| ⚠️ Limite assumée | **797 bureaux n'ont pas de rentabilité** (outre-mer sans contours, Français·es de l'étranger) : sans aire, pas de kilométrage. Ils gardent leurs voix à conquérir (version 2) mais restent gris en version 3 — un `0` au dénominateur les aurait placés en tête du classement. |

## Bordeaux ne s'affichait plus : les bureaux renumérotés depuis 2022

> Constat : en mode « Objectif », **tout** est « — » à Bordeaux. Le diagnostic remonte bien
> plus haut que l'affichage — et touche les trois versions.

| Statut | Détail |
| ------ | ------ |
| 🔍 Diagnostic | **Bordeaux a renuméroté ses bureaux entre 2022 et 2024** (`1101` → `1001`, `1201` → `1021`, `1301` → `1041`…), et les contours data.gouv sont figés sur le REU du 1er juin 2022 — le fichier « latest » (téléchargé et inspecté : 147 bureaux, codes de 2022) porte encore l'ancienne numérotation. Seuls **18 codes sur 153** coïncidaient encore, et *par accident* : les voix de 2024 y étaient rattachées au contour d'un **autre** bureau. L'écart d'inscrits le montre — 63 à 74 % en médiane, contre 2 % pour un vrai appariement. |
| 🔍 Diagnostic | **Ce n'était pas propre au mode « Objectif ».** Avec 12 % de son électorat localisé, Bordeaux tombait sous `ELEC_MIN` (90 %, [prep_iris_bv.py](prep_iris_bv.py)) : `_recaler` écartait **tous** ses quartiers pour E24, L24 et M26, d'où l'absence de `insc`, `abst` et `conq`. Score v1 : 0 IRIS sur 88 ; v2 : 35 ; v3 : 33 ; et le Carnet de campagne vide dans les trois, faute de `carnetBase`. Supprimer les versions 1 et 2 n'y aurait donc rien changé. |
| ✅ Corrigé | **`construire_crosswalk_renumerotation`** ([prep_elections.py](prep_elections.py)) reconstruit l'appariement par **alignement ordonné** (Needleman-Wunsch) des deux listes de codes : la renumérotation préserve l'ordre et se contente d'intercaler les créations, ce que l'alignement modélise exactement. Le coût d'un couple est l'écart relatif d'**inscrits** entre le scrutin de référence ancien et le nouveau — deux fichiers indépendants des codes, donc un vrai témoin. Bordeaux : **147 contours retrouvés**, 2,1 % d'écart médian, électorat localisé de 12 % à **97 %** — au-dessus d'`ELEC_MIN`. |
| ✅ Fait | **Trois garde-fous**, dans l'esprit du crosswalk PLM (« sinon on s'abstient »), qui reste inchangé : on n'intervient que sur les communes que l'appariement par code prive d'estimation (ailleurs, un alignement même bon dégraderait un rattachement déjà juste — Toulouse passait de 97 % à 96 %) ; l'écart médian doit rester sous **6 %**, calibré comme le 95<sup>e</sup> centile de l'écart des 1 769 communes dont l'appariement par code est complet (médiane 1,9 %) ; et le rattachement doit progresser d'au moins un point. **7 communes** sur les 93 qui déclenchent l'alignement le passent. |
| ✅ Fait | **Les créations depuis 2022 sont privées de contour** (suffixe `+`) plutôt que laissées sur le polygone d'un homonyme : dans une commune réalignée, l'alignement fait autorité pour tous ses bureaux. La règle vit dans `_remapper`, et non dans la table, pour valoir aussi aux **municipales 2026**, qui ont créé à leur tour des bureaux que le crosswalk, bâti sur 2024, ne connaît pas. `prep_bake` écarte de la carte tout code sans contour ; les voix continuent de compter dans les agrégats commune, département et région. |
| ✅ Fait | **Le crosswalk ne s'applique qu'aux scrutins de 2024 et après.** Ses clés sont des codes 2022 parfaitement valides : appliqué en amont, il aurait renvoyé les voix d'un bureau sur le contour d'un autre. Vérifié : aucun code de la présidentielle 2022 n'est remappé. |
| 🐛 Corrigé en route | Deux défauts de la première version du correctif. **(a)** 59 codes de contour portent deux features (bureau au tracé éclaté) : sans dédoublonnage, l'alignement appariait deux bureaux 2024 au même polygone. **(b)** Les inscrits des deux côtés étaient lus dans une table **fusionnée** : pour un faux ami, l'effectif de 2024 se retrouvait des deux côtés du couple, l'écart tombait à 0 % et le garde-fou validait sa propre erreur — six communes étaient retenues à tort et Bordeaux affichait 2,6 % au lieu de 2,1 %. Les deux tables sont désormais distinctes. |
| ⚠️ Limite assumée | **Le correctif ne peut pas être appliqué depuis ce dépôt seul** : `data_app/` doit être régénéré (`prep_elections` → `prep_iris_bv` → `prep_bake`) depuis les sources **hexagonal**, gérées par DVC. Tant que ce n'est pas fait, les valeurs servies restent celles d'avant. |
| ⚠️ Limite assumée | **86 communes déclenchent l'alignement sans le passer** — Cayenne, Saint-Médard-en-Jalles, Valenciennes, Oullins-Pierre-Bénite… Soit le gain est nul, soit l'écart d'inscrits dépasse le seuil : on préfère l'absence de chiffre à un chiffre faux. Quatre communes (Troyes, Alès, Belfort, Dieppe) n'ont **aucun** contour et sortent du champ. Le vrai remède serait un millésime de contours postérieur au REU 2022, ou une table de correspondance officielle : ni l'un ni l'autre n'existe à ce jour. |

## Un code de bureau ne veut pas dire la même chose selon la source qui le porte

> Suite du correctif Bordeaux. La renumérotation n'était qu'une des deux façons de perdre
> l'appariement bureau ↔ contour, et le chantier a fait remonter deux autres défauts, dans
> hexagonal et dans elections_predictions, plus un scrutin national disparu.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Le redécoupage : 101 communes dont l'appariement n'est pas réparable.** Une commune refond ses bureaux sans changer d'espace de codes — Dammarie-les-Lys 17 → 11, Montceau-les-Mines 14 → 10, Cogolin 7 → 12 — à électorat quasi constant. Tous ses codes se retrouvent des deux côtés de la jointure et pas un ne désigne le même territoire. La couverture est AVEUGLE à ce cas (100 %), et l'alignement inopérant : on ne fait pas correspondre 11 bureaux fusionnés à 17 polygones. Leurs bureaux récents sont privés de contour — **1 469 bureaux** perdent le détail infra-communal de 2024 et 2026 plutôt que de le porter faux. Les totaux commune / département / région ne changent pas : ils ne passent pas par le bureau. |
| ✅ Corrigé | **La médiane seule ne voyait pas Bordeaux.** Premier jet du détecteur : écart d'inscrits MÉDIAN sur les codes appariés > 15 %. Il attrapait 74 communes mais PAS Bordeaux, dont les 18 codes coïncidant par accident ont des écarts de 0, 2, 3, 3, 5, 5, 5, 8, 11, 14, puis 18, 24, 27, 29, 30, 51, 97 et 108 % — médiane 12,4 %, sous le seuil, alors que huit bureaux sur dix-huit sont grossièrement faux. La médiane est robuste, et c'est exactement ce qu'on ne veut pas ici. La moitié basse n'était pas un signe de justesse : les bureaux bordelais faisant tous entre 600 et 1 400 inscrit·es, un appariement au hasard tombe juste une fois sur deux. On lit donc AUSSI la part des bureaux dont l'écart dépasse 20 % : sur les 1 826 communes dont l'ensemble des codes est identique d'un millésime à l'autre, elle vaut 0,0 % jusqu'au 90e centile et 0,9 % au 95e — le seuil est à 25 %, vingt-cinq fois ce 95e centile. Bordeaux : 39 %. |
| ✅ Corrigé | **Le gain de rattachement bloquait les réparations justes.** L'alignement n'était accepté que s'il AUGMENTAIT la part d'électorat rattachée — critère né du cas Bordeaux, où la couverture était à 12 %. Mais une commune dont tous les codes coïncident est déjà à 100 % : aucun alignement, même parfait, ne peut la faire progresser, et 22 communes réparables étaient détachées à tort. Quand l'identité est démentie, la preuve n'est plus la couverture gagnée mais la COHÉRENCE de l'alignement (écart sous le seuil des communes intactes). Résultat : **30 communes réparées et 401 bureaux réappariés** au lieu de 8 et 217 — Sarreguemines, Le Creusot, Brive-la-Gaillarde et Sedan repassent du côté réparé. |
| ✅ Fait | **Une seule règle pour les deux cas.** `construire_crosswalk_renumerotation` renvoie désormais les communes RECODÉES — 30 réparées par l'alignement et 101 détachées, 131 en tout. `_remapper` les traite identiquement : tout code que le crosswalk ne place pas, dans une commune recodée, perd son contour (suffixe `+`). Le fichier publié pour les étapes suivantes suit : `communes_renumerotees.json` devient `communes_recodees.json`. |
| 🐛 Corrigé | **Un scrutin national entier disparaissait à cause d'une commune.** Vingt lignes sans exprimés à Montbéliard faisaient échouer `exprimes_nuances = ventiles.clip(upper=out["exprimes"])` : pandas remplace une borne NA par `+inf`, qu'il refuse ensuite d'écrire dans un entier nullable. L'exception remontait au garde-fou « un scrutin atypique ne doit pas tout bloquer », et les **70 099 bureaux du 1er tour des législatives 2024** — un des quatre scrutins que propose la carte — sortaient du corpus pour la France entière, sur une seule ligne d'avertissement. Le plafond ne s'applique plus que là où il existe. Défaut PRÉEXISTANT : le code de `master` échoue à l'identique. |
| 🐛 Corrigé (hexagonal) | **La réparation amont de ces mêmes lignes décalait tout le fichier.** Le `sed` de `nettoyer-2024-legislatives-1` remplaçait `Montbéliard;0` par `;Montbéliard;0E11` : le `;` de tête en trop décalait chaque champ d'un cran, si bien que « Code BV » recevait `Montbéliard`, « Inscrits » recevait `0E11` (lu comme `0e11`, donc 0) et « Exprimés » un pourcentage, donc NA. Les quatre bureaux de la série `0E` de Montbéliard n'existaient tout simplement pas. Vérifié de bout en bout à travers le normaliseur d'hexagonal : les `0E11/0E21/0E31/0E41` reviennent avec leurs vrais effectifs, zéro NA, et le reste du fichier est identique octet pour octet. `dvc.lock` n'est pas retouché — `dvc repro` verra la commande changer et rejouera les étapes concernées. |
| 🐛 Corrigé (elections_predictions) | **Le même faux appariement, un cran plus haut.** `report_geo.export` et `report_geo_2027.export` joignent les prédictions aux contours par `codeBureauVote`, avec un `continue` silencieux sur les orphelins : à Bordeaux, 18 features sur 153 passaient — et publiaient les inscrits des bureaux de 2024 sous des codes de contours de 2022 (1 349 là où le contour en comptait 686). Le dépôt porte pourtant de quoi trancher : `general_results.parquet` donne les inscrits de chaque bureau pour les 56 scrutins, dans l'espace de codes des contours. `report_geo.communes_desynchronisees()` les lit et applique les deux mêmes statistiques qu'ici (écart médian > 15 %, ou plus d'un quart des bureaux à plus de 20 %), plus un troisième témoin : un alignement ordonné qui fait MIEUX que l'identité. **128 communes en 24 s, Bordeaux comprise** — un sous-ensemble strict des 131 de l'atlas. **1 801 features fausses** ont été retirées de l'artefact publié, sur 49 départements ; il en reste 0 sur 66 659. Le modèle n'est pas rejouable ici, mais le code et l'artefact disent exactement la même chose. |
| ✅ Corrigé | **Le redécoupage y est détecté aussi.** La première version s'en remettait à la couverture de la jointure, aveugle dans les deux sens : elle laissait passer 829 features fausses réparties sur 79 communes appariées à 100 %, et supprimait celles de Saint-Victoret, correctes malgré 42 % de couverture. Le témoin est désormais l'écart d'inscrits, pas le nombre de codes qui tombent en face. Le site `/2027` n'est pas concerné par ces jointures : son artefact est communal (`communes.json`, `circo.geojson`) et ne sert aucune couche par bureau — mais son export partage le détecteur. |
| 🐛 Corrigé | **Le pipeline ne pouvait plus tourner du tout.** `charger_listes_lfi` exigeait des colonnes accentuées (`numéro_panneau`, `étiquette_tdl`) que le millésime courant d'hexagonal ne porte plus ; les deux graphies sont désormais acceptées. Et la racine des données hexagonal était codée en dur sur `/home/veesion/hexagonal`, alors que le dépôt se clone SOUS celui-ci (c'est ce que dit son propre `.gitignore`) : on cherche `./hexagonal/data` d'abord, `HEXAGONAL_DATA` tranche. Le fichier des listes LFI a aussi changé de place (sous-dossier `elections/`) : les deux chemins sont essayés. |
| 🐛 Corrigé en route | Quatre défauts de mes propres correctifs, trouvés en les vérifiant. **(a)** 59 codes de contour portent deux features (tracé éclaté) : sans dédoublonnage, l'alignement appariait deux bureaux 2024 au même polygone. **(b)** Les inscrits des deux côtés étaient lus dans une table FUSIONNÉE : pour un faux ami, l'effectif de 2024 se retrouvait des deux côtés du couple, l'écart tombait à 0 % et le garde-fou validait sa propre erreur. **(c)** Côté elections_predictions, le critère de couverture a été abandonné : à 90 % il supprimait 1 127 features dont la plupart étaient justes, à 50 % il en laissait 829 fausses. **(d)** Le troisième témoin (« l'alignement diffère de l'identité ») condamnait une commune sur une simple permutation de deux bureaux de taille voisine — Oullins-Pierre-Bénite, 1,5 % d'écart. Il faut maintenant que l'alignement fasse mieux, pas seulement autrement. |
| ✅ Vérifié | Régénération complète depuis les sources hexagonal (récupérées par md5 depuis le cache DVC public) : 27 scrutins au lieu de 26, l'appariement de Bordeaux passe de 18 à 147 bureaux sur 153, les communes redécoupées tombent à 0 bureau sur contour, Toulouse et les scrutins ≤ 2022 sont inchangés au bureau près. `ruff check` retrouve exactement les avertissements de `master`, sans un de plus. |

## La comparaison a tranché : plus qu'une version, la rentabilité

> Constat : les trois versions ont été publiées pour être **comparées**, pas pour cohabiter
> indéfiniment. La rentabilité du porte-à-porte l'emporte — c'est la seule qui rapporte le
> gisement à la ressource rare d'une campagne, l'heure de militant·e.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Une seule page, à la racine.** `build_site.py` n'écrit plus que `_site/index.html` ; `assemble_map()` perd son paramètre `version` et `map.html` son marqueur `__VERSION__`. Les permaliens `/v2/…` et `/v3/…` ne répondent plus — l'état de la vue qu'ils portaient (`?e=`, `?z=`, `?ll=`, `?f=`) reste valable à la racine, la clé du score restant `conquerir`. |
| ✅ Fait | **Le sélecteur de version disparaît** : `#vgroup` sort de [map.html](map.html) avec ses règles CSS, et `15_version.js` devient [15_modal.js](assets/js/15_modal.js), qui ne porte plus que la notice de méthode de la légende. |
| ✅ Fait | **Les deux autres définitions ne sont plus calculées nulle part.** `objectifConquerir` et `CONQ_SCRUTINS` quittent [02_data_geo.js](assets/js/02_data_geo.js) ; `voixConquerir` n'est plus que `rendementPorte`. Côté pipeline, `_conquerir`, `QUALIF_1T` et `CONQ_SCRUTINS` quittent [prep_bake.py](prep_bake.py), qui cesse de baker la clé `conq` à toutes les échelles — attention, la boucle qui la calculait posait aussi `vals["reg"]`, conservé. `mobMethodo` (le volet méthodo de la version 2) disparaît de [034_mobilisation.js](assets/js/034_mobilisation.js), devenu inatteignable ; son explication du numérateur est reprise, avec les nombres de la zone, dans la ligne « Voix à conquérir » de `rendMethodo`. |
| ✅ Fait | **Le Carnet et le plan d'action perdent leurs branches.** `CARNET_HYP` ne garde que `partDef` : les seuils d'objectif (`qualif1T`, `maj2T`, `margeRel`) partent avec les cartes de qualification. `GAGNABLES_LAB` vaut « Voix gagnables », `CARNET_SCRUTIN` « Législatives 2027 », et le levier « abstentionnistes » adosse toujours au stock brut sa part mobilisable. |
| ✅ Vérifié | Le JS concaténé parse ; aucun identifiant orphelin (`VERSION`, `VERSIONS`, `CONQ_PAST`, `objectifConquerir`, `buildVersions`) ne subsiste — `CONQ_PAST`, encore lu à l'initialisation de `indicLabel`/`indicUnit`, a été remplacé par `PAST[0]`. `build_site.py` produit bien une page unique de 666 Ko. `ruff check` retrouve exactement les 5 avertissements préexistants. |

## Le correctif amont est publié, pas seulement écrit

> Le `sed` réparé de hexagonal ne servait à personne tant que le cache DVC distant
> continuait de servir l'ancien fichier décalé : `dvc pull` rendait les données fautives, et
> le verrou annonçait des empreintes que plus rien ne produisait.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Cinq étapes rejouées et poussées.** La commande corrigée change le contenu de tout ce qui en descend : le CSV nettoyé, le parquet normalisé, la table de correspondance bureau ↔ circonscription, et les deux parquets `03_main` des deux tours. `dvc repro --downstream nettoyer-2024-legislatives-1` les reconstruit toutes les cinq ; `dvc push` les dépose sur le cache S3. Le second tour bouge aussi, parce qu'il lit la table de correspondance à laquelle les quatre bureaux manquaient. |
| ✅ Fait | **`dvc.lock` est enfin cohérent** (hexagonal `28a8215`). Le diff fait 24 lignes, et rien d'autre : les cinq empreintes et la commande. `dvc status` déclare les cinq étapes à jour. |
| ✅ Vérifié | Le parquet publié porte le md5 **`9c2fc17f37b0f31e5f4a2ec1a04d9719`** — exactement celui du fichier dont `data_app/` a été régénéré. Les blobs ont été relus **anonymement** sur le remote HTTPS public (5 × HTTP 200, tailles conformes au verrou) et le parquet retéléchargé rend bien les quatre bureaux `0E11/0E21/0E31/0E41` avec leurs 733/680/774/898 inscrits, soit les **3 085 inscrits** que l'ancien fichier versait dans un code de bureau vide. Montbéliard retrouve ses dix-sept bureaux dans la table de correspondance. |
| ⚠️ Limite (hexagonal, préexistante) | Deux blobs référencés par le verrou sont absents du cache distant comme du cache local : `data/03_main/elections/2024-legislatives-{1,2}-candidats.csv`. Rien à voir avec ce chantier — ces entrées du verrou ne sont pas touchées par le diff — mais `dvc pull` complet ne peut pas aboutir tant qu'elles manquent. |

## Le thème sombre n'avait pas de fond de carte, il avait un rectangle noir

> Constat : en thème sombre, passé l'échelle communale, il ne restait sous les polygones
> qu'un aplat noir traversé de quelques traits blancs. Ni la Garonne à Bordeaux, ni la
> Seine à Paris, ni le tissu urbain : rien pour se repérer, là où le thème clair donne une
> carte lisible. Ce n'était pas un bug de rendu — c'est le style amont qui est écrasé.

| Statut | Détail |
| ------ | ------ |
| ✅ Diagnostiqué | **Le style `dark` d'OpenFreeMap tient tout entier entre 0 et 60 sur 255.** Fond `rgb(12,12,12)`, eau `rgb(27,27,29)`, bâti `rgb(10,10,10)`, résidentiel à 5 % de clarté, et pas une teinte : tout y est gris. Quinze niveaux séparent le fleuve de la terre — sur la partie de la courbe où l'œil en distingue le moins, sous un remplissage à `.85` et l'encre par-dessus. Le thème clair, lui, hérite de positron une vraie hiérarchie : fond 242, parcs 230, eau 194, soit 48 niveaux entre la terre et l'eau. Les deux styles répondent en HTTP 200 et se chargent normalement : le fond n'était pas absent, il était invisible. |
| ✅ Corrigé | **Un gamma redéploie la hiérarchie au lieu d'une table couche par couche.** `shapeStyle` ([01_config.js](assets/js/01_config.js)) applique en thème sombre `c' = (c/255)^0.62` à **toutes** les couleurs du style — fond 12 → 39, eau 27 → 65, casings 60 → 106, libellés 101 → 153. Une règle unique, qui ne périme pas au premier remaniement du style amont, et qui ne trahit aucune couleur d'auteur puisqu'il n'y en a pas. Le parseur, c'est le navigateur (`ctx.fillStyle`, qui accepte tout ce que MapLibre accepte et rend normalisé) ; une sentinelle distingue les couleurs des chaînes d'expression (`interpolate`, `zoom`…), et la descente est récursive, les couleurs étant des feuilles d'expressions. |
| ✅ Corrigé | **Le fond uni sort de la surimpression.** L'encre est composée en fusion (`screen` en sombre, `multiply` en clair) : un aplat couvrant l'écran entier ne dessine rien et délave uniformément toutes les zones. Le gamma, en remontant ce fond de 12 à 39, triplait ce voile. La couche `background` est désormais retirée de la copie d'encre — ne s'impriment que les objets (routes, eau, bâti, voies ferrées). Le remplissage y gagne en franchise dans les **deux** thèmes. |
| ✅ Vérifié | Captures Chromium (WebGL logiciel) au chargement **et après bascule du thème** (`setStyle` rejoue `style.load`, donc le gamma), en vue France, sur Bordeaux (z 13,2, la Garonne) et sur Paris (z 12,4, la Seine) : le décor est lisible sous les polygones, les libellés ressortent, et le thème clair est inchangé hors la disparition du voile. |

## La couleur disait le rang, pas l'écart

> Constat, sur les variations du nombre de voix : deux zones à **+45 %** et **+100 %**
> sortaient du même rouge. Toutes deux dans la queue haute, donc dans le même cinquième —
> alors que l'une vaut deux fois l'autre.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **La choroplèthe colore l'écart à la médiane, plus le percentile** (`colorer`, [02_data_geo.js](assets/js/02_data_geo.js)). La médiane des zones affichées prend le ton neutre du milieu de l'échelle ; une zone s'en écarte vers le bleu ou le rouge **à proportion** de son écart. Colorer au rang garantissait autant de bleu que de rouge à l'écran — une propriété qu'on ne cherche pas, et qui coûte cher : le rang écrase les écarts là où la distribution est dense et en invente là où elle est plate. |
| ✅ Fait | **L'étalon est l'écart absolu à la médiane pris au 9<sup>e</sup> décile**, le même des deux côtés — sans quoi un même écart ne donnerait pas le même ton à gauche et à droite de la médiane, et « proportionnellement » ne voudrait rien dire. Le maximum ferait l'affaire si une seule zone aberrante ne suffisait pas à tasser toutes les autres sur le ton neutre ; à ce décile, ~10 % des zones saturent au bout de l'échelle et les 90 % restantes s'y déploient. |
| ✅ Fait | **Le ton est interpolé entre les cinq bornes, plus arrondi à la plus proche.** C'est la condition pour que +45 % et +100 % ne se ressemblent pas : cinq paliers ne suffisaient pas à les séparer même sur une échelle proportionnelle. L'interpolation est linéaire en sRVB — exactement celle du `linear-gradient` de la barre de légende, qui devient donc une lecture fidèle de la carte. Les bornes sont parsées une fois par thème (`RAMP`, rafraîchi par `syncColors`). |
| ✅ Fait | **Les deux légendes le disent** : « couleur = écart à la médiane des zones affichées » ([map.html](map.html)) et « écart à la médiane locale » sous les cartes du voisinage ([032_apercu.js](assets/js/032_apercu.js)). |
| ✅ Vérifié | En vue France, Paris et l'Île-de-France ressortent nettement au-dessus des autres régions et la Corse nettement en dessous, avec des tons intermédiaires continus, là où la carte affichait cinq aplats. Le cas d'une seule zone porteuse de valeur reste traité en amont (héritage de la couleur du niveau précédent, `styleFactory`) : la médiane d'un singleton étant la valeur elle-même, la renormaliser la rendrait neutre. |

## Le prix au m² : le même partout dans Paris, absent ailleurs

> Constat : le 6<sup>e</sup> et le 19<sup>e</sup> arrondissement affichaient le **même**
> prix, parce que la source ne connaît qu'un code INSEE pour toute la ville. Et 7 000
> communes n'affichaient rien du tout, avec pour seule explication « trop peu de ventes » —
> ce qui est faux à Strasbourg.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Paris, Lyon et Marseille sont ventilés par arrondissement** (`prep_immo._arrondissements`). Le jeu « Indicateurs Immobiliers par commune » agrège ces trois villes sous un code unique ; **DVF géolocalisé** (Etalab, ODbL) publie les mutations une par une, par commune — 45 fichiers par millésime, quelques dizaines de Mo, là où le DVF brut du millésime en pèse plusieurs centaines. Paris s'étage désormais de **8 262 €/m² au 19<sup>e</sup> à 14 987 € au 6<sup>e</sup>**, Marseille de **2 020 € au 3<sup>e</sup> à 5 592 € au 8<sup>e</sup>**. Les IRIS portant le code de leur arrondissement (751xx / 6938x / 132xx), la valeur retombe exactement sur la maille des quartiers : `prep_bake` lit ce code avant celui de la ville. |
| ✅ Fait | **On ne substitue pas une source à l'autre : on cale la seconde sur la première.** Les filtres du jeu communal ne sont pas publiés, et la même définition appliquée aux mutations brutes donne **10 158 €/m²** sur Paris 2024 là où le jeu communal en publie **9 674** — 5 % d'écart, invisible dans une ville, énorme entre deux communes voisines mesurées chacune à sa façon. On ne garde donc de DVF géolocalisé que la **forme** (le rapport d'un arrondissement à sa ville) et on la cale sur le **niveau** publié. Le prix de la ville est reconstitué avec le même estimateur que les arrondissements, pour que le facteur de calage ne mesure que le biais de méthode et pas en plus une différence de composition. Vérifié : la moyenne des arrondissements repondérée par leurs ventes redonne **exactement** le prix publié (10 243 / 4 896 / 3 539), ventes conservées à l'unité près. |
| ✅ Corrigé | **La fenêtre s'élargit là où les ventes sont rares**, plutôt que de n'afficher aucun prix. Trois millésimes restent la règle (27 879 communes) ; sous 5 ventes cumulées, on remonte à cinq (2020-2024), ce qui fait passer **3 032 communes rurales de plus** au-dessus du seuil — 30 911 zones au total. La période lue est **publiée avec la valeur** (clé `pxw`, bakée seulement quand elle s'écarte de la normale) et la fiche l'annonce dans son intitulé au lieu de la supposer. Les vieux millésimes ne sont **pas** recalés sur un indice national : un marché rural ne suit pas la courbe nationale, et corriger de 9 % un prix mesuré sur cinq ventes le rendrait faussement précis. |
| ✅ Corrigé | **« Trop peu de ventes » n'est plus dit là où c'est faux.** L'Alsace-Moselle relève du **livre foncier** et l'outre-mer n'est pas dans le champ de DVF : ces territoires n'auront jamais de prix, quel que soit le nombre de ventes — Strasbourg en compte des milliers. La fiche nomme la vraie raison ([03_panel_info.js](assets/js/03_panel_info.js)), et la rubrique ne s'affiche plus qu'aux échelles où le prix existe (commune, quartier) : plus haut, le manque n'en était pas un. |
| ✅ Corrigé | **Paris, Lyon et Marseille pèsent enfin dans les moyennes de référence.** Le recensement les ventile par arrondissement : leur code agrégé n'ayant pas de population, les trois villes manquaient purement et simplement aux moyennes France et région. Depuis que l'arrondissement porte un prix, il porte aussi son poids — la référence France passe de **2 893 à 3 148 €/m²**, l'Île-de-France de 4 524 à **5 468 €**, PACA de 4 034 à **3 916 €** (Marseille tire vers le bas, et c'est le fait). |
| ✅ Vérifié | `data_app` régénéré (`immo_commune.parquet`, `socio_reference.json`, `prep_bake` complet) et fiches relues dans le navigateur : Paris 1<sup>er</sup> 12 942 € / 19<sup>e</sup> 8 262 € « · arrondissement », Paris ville 10 243 € « · commune », Marseille 3<sup>e</sup> 2 020 €, Cantal 15004 « · 2020-2024 » sur 7 ventes, Strasbourg et Fort-de-France chacun avec son motif d'absence. `ruff check` retrouve exactement les 20 avertissements préexistants. |

## La carte disait une unité, pas un rang : « Prioritaire », noté sur 100

> Constat : la pastille par défaut affichait **« Rentabilité du porte-à-porte : 0,28
> voix/h »**. Deux fois trop d'informations pour la question qu'on pose à une carte — *où
> vaut-il mieux aller ?* — et pas assez pour y répondre : personne ne sait, sans y avoir
> réfléchi, si 0,28 voix par heure est beaucoup ou peu. Le chiffre demandait sa propre
> notice avant de vouloir dire quoi que ce soit.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **La pastille s'appelle « Prioritaire » et donne une note sur 100.** `PAST` et `HEAD_INFO` ([01_config.js](assets/js/01_config.js)) portent le nouvel intitulé et la nouvelle unité (` /100`) ; `fmtVal` la rend en **entier** (« 60 / 100 »), la décimale d'un rendement ne se transportant pas dans une note. Le chiffre de tête de la fiche la légende « où 50 est le terrain médian de France ». Saint-Denis **60**, Épinay-sur-Seine **66**, Montreuil **56**, Paris **52**, la Creuse **46**, le Cantal **35**. |
| ✅ Fait | **Trois repères, pas un : 0 au plancher, 50 à la MÉDIANE, 100 au sommet** (`scorePrioritaire`, [02_data_geo.js](assets/js/02_data_geo.js)), la note interpolant linéairement de part et d'autre de la médiane. Une simple règle de trois sur le maximum, essayée d'abord, tassait tout : distribution très dissymétrique (médiane 0,23 voix/h, sommet 1,65), le bureau médian notait **14** et la moitié des communes tenait entre **9 et 17** — une note qui n'utilise pas son échelle ne classe plus rien. Accrocher la médiane à 50 rend l'amplitude sans toucher à l'ordre : la transformation est **monotone**. |
| ✅ Fait | **Les repères sont ceux des bureaux de vote**, seule maille qui **partitionne** la France : la médiane d'un tas fait d'un peu de chaque échelle ne se raconte pas. Une zone se situe donc parmi les ~67 000 bureaux du pays, quelle que soit sa taille. Conséquence assumée : la commune médiane note **44** et non 50, et plafonne à **84** (Esnandes) ; un département tient entre **22** (Mayotte) et **60** (Seine-Saint-Denis, La Réunion). Une commune moyenne ses bons et ses mauvais terrains, un département plus encore — c'est l'information, pas un défaut d'échelle. Un repère par niveau aurait donné cinq notes incomparables entre elles, et un 100 dans chaque vue. |
| ✅ Fait | **`rendementPorte` est inchangé** et continue de servir en **voix/h** partout où le chiffre est expliqué (volet méthodo, Carnet de campagne) : la note est une présentation, pas un autre calcul. `voixConquerir`, qui n'était plus qu'un alias, disparaît. |
| ✅ Fait | **Les bornes sont calculées par le pipeline, jamais écrites en dur** (`_reperes_rendement`, [prep_bake.py](prep_bake.py)) : minimum, médiane et maximum de `mobn / mobh` sur les bureaux, lus sur les valeurs **déjà arrondies** — celles que le client relira — et élargis au millième extérieur pour qu'aucune zone ne sorte de [0, 100]. Publiés avec les repères du modèle dans `values/_mobilisation.json` (`rendement_min` **0**, `rendement_median` **0,229**, `rendement_max` **1,646** — un bureau de Sainte-Suzanne, à La Réunion), ils suivent donc toute régénération de `data_app`. |
| ✅ Fait | **La couleur reste calculée sur le rendement brut**, pas sur la note (`colVal` / `colValOf`, [02_data_geo.js](assets/js/02_data_geo.js), lus par `styleFactory` dans [06_navigation.js](assets/js/06_navigation.js)). Le ton est un écart **proportionnel** à la médiane des zones affichées — c'est tout l'objet du chantier « La couleur disait le rang, pas l'écart » ; le faire passer par une note dont la pente casse à la médiane NATIONALE aurait donné deux tons différents au même écart réel selon le côté du 50 où les zones tombent (jusqu'à 0,57 de l'échelle de ton d'écart mesuré sur la carte des départements). On lit le nombre sur la note, l'écart sur la couleur, et la carte ne bouge pas d'un pixel. |
| ✅ Fait | **Ce que la note mesure n'est pas caché, il est rangé.** Le bouton « i » n'a pas bougé d'une ligne ([034_mobilisation.js](assets/js/034_mobilisation.js)) : survol = la définition en une phrase, clic = le calcul décomposé en voix par heure avec les chiffres de la zone. Il devient simplement le **seul** chemin vers l'unité, ce que disent maintenant les commentaires de [07_controls.js](assets/js/07_controls.js) (légende) et [03_panel_info.js](assets/js/03_panel_info.js) (chiffre de tête). |
| 🐛 Évité | **La France serait sortie grise** au premier tracé si les bornes arrivaient après lui : `window.__mobRef` n'est posé qu'au retour de la promesse d'amorçage. `scorePrioritaire` lit donc le **cache** (`values/_mobilisation.json`, inliné dans l'amorce par [prep_seed.py](prep_seed.py)), et [08_search.js](assets/js/08_search.js) attend ce fichier — déjà en vol avec les autres, donc sans aller-retour supplémentaire — avant de peindre. |
| ✅ Vérifié | `_reperes_rendement` rejoué sur les 150 196 zones servies redonne exactement les trois bornes publiées ; le meilleur bureau note **100**, le bureau médian **50**, et les notes recalculées hors navigateur donnent 60 / 66 / 56 / 52 / 46 / 35 sur l'échantillon ci-dessus. Répartition après changement d'échelle (avant → après) : bureaux p25 **36**, médiane **50**, p90 **58** ; communes p25 **34**, médiane **44**, p90 **54**. **938 zones** notent 0, toutes parce que leur gisement est nul. Les six fichiers JS touchés parsent ; `build_map.py` assemble la page et `build_site.py` la publie avec les trois bornes inlinées dans l'amorce. |
| ⚠️ Limite assumée | **Le haut de l'échelle reste serré.** Le sommet est sept fois la médiane : au-dessus de 50, la note progresse lentement (p90 des bureaux à 58, p99 à 69) et les cent derniers points sont l'affaire de quelques dizaines de bureaux. C'est le prix d'une note **accrochée à des valeurs réelles** — 0, la médiane et le maximum sont des terrains qui existent — plutôt qu'à des quantiles, qui étaleraient l'échelle mais feraient du nombre un rang déguisé, exactement ce que la coloration du site refuse depuis longtemps. |

## « 67 437 non-inscrit·es » à Montpellier : la moitié n'avait pas le droit de vote

> Constat : le plan d'action affichait à Montpellier **« ≈ 67 437 non-inscrit·es · ≈ 20 140
> mal-inscrit·es »**, soit **87 577 voix** annoncées sous « Priorité n°1 · le plus gros
> réservoir » — pour **88 232 votant·es** au 1<sup>er</sup> tour des municipales 2026. Le
> réservoir prétendu pesait autant que le corps électoral qui se déplace. Le chiffre était
> sur-évalué dans toutes les communes, et d'autant plus que la commune est grande, jeune et
> immigrée : c'est-à-dire exactement là où la carte désigne la priorité.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Un·e résident·e étranger·e n'est pas un·e non-inscrit·e.** La base du calcul était la population majeure **toutes nationalités** : les **43 484 résident·es étranger·es** de Montpellier (14,4 % de la population) comptaient comme un réservoir d'inscription alors que, hors liste complémentaire européenne, elles et ils **ne peuvent pas s'inscrire**. `prep_admin` sert désormais `part_fr` (`P21_POP_FR`, même base IC, aucun téléchargement nouveau) et `prep_bake` en multiplie la population majeure. C'était plus de la moitié de l'erreur — et 4,3× à Saint-Denis (38 830 → **8 959**). |
| ✅ Corrigé | **La mal-inscription était comptée deux fois.** Le panneau additionnait `noninsc + malinsc`. Or quelqu'un qui vit à Montpellier et reste inscrit à Nîmes est recensé ici et inscrit là-bas : il est **déjà** dans l'écart « population majeure − inscrits ». Le second terme le rajoutait — +20 140 en double. Un seul champ est désormais baké (`resinsc`), et le flux d'arrivées récentes (IRAN, `adm.mig`) devient la **texture** du levier (« 9 % des habitant·es ont changé de commune dans l'année »), jamais un terme à ajouter. |
| ✅ Corrigé | **La population majeure était approximée, avec un biais orienté.** « 15 ans et + moins un cinquième des 15-29 » sur-comptait les adultes dans **30 299 communes sur 34 970** (médiane +1,3 %, jusqu'à +2,5 %) et les sous-comptait de 4,1 % à Montpellier — le biais suit la part des jeunes (corrélation **−0,53**), donc il fabriquait des non-inscrit·es fantômes dans les communes âgées, celles où le réservoir affiché était le plus douteux. La base IC publie les tranches exactes : `pop18` somme `P21_POP1824`…`P21_POP80P` (`prep_admin.AGES_18P`). Nationalement l'approximation ne s'écartait que de 0,3 % — l'erreur était **locale**, donc invisible sur un total. |
| ✅ Fait | **Le chiffre dit maintenant ce qu'il mesure, et ne prétend pas plus.** `resinsc = majeur·es français·es résidant dans la commune − inscrit·es`, c'est-à-dire les non-inscrit·es **plus** les résident·es inscrit·es ailleurs, **moins** les inscrit·es partis. Les deux premiers termes sont la même cible militante — une démarche d'inscription à faire faire — donc **un seul chiffre**, sous un libellé qui l'énonce, avec le solde en clair dessous (« 211 584 majeur·es français·es recensé·es − 169 505 inscrit·es »). Aucune **ventilation** entre non- et mal-inscription : elle serait un modèle, pas une mesure. |
| ✅ Corrigé | **Le solde négatif n'est plus un silence, c'est l'autre bout du même phénomène.** L'ancien champ n'était pas servi quand l'écart était négatif — une commune sur deux — au motif que « la soustraction n'y mesure plus rien ». Elle y mesure très bien quelque chose : ces communes sont les communes d'**origine** des mal-inscrit·es des grandes villes, celles dont la liste porte des gens qui vivent ailleurs. Le solde est donc servi **signé** (**23 521** communes négatives, **10 869** positives, **519** à l'équilibre), et le levier n°1 y devient la **procuration** et le contact avec les inscrit·es partis, pas l'inscription. En sélection multiple, sommer le solde donne enfin le **net** d'un territoire, les communes d'origine compensant les villes d'accueil. |
| ✅ Fait | **Le réservoir n°1 se compte en personnes, pas en voix.** `lever()` prend une unité : « 42 079 **à inscrire** » et non « 42 079 voix » — inscrire quelqu'un ne fait pas voter pour nous. Les leviers 2 et 3 gardent « voix ». Dans le Carnet, le corps électoral potentiel de la décomposition (`carnetBase.elig`) passe de `inscrits + non-inscrits` à `maj` : les résident·es étranger·es gonflaient le segment « voix inaccessibles » de la barre. Là où la liste est plus large que la population résidente, c'est la liste qui fait la base. |
| ✅ Calé | **Contrôle contre l'INSEE** ([Insee Première n°1986](https://www.insee.fr/fr/statistiques/7766966), présidentielle 2022) : **2,9 M** de non-inscrit·es (5,8 % des Français·es majeur·es) et **7,7 M** de mal-inscrit·es (16,5 % des inscrit·es). L'ancien estimateur servait **5,92 M** de « non-inscrit·es » — le double du réel, et concentré dans les villes. Après correction, la somme des soldes positifs vaut **3,13 M** et le solde net national **1,71 M**, ce qui est cohérent : le net doit être inférieur aux non-inscrit·es, puisque les listes portent aussi des Français·es de l'étranger et des radiations en retard. Montpellier **42 079** (19,9 % de ses majeur·es français·es), Paris **155 292**, Toulouse **101 985**, Saint-Denis **8 959**, Guéret **1 750**. |
| ⚠️ Limite assumée | **Deux biais résiduels, de l'ordre du point, en sens contraire.** `part_fr` est mesurée sur **toute** la population alors que les étranger·es sont plus adultes que la moyenne : on sur-corrige un peu. À l'inverse, les ressortissant·es de l'UE inscrit·es sur la **liste complémentaire** sont comptés dans les inscrit·es aux européennes : on sous-corrige d'autant. La base IC ne publiant ni la nationalité croisée avec l'âge, ni le partage UE / hors UE, les deux restent non mesurés — et se compensent. |
| ✅ Vérifié | `admin_commune.parquet` complété (colonnes existantes **bit à bit identiques** sur les 34 971 lignes, contrôle explicite) puis `prep_bake` rejoué en entier : **34 909** communes portent le solde. Les trois fichiers JS touchés parsent, et `actionPanel` exécuté hors navigateur sur les valeurs réellement bakées rend les **quatre** branches (solde positif, négatif, nul, absent). `build_site.py` assemble la page. `ruff check` n'ajoute aucun avertissement — la lambda appelée en place de l'ancien estimateur en emportait même trois. |

## Beaucoup de pourcentages, aucun nombre : la fiche ne disait pas combien d'inscrit·es

> Constat : la fiche d'une commune alignait une trentaine de pourcentages — « Participation
> 49,5 % », « Gauche 28,4 % des inscrits », « Taux de pauvreté 28 % », « 15-29 ans 31,2 % » —
> et **pas un seul** des deux nombres dont ils sont tous des parts : la **population** et le
> **nombre d'inscrit·es**. Le champ `insc` était baké, servi au Carnet, et **jamais affiché**.
> Aux échelles région et département il n'existait même pas. Or un taux classe les
> territoires, un nombre les dimensionne : « 9,9 % des inscrits » vaut **136 509 voix** à
> Paris et **809** à Guéret, et ce n'est pas la même campagne. C'est en personnes qu'on
> décide d'envoyer une équipe quelque part.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Un bandeau de repères en tête de chaque fiche** (`reperes`, [03_panel_info.js](assets/js/03_panel_info.js)) : **habitant·es**, **inscrit·es** (avec un « i » qui dit de quel registre), **majeur·es de nationalité française recensé·es** et le **solde d'inscription**. Montpellier ouvre désormais sur « 302 454 habitant·es · 169 505 inscrit·es · 211 584 majeur·es français·es · 42 079 à inscrire » au lieu d'un titre nu. |
| ✅ Fait | **Le registre de CHAQUE scrutin, pas un seul.** `_valeurs_niveau` ([prep_bake.py](prep_bake.py)) bake `insc_P22/E24/L24/M26` et les votant·es correspondants `vot_*`, à **toutes** les échelles. C'était nécessaire, pas confortable : le corps électoral parisien vaut **1 368 025** en avril 2022, **1 378 896** en juin 2024 et **1 405 332** en mars 2026 — **37 307** personnes séparent le premier du dernier, et relire un score de 2026 sur le registre de 2022 sous-compterait ses voix de 2,7 %. |
| ✅ Fait | **La colonne `Inscrits` du tableau de recomposition.** `inscs` est un dict **parallèle** à `rec` : le registre de chacun des scrutins recomposés (27 au plus, un par tour de 2012 à 2026). Sans lui, jusqu'à 27 lignes × 8 colonnes de pourcentages n'étaient reconvertibles avec **aucun** nombre de la fiche — et deux lignes ne s'y comparaient pas en personnes, les municipales à deux tours ne portant que sur les communes concernées (**3,9 M** d'inscrit·es en Île-de-France au 2ᵉ tour de 2026 contre **7,6 M** au 1ᵉʳ). Chaque case porte son effectif au survol. |
| ✅ Fait | **Le nombre à côté du taux, partout.** Frise du vote LFI (les voix sous chaque barre), participation (votant·es, abstentionnistes, inscrit·es), rapport de force (les voix de chaque bloc), barre et légende de recomposition, taux de pauvreté, tranches d'âge, catégories sociales, pyramide des âges (au survol), renouvellement de population, constats des « Conclusions opérationnelles », leviers du plan d'action, **infobulle de la carte**, petites cartes de voisinage et vue par arrondissement. Le chiffre de tête reçoit une ligne d'effectif propre à l'indicateur affiché (`headEffectif`) : des voix pour un score, des votant·es pour la participation, des personnes pour la pauvreté, des **euros par mois** pour l'effort d'accession. |
| ✅ Fait | **Les derniers pourcentages orphelins du plan d'action et de la méthode.** Le flux d'arrivées récentes (« 9 % des habitant·es ont changé de commune dans l'année ») dit maintenant combien de personnes ; le **levier marginal** se chiffrait en *points d'inscrits* — la seule ligne du panneau qui n'était pas en personnes — et se lit en **voix de gauche hors LFI**, la soustraction se faisant sur des voix publiées ; la part de portes à faire en voiture est doublée du **nombre de portes**, dans le volet méthodo comme dans la notice nationale. |
| 🐛 Corrigé au passage | **Les infobulles « i » sortaient en une seule ligne** dès que le libellé qui les porte est insécable — ce qui est le cas du bandeau de repères et des valeurs de lignes socio, où quatre des nouveaux « i » vivent. `#info .hint::after` remet explicitement `white-space:normal` : l'infobulle est un paragraphe, elle revient à la ligne dans ses 230 px. |
| ✅ Fait | **Un « ≈ » qui veut dire quelque chose.** Le ministère publie les voix de **LFI** et de la **gauche**, les **votant·es** et les **inscrit·es** ; les autres blocs n'existent qu'en part d'inscrits arrondie au dixième de point. Leur effectif est donc *reconstitué* (`effectif`, [01_config.js](assets/js/01_config.js)), arrondi à l'**ordre de grandeur de l'incertitude** que cet arrondi porte — ±0,05 % de la base, soit ±690 personnes à Paris et ±0,5 dans un bureau — et marqué « ≈ ». Le signe distingue à l'œil une mesure d'une reconstruction, au lieu de mélanger les deux sous la même typographie. |
| ✅ Fait | **Un effectif seulement là où sa base est connue.** Le recensement publie ses parts sur quatre dénominateurs ; `data_app` n'en porte que deux — la **population** (âges, pauvreté, renouvellement) et les **15 ans et plus**, que la population et la part des 0-14 ans donnent exactement (catégories sociales). Le chômage (actif·ves de 15-64 ans), les diplômes (non-scolarisé·es de 15 ans et plus) et le logement (résidences principales) restent **sans nombre**, et la rubrique **dit** pourquoi. Fabriquer un effectif sur une base approchée aurait été le contraire de ce que le chantier cherche. |
| ✅ Fait | **Les effectifs aux échelles agrégées**, qui n'en avaient aucun : `_baker_effectifs_agreges` sert population, **majeur·es français·es** et **solde d'inscription** aux régions et départements. Les deux sources ne sont pas interchangeables — la population somme `admin_commune` **tel quel**, ventilé par arrondissement à Paris, Lyon et Marseille, seule forme qui *partitionne* le territoire (sommer les valeurs communales aurait compté Paris deux fois, une par ses vingt arrondissements et une par la ligne `75056` que `_agreger_plm` y ajoute) ; `maj` et `resinsc` somment les valeurs **communales**, qui n'existent que là où il y a un registre, donc jamais sur un arrondissement. **100** départements et **17** régions servis ; Mayotte n'en a pas, le recensement n'y descendant pas — et la fiche ne l'invente pas. |
| ✅ Fait | **Le solde d'inscription est écrit dans son SENS, pas signé.** Un « −12 480 » dans un bandeau de repères ne se lit pas ; « 12 480 inscrit·es de plus que de majeur·es français·es » se lit, et dit que le levier est la **procuration** et non l'inscription — exactement ce que le plan d'action explique déjà au levier n°1. Trois des quatre repères portent un « i » qui donne leur définition au survol — la population, elle, n'en demande pas. |
| ✅ Supprimé | **Le champ `insc` disparaît**, remplacé par `insc_E24` qui est la même valeur sous son vrai nom (le registre des européennes 2024). Il n'était baké qu'à la commune et au quartier : le volet méthodo du porte-à-porte devait *deviner* les inscrit·es d'un bureau de vote à partir de ses portes (« portes × 1,6 électeur·ice »), et l'aperçu par arrondissement les reconstituait du stock d'abstention. Les deux lisent maintenant le registre. `inscRef` centralise l'accès et garde le repli pour les valeurs agrégées d'une sélection multiple. |
| ✅ Corrigé | **Le stock d'abstentionnistes est désormais une soustraction, pas un taux.** `indicators._stock_abstention` renvoie `inscrits − votants` au lieu de `inscrits × taux d'abstention`, dont le taux est arrondi au centième de point : Paris affichait **556 109** pour **556 140** réels. L'écart est négligeable en soi — il ne l'était plus dès lors que la fiche écrit les deux termes de la soustraction juste au-dessus, dans la section « Participation ». |
| ✅ Fait | **La mensualité du crédit à côté de l'effort d'accession.** « Effort 43,4 % » ne dit pas ce qu'il faut sortir chaque mois : `mensualiteCredit` (miroir de `prep_immo._mensualite`, comme `IMMO_HYP` l'est de ses hypothèses) rend **1 103 € / mois** en regard des **2 541 € / mois** de revenu du ménage médian. Le taux classe les communes, l'euro dit si la propriété est atteignable. |
| ⚠️ Coût assumé | **Les fichiers de valeurs grossissent de 18 %** (`data_app/values` : 254 → 300 Mo). Huit entiers par zone (`insc_*`, `vot_*`) et le dict `inscs`, parallèle à `rec` : `values/bv/75.json` passe de **1,37 à 1,67 Mo** (+22 %), `region.json` de 30 à 39 Ko. Le geo du même département pesant l'essentiel du transfert (**647 Mo** pour les contours de bureaux contre 123 Mo de valeurs), cela reste quelques pour cent de ce que coûte l'ouverture d'un département — pour la seule chose qui permettait de relire la fiche en personnes. |
| ⚠️ Limite assumée | **`data_app` ne porte pas trois dénominateurs du recensement** (`P21_RP`, actif·ves occupé·es, non-scolarisé·es de 15 ans et plus) : ils sont perdus à l'étape `prep_socio` / `prep_admin`, qui ne conservent que des parts. Les servir demanderait de reprendre `recensement/iris.csv` et les bases IC logement/activité en amont — hors du champ de ce chantier, et sans effet sur les nombres déjà servis. Les rubriques concernées disent leur base au lieu d'afficher un effectif approché. |
| ✅ Vérifié | **La reconstruction est contrôlée contre la source elle-même.** En la rejouant sur le vote LFI, dont les voix *sont* publiées — **454 851** couples zone × scrutin — elle retrouve le compte **exact** dans **96,1 %** des bureaux de vote, **87,2 %** des communes et **81,1 %** des quartiers ; l'écart reste sous **2,1 %** de la valeur au 99ᵉ centile communal, et le pire cas s'explique entièrement par l'arrondi du taux (Dunkerque aux municipales 2026 : taux réel 2,6545 %, servi 2,6 %, soit 35 voix reconstituées en moins sur 1 615). Aux échelles agrégées, où aucun taux ne tombe rond, la reconstruction n'est jamais exacte mais reste à **1,2 %** près en région et **2,6 %** en département dès que le bloc pèse plus de 2 % des inscrits. |
| ⚠️ Limite mesurée | **L'erreur relative explose sous le dixième de point.** 0,05 point d'incertitude sur un bloc à 0,3 % des inscrits, c'est 17 % de sa valeur ; à 0,05 % près de zéro, la reconstruction ne dit plus qu'un ordre de grandeur. Deux conséquences assumées : les blocs marginaux d'une grande zone ne se lisent qu'à un cran près, et un taux non nul dont l'effectif retombe à zéro s'écrit « **< 1 000 voix** » et non « ≈ 0 » — dire « personne » là où la source dit « moins d'un cran » aurait été le seul vrai mensonge du chantier. Les blocs qui décident d'une campagne sont tous très au-dessus de ce seuil. |
| ✅ Vérifié | `prep_bake` rejoué en entier. Les **onze fichiers JS** touchés parsent, et `infoPanel` exécuté **hors navigateur** sur les valeurs réellement bakées rend **177 fiches** — les cinq échelles × les douze indicateurs × quatre paires de scrutins, plus une fiche agrégée de sélection multiple, Mayotte (sans population), Strasbourg (hors champ DVF) et la Creuse (petites bases) — sans une exception ni un `undefined`. L'agrégat d'une sélection somme bien les nouveaux effectifs (contrôlé contre la somme directe). `build_site.py` assemble la page. `ruff check` ne signale rien de nouveau (il perd même deux avertissements). |

## Le porte-à-porte frappait au fichier électoral, pas au bâti

> Constat : le nombre de portes d'un bureau de vote se déduisait des **inscrit·es**
> (`inscrits ÷ 1,6`). Il ne comptait donc que les logements **habités à l'année** — alors
> qu'on ne fait pas le porte-à-porte sur le fichier électoral, on le fait sur la **rue** :
> celle ou celui qui la remonte frappe aussi aux volets clos. La France compte **37,7
> millions de logements** pour **30,8 millions** de résidences principales : **17,8 % du
> parc** — 6,8 millions de portes — était invisible au budget-temps. Là où ce parc vide est
> l'essentiel du bâti (Les Belleville : **11 %** de résidences principales, Morzine 13 %,
> Leucate 16 %), la tournée est plusieurs fois plus longue pour le même nombre de
> conversations, et la carte annonçait un terrain rentable là où le militant d'octobre
> trouve une station fermée.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Le parc de logements entre dans le budget-temps** ([prep_mobilisation.py](prep_mobilisation.py)). `portes_tot = portes ÷ part de résidences principales` : la tournée (`0,7124 × √(aire × portes)`), le pas entre deux portes et le choix du mode se calculent désormais sur **toutes** les portes, et le temps se décompose en trois — le **trajet** à chaque porte, **15 min de conversation** aux seules portes habitées, **1 min** de sonnette sans réponse aux autres. À part de résidences principales de 100 %, la formule redonne exactement l'ancienne. |
| ✅ Fait | **La part de résidences principales est lue au QUARTIER**, pas à la commune : base infracommunale « logement » du **recensement 2021** (`P21_RP / P21_LOG`, la même source que `prep_admin`, même cache), rabattue sur le bureau de vote par les poids **IRIS × bureau** de [prep_iris_bv.py](prep_iris_bv.py) — à Nice le front de mer n'est pas l'arrière-pays. **66 457** bureaux (95 %) l'obtiennent à ce grain, **2 434** par leur commune (quand les IRIS renseignés couvrent moins de la moitié du bureau) et **1 066** par la valeur nationale, dont **984** hors métropole. |
| ✅ Fait | **Un bureau non mesuré prend la part nationale (82,2 %), pas 100 %.** Le laisser au parc « tout habité » l'aurait placé devant ses voisins corrigés pour la seule raison qu'on ne l'a pas mesuré — le contraire de ce que la correction cherche. |
| ✅ Fait | **La note bouge là où le parc est vide, et nulle part ailleurs.** Sur **34 925** communes notées, **1 289** se déplacent de plus de 5 points et **280** de plus de 10 : Les Belleville `44 → 27`, Morzine `32 → 22`, Leucate `47 → 34`, Bourg-d'Oueil `43 → 20` ; la Corse-du-Sud `27 → 25`, la Creuse — un logement sur trois y est une résidence secondaire ou un logement vacant — `46 → 43`. Paris (`52`), Saint-Denis (`60`), Marseille (`56`) et Lille (`51`) ne bougent pas d'un dixième de point. |
| ✅ Fait | **Le volet « i » sert les deux comptes** ([034_mobilisation.js](assets/js/034_mobilisation.js)) : `mobpt` (portes réelles) à côté de `mobp` (logements habités), la ligne « Portes à frapper » disant l'écart en nombre et en part du parc. La « chance par porte » se rapporte désormais aux portes **réellement frappées** (Paris : 5,92 %, une porte sur 17). Les valeurs bakées avant ce chantier n'ont pas `mobpt` : la notice retombe alors sur `mobp` et redit le texte d'avant, sans trou. |
| 🐛 Corrigé au passage | **« Temps par porte » se lisait à l'envers** une fois les portes closes comptées : moyenné sur toutes les portes, il affichait **4,5 min** aux Belleville contre **12,5 min** à Paris — le terrain le plus cher de France donné à lire comme le moins cher, parce que ses portes ne coûtent qu'une sonnette. La ligne rapporte donc le temps à la porte **habitée** (« Temps par porte habitée » : **30,1 min** aux Belleville, **15,3 min** à Paris), c'est-à-dire au prix d'une conversation possible, portes closes traversées comprises. |
| ⚠️ Garde-fou | **La correction est plafonnée à 15 % de résidences principales** (facteur × 6,7), dans le même esprit que le plafond de densité : un immeuble de vacances manifestement fermé se voit depuis la rue et ne se frappe pas boîte par boîte. **111** bureaux sont concernés, soit **0,11 %** des portes habitées du pays. |
| ⚠️ Limite assumée | **Le recensement date l'occupation d'une année, pas d'une saison.** Une station de ski démarchée en février a plus de portes ouvertes que son taux de résidences principales ne le dit — mais celles qui s'y ouvrent abritent des électeur·ices **inscrit·es ailleurs**, qui ne pèsent pas sur le bureau qu'on démarche. Le sens de la correction est donc juste ; son ampleur est un maximum. |
| ✅ Vérifié | `prep_mobilisation` rejoué **avant** la modification, sa sortie contrôlée **ligne à ligne identique** à celle servie par `HEAD` (le calcul est donc reproductible, et l'écart qui suit vient bien du chantier), puis `prep_bake` en entier : **8,07 M** d'heures de porte-à-porte contre 7,88 M, **0,273** voix/h contre 0,280, et **8,8 %** des portes en voiture contre 10,5 % — le parc réel resserre le pas entre deux portes, donc on marche un peu plus. Le total servi à une commune boucle exactement sur la somme de ses bureaux (Les Belleville : 12 438 portes, 935 h). `rendMethodo` et `mobResume` exécutés **hors carte** (Chromium sans tête, Leaflet remplacé par un objet muet) sur les valeurs réellement bakées — commune, département, région, bureau de vote, zone sans porte-à-porte et zone servie **sans `mobpt`** — rendent sans exception, sans `undefined` ni `NaN`. `build_site.py` assemble la page ; `ruff check` ne signale rien de nouveau. |

## Le volet expliquait le rendement, la carte affichait la note : le barème manquait

> Constat : le chiffre de tête d'une fiche annonce **« 60 / 100 »**. Cliquer sur son « i »
> ouvre un volet qui décompose scrupuleusement **« 4 030 voix ÷ 7 906 h = 0,51 voix/h »**,
> ses portes, ses minutes, ses kilomètres — et ne dit **nulle part** par quoi on passe de
> `0,51 voix/h` à `60 / 100`. Deux nombres sans lien apparent, dans le seul endroit du site
> censé fabriquer la confiance : un lecteur était fondé à croire la note tirée d'ailleurs.
> Le barème existait pourtant, calculé et documenté (`scorePrioritaire`,
> `_reperes_rendement`) — il n'était simplement écrit à aucun endroit qu'un utilisateur
> puisse lire.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Une règle graduée, avec la zone pointée dessus** (`noteEchelle`, [034_mobilisation.js](assets/js/034_mobilisation.js)) : les trois bornes servies portent leur valeur en voix/h (`0,000` pire terrain, `0,224` terrain médian, `1,646` meilleur), le remplissage vaut la note, et le curseur l'affiche. La graduation du 50 est matérialisée parce que **la pente y casse** : c'est le seul repère du rail qui ne soit pas une extrémité. |
| ✅ Fait | **L'opération, écrite avec ses propres nombres** — celle du segment réellement emprunté, et lui seul : Saint-Denis `50 + 50 × (0,510 − 0,224) ÷ (1,646 − 0,224) = 60 / 100`, la Creuse `50 × (0,192 − 0,000) ÷ (0,224 − 0,000) = 43 / 100`. Les bornes sont écrites au **millième** et non au centième : au centième, l'opération recopiée par le lecteur (« 0,22 − 0,00 ») ne retomberait pas sur le résultat affiché. Et la note **non arrondie** est rappelée entre parenthèses quand elle diffère de l'entier servi (`60,06, arrondie`), pour la même raison. |
| ✅ Fait | **Le volet s'ouvre désormais sur le chemin complet**, `4 030 voix ÷ 7 906 h = 0,51 voix/h` puis `→ soit une note de 60 / 100`, au lieu du seul rendement : un volet qui n'explique pas le chiffre qu'on a sous les yeux explique le mauvais chiffre. Le barème détaillé vient plus bas, **après** le rendement — on ne situe sur une échelle qu'une grandeur déjà comprise. |
| ✅ Fait | **La notice de la légende sert la même règle**, sans curseur (aucune zone n'est ouverte) : ce qu'on regarde avant tout clic est une note, pas le rendement dont elle est tirée. |
| ✅ Fait | **Ce qui n'est pas montrable n'est pas expliqué** : toute la section tombe d'un bloc si `values/_mobilisation.json` ne sert pas les bornes (`noteEchelle` rend `""`), plutôt que de décrire une échelle qu'on ne peut pas dessiner. Même règle pour la deuxième ligne de l'équation, absente si la zone n'a pas de rendement chiffrable. |
| ✅ Fait | **Aucune borne écrite en dur.** Les trois valeurs sont lues par `rendRep()`, comme le calcul les lit, et la note affichée est celle que `scorePrioritaire` renvoie — pas une seconde formule recopiée dans la notice, qui pourrait s'en écarter sans qu'on le voie. Une régénération de `data_app` déplace les bornes : la notice suit. Les repères qu'une régénération périmerait (« la commune médiane note 44 », « un département tient entre 22 et 60 ») restent dans [DOCUMENTATION.md](DOCUMENTATION.md) et ne sont plus recopiés dans l'interface, qui n'en garde que le sens : une commune note moins que son meilleur bureau, un département moins encore. |
| ✅ Fait | **Le barème est aussi écrit dans les documents**, formule en clair et exemples chiffrés : [README.md](README.md) (« Du rendement à la note ») et [DOCUMENTATION.md](DOCUMENTATION.md), qui n'en donnaient jusqu'ici que la description en prose (« interpole de part et d'autre de la médiane »). |
| ✅ Vérifié | Barème rejoué **hors navigateur** sur les valeurs servies : Saint-Denis **60**, Paris **52**, la Creuse **43** — exactement les notes que le dépôt documente. Puis `rendMethodo` et `mobResume` **exécutés dans Chromium sans tête** sur cinq cas servis — commune au-dessus du médian, département en dessous, commune notant **0**, zone **sans porte-à-porte chiffrable**, zone servie **sans `mobpt`** : aucun `undefined`, aucun `NaN`, aucun tiret vide ; le remplissage tombe à `60,056 %` pour une note de 60,06 et le curseur reste dans le rail jusqu'à la note 0. Mise en page mesurée dans les **deux thèmes** et à **360 px** de large : aucun débordement horizontal des panneaux, tous les champs dans le cadre, les trois graduations à 88 px de large en mobile. Les **273 noms déclarés au premier niveau** du paquet concaténé audités à l'analyseur : **aucune collision** (dans un script unique, deux `const` homonymes tuent la page entière au chargement). `build_site.py` publie la page (746 Ko). |

## Un atlas fait pour être corrigé, mais sans porte pour le dire

> Constat : le site publie des dizaines de milliers de chiffres modélisés, à la maille du
> bureau de vote, et **aucune adresse** pour signaler qu'un de ces chiffres est faux. La
> personne la mieux placée pour voir l'erreur — la militante qui connaît sa rue, son
> quartier en travaux, sa commune fusionnée — n'avait littéralement pas d'endroit où le
> dire. Le seul lien sortant du site pointait vers les groupes d'action.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Un formulaire vers `etudes-electorales@franceinsoumise.org`** ([16_suggestion.js](assets/js/16_suggestion.js)) : type de retour (donnée qui paraît fausse, donnée à ajouter, méthode de calcul, interface, bug), zone concernée, message, et — facultatif — qui écrit. Deux portes d'entrée : le bouton **💬 Suggérer** de la barre du haut, et un **lien en pied de chaque notice de méthode**. La seconde est celle qui compte : c'est en lisant d'où sort un chiffre qu'on doute d'un chiffre, et il ne faut alors plus rien chercher. |
| ✅ Fait | **Le contexte de la vue est joint d'office** — zone ouverte, fiche ouverte si elle diffère (un clic sur un bureau de vote n'a pas quitté la commune), indicateur affiché, **valeur** affichée, scrutins comparés, **permalien**. « Le chiffre est faux » ne se corrige pas sans savoir où et lequel, et c'est précisément ce qu'une personne qui signale un problème n'a aucune raison de penser à recopier. La valeur est jointe parce que deux jeux servis à quelques jours d'écart ne donnent pas le même nombre pour la même zone. |
| ✅ Fait | **Le contexte est MONTRÉ, pas seulement joint** : le panneau l'affiche ligne à ligne, tel qu'il partira. Un formulaire qui expédie l'URL de navigation de quelqu'un sans le lui dire ne le respecte pas. |
| ✅ Fait | **Rien n'est envoyé par le site**, et c'est un choix : la page est statique, sans serveur. Le formulaire compose le courriel et le remet au **logiciel de messagerie** de la personne (`mailto:`), qui le relit et l'envoie elle-même. Un service de formulaires tiers ou une fonction sans serveur aurait fait dépendre les retours d'un compte à maintenir, avec des adresses de militant·es transitant chez un prestataire. |
| ✅ Fait | **Le `mailto:` échoue sans rien dire** — webmail non déclaré comme gestionnaire, poste sans client configuré. Deux autres sorties sont donc offertes **à égalité** dans le panneau, et non en repli caché : un bouton **« Copier le message »** (objet compris, pour qu'un collage dans un webmail reste triable) et l'**adresse écrite en clair**, sélectionnable. Un retour perdu parce que le navigateur n'a rien ouvert est un retour qu'on ne recevra jamais. |
| ✅ Fait | **Un message vide n'envoie rien**, mais le bouton reste **cliquable et visible** (simplement estompé) : cliqué, il dit ce qui manque et met le curseur dans la zone de texte. Un bouton `disabled` ne répond rien à qui clique dessus sans comprendre pourquoi rien ne se passe. |
| ⚠️ Garde-fou | **Au-delà de ~1 900 caractères d'URL**, certains clients tronquent le corps sans avertir : le panneau prévient et renvoie vers la copie, sans bloquer l'envoi. |
| ✅ Vérifié | Formulaire **exécuté dans Chromium sans tête** : état vide (bouton estompé, « Écrivez d'abord votre message »), état rempli (objet `[Atlas électoral] Une donnée qui paraît fausse — Saint-Denis`, corps de 1 156 caractères d'URL portant message, type, zone saisie, signature et les six lignes de contexte, accents et flèches correctement encodés), et message de 2 200 caractères (3 092 d'URL) déclenchant bien l'avertissement de troncature. Champs et boutons mesurés dans les deux thèmes et à 360 px : tous dans le cadre, aucun débordement du panneau. **Les six chemins d'ouverture rejoués un par un** : bouton de la barre du haut, lien en pied de la notice de légende (`#modal`), lien en pied du volet de la fiche (`#info`), activation au **clavier** (Entrée sur le lien), bouton de copie, et clic d'envoi sur un message vide — qui annule bien la navigation `mailto:` et affiche « Votre message est vide ». |

## « 0 / 100, le pire terrain de France » : 684 zones qui n'y étaient pour rien

> Constat : **938 zones notaient `0`**, et le dépôt affirmait — vérification à l'appui —
> qu'elles y étaient « toutes parce que leur gisement est nul ». C'était faux pour **684
> d'entre elles**. Leménil-Mitry (6 inscrit·es) sortait à `0 / 100`, « le pire terrain de
> France », pour un rendement réel de `0,240 voix/h` qui la plaçait à **51**, au-dessus du
> terrain médian du pays. La note n'était pas mal calculée : elle était calculée sur des
> termes que le pipeline avait arrondis avant de les servir.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **`mobn` et `mobh` sont servis au centième** (`MOB_DEC`, [prep_bake.py](prep_bake.py)), et non plus à l'unité. Ces deux clés ne sont pas lues comme des nombres mais comme un **rapport** — la note est `mobn / mobh` replacé entre trois bornes dont le médian vaut `0,224` voix/h. Une voix de numérateur y pèse donc 2,2 points de note sur une zone de 100 h, et **45 points sur une zone de 5 h**. L'arrondi à l'unité, invisible sur un département, détruisait la note des petites zones. |
| ✅ Corrigé | **Toute zone de moins d'une demi-voix à conquérir sortait à `mobn = 0`**, donc notée `0 / 100`. C'est 205 communes, 220 bureaux et 259 quartiers rangés au plancher de l'échelle sans y appartenir — Leménil-Mitry `51`, Caunette-sur-Lauquet `33`, Châteauvieux-les-Fossés `30`, Fontaine-en-Dormois `27`, tous affichés `0`. Le total des notes à `0` tombe de **938 à 254**, dont **231 au gisement exactement nul** (abstention prévue sous le plancher jamais franchi : le modèle n'y voit rien à reconquérir, cf. `plancher` dans [prep_mobilisation.py](prep_mobilisation.py)) et 23 sous la demi-note. Le `0` du barème redevient ce que la légende en dit. |
| ✅ Corrigé | **L'erreur n'était pas cantonnée aux zéros.** Mesurée contre la note recalculée sur `mobilisation_bv.parquet` non arrondi : **9 641 communes** (28 %) et 10 921 bureaux (16 %) fautaient de plus d'un point, 229 communes et 257 bureaux de plus de **dix**, l'écart maximal atteignant **52 points**. Au centième, l'écart maximal tombe à **0,5 point** et plus aucune zone ne dépasse le point — invisible dans une note affichée en entier. Une seule décimale ne suffisait pas (5,6 points d'écart, trois faux zéros) ; le millième n'apportait plus rien. |
| ✅ Corrigé | **La borne haute était elle-même un artefact d'arrondi.** `_reperes_rendement` lit les bornes sur les valeurs *servies*, à dessein — le client relit les mêmes. Mais le meilleur bureau, à Sainte-Suzanne, sortait servi `181 voix ÷ 110 h = 1,6455` là où son rendement vaut `1,6419` : `rendement_max` passe de **1,646 à 1,642**, et la borne redevient un terrain réel plutôt qu'un arrondi. Aucune note publiée ne bouge (Saint-Denis **60**, Épinay **66**, Montreuil **56**, Paris **52**, Esnandes **84**, la Creuse **43**, le Cantal **33**, Mayotte **22**) ; le meilleur bureau note désormais **100** tout juste, et non 99,98. |
| ✅ Fait | **L'opération écrite du volet « i » garde les décimales sous 10** (`_nq`, [034_mobilisation.js](assets/js/034_mobilisation.js)). Servir `0,37` voix et `1,54` h en les écrivant à l'unité aurait donné « **0 voix ÷ 2 h = 0,24 voix/h** » : une équation que personne ne peut refaire, exactement le défaut que le millième des bornes corrigeait déjà un cran plus bas. Au-dessus de 10, une voix et une heure se comptent à l'unité — « 8 069 579 h » n'a pas besoin d'un « ,00 ». Les autres affichages (infobulle, Carnet, chiffre de tête) arrondissent comme avant : personne ne lit « 169,65 h ». |
| ⚠️ Limite assumée | **Le détail du numérateur reste écrit à l'unité** : la ligne « Voix à conquérir » légende `0,37 voix` par « 2 abstentionnistes conjoncturels × 24,6 % de gauche », dont le produit fait 0,49. `mobc` compte des **personnes** — le servir au centième ferait afficher « 1,90 abstentionniste », ce qu'aucune décimale ne rend plus vrai. À cette échelle, la légende est une restitution arrondie du calcul, pas le calcul. |
| ✅ Vérifié | `data_app` régénéré (`prep_bake` complet, 6 min 30) : **312 fichiers** touchés, et les seules clés qui bougent sont `mobn` et `mobh` — diff des valeurs comparée clé par clé sur un département témoin (583 `mobn`, 582 `mobh`, rien d'autre). Poids servi : `values/` passe de 315,4 à **316,2 Mo** (+0,28 %), l'amorce ne bouge pas d'un octet. Note servie recalculée sur les **150 215 zones** et comparée à la note exacte du parquet : écart maximal **0,513 point**, moyen 0,034. `build_map.py` assemble la page et `build_site.py` la publie (765 Ko) avec `rendement_max` **1,642** inliné dans l'amorce. Les **20 fichiers JS** et le paquet concaténé passés à l'analyseur : tout parse, **274 noms au premier niveau**, aucune collision — `_nq` compris (dans un script unique, deux `const` homonymes tuent la page entière). Faute de moteur JS sur la machine de ce correctif, le rendu n'a pas été rejoué dans un navigateur : le formateur est vérifié par table de valeurs (`0 → 0`, `0,37 → 0,37`, `9,99 → 9,99`, `10 → 10`, `8 069 579 → 8 069 579`) et l'équation de Leménil-Mitry recomposée à la main — « **0,37 voix ÷ 1,54 h = 0,24 voix/h** », note **51**. |

## Le 100 de la note était un bureau de Sainte-Suzanne, et il écrasait le reste du pays

> Constat : le chantier précédent avait accroché la note « Prioritaire » à trois terrains
> réels — 0 au gisement nul, 50 au bureau médian, **100 au meilleur bureau de France**. Ce
> dernier repère était un point isolé : `1,642 voix/h` à Sainte-Suzanne, **21 % au-dessus du
> deuxième bureau** et 57 % au-dessus du p99,9. Toute la moitié haute de l'échelle s'y
> écrasait — **88 %** des bureaux au-dessus du médian tenaient entre 50 et 60, `1,4 %`
> passaient 70, la meilleure commune de France plafonnait à `84` et le meilleur département
> à `60`. C'était, à l'intérieur du haut de l'échelle, exactement le défaut qu'on croyait
> avoir corrigé en accrochant le médian à 50 : une note qui n'utilise pas son échelle ne
> classe plus rien. Le dépôt l'avait d'ailleurs écrit noir sur blanc en « ⚠️ Limite
> assumée » — c'était une limite, pas une fatalité.

| Statut | Détail |
| ------ | ------ |
| ✅ Corrigé | **Le 100 est désormais un repère de DISPERSION : `médiane + 3 σ`**, soit `0,641 voix/h` (`_reperes_rendement`, [prep_bake.py](prep_bake.py)). Il ne dépend plus d'un bureau, donc plus d'un accident. La moitié haute se répartit maintenant **49 % / 23 % / 13 % / 7 % / 4 %** sur les dizaines de 50 à 100, là où 88 % tenaient dans la première. Saint-Denis passe de `60` à **`84`**, Montreuil de `56` à **`71`**, Montpellier à **`74`**, Paris de `52` à **`57`**, la Seine-Saint-Denis de `60` à **`83`**. |
| ✅ Corrigé | **Le 0, lui, ne bouge pas d'un pouce — et surtout pas à `− 3 σ`.** Symétriser l'échelle aurait mis le 0 à `−0,193 voix/h`, une valeur qui n'existe pas : un rendement ne descend pas sous zéro. Le quart inférieur de l'échelle serait devenu inatteignable (le terrain le plus pauvre de France aurait noté `23`) et le « 0 sur 100 » aurait perdu son sens, qui est **« rien à gagner ici »** — ce que **231 zones** disent exactement. Toutes les notes sous le médian sont donc inchangées : la Creuse `43`, le Cantal `33`, Mayotte `22`. Aucune note ne peut être négative. |
| ✅ Fait | **Les notes d'exception dépassent 100, et ce n'est pas rattrapé.** Le rabot `Math.min(100, …)` de `scorePrioritaire` ([02_data_geo.js](assets/js/02_data_geo.js)) disparaît ; seul le plancher reste, un rendement négatif ne pouvant signaler qu'une borne servie plus vieille que les valeurs qu'elle borne. Épinay-sur-Seine note **`105 / 100`**, Esnandes **`165`**, le meilleur bureau **`220`**. Plafonner rendrait indiscernables les **1 547 bureaux** qui passent 100 — et c'est précisément entre ceux-là qu'une campagne choisit. |
| ✅ Ajusté | **`2 σ` d'abord, `3 σ` retenu : le dépassement doit rester une exception, pas une catégorie.** À `2 σ` (`note100` = `0,502`), l'échelle avait l'élégance d'être presque une droite — pente du haut `180` points par voix/h contre `223` en bas — mais **6 %** des bureaux, `4,9 %` des quartiers et **435 communes** passaient 100, Saint-Denis compris à `101 / 100`. Sur un outil que des militant·es lisent zone par zone, un « 101 sur 100 » sur la commune la plus regardée du 93 se lit comme un bug, pas comme une information. À `3 σ` le dépassement retombe à `2,3 %` des bureaux et `83` communes, et Saint-Denis rentre dans l'échelle à `84`. Le prix est une **cassure plus franche au 50** : la pente du haut tombe à `120` points par voix/h, soit un peu plus de la moitié de celle du bas. |
| ✅ Fait | **L'échelle reste linéaire, en deux segments** — et la notice écrit la cassure avec ses nombres (« dix points valent `0,045` voix/h en dessous, `0,083` au-dessus »), calculés depuis les bornes servies et non recopiés. À `1,61 σ` (σ = médian) la cassure disparaîtrait tout à fait et l'échelle serait une seule droite, mais le 100 ne serait plus un repère de dispersion : seulement le double du médian. |
| ✅ Fait | **Le nombre de σ est SERVI, pas écrit dans le client** (`rendement_sigmas`, avec `rendement_sigma` et le `rendement_note100` qui s'en déduit). C'est ce qui a rendu le passage de 2 à 3 σ possible en un seul chiffre — `SIGMAS_NOTE` dans [prep_bake.py](prep_bake.py) — la carte, le chiffre de tête, la règle graduée et l'opération écrite suivant d'elles-mêmes. `rendement_min` et `rendement_max` restent servis mais ne sont plus le barème : ce sont les deux terrains extrêmes du pays, que la notice cite pour situer l'échelle. |
| ✅ Fait | **La règle graduée dit d'où vient son 100** (`noteEchelle`, [034_mobilisation.js](assets/js/034_mobilisation.js)) : la graduation porte « médiane + 3 σ » — le 3 lu dans les données — là où elle disait « meilleur terrain », et le 0 porte « rien à gagner » là où il disait « pire terrain ». Le remplissage et le curseur sont ramenés dans le rail (une barre de 220 % sortirait du panneau) mais **le nombre écrit reste la note vraie** : c'est le dépassement qui est l'information. Deux paragraphes du volet et de la notice de légende sont réécrits pour dire pourquoi le 100 n'est pas le meilleur terrain, et ce que dépasser 100 veut dire. |
| ✅ Fait | **La couleur ne bouge pas** — elle se calcule sur le rendement brut depuis « La couleur disait le rang, pas l'écart », et le motif est même renforcé : un **rapport de notes** ne mesure rien, la note ayant une origine conventionnelle et une pente qui casse au 50. On lit le nombre sur la note, l'écart sur la teinte. Commentaires mis à jour dans [02_data_geo.js](assets/js/02_data_geo.js) et [06_navigation.js](assets/js/06_navigation.js). |
| ✅ Vérifié | `data_app` régénéré : seul `values/_mobilisation.json` change (les trois nouvelles clés ; `mobn`/`mobh` sont ceux du correctif précédent). Notes recalculées hors navigateur sur les **150 215 zones** servies : minimum `0` (231 zones), médiane des bureaux `50`, des communes `43`, des départements `54` ; p90 des bureaux `75`, maximum `220`. Rien ne dépasse 100 aux deux échelles les plus regardées — département et région plafonnent à `83` (Seine-Saint-Denis, La Réunion). Écart entre la note servie et la note exacte du parquet, remesuré sur la nouvelle pente : maximum **0,51 point**, aucun dépassement du point. Les **20 fichiers JS** et le paquet concaténé passés à l'analyseur : tout parse, **274 noms au premier niveau**, aucune collision. Faute de moteur JS sur la machine, le rendu n'a pas été rejoué dans un navigateur ; les bornages du rail sont vérifiés par lecture (`width` et curseur ramenés à 100 et 98, note affichée non bornée). `build_map.py` assemble la page et `build_site.py` la publie avec les bornes inlinées dans l'amorce. |

## Un formulaire qui n'envoie pas n'est pas un formulaire

> Constat, en une phrase de relecture : « If the form doesn't send a mail then there's no
> point to a form. » La première version composait un `mailto:` — un **lien déguisé en
> formulaire**. Il fallait un logiciel de courriel configuré ; sur un webmail, cliquer
> « Envoyer » ne faisait **rien du tout**, sans le moindre message. Les quatre champs, le
> contexte joint et la notice de méthode ne servaient alors qu'à préparer un brouillon que
> la moitié des visiteurs ne verrait jamais s'ouvrir.

| Statut | Détail |
| ------ | ------ |
| ✅ Fait | **Le formulaire poste vraiment** ([16_suggestion.js](assets/js/16_suggestion.js)). `POST` JSON vers un **relais de formulaires** (`formsubmit.co`), qui transmet par courriel à `etudes-electorales@franceinsoumise.org` : ni compte, ni clé, ni serveur à héberger — le site reste une page statique. Le bouton dit désormais « Envoyer le message » et non « Ouvrir mon logiciel de courriel ». |
| ✅ Fait | **Le tiers est nommé dans le panneau**, pas seulement dans le code : « l'envoi passe par un relais de formulaires (formsubmit.co) […] votre message et le contexte ci-dessus transitent donc par ce tiers ». C'est le prix d'un envoi réel depuis une page sans serveur, et la personne qui écrit a le droit de le savoir avant de cliquer. L'ancienne notice affirmait l'inverse (« Rien n'est envoyé par ce site ») : elle serait devenue un mensonge, elle est réécrite — dans le panneau, dans [README.md](README.md) et dans [DOCUMENTATION.md](DOCUMENTATION.md). |
| ✅ Fait | **Le repli n'est plus la porte principale, c'est le filet.** Courriel pré-rempli et copie du message sont désormais `hidden` et ne s'ouvrent **que si l'envoi a échoué**. Les montrer d'emblée redirait « ce formulaire n'envoie pas vraiment ». |
| ✅ Fait | **On n'annonce jamais un envoi qui n'a pas eu lieu.** Le relais répond `{success, message}` où `success` est une **chaîne** (`"true"` / `"false"`) : `r.success===true` aurait été faux à tous les coups, et le panneau aurait félicité l'utilisateur d'un message parti nulle part. Trois issues distinctes — succès (bouton neutralisé, pas de doublon), **relais non activé** (la phrase anglaise du service, redite en français, plus le repli), **réseau muet** (le motif technique, plus le repli). |
| ✅ Fait | **Un champ « votre adresse », facultatif**, envoyé dans la clé `email` que le relais met en **répondre-à** : maintenant que le site expédie à la place de la personne, l'équipe ne peut plus répondre en cliquant « Répondre » sans lui. L'intitulé dit à quoi il sert (« sans elle, l'équipe ne peut pas vous répondre »). |
| ✅ Fait | **Le courriel reçu est un tableau, pas un pavé** : chaque champ part sous son propre nom (`_template: "table"`), contexte compris — Zone, Indicateur affiché, Valeur affichée, Permalien s'y lisent ligne à ligne. |
| ⚠️ Garde-fou | **Piège à robots** (champ hors écran, `tabindex="-1"`, `aria-hidden`) vérifié **côté page** avant l'appel réseau, en plus de l'être par le relais : un envoi qui sera jeté à l'arrivée ne mérite pas un aller-retour. |
| ⏳ En attente d'un clic | **Une action, une seule fois, et elle n'est pas dans le code.** Au tout premier message, `formsubmit.co` adresse un courriel d'**activation** à `etudes-electorales@franceinsoumise.org`. Tant que ce lien n'est pas cliqué, rien n'est délivré — le formulaire l'affiche en clair et bascule sur son repli plutôt que de faire croire à un envoi. Après ce clic, les messages arrivent. Le relais fournit alors un **alias** opaque (`formsubmit.co/ajax/<alias>`) qui évite d'exposer l'adresse aux moissonneurs : le poser dans `SUGG_ENVOI` quand on l'aura. |
| ✅ Vérifié | Contrat du relais **sondé en vrai** avant d'écrire une ligne, sur une adresse de domaine **réservé** (RFC 2606, aucun destinataire réel) : `access-control-allow-origin: *`, et la réponse `{"success":"false","message":"This form needs Activation…"}` — le service ne prétend donc pas délivrer ce qu'il ne délivre pas, ce sur quoi repose tout l'affichage. Puis les **quatre issues rejouées dans Chromium sans tête** contre un `fetch` instrumenté : message vide (aucun appel réseau), succès (requête `POST`, 13 champs dont `email` en répondre-à et l'objet `[Atlas électoral] … — Saint-Denis`, bouton neutralisé, repli masqué), relais non activé (repli ouvert, message en français, `mailto:` de 868 caractères prêt), panne réseau (repli ouvert, bouton réutilisable), et robot (piège rempli → aucun appel réseau). Aucun `undefined`, aucun `NaN`. |
| ⚠️ Non vérifié | **La délivrance réelle n'a pas pu l'être** : le seul test possible consiste à écrire à `etudes-electorales@franceinsoumise.org`, ce qui déclenche le courriel d'activation dans une boîte qui n'est pas la mienne. Le premier message envoyé depuis le site fera office de test — et, s'il échoue, le dira. |
