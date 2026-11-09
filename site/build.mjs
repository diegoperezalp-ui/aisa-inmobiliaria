import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(siteDirectory, "dist");
const siteFiles = [
  "index.html",
  "compra.html",
  "renta.html",
  "venta.html",
  "favoritos.html",
  "propiedad.html",
  "agenda.html",
  "robots.txt",
  "sitemap.xml",
  "assets",
  "css",
  "js",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of siteFiles) {
  await cp(path.join(siteDirectory, file), path.join(outputDirectory, file), {
    recursive: true,
  });
}