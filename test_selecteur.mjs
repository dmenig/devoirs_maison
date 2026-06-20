import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({executablePath:"/usr/bin/google-chrome",
  headless:"new", args:["--no-sandbox"]});
const p = await b.newPage();
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
p.on("console", m => { if (m.type()==="error") errs.push("CONSOLE: " + m.text()); });
const wait = ms => new Promise(r=>setTimeout(r,ms));

await p.goto("http://localhost:8799/served_map_test.html", {waitUntil:"networkidle2", timeout:30000});
await wait(2000);

// selector present + populated
const sel = await p.evaluate(() => ({
  a: [...document.querySelectorAll("#selA option")].map(o=>o.value),
  b: [...document.querySelectorAll("#selB option")].map(o=>o.value),
  aVal: document.getElementById("selA").value, bVal: document.getElementById("selB").value,
  pastilles: [...document.querySelectorAll("#pastilles .chip")].map(c=>c.textContent),
}));
console.log("SELECTOR options A:", sel.a.join(","), "| default", sel.aVal+"→"+sel.bVal);
console.log("PASTILLES:", sel.pastilles.join(" | "));

// drill to commune, read réservoir section (default P22→E24)
await p.evaluate(() => { const s=document.getElementById("search");
  s.value="Villeurbanne · 69266"; s.dispatchEvent(new Event("change")); });
await wait(3000);
const panel1 = await p.evaluate(() => {
  const t=document.getElementById("info").innerText;
  const m=t.match(/Réservoirs de voix · (\S+)/);
  return {arrow:m&&m[1], hasReport:/Report LFI P22→E24/.test(t),
    hasDpart:/Différentiel participation P22→E24/.test(t),
    hasPerte:/Taux de perte gauche P22→E24/.test(t)};
});
console.log("PANEL default:", JSON.stringify(panel1));

// activate the dynamic "Report LFI" pastille and read map fills
const mapColors = () => p.evaluate(() => { const o={};
  document.querySelectorAll("path.leaflet-interactive").forEach(el=>{const c=el.getAttribute("fill");o[c]=(o[c]||0)+1;}); return o; });
await p.evaluate(() => [...document.querySelectorAll("#pastilles .chip")].find(c=>/Report LFI/.test(c.textContent)).click());
await wait(1500);
console.log("REPORT pastille label after activate:",
  await p.evaluate(()=>document.querySelector("#pastilles .chip.on").textContent));
console.log("MAP fills (report P22→E24):", JSON.stringify(await mapColors()));

// change pair to L24→M26 via the selects, expect relabel + recolor + panel update
await p.evaluate(() => { const a=document.getElementById("selA"),bb=document.getElementById("selB");
  a.value="L24"; a.dispatchEvent(new Event("change"));
  bb.value="M26"; bb.dispatchEvent(new Event("change")); });
await wait(1500);
const after = await p.evaluate(() => ({
  legtitle: document.getElementById("legtitle").textContent,
  activeChip: document.querySelector("#pastilles .chip.on").textContent,
  panelArrow: (document.getElementById("info").innerText.match(/Réservoirs de voix · (\S+)/)||[])[1],
  panelHasReport: /Report LFI L24→M26/.test(document.getElementById("info").innerText),
}));
console.log("AFTER L24→M26:", JSON.stringify(after));
console.log("MAP fills (report L24→M26):", JSON.stringify(await mapColors()));

console.log("\nERRORS:", errs.length ? errs.join("\n") : "none");
await b.close();
