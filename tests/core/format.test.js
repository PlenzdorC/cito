import { describe, expect, it } from 'vitest';
import {
  formatArea,
  formatClock,
  formatDelta,
  formatEuro,
  formatKwh,
  formatMeters,
  formatMonthly,
  formatNumber,
  formatPercent,
} from '../../src/core/format.js';

const NB = ' ';

describe('format', () => {
  it('formats euro amounts the German way', () => {
    expect(formatEuro(284900)).toBe(`284.900${NB}€`);
    expect(formatEuro(1041.6)).toBe(`1.042${NB}€`);
  });

  it('formats price deltas for option cards', () => {
    expect(formatDelta(0)).toBe('Inklusive');
    expect(formatDelta(0, { includedLabel: 'Im Grundpreis' })).toBe('Im Grundpreis');
    expect(formatDelta(4800)).toBe(`+${NB}4.800${NB}€`);
    expect(formatDelta(-27750)).toBe(`−${NB}27.750${NB}€`);
  });

  it('formats units', () => {
    expect(formatArea(145)).toBe(`145${NB}m²`);
    expect(formatArea(72.46, 1)).toBe(`72,5${NB}m²`);
    expect(formatMeters(10.974)).toBe(`10,97${NB}m`);
    expect(formatPercent(0.644)).toBe(`64${NB}%`);
    expect(formatKwh(54.8, 1)).toBe(`54,8${NB}kWh`);
    expect(formatMonthly(1042)).toBe(`1.042${NB}€${NB}/${NB}Mt.`);
    expect(formatNumber(12000)).toBe('12.000');
    expect(formatNumber(7.456, 2)).toBe('7,46');
  });

  it('formats clock times from decimal hours', () => {
    expect(formatClock(13.5)).toBe('13:30');
    expect(formatClock(8)).toBe('08:00');
    expect(formatClock(19.75)).toBe('19:45');
  });
});
