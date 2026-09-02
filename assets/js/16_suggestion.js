// ============================================================================
// « Suggérer une amélioration » — le retour des utilisateur·ices, par courriel.
//
// L'atlas est un SITE STATIQUE (GitHub Pages) : il n'a pas de serveur à qui poster un
// formulaire, et lui en donner un — service de formulaires tiers, fonction sans serveur —
// ferait dépendre les retours d'un compte à maintenir, avec les adresses des militant·es
// qui transitent chez un tiers. Le formulaire compose donc un courriel et le remet au
// LOGICIEL DE COURRIEL de la personne (`mailto:`) : rien ne part du site, l'expéditeur est
// sa propre adresse, et le message est relu avant envoi.
//
// Le `mailto:` n'aboutit pas partout (webmail non déclaré comme gestionnaire, poste sans
// client configuré) et il échoue SANS RIEN DIRE. D'où les deux autres sorties, à égalité
// dans le panneau plutôt qu'en repli caché : le message se COPIE d'un bouton, et l'adresse
// est écrite en clair, sélectionnable. Un retour perdu parce que le navigateur n'a rien
// ouvert est un retour qu'on ne recevra jamais.
//
// Ce que le formulaire joint d'office : la ZONE, l'INDICATEUR et le PERMALIEN de la vue.
// « Le chiffre est faux » ne se corrige pas sans savoir où et lequel — et c'est justement
// ce qu'une personne qui signale un problème n'a aucune raison de penser à recopier. Le
// contexte est affiché tel qu'il sera envoyé : rien ne part que la personne n'ait vu.
const SUGG_ADRESSE="etudes-electorales@franceinsoumise.org";
// Les sujets ne sont pas décoratifs : ils préfixent l'objet du courriel, donc ils trient la
// boîte de réception. Ordre = celui de l'utilité d'un retour (une donnée fausse d'abord).
const SUGG_SUJETS=["Une donnée qui paraît fausse",
                   "Une donnée ou un indicateur à ajouter",
                   "La méthode de calcul (note « Prioritaire », réservoirs, budget-temps)",
                   "L'interface, la navigation, la lisibilité",
                   "Un bug (quelque chose ne marche pas)",
                   "Autre"];
// Les noms de zone viennent des données (COG, contours IGN) et finissent dans des attributs
// `value=""` : on échappe, par principe, plutôt que de parier sur ce qu'un nom de commune
// ne contient pas.
const sgEsc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

// Contexte de la vue, sous forme de couples [libellé, valeur] : affiché dans le panneau ET
// recopié en pied de courriel, à l'identique.
function suggContexte(){
  const l=[], t=(typeof stack!=="undefined"&&stack.length)?stack[stack.length-1]:null;
  l.push(["Zone", t?`${t.nom} (${t.niveau} ${t.code})`:"France — vue d'ensemble"]);
  // La fiche ouverte n'est pas toujours la zone en focus : un clic sur un bureau de vote ou
  // un quartier ouvre sa fiche sans quitter la commune. Le retour porte le plus souvent sur
  // ce qu'on a sous les yeux, donc sur cette fiche-là.
  if(lastInfo&&(!t||lastInfo.code!==t.code))
    l.push(["Fiche ouverte", `${lastInfo.nom} (${lastInfo.niveau} ${lastInfo.code})`]);
  l.push(["Indicateur affiché", indicLabel||indicKey]);
  // La VALEUR vue est ce qui permet de rejouer le calcul : deux jeux de données servis à
  // quelques jours d'écart ne donnent pas le même nombre pour la même zone.
  const o=lastInfo?lastInfo.o:(t?t.o:null), v=o?rawVal(o,indicKey):null;
  if(v!=null)l.push(["Valeur affichée", fmtVal(v,indicUnit==="%"?" %":indicUnit)]);
  l.push(["Scrutins comparés", `${selA} → ${selB}`]);
  l.push(["Permalien", location.href]);
  return l; }

