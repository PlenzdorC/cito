// @vitest-environment jsdom
import { render } from 'lit-html';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { deriveView } from '../../src/core/derive.js';
import { createInitialState } from '../../src/core/state.js';
import { exposeTemplate } from '../../src/ui/print-expose.js';

describe('Exposé', () => {
  function renderExpose(config, image = 'data:image/jpeg;base64,AAAA') {
    const state = { ...createInitialState(), config };
    const derived = deriveView(state);
    const container = document.createElement('div');
    render(exposeTemplate(state, derived, { image, createdAt: new Date('2026-09-25T12:00:00Z') }), container);
    return { container, derived, text: container.textContent.replace(/\s+/g, ' ') };
  }

  it('fasst Konfiguration, Preis, Grundrisse und Fahrplan zusammen', () => {
    const { container, derived, text } = renderExpose({ ...createDefaultConfig(), facade: 'holz', pv: 'plus' });
    expect(text).toContain(`Exposé ${derived.configId}`);
    expect(text).toContain('25. September 2026');
    expect(text).toContain('Familien-Stadthaus Cito One');
    expect(text).toContain('Rhombusschalung Holz');
    expect(text).toContain('Festpreis gesamt');
    expect(text).toContain('Woche 24');
    expect(container.querySelectorAll('figure')).toHaveLength(2);
    expect(container.querySelector('img').getAttribute('alt')).toContain('3D-Ansicht');
  });

  it('zeigt beim Bungalow nur einen Grundriss und kommt ohne Bild aus', () => {
    const { container, text } = renderExpose(createDefaultConfig('alpha'), null);
    expect(container.querySelectorAll('figure')).toHaveLength(1);
    expect(container.querySelector('img')).toBeNull();
    expect(text).toContain('eingeschossig');
  });
});
