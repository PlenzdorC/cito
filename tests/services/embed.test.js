import { describe, expect, it } from 'vitest';
import {
  buildEmbedSnippet,
  buildEmbedUrl,
  currentBaseUrl,
  isValidPartnerId,
  parseEmbedParams,
  validateEmbedOptions,
} from '../../src/services/embed.js';

describe('parseEmbedParams', () => {
  it('reads valid partner parameters', () => {
    expect(parseEmbedParams('?embed=1&partner=CITO-PARTNER-7729&accent=9D3E1A')).toEqual({
      embed: true,
      partner: 'CITO-PARTNER-7729',
      accent: '#9d3e1a',
    });
  });

  it('drops invalid or malicious values', () => {
    expect(parseEmbedParams('?partner=<script>&accent=red;background:url(x)')).toEqual({
      embed: false,
      partner: null,
      accent: null,
    });
    expect(parseEmbedParams(undefined)).toEqual({ embed: false, partner: null, accent: null });
  });
});

describe('embed code', () => {
  it('validates the generator form', () => {
    expect(validateEmbedOptions({ partner: 'CITO-7729', accent: '#9D3E1A', width: '100%', height: '780px' }).valid).toBe(true);
    const { errors } = validateEmbedOptions({ partner: 'x', accent: 'blau', width: '100vw', height: '300px' });
    expect(Object.keys(errors).sort()).toEqual(['accent', 'height', 'partner', 'width']);
    expect(isValidPartnerId('A'.repeat(41))).toBe(false);
  });

  it('builds the iframe URL with partner, accent and configuration', () => {
    const url = buildEmbedUrl({
      baseUrl: 'https://citodomus.example/konfigurator/?old=1',
      partner: 'CITO-7729',
      accent: '#9d3e1a',
      configHash: 'm=one&fa=holz',
    });
    expect(url).toBe('https://citodomus.example/konfigurator/?embed=1&partner=CITO-7729&accent=9D3E1A#m=one&fa=holz');
  });

  it('skips invalid partner data in the URL', () => {
    expect(buildEmbedUrl({ baseUrl: 'https://x.example/', partner: '<b>', accent: 'nope' })).toBe('https://x.example/?embed=1');
  });

  it('escapes attributes and falls back to safe sizes', () => {
    const snippet = buildEmbedSnippet({ url: 'https://x.example/?a="><script>', width: '100%" onload="x', height: '99' });
    expect(snippet).toContain('src="https://x.example/?a=&quot;&gt;&lt;script&gt;"');
    expect(snippet).toContain('width="100%"');
    expect(snippet).toContain('height="780px"');
    expect(snippet).not.toContain('onload');
  });

  it('derives the base URL from a location', () => {
    expect(currentBaseUrl({ origin: 'https://a.example', pathname: '/k/' })).toBe('https://a.example/k/');
    expect(currentBaseUrl(null)).toBe('');
  });
});
