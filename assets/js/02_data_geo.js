const depOf=c=>c.startsWith("97")?c.slice(0,3):c.slice(0,2);
// Paris/Lyon/Marseille : la commune INSEE (75056/69123/13055) agrège des arrondissements
// dont les IRIS portent le code d'arrondissement (751xx, 6938x, 132xx) — la jointure par
// préfixe à 5 sur le code commune renverrait 0 quartier. On élargit le filtre à ces villes.
const PLM={"75056":/^751\d\d/,"69123":/^6938\d/,"13055":/^132\d\d/};
const irisInCommune=(ci,code)=>{ const r=PLM[code]; return r?r.test(ci):ci.slice(0,5)===code; };

// Fiabilité géométrique d'un contour de bureau de vote (chantier 4) — DÉSACTIVÉ pour l'instant.
// La métrique comptait les polygones disjoints, mais elle confond le bruit de tessellation
// Voronoï (micro-slivers) avec une vraie fragmentation et masquait à tort ~25-40 % de bureaux
// nets. À refondre en comptage tolérant aux slivers avant réactivation (cf. 06_navigation.js).
// const BV_MAX_PARTS=2;
// const geomParts=g=>g&&g.type==="MultiPolygon"?g.coordinates.length:1;
// const bvFiable=f=>{ const p=f.properties;
//   return p&&p.fiable!=null?!!(+p.fiable):geomParts(f.geometry)<=BV_MAX_PARTS; };

// Coloration DIVERGENTE, centrée sur la MÉDIANE des zones affichées et proportionnelle à
// l'ÉCART : la médiane prend le ton neutre du milieu de l'échelle, et une zone s'en écarte
// vers le bleu (plus faible) ou le rouge (plus élevé) à proportion de cet écart.
//
// Pourquoi plus le RANG. Colorer au percentile garantit autant de bleu que de rouge à
// l'écran — une propriété qu'on ne cherche pas, et qui coûte cher : le rang écrase les
// écarts là où la distribution est dense et en invente là où elle est plate. Deux zones de
// la queue haute, +45 % et +100 % de voix, tombaient dans le même cinquième et sortaient
// du MÊME rouge, alors que l'une vaut deux fois l'autre.
//
// L'ÉTALON. « Proportionnellement » demande une unité, et la même des deux côtés (sans
// quoi un même écart ne donnerait pas le même ton à gauche et à droite de la médiane) :
// c'est l'écart absolu à la médiane pris au 9e décile. Le MAXIMUM ferait l'affaire si une
// seule zone aberrante ne suffisait pas à tasser toutes les autres sur le ton neutre ; à ce
// décile, ~10 % des zones saturent au bout de l'échelle et les 90 % restantes s'y déploient.
//
// Le ton est INTERPOLÉ entre les cinq bornes, non arrondi à la plus proche : c'est ce qui
// permet à +45 % et +100 % de ne pas se ressembler, et c'est exactement le dégradé que
// montre la barre de la légende (même interpolation sRVB que `linear-gradient`).
const ECART_Q=.9;
const quantile=(tri,p)=>{ const i=(tri.length-1)*p, k=Math.floor(i);
  return tri[k]+(tri[Math.ceil(i)]-tri[k])*(i-k); };
