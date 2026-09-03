// ============================================================================
// « Suggérer une amélioration » — le retour des utilisateur·ices, VRAIMENT envoyé.
//
// Première version : le formulaire ne faisait que composer un `mailto:`. C'était un lien
// déguisé en formulaire — il fallait un logiciel de courriel configuré, et sur un webmail
// il ne se passait rien du tout. Un formulaire qui n'envoie pas n'est pas un formulaire.
//
// Le site est statique (GitHub Pages) : il n'a pas de serveur à qui poster. On passe donc
// par un RELAIS de formulaires, FormSubmit — POST en JSON, réponse en JSON, aucun compte ni
// clé à gérer. C'est un tiers, et il faut le dire : le message et le contexte transitent
// par lui avant d'arriver dans la boîte de l'équipe. C'est le prix d'un envoi réel depuis
// une page sans serveur ; le jour où le PEE héberge son propre point d'entrée, il n'y a que
// SUGG_ENVOI à changer.
//
// Le relais ne ment pas quand il ne peut pas délivrer : tant que le formulaire n'est pas
// activé (un clic, une seule fois, dans le courriel d'activation reçu à l'adresse de
// destination), il répond `success:"false"` avec le motif. On ne prétend donc jamais
// « envoyé » sans l'avoir été — et le repli (courriel préparé, copie du message) n'apparaît
// que là : quand l'envoi a ÉCHOUÉ, pas avant.
//
// Ce que le formulaire joint d'office : la ZONE, l'INDICATEUR, la VALEUR affichée et le
// PERMALIEN de la vue. « Le chiffre est faux » ne se corrige pas sans savoir où et lequel —
// et c'est justement ce qu'une personne qui signale un problème n'a aucune raison de penser
// à recopier. Le contexte est affiché tel qu'il sera envoyé : rien ne part que la personne
// n'ait vu.
const SUGG_ADRESSE="etudes-electorales@franceinsoumise.org";
// Point d'entrée du relais. L'adresse y figure en clair — elle l'est déjà dans le panneau,
// qui l'écrit pour qui préfère son propre courriel. FormSubmit fournit après activation un
// ALIAS opaque (`formsubmit.co/ajax/<alias>`) qui évite de l'exposer aux moissonneurs : le
// remplacer ici quand on l'aura, le reste ne bouge pas.
const SUGG_ENVOI=`https://formsubmit.co/ajax/${SUGG_ADRESSE}`;
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
const sgVal=id=>{ const e=$(id); return e?e.value.trim():""; };

// Contexte de la vue, sous forme de couples [libellé, valeur] : affiché dans le panneau ET
// envoyé, à l'identique.
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

function suggSujet(){ const zone=sgVal("sgzone");
  return `[Atlas électoral] ${sgVal("sgtype")||"Suggestion"}${zone?` — ${zone}`:""}`; }

// Charge utile envoyée au relais. Un OBJET À CHAMPS NOMMÉS et non un bloc de texte : le
// relais en fait un tableau dans le courriel reçu, où chaque ligne se lit d'un coup d'œil.
// Les clés en `_` sont ses réglages, pas des données.
function suggCharge(){
  const c={ "Type": sgVal("sgtype"), "Message": sgVal("sgmsg") };
  const zone=sgVal("sgzone"), qui=sgVal("sgqui"), courriel=sgVal("sgmail");
  if(zone)c["Zone concernée (saisie)"]=zone;
  if(qui)c["De la part de"]=qui;
  // `email` est le champ que le relais met en RÉPONDRE-À : sans lui, l'équipe reçoit le
  // message sans pouvoir répondre à qui l'a écrit. D'où le champ, facultatif, et l'intitulé
  // qui dit à quoi il sert.
  if(courriel)c.email=courriel;
  suggContexte().forEach(([k,v])=>{ c[k]=v; });
  c._subject=suggSujet();
  c._template="table";
  c._captcha="false";
  return c; }