// Corps du courriel, en texte brut. Les retours à la ligne sont de vrais `\n` : c'est
// encodeURIComponent qui les traduit pour l'URL, une fois et à un seul endroit.
function suggCorps(){
  const val=id=>{ const e=$(id); return e?e.value.trim():""; };
  const qui=val("sgqui"), zone=val("sgzone");
  return [
    val("sgmsg"),
    "",
    "— — —",
    `Type : ${val("sgtype")}`,
    zone?`Zone concernée (saisie) : ${zone}`:null,
    qui?`De la part de : ${qui}`:null,
    "",
    "Contexte joint automatiquement par l'atlas :",
    ...suggContexte().map(([k,v])=>`· ${k} : ${v}`),
  ].filter(x=>x!=null).join("\n"); }

function suggSujet(){ const t=$("sgtype"), z=$("sgzone");
  const zone=z&&z.value.trim();
  return `[Atlas électoral] ${t?t.value:"Suggestion"}${zone?` — ${zone}`:""}`; }

// `mailto:` : l'objet ET le corps sont encodés (un « & » ou un « # » dans un nom de zone
// couperait sinon l'URL au milieu du message).
const suggMailto=()=>`mailto:${SUGG_ADRESSE}?subject=${encodeURIComponent(suggSujet())}`+
  `&body=${encodeURIComponent(suggCorps())}`;
// Au-delà de ~2 000 caractères d'URL, des clients tronquent le corps sans avertir. On ne
// bloque pas l'envoi — on prévient, et le bouton « copier » reste là pour un long message.
const SUGG_URL_MAX=1900;

function suggPanneau(){
  const ctx=suggContexte().map(([k,v])=>
    `<div class="row"><span>${sgEsc(k)}</span><b>${sgEsc(v)}</b></div>`).join("");
  return `<h3>💬 Suggérer une amélioration</h3>`+
    `<p>Cet atlas est fait pour être corrigé. Un chiffre qui paraît faux, une donnée qui `+
    `manque, un calcul qu'on n'arrive pas à suivre, une carte illisible sur son téléphone : `+
    `tout se dit à l'équipe <b>Études électorales</b>, à `+
    `<a class="sgmail" href="mailto:${SUGG_ADRESSE}">${SUGG_ADRESSE}</a>.</p>`+
    `<div class="sgf">`+
      `<label for="sgtype">De quoi s'agit-il ?</label>`+
      `<select id="sgtype">${SUGG_SUJETS.map(s=>`<option>${sgEsc(s)}</option>`).join("")}</select>`+
      `<label for="sgzone">Zone concernée <span class="sgopt">(facultatif)</span></label>`+
      `<input id="sgzone" type="text" placeholder="commune, quartier, bureau de vote…"/>`+
      `<label for="sgmsg">Votre message</label>`+
      `<textarea id="sgmsg" rows="6" placeholder="Ce que vous avez vu, ce que vous attendiez, `+
        `et — si c'est un chiffre — celui que vous connaissez et sa source."></textarea>`+
      `<label for="sgqui">Vous êtes <span class="sgopt">(facultatif : nom, groupe d'action, `+
        `département)</span></label>`+
      `<input id="sgqui" type="text" placeholder="ex. GA Saint-Denis centre"/>`+
    `</div>`+
    // Le contexte est MONTRÉ, pas seulement joint : un formulaire qui expédie l'URL de
    // navigation d'une personne sans le lui dire ne la respecte pas.
    `<div class="sec">Joint automatiquement à votre message</div>`+
    `<div class="sgctx">${ctx}</div>`+
    `<div class="sgact">`+
      `<a id="sgsend" class="sgbtn sgprim" href="${suggMailto()}">✉️ Ouvrir mon logiciel de courriel</a>`+
      `<button id="sgcopy" class="sgbtn" type="button">📋 Copier le message</button>`+
    `</div>`+
    `<div id="sgnote" class="sgnote"></div>`+
    `<p class="hypnote"><b>Rien n'est envoyé par ce site.</b> Le bouton prépare un courriel `+
    `dans votre propre logiciel de messagerie : vous le relisez et vous l'envoyez vous-même. `+
    `Si rien ne s'ouvre — c'est fréquent avec un webmail —, copiez le message et collez-le `+
    `dans un courriel à <b>${SUGG_ADRESSE}</b>.</p>`; }