function tonEchelle(u){ const x=Math.max(0,Math.min(1,u))*(RAMP.length-1),
  i=Math.min(RAMP.length-2,Math.floor(x)), f=x-i, a=RAMP[i], b=RAMP[i+1];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`; }
function colorer(vals){ const xs=vals.filter(v=>v!=null&&!isNaN(v)).sort((a,b)=>a-b);
  if(!xs.length)return()=>C.geonodata;
  const med=quantile(xs,.5);
  const etalon=quantile(xs.map(v=>Math.abs(v-med)).sort((a,b)=>a-b),ECART_Q);
  return v=>{ if(v==null||isNaN(v))return C.geonodata;
    // étalon nul : toutes les zones portent la même valeur, aucune ne s'écarte — toutes neutres.
    const t=etalon>0?Math.max(-1,Math.min(1,(v-med)/etalon)):0;
    return tonEchelle((t+1)/2); }; }
// Réservoirs entre les deux scrutins choisis (A→B), recalculés à la volée à partir des
// voix réelles bakées (lfiv_*, gv_*) et de la participation — mêmes formules que
// indicators.reservoirs : report = voixB/voixA, perte gauche = (voixA−voixB)/voixA,
// différentiel de participation = part B − part A (points).
function pairMetrics(o){ if(!o)return {};
  const lvA=o[`lfiv_${selA}`], lvB=o[`lfiv_${selB}`], gvA=o[`gv_${selA}`], gvB=o[`gv_${selB}`],
        pA=o[`part_${selA}`], pB=o[`part_${selB}`];
  // Les DEUX scrutins doivent être ventilés. Garder le seul dénominateur laissait passer
  // un numérateur ABSENT (municipales des communes de moins de 1 000 habitants : aucune
  // voix par liste n'y est publiée), et voixB/voixA valait alors NaN — soit « NaN% » dans
  // l'infobulle et en chiffre de tête sur 31 542 communes dès qu'on choisissait Munic. 2026
  // comme scrutin B. Un report qui n'est pas mesurable vaut « — », comme partout ailleurs.
  return {
    report: (lvA&&lvB!=null)?Math.round(1000*lvB/lvA)/10:null,
    perte:  (gvA&&gvB!=null)?Math.round(1000*(gvA-gvB)/gvA)/10:null,
    dpart:  (pA!=null&&pB!=null)?Math.round((pB-pA)*10)/10:null,
    // réservoirs exprimés en NOMBRE DE VOIX (retour Elia) : évolution des voix LFI et
    // voix de gauche perdues (à reconquérir) entre les deux scrutins choisis.
    dlfiv:  (lvA!=null&&lvB!=null)?lvB-lvA:null,
    pertev: (gvA!=null&&gvB!=null)?gvA-gvB:null };
}
// ============================================================================
// « Voix à conquérir » = RENTABILITÉ : voix gagnables ÷ heures de porte-à-porte. Le
// rapport est calculé ICI, sur des sommes (voix totales ÷ heures totales), et non baké
// niveau par niveau : c'est ce qui rend l'agrégat juste — le rendement d'un département
// est celui de tout son terrain pris ensemble, jamais la moyenne des rendements de ses
// bureaux. `mobn` (et non `mob`) au numérateur : les voix des seuls bureaux dont on sait
// chiffrer le porte-à-porte, celles-là mêmes qui alimentent `mobh`.
//
// Le site a comparé un temps trois définitions du score sur trois pages (cf. 01_config.js).
// Les deux autres — déficit arithmétique `conq`, voix modélisées `mob` — ne colorent plus
// la carte. `mob` reste servi et lu : c'est le NUMÉRATEUR de la rentabilité, et le Carnet
// de campagne en fait son segment « voix gagnables ».
function rendementPorte(o){ if(!o||!o.mobh||o.mobn==null)return null;
  return Math.round(1000*o.mobn/o.mobh)/1000; }

const voixConquerir=o=>rendementPorte(o);

// Les autres valeurs sont bakées par prep_bake.py et lues telles quelles.
function rawVal(o,k){ if(!o)return null;
  if(k==="conquerir") return voixConquerir(o);
  if(k==="dyn_report")return pairMetrics(o).report;
  if(k==="dyn_dpart") return pairMetrics(o).dpart;
  if(k==="dyn_perte") return pairMetrics(o).perte;
  if(STAT.has(k)) return o[`${k}_${selB}`];  // instantané du scrutin B (lfi/part/rn/gauche)
  return o[k]; }
const valOf=p=>rawVal(curVals[p.__code],indicKey);

