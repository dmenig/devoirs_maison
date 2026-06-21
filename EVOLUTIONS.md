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
| 3 | ✅ Fait | `031_carnet.js` (3 scénarios + décomposition 4 segments) en tête de fiche ; `05_panel_action.js` réécrit en plan priorisé/daté (non-/mal-inscription → remobilisation → abstention → primo, PS marginal) ; bake des estimations dans `prep_bake.py`. Seuils/segments = **hypothèses provisoires `CARNET_HYP`**, à valider PEE. |
| 4 | ✅ Fait | Cutoff de fiabilité BV (heuristique client + drapeau `fiable` baké dans `prep_bv.py`), repli via export. **Vue d'ensemble locale embarquée en bas de la fiche commune** (`032_apercu.js`) : small-multiples SVG de la commune dans son voisinage (LFI / participation / RN · Europ. 2024, contour blanc = commune courante) ; pour Paris/Lyon/Marseille, comparaison **par arrondissement** (la maille d'un GA) à partir des valeurs d'arrondissement déjà bakées. Reste ouvert : définition fine du « grand quartier » hors PLM. |
| 5 | ✅ Fait | Bouton **⬇️ Export** : CSV (séparateur `;`, BOM Excel) de la vue courante + en-tête de provenance. GeoJSON déféré (optionnel). |
