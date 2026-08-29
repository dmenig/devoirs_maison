
// ============================================================================
// Carnet de campagne — Présidentielle 2027 (chantier 3 ; maquette de référence :
// exemple-slide-commune-lfipee.netlify.app). Traduit le profil de la zone en objectifs
// chiffrés + décomposition de l'électorat. Le plan d'action priorisé est dans actionPanel.
//
// Les SEUILS et la DÉCOMPOSITION (taux de qualification, participation attendue) sont
// regroupés dans CARNET_HYP pour rester ajustables.
const CARNET_HYP={
  qualif1T:0.20,   // part des exprimés visée au 1er tour pour espérer la qualification
  maj2T:0.50,      // majorité absolue des exprimés au 2nd tour
  margeRel:0.08,   // demi-fourchette relative (± marge d'incertitude)
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

function carnetScenarios(o,b){ const H=CARNET_HYP;
  const card=(t,cible)=>{ const m=Math.round(cible*H.margeRel);
    return `<div class="scn"><div class="scl">${t}</div>`+
      `<div class="scv">${_nb(cible)}<small> voix</small></div>`+
      `<div class="scr">${_nb(cible-m)} – ${_nb(cible+m)} (± ${_nb(m)})</div></div>`; };
  // Repère = voix LFI réellement obtenues aux scrutins passés (point 14 : comparable à
  // l'objectif en voix). La présidentielle 2022 prime — même type de scrutin que 2027.
  const refs=[];
  if(o.lfiv_P22!=null)refs.push(`Présidentielle 2022 : <b>${_nb(o.lfiv_P22)}</b> voix LFI`);
  if(o.lfiv_E24!=null)refs.push(`Européennes 2024 : ${_nb(o.lfiv_E24)} voix`);
  const ref=refs.length?`<div class="cref">Repère · ${refs.join(" · ")}</div>`:"";
  return `<div class="scns">`+
    card("1ᵉʳ tour · qualification",b.exprimes*H.qualif1T)+
    card("2ᵉ tour vs RN (Bardella)",b.exprimes*H.maj2T)+
    card("2ᵉ tour vs macroniste",b.exprimes*H.maj2T)+`</div>`+
    ref+
    `<div class="hypnote">Objectifs indicatifs rapportés à ${_nb(b.elig)} électeur·ices potentiel·les `+
    `— ils visent l'objectif national et ne préjugent pas de la participation locale.</div>`;
}

// Décomposition de l'électorat potentiel en 4 segments (cf. maquette). garanties/potentielles
// = voix réelles (socle = plancher gauche ; potentiel = plafond + insoumis 2022 non remobilisés).
// Deuxième segment de la décomposition : ce qu'il reste à ALLER CHERCHER. Sa définition suit
// la VERSION du site, comme la pastille de carte — c'est la même quantité, pas un second
// calcul qui la contredirait sous les yeux du lecteur. Le carnet affichait jusqu'ici
// l'heuristique de la version 1 dans les trois versions : on lisait « 134 voix potentielles »
// sous une carte qui en annonçait un autre nombre, pour le même territoire et le même mot.
//
//   V1 · heuristique de voix RÉELLES : l'écart entre le meilleur et le pire score de la
//        gauche (ce que la zone a déjà su faire, moins son plancher), plus les voix
//        insoumises de 2022 non retrouvées en 2024.
//   V2/V3 · la mesure modélisée : les abstentionnistes de gauche mobilisables. Elle ne
//        compte QUE des gens qui n'ont pas voté, là où l'heuristique mélangeait démobilisés
//        et abstentionnistes — d'où un nombre franchement différent, et c'est le propos.
//
// V2 et V3 donnent le même effectif : la version 3 ne change pas ce qui est gagnable, elle
// dit ce que ça coûte d'aller le chercher (ligne d'effort ajoutée sous la barre).
function carnetGagnables(o,garanties,plafond){
  if(VERSION>1)return o.mob!=null?o.mob:null;
  // Les deux scrutins doivent être mesurés : `||0` transformait un scrutin ABSENT en zéro
  // voix, et donc soit un socle 2022 entier compté comme perdu, soit « rien à remobiliser »
  // là où l'on ne sait pas. 33 communes du corpus n'ont qu'un des deux (cf. panneau d'action).
  const remob=(o.lfiv_P22!=null&&o.lfiv_E24!=null)?Math.max(0,o.lfiv_P22-o.lfiv_E24):0;
  return Math.max(0,plafond-garanties)+remob;
}
const GAGNABLES_LAB=VERSION>1?"Voix gagnables":"Voix potentielles";

// Note sous la barre : d'où sort le segment « à gagner », et ce qu'il coûte en version 3.
function carnetGagnablesNote(o,gagnables){
  if(VERSION===1)return "";
  if(gagnables==null)
    return `<div class="hypnote">Le modèle 2027 ne couvre pas cette zone : les voix gagnables `+
      `n'y sont pas estimées.</div>`;
  const rend=rendementPorte(o);
  const effort=(VERSION===3&&rend&&o.mobh!=null)
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
  const garanties=Math.min(...gvs), plafond=Math.max(...gvs);
  const gagnables=carnetGagnables(o,garanties,plafond);
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
function carnet(o){ if(!o)return "";
  const b=carnetBase(o); if(!b)return "";
  return `<div class="carnet"><div class="clead">Carnet de campagne · Présidentielle 2027</div>`+
    carnetScenarios(o,b)+
    `<div class="csec">Décomposition de l'électorat potentiel</div>`+
    carnetCompo(o,b)+
    `<div class="cfoot">Pôle Études Électorales — fiche générée automatiquement par zone.</div></div>`;
}
