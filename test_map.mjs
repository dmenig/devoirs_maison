import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({executablePath:"/usr/bin/google-chrome",
  headless:"new", args:["--no-sandbox"]});
const p = await b.newPage();
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
p.on("console", m => { if (m.type()==="error") errs.push("CONSOLE: " + m.text()); });

await p.goto("http://localhost:8799/served_map_test.html", {waitUntil:"networkidle2", timeout:30000});
const wait = ms => new Promise(r=>setTimeout(r,ms));
await wait(2500);

// 1) France view: count colored vs grey region fills
const colorStats = async () => p.evaluate(() => {
  const out = {};
  document.querySelectorAll("path.leaflet-interactive").forEach(el => {
    const c = el.getAttribute("fill"); out[c] = (out[c]||0)+1;
  });
  return out;
});
console.log("FRANCE fills:", JSON.stringify(await colorStats()));

// 2) Drill to a commune via search (Villeurbanne 69266) and read the info panel
await p.evaluate(() => {
  const s = document.getElementById("search");
  s.value = "Villeurbanne · 69266";
  s.dispatchEvent(new Event("change"));
});
await wait(3000);
const panel = await p.evaluate(() => {
  const i = document.getElementById("info");
  return {visible: i.style.display, hasReservoir: /Insoumis à reconquérir/.test(i.innerHTML),
    over100: /(\d{3,})\s*%/.test(i.innerText), expBlocks: i.querySelectorAll(".exph").length,
    text: i.innerText.slice(0,600)};
});
console.log("PANEL visible:", panel.visible, "| expandable sections:", panel.expBlocks,
  "| reservoir line:", panel.hasReservoir, "| any value >100%:", panel.over100);
console.log("BV fills (commune subdivisions):", JSON.stringify(await colorStats()));
console.log("SUBTOGGLE display:", await p.evaluate(()=>getComputedStyle(document.getElementById("subtoggle")).display));

// 3) Toggle to IRIS
await p.evaluate(()=>document.querySelector('#subtoggle .chip[data-m="iris"]').click());
await wait(2500);
console.log("after IRIS toggle, active pastille:", await p.evaluate(()=>document.querySelector('#pastilles .chip.on')?.textContent));
console.log("IRIS fills:", JSON.stringify(await colorStats()));

console.log("\n--- PANEL TEXT ---\n" + panel.text);
console.log("\nERRORS:", errs.length ? errs.join("\n") : "none");
await b.close();
