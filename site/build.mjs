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
  "appraisals.html",
  "robots.txt",
  "sitemap.xml",
  "assets",
  "css",
  "js",
];

try {
  await rm(outputDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
} catch {
  // Windows file locks (e.g. OneDrive) can briefly prevent deleting the root dir; proceed with overwriting
}
await mkdir(outputDirectory, { recursive: true });

for (const file of siteFiles) {
  await cp(path.join(siteDirectory, file), path.join(outputDirectory, file), {
    recursive: true,
    force: true,
  });
}
console.log("Site build completed successfully into dist/");
