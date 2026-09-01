
// ============================================================================
// Carnet de campagne — Législatives 2027 (chantier 3 ; maquette de référence :
// exemple-slide-commune-lfipee.netlify.app). Traduit le profil de la zone en repères
// chiffrés + décomposition de l'électorat. Le plan d'action priorisé est dans actionPanel.
//
// Les hypothèses de la DÉCOMPOSITION sont regroupées dans CARNET_HYP pour rester
// ajustables. Les seuils d'objectif (qualification à 20 % des exprimés, majorité à 50 %)
// en sont sortis avec les cartes d'objectif : plus rien ici ne projette un résultat.
const CARNET_HYP={
  partDef:0.70,    // participation présidentielle attendue à défaut de donnée (fraction)
};
const _nb=v=>Math.round(v).toLocaleString('fr');

// Base électorale : inscrits (champ baké, sinon dérivé du stock d'abstention E24 =
// inscrits × taux d'abstention) ; corps électoral potentiel = inscrits + non-inscrits.
function carnetBase(o){
  let insc=o.insc;
  if(insc==null&&o.abst!=null&&o.part_E24!=null&&o.part_E24<100)
    insc=Math.round(o.abst/(1-o.part_E24/100));
  if(insc==null)return null;
  const elig=insc+(o.noninsc||0);
  const pp=o.part_P22!=null?o.part_P22:o.part_E24;
  const part=pp!=null?pp/100:CARNET_HYP.partDef;
  return {insc,elig,part,exprimes:Math.round(insc*part)};
}

// Voix LFI RÉELLEMENT obtenues aux scrutins passés (point 14). Rien d'estimé, rien de
// projeté : c'est ce à quoi on compare tout le reste.
function carnetRepere(o,intitule){
  const refs=[];
  if(o.lfiv_P22!=null)refs.push(`Présidentielle 2022 : <b>${_nb(o.lfiv_P22)}</b> voix LFI`);
  if(o.lfiv_E24!=null)refs.push(`Européennes 2024 : ${_nb(o.lfiv_E24)} voix`);
  return refs.length?`<div class="cref">${intitule} · ${refs.join(" · ")}</div>`:"";
}

// Le Carnet s'ouvre sur les voix LFI RÉELLEMENT obtenues, puis sur la décomposition de
// l'électorat. Il a porté un temps, en version 1, des cartes d'objectif arithmétique
// (20 % des exprimés estimés pour espérer la qualification, 50 % au second tour) : c'était
// la formule dont le score de cette version-là était tiré. Elles remettaient sous les yeux
// le calcul que la rentabilité remplace — « qualification : 6 553 voix » juste au-dessus de
// « Voix gagnables : 4 030 » se lit comme « il en manque 6 553 ». Plus une seule ligne
// servie ne sort désormais de l'arithmétique historique.
const carnetScenarios=o=>carnetRepere(o,"Voix LFI obtenues");

// Décomposition de l'électorat potentiel (cf. maquette). Les voix garanties sont RÉELLES :
// le plancher de la gauche sur les scrutins connus.
// Deuxième segment de la décomposition : ce qu'il reste à ALLER CHERCHER. C'est le NUMÉRATEUR
// du score que colore la carte, pas un second calcul qui le contredirait sous les yeux du
// lecteur — la rentabilité n'est que ces mêmes voix rapportées aux heures de porte-à-porte.
// Le Carnet a longtemps affiché ici l'heuristique de la version 1 (l'écart entre le meilleur
// et le pire score de la gauche, plus les voix insoumises de 2022 non retrouvées en 2024) :
// on lisait « 134 voix potentielles » sous une carte qui en annonçait un autre nombre, pour
// le même territoire et le même mot. La mesure modélisée ne compte QUE des gens qui n'ont
// pas voté, là où l'heuristique mélangeait démobilisés et abstentionnistes.
const carnetGagnables=o=>o.mob!=null?o.mob:null;
const GAGNABLES_LAB="Voix gagnables";

