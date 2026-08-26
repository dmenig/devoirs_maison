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
| ✅ Fait | **Pastilles de carte** « Prix au m² » et « Effort logement » réservées à la **carte des communes** (vue département, `immoActive()` dans [07_controls.js](assets/js/07_controls.js)) : la donnée étant communale, une choroplèthe IRIS serait uniforme sur toute la commune. La fiche d'un quartier affiche quand même le prix, en disant « à l'échelle de la commune ». |
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
