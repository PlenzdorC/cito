import { describe, expect, it } from 'vitest';
import { accentPalette, contrastRatio, ensureContrast, mix, normalizeHex, parseHex, toHex } from '../../src/core/color.js';

describe('color helpers', () => {
  it('parses and normalises hex colours', () => {
    expect(parseHex('#9D3E1A')).toEqual({ r: 157, g: 62, b: 26 });
    expect(parseHex('9d3e1a')).toEqual({ r: 157, g: 62, b: 26 });
    expect(parseHex('red')).toBeNull();
    expect(parseHex('#fff')).toBeNull();
    expect(parseHex(null)).toBeNull();
    expect(normalizeHex(' 9D3E1A ')).toBe('#9d3e1a');
    expect(toHex({ r: 300, g: -4, b: 15.6 })).toBe('#ff0010');
  });

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#9d3e1a', '#ffffff')).toBeGreaterThan(4.5);
    expect(contrastRatio('#d96b43', '#ffffff')).toBeLessThan(4.5);
  });

  it('mixes colours linearly', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#9d3e1a', '#9d3e1a', 0.7)).toBe('#9d3e1a');
  });

  it('darkens light accents until white text is readable', () => {
    const fixed = ensureContrast('#d96b43');
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast('#9d3e1a')).toBe('#9d3e1a');
  });

  it('derives an accessible partner palette', () => {
    const palette = accentPalette('#FFD400');
    expect(palette.accent).toBe('#ffd400');
    expect(contrastRatio(palette.primary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.primaryContainer, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(accentPalette('javascript:alert(1)')).toBeNull();
  });
});
