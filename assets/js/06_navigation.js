
function dessiner(geo,valeurs,codeProp,nameProp,enter){
  if(layer)layer.remove(); curVals=valeurs;
  geo.features.forEach(f=>{f.properties.__code=String(f.properties[codeProp]);
    f.properties.__nom=f.properties[nameProp]||f.properties.__code;});
  const fc=colorer(geo.features.map(f=>valOf(f.properties)));
  layer=L.geoJSON(geo,{style:f=>({fillColor:fc(valOf(f.properties)),color:"#1a1a1a",weight:.5,fillOpacity:.85}),
    onEachFeature:(f,ly)=>{ const v=valOf(f.properties);
      ly.bindTooltip(`<b>${f.properties.__nom}</b><br>${indicLabel} : ${fmtVal(v,indicUnit)}`,{sticky:true});
      ly.on("mouseover",()=>ly.setStyle({weight:2.4,color:"#fff"}));
      ly.on("mouseout",()=>layer.resetStyle(ly));
      if(enter){ ly.__enter=()=>enter(f,ly);
        ly.on("click",()=>{infoPanel(f.properties.__nom,valeurs[f.properties.__code]);enter(f,ly);}); }
      else ly.on("click",()=>infoPanel(f.properties.__nom,valeurs[f.properties.__code])); }}).addTo(map); }

function jumpTo(d){ stack=stack.slice(0,d); infoPanel(null); setFil();
  if(d===0)return vueFrance(); const t=stack[d-1];
  // remonter : on plafonne le zoom d'arrivée juste sous le seuil de redescente ZIN[d]
  // (tout en restant au-dessus de ZOUT[d]), sinon l'ajustement aux contours du parent
  // retombe pile sur le seuil et on replonge aussitôt dans la zone qu'on vient de quitter.
  flyTo(t.bounds, ZIN[d]!=null?ZIN[d]-0.1:15); render(t.niveau,t.code); }
function setFil(){ let h=`<span class="crumb" data-d="0">🇫🇷 France</span>`;
  stack.forEach((s,i)=>h+=` › <span class="crumb" data-d="${i+1}">${s.nom}</span>`);
  $("fil").innerHTML=h; $("fil").querySelectorAll(".crumb").forEach(e=>e.onclick=()=>jumpTo(+e.dataset.d));
  $("back").disabled=stack.length===0; }

function flyTo(b,maxZoom){ if(!b)return; busy=true; map.flyToBounds(b,{duration:.8,maxZoom:maxZoom||11});
  map.once("moveend",()=>{ if(stack.length)stack[stack.length-1].enterZoom=map.getZoom();
    setTimeout(()=>busy=false,200); }); }

