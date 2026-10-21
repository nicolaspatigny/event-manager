import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "../frontend/node_modules/playwright/index.mjs";
import { marked } from "../docs/tools/node_modules/marked/lib/marked.esm.js";
const root = fileURLToPath(new URL("../docs", import.meta.url));
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
    : {},
);
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({
  path: path.join(root, "tools/node_modules/mermaid/dist/mermaid.min.js"),
});
await page.evaluate(() =>
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
  }),
);
await fs.mkdir(root + "/diagrams", { recursive: true });
let sections = [];
let count = 0;
const files = [
  "ANALYSIS",
  "DESIGN",
  "WIREFRAMES",
  "PROJECT",
  "API",
  "SECURITY",
  "TESTS",
  "EVIDENCE",
  "DEPLOYMENT",
  "ASSESSMENT",
];
for (const file of files) {
  let text = await fs.readFile(root + "/" + file + ".md", "utf8");
  for (const match of [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)]) {
    const id = "diagram" + ++count;
    const svg = await page.evaluate(
      async ({ id, source }) => (await mermaid.render(id, source)).svg,
      { id, source: match[1] },
    );
    await fs.writeFile(root + "/diagrams/" + id + ".svg", svg);
    text = text.replace(match[0], svg);
  }
  sections.push(
    '<section id="' + file + '">' + (await marked.parse(text)) + "</section>",
  );
}
const css = `body{font:14px/1.6 Arial,sans-serif;color:#243b31;max-width:1020px;margin:auto;padding:40px}h1,h2,h3{line-height:1.2}h1{font:34px Georgia,serif;margin:35px 0 20px}h2{font-size:22px;margin-top:30px}h3{font-size:17px}table{border-collapse:collapse;width:100%;font-size:11px;table-layout:auto}th,td{padding:8px;border:1px solid #d7dcd3;vertical-align:top;overflow-wrap:anywhere}th{background:#e9eddf;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10px;background:#f4f3ed;padding:15px}code{font-size:.9em}a{color:#28593d}svg{max-width:100%;height:auto;display:block;margin:20px auto}section{margin-top:50px}img{max-width:100%}nav a{display:block}header{padding:50px 0;border-bottom:3px solid #28593d}small{color:#666}@media print{body{padding:0;font-size:11px;max-width:none}section{break-before:page}h1,h2,h3{break-after:avoid}tr{break-inside:avoid}svg{max-height:230mm}a{color:inherit;text-decoration:none}pre{font-size:9px}img{max-height:230mm;object-fit:contain;display:block;margin:15px auto}}`;
const html =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Dossier technique CDA — Rassemble</title><style>' +
  css +
  "</style></head><body><header><p>PROJET CDA · REMPLACEMENT DE STAGE</p><h1>Rassemble</h1><h2>Dossier technique et preuves</h2><p>Nicolas Patigny · ENI</p><p>Angular · Spring Boot · MongoDB</p><small>Livraison technique du 21 octobre 2026. Contexte personnel, validation pédagogique et analyse personnelle à compléter honnêtement avant remise.</small></header><nav><h2>Sommaire</h2>" +
  files.map((f) => '<a href="#' + f + '">' + f + "</a>").join("") +
  "</nav>" +
  sections.join("\n") +
  "</body></html>";
await fs.writeFile(root + "/DOSSIER.html", html);
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const target = path.resolve(root, "." + relative);
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const types = {
      ".html": "text/html; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };
    res.setHeader(
      "Content-Type",
      types[path.extname(target)] || "application/octet-stream",
    );
    res.end(await fs.readFile(target));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.unref();
await page.goto("http://127.0.0.1:" + server.address().port + "/DOSSIER.html", {
  waitUntil: "networkidle",
});
if (
  await page
    .locator("img")
    .evaluateAll((images) =>
      images.some((image) => !image.complete || image.naturalWidth === 0),
    )
)
  throw Error("A dossier image did not load");
await page.pdf({
  path: root + "/DOSSIER.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="font-size:8px;margin:auto;color:#777">Rassemble · Dossier technique CDA — <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
server.close();
console.log("Rendered " + count + " diagrams and dossier HTML/PDF");
