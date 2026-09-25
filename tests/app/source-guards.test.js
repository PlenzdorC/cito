import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Statische Prüfungen auf Muster, die im Quellcode nicht vorkommen dürfen. */

const SRC = join(import.meta.dirname, '..', '..', 'src');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.js') ? [path] : [];
  });
}

const sources = files(SRC).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const FORBIDDEN = [
  // Vite ersetzt nur import.meta.env.X statisch – mit ?. bleibt der Wert im Build leer
  { pattern: /import\.meta\.env\?\./, reason: 'import.meta.env?. wird im Build nicht ersetzt' },
  { pattern: /\binnerHTML\s*=|unsafeHTML|insertAdjacentHTML|document\.write/, reason: 'HTML-Injektion vermeiden' },
  { pattern: /\beval\(|new Function\(/, reason: 'kein eval' },
  { pattern: /console\.log\(/, reason: 'kein console.log im Produktionscode' },
];

describe('source guards', () => {
  it.each(FORBIDDEN)('$reason', ({ pattern }) => {
    const offenders = sources.filter(({ text }) => pattern.test(text)).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('keeps modules below the 800-line maximum', () => {
    const large = sources
      .filter(({ path }) => !path.endsWith('icon-paths.js'))
      .filter(({ text }) => text.split('\n').length > 800)
      .map(({ path }) => path);
    expect(large).toEqual([]);
  });
});
