import { describe, expect, it } from 'vitest';
import { buildReturnUrl, parseOriginList, parseReturnUrl, returnHost } from '../../src/services/return-url.js';

const ORIGIN = 'https://konfigurator.example';

describe('parseReturnUrl', () => {
  const parse = (value, allowedOrigins = []) =>
    parseReturnUrl(`?partner=CITO-7729&return=${encodeURIComponent(value)}`, { origin: ORIGIN, allowedOrigins });

  it('accepts addresses on the configurator origin, also relative ones', () => {
    expect(parse('https://konfigurator.example/haeuser/?utm_source=x#modelle')).toBe('https://konfigurator.example/haeuser/?utm_source=x#modelle');
    expect(parse('/beispiele/seite.html')).toBe('https://konfigurator.example/beispiele/seite.html');
  });

  it('accepts released origins', () => {
    const allowed = ['https://www.citodomus.example'];
    expect(parse('https://www.citodomus.example/haus', allowed)).toBe('https://www.citodomus.example/haus');
    expect(parse('https://citodomus.example/haus', allowed)).toBeNull();
  });

  it.each([
    'https://evil.example/',
    '//evil.example/login',
    '/\\evil.example/login',
    'https://konfigurator.example.evil.example/',
    'https://konfigurator.example@evil.example/',
    'https://user:pw@konfigurator.example/',
    'http://konfigurator.example/',
    'javascript:alert(1)',
    ' java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('rejects %s (Open Redirect, Skripte, Zugangsdaten)', (value) => {
    expect(parse(value)).toBeNull();
  });

  it('ignores missing, overlong and malformed values', () => {
    expect(parseReturnUrl('', { origin: ORIGIN })).toBeNull();
    expect(parseReturnUrl(undefined, { origin: ORIGIN })).toBeNull();
    expect(parseReturnUrl('?return=', { origin: ORIGIN })).toBeNull();
    expect(parse(`/${'a'.repeat(2100)}`)).toBeNull();
    expect(parse('https://[::1')).toBeNull();
    expect(parseReturnUrl('?return=%2Fhaus', { origin: undefined })).toBeNull();
  });
});

describe('parseOriginList', () => {
  it('normalizes comma or space separated origins and drops invalid entries', () => {
    expect(parseOriginList('https://a.example/pfad, http://b.example:8080  ftp://c.example unsinn')).toEqual([
      'https://a.example',
      'http://b.example:8080',
    ]);
    expect(parseOriginList('')).toEqual([]);
    expect(parseOriginList(undefined)).toEqual([]);
  });
});

describe('buildReturnUrl', () => {
  const result = { config: 'm=one&fa=holz', configId: 'CTD-2026-4K9QX', total: 297250 };

  it('appends the configuration and keeps existing parameters and the anchor', () => {
    const url = new URL(buildReturnUrl('https://www.citodomus.example/haus?utm_source=x#ergebnis', result));
    expect(url.origin + url.pathname).toBe('https://www.citodomus.example/haus');
    expect(url.searchParams.get('utm_source')).toBe('x');
    expect(url.searchParams.get('config')).toBe('m=one&fa=holz');
    expect(url.searchParams.get('configId')).toBe('CTD-2026-4K9QX');
    expect(url.searchParams.get('total')).toBe('297250');
    expect(url.searchParams.has('lead')).toBe(false);
    expect(url.hash).toBe('#ergebnis');
  });

  it('adds the lead reference and replaces results of an earlier visit', () => {
    const url = new URL(
      buildReturnUrl('https://x.example/?config=m%3Dalpha&configId=ALT&lead=ALT', { ...result, lead: 'CTD-2026-4K9QX' }),
    );
    expect(url.searchParams.getAll('config')).toEqual(['m=one&fa=holz']);
    expect(url.searchParams.getAll('configId')).toEqual(['CTD-2026-4K9QX']);
    expect(url.searchParams.get('lead')).toBe('CTD-2026-4K9QX');
    expect(new URL(buildReturnUrl('https://x.example/?lead=ALT', result)).searchParams.has('lead')).toBe(false);
  });
});

describe('returnHost', () => {
  it('names the target without www and port', () => {
    expect(returnHost('https://www.citodomus.example/haus')).toBe('citodomus.example');
    expect(returnHost('http://localhost:5173/beispiele/')).toBe('localhost');
  });
});
