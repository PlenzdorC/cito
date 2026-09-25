#!/usr/bin/env node
/**
 * Sammelt alle im Quellcode verwendeten Material-Symbols (icon('name') bzw. icon: 'name')
 * und schreibt deren SVG-Pfade nach src/ui/icon-paths.js.
 * Endet ein Name auf „_fill“, wird die gefüllte Variante verwendet.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const iconDir = join(root, 'node_modules', '@material-symbols', 'svg-400', 'outlined');
const outFile = join(srcDir, 'ui', 'icon-paths.js');

const PATTERNS = [/icon\(\s*'([a-z0-9_]+)'/g, /icon:\s*'([a-z0-9_]+)'/g];
/** Fallback-Icon für unbekannte Namen. */
const ALWAYS = ['help'];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.js') && path !== outFile ? [path] : [];
  });
}

const names = new Set(ALWAYS);
for (const file of sourceFiles(srcDir)) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) names.add(match[1]);
  }
}

const missing = [];
const entries = [...names].sort().map((name) => {
  const fileName = name.endsWith('_fill') ? `${name.slice(0, -5)}-fill.svg` : `${name}.svg`;
  try {
    const svg = readFileSync(join(iconDir, fileName), 'utf8');
    const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
    return `  ${name}: ${JSON.stringify(paths)},`;
  } catch {
    missing.push(name);
    return null;
  }
});

const header = `// Automatisch erzeugt von ${relative(root, fileURLToPath(import.meta.url)).replace(/\\/g, '/')} – nicht manuell bearbeiten.\n// Quelle: @material-symbols/svg-400 (Apache-2.0), Stil „outlined“.\n`;
writeFileSync(outFile, `${header}export const ICON_PATHS = {\n${entries.filter(Boolean).join('\n')}\n};\n`);

console.log(`icons: ${names.size - missing.length} Icons nach ${relative(root, outFile)} geschrieben.`);
if (missing.length) {
  console.error(`icons: Nicht gefunden: ${missing.join(', ')}`);
  process.exitCode = 1;
}