// Corps en texte brut : sert au repli (courriel préparé, presse-papiers), pas à l'envoi.
function suggCorps(){
  return Object.entries(suggCharge())
    .filter(([k])=>!k.startsWith("_")&&k!=="Message")
    .map(([k,v])=>`${k} : ${v}`)
    .join("\n")+`\n\n${sgVal("sgmsg")}`; }
// `mailto:` : l'objet ET le corps sont encodés (un « & » ou un « # » dans un nom de zone
// couperait sinon l'URL au milieu du message).
const suggMailto=()=>`mailto:${SUGG_ADRESSE}?subject=${encodeURIComponent(suggSujet())}`+
  `&body=${encodeURIComponent(suggCorps())}`;

function suggPanneau(){
  const ctx=suggContexte().map(([k,v])=>
    `<div class="row"><span>${sgEsc(k)}</span><b>${sgEsc(v)}</b></div>`).join("");
  return `<h3>💬 Suggérer une amélioration</h3>`+
    `<p>Cet atlas est fait pour être corrigé. Un chiffre qui paraît faux, une donnée qui `+
    `manque, un calcul qu'on n'arrive pas à suivre, une carte illisible sur son téléphone : `+
    `écrivez-le à l'équipe <b>Études électorales</b>, le message part d'ici.</p>`+
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
      `<label for="sgmail">Votre adresse <span class="sgopt">(facultatif — sans elle, `+
        `l'équipe ne peut pas vous répondre)</span></label>`+
      `<input id="sgmail" type="email" placeholder="vous@exemple.fr"/>`+
      // Piège à robots : un champ que personne ne voit et que seuls les automates
      // remplissent. Le relais jette le message quand il est rempli.
      `<input id="sghoney" type="text" name="_honey" tabindex="-1" autocomplete="off" `+
        `aria-hidden="true" class="sghoney"/>`+
    `</div>`+
    // Le contexte est MONTRÉ, pas seulement joint : un formulaire qui expédie l'URL de
    // navigation d'une personne sans le lui dire ne la respecte pas.
    `<div class="sec">Joint automatiquement à votre message</div>`+
    `<div class="sgctx">${ctx}</div>`+
    `<div class="sgact">`+
      `<button id="sgsend" class="sgbtn sgprim" type="button">✉️ Envoyer le message</button>`+
    `</div>`+
    `<div id="sgnote" class="sgnote"></div>`+
    // Repli : présent dans le DOM mais MASQUÉ tant que l'envoi n'a pas échoué. Le montrer
    // d'emblée redirait « ce formulaire n'envoie pas vraiment », ce qui n'est plus vrai.
    `<div id="sgfallback" class="sgfb" hidden>`+
      `<div class="sec">Autre chemin</div>`+
      `<p>L'envoi n'a pas abouti. Le message est prêt : ouvrez-le dans votre logiciel de `+
      `courriel, ou copiez-le et collez-le dans un courriel à `+
      `<a class="sgmail" href="mailto:${SUGG_ADRESSE}">${SUGG_ADRESSE}</a>.</p>`+
      `<div class="sgact">`+
        `<a id="sgmailto" class="sgbtn" href="#">✉️ Ouvrir mon logiciel de courriel</a>`+
        `<button id="sgcopy" class="sgbtn" type="button">📋 Copier le message</button>`+
      `</div></div>`+
    `<p class="hypnote"><b>Où va ce message.</b> Le site étant une page statique sans `+
    `serveur, l'envoi passe par un <b>relais de formulaires</b> (formsubmit.co) qui le `+
    `transmet par courriel à l'équipe : votre message et le contexte ci-dessus transitent `+
    `donc par ce tiers. Votre adresse n'est envoyée que si vous la donnez, et sert `+
    `uniquement à vous répondre.</p>`; }

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

