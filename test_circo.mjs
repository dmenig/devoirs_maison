import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({executablePath:"/usr/bin/google-chrome",
  headless:"new", args:["--no-sandbox"]});
const p = await b.newPage();
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
p.on("console", m => { if (m.type()==="error" && !/favicon/.test(m.text())) errs.push("CONSOLE: " + m.text()); });
const wait = ms => new Promise(r=>setTimeout(r,ms));

await p.goto("http://localhost:8799/served_map_test.html", {waitUntil:"networkidle2", timeout:30000});
await wait(2500);

// drill France → Région (Auvergne-Rhône-Alpes) → Département (Rhône) : doit afficher les circonscriptions
await p.evaluate(() => window.__enter("region","84","Auvergne-Rhône-Alpes",null));
await wait(900);
await p.evaluate(() => window.__enter("departement","69","Rhône",null));
await wait(1800);
const circoStep = await p.evaluate(() => ({
  crumb: document.getElementById("fil").innerText,
  feats: window.__feats(),
}));
console.log("DÉPARTEMENT 69 → circos:", circoStep.feats.length, "zones |", circoStep.feats.slice(0,4).join(" / "));

// entrer dans une circonscription : doit rabattre les communes (sous-ensemble du département)
await p.evaluate(() => window.__enter("circonscription","69-01","1re circ.",null));
await wait(1800);
const communeStep = await p.evaluate(() => ({
  crumb: document.getElementById("fil").innerText,
  n: window.__feats().length,
  sample: window.__feats().slice(0,4),
}));
console.log("CIRCO 69-01 → communes:", communeStep.n, "|", communeStep.sample.join(" / "));
console.log("FIL:", communeStep.crumb);

// comparatif : nb total de communes du Rhône (pour vérifier que le rattachement filtre bien)
const totalCom = await p.evaluate(async () => {
  const r = await fetch("http://localhost:8799/data_app/geo/communes/69.geojson");
  return (await r.json()).features.length;
});
console.log("Communes Rhône (total):", totalCom, "→ circo 69-01 filtrée:", communeStep.n,
  communeStep.n>0 && communeStep.n<totalCom ? "OK (sous-ensemble)" : "⚠ PAS filtré");

console.log("\nzones circo nommées ?", /circ\./.test(circoStep.feats[0]||"") ? "OK" : "⚠");
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await b.close();