// Copie : `navigator.clipboard` en contexte sécurisé (le site est servi en HTTPS), repli
// par textarea + execCommand là où l'API manque ou est refusée.
function suggCopier(txt){
  const vieux=()=>{ const t=document.createElement("textarea");
    t.value=txt; t.setAttribute("readonly","");
    t.style.cssText="position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(t); t.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
    document.body.removeChild(t); return ok; };
  if(navigator.clipboard&&navigator.clipboard.writeText)
    return navigator.clipboard.writeText(txt).then(()=>true,()=>vieux());
  return Promise.resolve(vieux()); }

function suggOuvrir(){ ouvrirModal(suggPanneau());
  const msg=$("sgmsg"), env=$("sgsend"), note=$("sgnote");
  // Le `href` du lien est reconstruit à chaque frappe : c'est un CLIC UTILISATEUR sur une
  // ancre `mailto:` qui ouvre le plus fidèlement le client de courriel — une affectation de
  // location.href depuis un gestionnaire est bloquée par certains navigateurs.
  const maj=()=>{ const url=suggMailto(); env.href=url;
    const vide=!msg.value.trim();
    env.classList.toggle("off",vide);
    note.className="sgnote";
    note.textContent=vide?"Écrivez d'abord votre message."
      :(url.length>SUGG_URL_MAX?"Message long : certains logiciels de courriel le tronquent. "+
        "Préférez « Copier le message », puis collez-le dans un courriel.":""); };
  ["sgmsg","sgzone","sgqui","sgtype"].forEach(id=>{ const e=$(id);
    if(e){ e.oninput=maj; e.onchange=maj; } });
  maj(); msg.focus();
  // Un clic sur le lien alors que le message est vide n'ouvre rien : un courriel vide
  // envoyé par erreur coûte un aller-retour à l'équipe qui le reçoit.
  env.onclick=e=>{ if(!msg.value.trim()){ e.preventDefault(); msg.focus();
      note.className="sgnote warn"; note.textContent="Votre message est vide."; return; }
    note.className="sgnote ok";
    note.textContent="Courriel préparé dans votre logiciel de messagerie — il reste à l'envoyer. "+
      "Si rien ne s'est ouvert, utilisez « Copier le message »."; };
  $("sgcopy").onclick=()=>{ if(!msg.value.trim()){ msg.focus();
      note.className="sgnote warn"; note.textContent="Votre message est vide."; return; }
    // On copie l'objet AVEC le corps : collé dans un webmail, le message reste complet et
    // reste triable — l'objet seul ne se retrouve nulle part ailleurs.
    suggCopier(`${suggSujet()}\n\n${suggCorps()}`).then(ok=>{ note.className="sgnote "+(ok?"ok":"warn");
      note.textContent=ok?`Message copié. Collez-le dans un courriel à ${SUGG_ADRESSE}.`
        :"La copie a été refusée par le navigateur : sélectionnez le message à la main."; }); }; }

// Deux portes d'entrée. Le bouton de la barre du haut est la porte permanente ; le lien
// `.sglink` en pied des notices de méthode (#modal) est celle qui compte — c'est en lisant
// d'où sort un chiffre qu'on doute d'un chiffre, et il ne faut alors plus rien chercher.
(function(){ const b=$("suggestbtn"); if(b)b.onclick=suggOuvrir;
  // #info comme #modal : le pied de notice est le même texte, servi dans le volet méthodo de
  // la fiche et dans la notice de la légende. Le gestionnaire de #info (07_controls.js) ne
  // reconnaît que .back / .sph / .exph : un .sglink le traverse sans effet.
  ["modal","info"].forEach(id=>{ const e=$(id); if(e)e.addEventListener("click",ev=>{
    if(ev.target.closest(".sglink")){ ev.preventDefault(); ev.stopPropagation(); suggOuvrir(); } }); });
  document.addEventListener("keydown",e=>{
    if((e.key==="Enter"||e.key===" ")&&document.activeElement
       &&document.activeElement.classList.contains("sglink")){ e.preventDefault(); suggOuvrir(); } }); })();
