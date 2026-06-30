
// ============================================================================
// Conclusions opérationnelles (retour Elia n°9) : chaque signal socio-démo marquant
// (écart à la moyenne France) est traduit en MESURES de campagne priorisées plutôt que
// laissé en statistique brute. Les recos passent EN AVANT dans la fiche ; le pourquoi
// et le constat chiffré restent dépliables au clic (même mécanique exp/détail que le reste).
// Règle : k=clé socio · sens (+1 plus haut qu'en France, -1 plus bas) · ec=écart minimal
// (points) pour déclencher · lab/u=libellé+unité du constat · t=titre · mes=mesures · pq=pourquoi.
const RECO_REGLES=[
  {k:"logloc",sens:1,ec:7,lab:"Locataires",u:"%",t:"Beaucoup de locataires",
   mes:["Campagne d'inscription & procurations (forte mobilité → mal-inscription)",
        "Mots d'ordre : coût du logement, encadrement des loyers, anti-expulsions"],
   pq:"Les locataires déménagent souvent et restent fréquemment inscrit·es sur d'anciennes listes : "+
      "un gros gisement de mal-inscrit·es à retrouver. Ils subissent aussi de plein fouet le coût du logement."},
  {k:"loghlm",sens:1,ec:7,lab:"Logement social",u:"%",t:"Quartiers de logement social",
   mes:["Présence de terrain régulière (pieds d'immeuble, associations de quartier)",
        "Abstentionnistes à remobiliser en priorité",
        "Mots d'ordre : services publics, droit au logement"],
   pq:"Les quartiers HLM cumulent forte abstention et besoin de services publics : c'est un terrain "+
      "prioritaire de remobilisation dans la durée, pas de conquête de dernière minute."},
  {k:"pauv",sens:1,ec:4,lab:"Taux de pauvreté",u:"%",t:"Précarité économique forte",
   mes:["Mots d'ordre : pouvoir d'achat, salaires, prix de l'énergie et de l'alimentation",
        "Porte-à-porte d'inscription dans les secteurs les plus modestes"],
   pq:"Une pauvreté supérieure à la moyenne nationale rend les enjeux de pouvoir d'achat et de services "+
      "publics décisifs, et fragilise l'inscription électorale."},
  {k:"chom",sens:1,ec:3,lab:"Chômage (15-64 ans)",u:"%",t:"Chômage élevé",
   mes:["Mots d'ordre : emploi, droits des chômeur·ses, industrie locale",
        "Relais via les structures d'insertion et le tissu associatif"],
   pq:"Un chômage supérieur à la moyenne nationale fait de l'emploi un axe central et oriente le contact "+
      "militant vers les lieux d'insertion."},
  {k:"a1529",sens:1,ec:4,lab:"15-29 ans",u:"%",t:"Population jeune",
   mes:["Aller vers les primo-votant·es : lycées, facs, résidences CROUS",
        "Vérifier l'inscription d'office des jeunes de 18 ans",
        "Mots d'ordre : éducation, premier emploi, climat"],
   pq:"Une part de jeunes supérieure à la moyenne ouvre un réservoir de primo-votant·es, à condition "+
      "d'aller les chercher là où ils sont et de sécuriser leur inscription."},
  {k:"a75",sens:1,ec:3,lab:"75 ans et +",u:"%",t:"Population âgée",
   mes:["Présence sur les marchés et lieux de vie de jour",
        "Mots d'ordre : retraites, santé de proximité, perte d'autonomie"],
   pq:"Les plus de 75 ans votent davantage mais restent à convaincre : le contact passe par les marchés "+
      "et les lieux de jour, autour des enjeux de santé et de retraite."},
  {k:"ouv",sens:1,ec:5,lab:"Ouvriers",u:"%",t:"Forte présence ouvrière",
   mes:["Terrain prioritaire : porte-à-porte et remobilisation de l'abstention",
        "Mots d'ordre : salaires, conditions de travail, industrie"],
   pq:"Une forte proportion d'ouvrier·es signale un électorat populaire historiquement abstentionniste : "+
      "la priorité est de renouer le contact, pas seulement de convaincre."},
];

// Top signaux classés par force relative (écart / seuil), plafonnés à 4 pour éviter la
// surcharge (cf. retour Elia : ne pas noyer le·la militant·e sous les statistiques brutes).
function socioRecos(o){ const fr=window.__socioFr||{}; if(!o)return [];
  const out=[];
  for(const r of RECO_REGLES){ const v=o[r.k], f=fr[r.k]; if(v==null||f==null)continue;
    const d=(v-f)*r.sens; if(d<r.ec)continue; out.push({...r,v,f,force:d/r.ec}); }
  return out.sort((a,b)=>b.force-a.force).slice(0,4); }

// Bloc « Conclusions opérationnelles » : recos en tête de fiche, mesures visibles,
// pourquoi + constat chiffré dépliables au clic. Renvoie "" si aucun signal marquant.
function recoPanel(o){ const rs=socioRecos(o); if(!rs.length)return "";
  const fr=window.__socioFr||{};
  const items=rs.map(r=>{
    const mes=`<ul class="rcom">${r.mes.map(m=>`<li>${m}</li>`).join("")}</ul>`;
    const det=`<p>${r.pq}</p><p class="rcoc"><b>Constat :</b> ${r.lab} ${r.v}${r.u} ici, `+
      `contre ${fr[r.k]}${r.u} en moyenne en France.</p>`;
    return expBlock(`<div class="rco"><div class="rcot">${r.t}</div>${mes}</div>`,det); }).join("");
  return `<div class="act recos"><div class="ah">🧭 Conclusions opérationnelles</div>`+
    `<div class="rcohint">Priorités déduites du profil de la commune — cliquez pour le pourquoi et le chiffre.</div>`+
    items+`</div>`; }