// Envoi. Le relais répond `{success:"true"|"false", message}` — `success` est une CHAÎNE,
// pas un booléen : `r.success===true` serait faux à tous les coups. Tout ce qui n'est pas
// un succès franc ouvre le repli, message du relais à l'appui.
async function suggEnvoyer(){
  const note=$("sgnote"), bouton=$("sgsend"), repli=$("sgfallback");
  if(!sgVal("sgmsg")){ $("sgmsg").focus();
    note.className="sgnote warn"; note.textContent="Votre message est vide."; return; }
  // Le piège à robots est vérifié ICI aussi : inutile de faire un aller-retour réseau pour
  // un envoi qui sera jeté à l'arrivée.
  if(sgVal("sghoney")){ note.className="sgnote warn";
    note.textContent="Envoi refusé."; return; }
  bouton.disabled=true; bouton.textContent="Envoi en cours…";
  note.className="sgnote"; note.textContent="";
  let ok=false, motif="";
  try{
    const rep=await fetch(SUGG_ENVOI,{method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify(suggCharge())});
    const j=await rep.json().catch(()=>({}));
    ok=String(j.success)==="true";
    motif=j.message||`réponse ${rep.status} du relais`;
  }catch(e){ motif="le réseau n'a pas répondu ("+e+")"; }
  bouton.disabled=false; bouton.textContent="✉️ Envoyer le message";
  if(ok){
    note.className="sgnote ok";
    note.textContent="Message envoyé à l'équipe Études électorales. Merci — "+
      "chaque retour de terrain corrige une donnée que personne d'autre ne peut voir.";
    repli.hidden=true;
    // Envoyé = plus rien à renvoyer : on neutralise le bouton pour éviter le doublon d'un
    // second clic « pour être sûr ».
    bouton.disabled=true; bouton.textContent="✓ Message envoyé";
    return; }
  note.className="sgnote warn";
  // Le motif le plus probable au premier envoi, et le seul que l'équipe puisse lever
  // elle-même : le relais attend qu'on clique le lien d'activation qu'il a envoyé à
  // l'adresse de destination. On le dit en français plutôt que de recopier son anglais.
  note.textContent=/activat/i.test(motif)
    ? "Le relais d'envoi n'est pas encore activé pour cette adresse (un clic est attendu "+
      "dans le courriel d'activation reçu par l'équipe). Votre message n'est pas perdu : "+
      "utilisez l'un des deux chemins ci-dessous."
    : "L'envoi a échoué : "+motif+". Votre message n'est pas perdu.";
  $("sgmailto").href=suggMailto();
  repli.hidden=false; }

function suggOuvrir(){ ouvrirModal(suggPanneau());
  const msg=$("sgmsg"), note=$("sgnote");
  $("sgsend").onclick=suggEnvoyer;
  // Le lien de repli est reconstruit à chaque frappe : c'est un CLIC UTILISATEUR sur une
  // ancre `mailto:` qui ouvre le plus fidèlement le client de courriel — une affectation de
  // location.href depuis un gestionnaire est bloquée par certains navigateurs.
  const maj=()=>{ const a=$("sgmailto"); if(a)a.href=suggMailto(); };
  ["sgmsg","sgzone","sgqui","sgmail","sgtype"].forEach(id=>{ const e=$(id);
    if(e){ e.oninput=maj; e.onchange=maj; } });
  $("sgcopy").onclick=()=>{ if(!sgVal("sgmsg")){ msg.focus();
      note.className="sgnote warn"; note.textContent="Votre message est vide."; return; }
    // On copie l'objet AVEC le corps : collé dans un webmail, le message reste complet et
    // reste triable — l'objet seul ne se retrouve nulle part ailleurs.
    suggCopier(`${suggSujet()}\n\n${suggCorps()}`).then(ok=>{ note.className="sgnote "+(ok?"ok":"warn");
      note.textContent=ok?`Message copié. Collez-le dans un courriel à ${SUGG_ADRESSE}.`
        :"La copie a été refusée par le navigateur : sélectionnez le message à la main."; }); };
  maj(); msg.focus(); }

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
