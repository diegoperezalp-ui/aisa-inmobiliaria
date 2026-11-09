import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const [inputPath, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
if (!inputPath) {
  console.error('Uso: npm run import:properties -- <archivo.json> [--apply]');
  process.exit(2);
}
const baseUrl = (process.env.AISA_API_BASE_URL || 'https://aisa-inmobiliaria-api.onrender.com/api').replace(/\/+$/, '');
const token = process.env.AISA_ADMIN_TOKEN;
if (!token) {
  console.error('Falta AISA_ADMIN_TOKEN. Inicia sesión como administrador y configura el token solo en la terminal local; no lo guardes en archivos del proyecto ni en Copilot Chat.');
  process.exit(2);
}
const absolutePath = path.resolve(inputPath);
const input = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
if (!Array.isArray(input.properties)) throw new Error('El JSON debe incluir un arreglo properties.');
const response = await fetch(`${baseUrl}/properties/import`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...input, ...(apply ? { apply: true } : {}) }),
  signal: AbortSignal.timeout(30000)
});
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.success) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
if (result.dryRun) console.log('\nVista previa solamente. Después de revisar, usa --apply para guardar.');