async function vueFrance(){ stack=[]; setFil(); subToggle(false); flyTo(FRANCE,6);
  dessiner(await getJSON("geo/regions.geojson"),await getJSON("values/region.json"),"code","nom",
    (f,ly)=>entrer("region",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueRegion(code){ subToggle(false);
  const [geo,val,hier]=await Promise.all([getJSON("geo/departements.geojson"),
    getJSON("values/departement.json"),getJSON("values/_hierarchie.json")]);
  const deps=new Set(hier.departements.filter(d=>d.region===code).map(d=>d.code));
  dessiner({type:"FeatureCollection",features:geo.features.filter(f=>deps.has(String(f.properties.code)))},
    val,"code","nom",(f,ly)=>entrer("departement",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueDepartement(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/circ/${code}.geojson`),getJSON("values/circonscription.json")]);
  if(!geo||!geo.features.length)return vueDeptCommunes(code); // dép. sans circo (outre-mer/étranger)
  const depNom=(stack[stack.length-1]||{}).nom||code;
  geo.features.forEach(f=>f.properties.nom=circoNom(f.properties.code_circonscription,depNom));
  dessiner(geo,val||{},"code_circonscription","nom",
    (f,ly)=>entrer("circonscription",f.properties.__code,f.properties.__nom,ly.getBounds())); }
async function vueDeptCommunes(code){ subToggle(false);
  const [geo,val]=await Promise.all([getJSON(`geo/communes/${code}.geojson`),getJSON(`values/commune/${code}.json`)]);
  if(!geo){$("loading").textContent="contours indisponibles";return;}
  dessiner(geo,val||{},"code","nom",(f,ly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds())); }
// communes d'une circonscription : on rabat les communes du département dont le centre
// tombe dans le contour de la circo (rattachement approché, front-only).
async function vueCirconscription(code){ subToggle(false); const dep=code.split("-")[0];
  const [cgeo,geo,val]=await Promise.all([getJSON(`geo/circ/${dep}.geojson`),
    getJSON(`geo/communes/${dep}.geojson`),getJSON(`values/commune/${dep}.json`)]);
  if(!geo){$("loading").textContent="contours communes indisponibles";return;}
  const cf=cgeo&&cgeo.features.find(f=>String(f.properties.code_circonscription)===code);
  let feats=geo.features;
  if(cf){ feats=geo.features.filter(f=>{const c=centroid(f.geometry);return ptInGeom(c[0],c[1],cf.geometry);});
    if(!feats.length){ const cc=centroid(cf.geometry); // circo urbaine : rabattre la commune englobante
      feats=geo.features.filter(f=>ptInGeom(cc[0],cc[1],f.geometry)); }
    if(!feats.length)feats=geo.features; }
  dessiner({type:"FeatureCollection",features:feats},val||{},"code","nom",
    (f,ly)=>entrer("commune",f.properties.__code,f.properties.__nom,ly.getBounds())); }
const subToggle=show=>{$("subtoggle").style.display=show?"flex":"none";};
async function vueCommune(code){ const dep=depOf(code); subToggle(true);
  if(sousMode==="iris"){
    const [geo,val]=await Promise.all([getJSON(`geo/iris/${dep}.geojson`),getJSON("values/iris.json")]);
    if(!geo){$("loading").textContent="contours IRIS indisponibles";return;}
    const fc={type:"FeatureCollection",features:geo.features.filter(f=>String(f.properties.code_iris).slice(0,5)===code)};
    if(!fc.features.length){$("loading").textContent="pas d'IRIS";return;}
    dessiner(fc,val||{},"code_iris","nom_iris",null); return; }
  const [geo,val]=await Promise.all([getJSON(`geo/bv/${dep}.geojson`),getJSON(`values/bv/${dep}.json`)]);
  if(!geo){$("loading").textContent="contours BV indisponibles";return;}
  const fc={type:"FeatureCollection",features:geo.features.filter(f=>String(f.properties.code_commune)===code)};
  if(!fc.features.length){$("loading").textContent="pas de bureaux";return;}
  dessiner(fc,val||{},"bureau","bureau",null); }

function render(n,c){ if(n==="region")vueRegion(c);else if(n==="departement")vueDepartement(c);
  else if(n==="circonscription")vueCirconscription(c);else if(n==="commune")vueCommune(c); }
function entrer(niveau,code,nom,bounds){ stack.push({niveau,code,nom,bounds}); setFil();
  flyTo(bounds,niveau==="commune"?15:11); setTimeout(()=>render(niveau,code),320); }
$("back").onclick=()=>jumpTo(stack.length-1);
// hooks de test/débogage (comme window.__map) : piloter la navigation, lister les zones dessinées
window.__enter=entrer;
window.__feats=()=>{const a=[];layer&&layer.eachLayer(l=>l.feature&&a.push(l.feature.properties.__nom));return a;};

// zoom-molette = descendre/remonter automatiquement
function featureAuCentre(){ if(!layer)return null; const c=map.getCenter(); let best=null,ba=1e18;
  layer.eachLayer(ly=>{ if(ly.getBounds){const b=ly.getBounds(); if(b.contains(c)){
    const a=(b.getEast()-b.getWest())*(b.getNorth()-b.getSouth()); if(a<ba){ba=a;best=ly;}}}}); return best; }
map.on("zoomend",()=>{ if(busy)return; const z=map.getZoom(), d=stack.length;
  if(d<4 && ZIN[d]!=null && z>=ZIN[d]){ const f=featureAuCentre(); if(f&&f.__enter)f.__enter(); }
  else if(d>=1){ const ez=stack[d-1].enterZoom, thr=Math.max(ZOUT[d], ez!=null?ez-ZBACK:ZOUT[d]);
    if(z<=thr) jumpTo(d-1); } });