// Note sous la barre : d'où sort le segment « à gagner », et ce qu'il coûte en heures.
function carnetGagnablesNote(o,gagnables){
  if(gagnables==null)
    return `<div class="hypnote">Le modèle 2027 ne couvre pas cette zone : les voix gagnables `+
      `n'y sont pas estimées.</div>`;
  const rend=rendementPorte(o);
  const effort=(rend&&o.mobh!=null)
    ? ` Il faudrait ≈ <b>${_nb(o.mobh)} heures</b> de porte-à-porte pour frapper à toutes les `+
      `portes de la zone, soit <b>${rend.toLocaleString('fr',{minimumFractionDigits:2,maximumFractionDigits:2})} voix/h</b>.`
    : "";
  return `<div class="hypnote">Voix gagnables = <b>abstentionnistes conjoncturels × part de `+
    `gauche du votant marginal</b> (législatives 2027) — le chiffre que colore la carte.${effort} `+
    `Détail du calcul dans le « i » de la légende.</div>`;
}

function carnetCompo(o,b){
  const gvs=["P22","E24","L24","M26"].map(k=>o[`gv_${k}`]).filter(v=>v!=null);
  if(!gvs.length)return "";
  const garanties=Math.min(...gvs);
  const gagnables=carnetGagnables(o);
  // Abstention et non-/mal-inscription retirées de la décomposition (retour PEE) : on ne
  // mélange plus des données passées (abstention E24), présentes (non-/mal-inscrits) et
  // futures (voix garanties/gagnables). L'abstention structurelle gonfle désormais les
  // « voix inaccessibles » ; les non-/mal-inscrit·es relèvent des objectifs de campagne (plan d'action).
  const inaccessibles=Math.max(0,b.elig-garanties-(gagnables||0));
  // Point 13 : on évite la lecture « rouge-jaune-bleu = FI-LREM-RN ». Les voix garanties et
  // gagnables partagent la couleur de campagne (rouge) — gagnables en rayures (≈ 50 %
  // pleines) pour marquer l'incertitude ; inaccessibles en bleu/gris neutre.
  const RED="#D1271C";
  // Un segment `null` (modèle sans valeur ici) sort de la barre ET de la légende : mieux vaut
  // une décomposition à deux termes qu'un « 0 » qui se lirait « rien à gagner ».
  const segs=[["Voix garanties",garanties,RED],
    ...(gagnables==null?[]:[[GAGNABLES_LAB,gagnables,
      `repeating-linear-gradient(45deg,${RED} 0 6px,transparent 6px 12px)`]]),
    ["Voix inaccessibles",inaccessibles,"#3885f4"]];
  const tot=segs.reduce((a,s)=>a+s[1],0)||1;
  const bar=segs.map(s=>s[1]?`<i style="width:${(100*s[1]/tot).toFixed(1)}%;background:${s[2]}" title="${s[0]} ${_nb(s[1])}"></i>`:"").join("");
  const lg=segs.map(s=>`<div class="crow"><span><i style="background:${s[2]}"></i>${s[0]}</span><b>${_nb(s[1])}</b></div>`).join("");
  return `<div class="recbar">${bar}</div><div class="compo">${lg}</div>`+
    carnetGagnablesNote(o,gagnables);
}

// Entête du Carnet : à insérer en tête de la fiche commune. Renvoie "" si pas de base
// électorale exploitable (la fiche socio/IRIS reste alors affichée telle quelle).
// Le seul chiffre PROJETÉ du Carnet est celui du modèle, qui porte sur les LÉGISLATIVES
// 2027 : le titre suit, sans quoi la fiche annoncerait un scrutin et en chiffrerait un
// autre. (Il a dit « Présidentielle 2027 » tant que le Carnet portait les objectifs de
// qualification au 1ᵉʳ tour, retirés avec la version 1.)
const CARNET_SCRUTIN="Législatives 2027";

function carnet(o){ if(!o)return "";
  const b=carnetBase(o); if(!b)return "";
  return `<div class="carnet"><div class="clead">Carnet de campagne · ${CARNET_SCRUTIN}</div>`+
    carnetScenarios(o)+
    `<div class="csec">Décomposition de l'électorat potentiel</div>`+
    carnetCompo(o,b)+
    `<div class="cfoot">Pôle Études Électorales — fiche générée automatiquement par zone.</div></div>`;
}
