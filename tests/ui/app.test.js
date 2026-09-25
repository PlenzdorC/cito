// @vitest-environment jsdom
import { render } from 'lit-html';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createActions } from '../../src/app/actions.js';
import { deriveView } from '../../src/core/derive.js';
import { createInitialState } from '../../src/core/state.js';
import { createStore } from '../../src/core/store.js';
import { appTemplate } from '../../src/ui/app.js';

const NB = ' ';
const euro = (value) => `${new Intl.NumberFormat('de-DE').format(value)}${NB}€`;

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

/** Rendert die App synchron bei jeder Zustandsänderung (statt requestAnimationFrame). */
function mountApp(initial = createInitialState()) {
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const store = createStore(initial);
  const deps = {
    viewer: () => null,
    storage: memoryStorage,
    setTimeout: vi.fn(),
    // Im Test wird synchron gerendert – der DOM ist beim Aufruf bereits aktuell.
    afterRender: (fn) => fn(),
    onStepChanged: vi.fn(),
    shareUrl: (hash) => `https://konfigurator.example/#${hash}`,
    copyToClipboard: vi.fn(async () => true),
    submitLead: vi.fn(async (payload) => ({ ok: true, demo: false, reference: `LEAD-${payload.configId}` })),
    scrollToSection: vi.fn(),
    focusElement: vi.fn(),
    focusFirstInvalid: vi.fn(),
    toggleFullscreen: vi.fn(),
    download: vi.fn(),
    logError: vi.fn(),
    printExpose: vi.fn(async () => {}),
  };
  const { actions } = createActions(store, deps);
  const draw = () => {
    const state = store.getState();
    render(appTemplate(state, deriveView(state), actions), container);
  };
  store.subscribe(draw);
  draw();
  const $ = (selector) => container.querySelector(selector);
  const $$ = (selector) => [...container.querySelectorAll(selector)];
  // Nur normale Leerräume zusammenfassen – geschützte Leerzeichen (NBSP) gehören zur Preisformatierung
  const total = () => $('#summary-bar').textContent.replace(/[ \t\r\n]+/g, ' ');
  return { container, store, actions, deps, $, $$, total };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Konfigurator-Oberfläche', () => {
  let app;
  beforeEach(() => {
    app = mountApp();
  });

  it('startet mit Schritt 1, Cito One und dem Katalogpreis', () => {
    expect(app.$('#panel-title').textContent).toContain('Haustyp & Modell');
    // Die Schrittnavigation existiert für Desktop und Mobil je einmal (per CSS umgeschaltet)
    expect(app.$('nav[aria-label="Konfigurationsschritte"]').querySelectorAll('button').length).toBe(5);
    expect(app.total()).toContain(euro(284900));
    expect(app.total()).toContain(`ab 1.042${NB}€`);
  });

  it('wechselt das Modell per Klick und passt Preis und Flächenregler an', () => {
    app.$('input[name="model"][value="grande"]').click();
    expect(app.store.getState().config.model).toBe('grande');
    expect(app.total()).toContain(euro(358000));
    const slider = app.$('#area-slider');
    expect(slider.max).toBe('210');
    slider.value = '200';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.total()).toContain(euro(358000 + 15 * 1850));
  });

  it('deaktiviert zu viele Zimmer für kleine Flächen und zweigeschossige Bungalows', () => {
    app.$('input[name="model"][value="alpha"]').click();
    const rooms = app.$$('input[name="rooms"]');
    expect(rooms.filter((r) => r.disabled)).toHaveLength(2);
    expect(app.$$('input[name="floors"]')[1].disabled).toBe(true);
    expect(app.$('#opt-accessible').disabled).toBe(true);
  });

  it('führt durch die Fassaden-Optionen inklusive Farbauswahl', () => {
    app.actions.nextStep();
    expect(app.$('#panel-title').textContent).toContain('Fassadengestaltung');
    app.$('input[name="facade"][value="holz"]').click();
    expect(app.$('fieldset legend').textContent).toContain('Holzton');
    app.$$('input[name="woodTone"]')[2].click();
    expect(app.store.getState().config.woodTone).toBe('silber');
    app.$('#opt-raffstore').click();
    expect(app.total()).toContain(euro(284900 + 4800 + 2900));
  });

  it('übernimmt eine Cito-Empfehlung mit einem Klick', () => {
    app.actions.goToStep(2);
    const apply = app.$$('button').find((b) => b.textContent.includes('Empfehlung übernehmen'));
    apply.click();
    expect(app.store.getState().config).toMatchObject({ frame: 'anthrazit', raffstore: true });
    expect(app.store.getState().toasts.at(-1).text).toContain('Cito-Empfehlung');
  });

  it('meldet, wenn das PV-Paket nicht mehr auf das Dach passt', () => {
    app.actions.goToStep(3);
    app.$('input[name="pv"][value="max"]').click();
    app.$('input[name="roof"][value="flach"]').click();
    const state = app.store.getState();
    expect(state.config.pv).not.toBe('max');
    expect(state.toasts.some((t) => t.text.includes('Module'))).toBe(true);
    expect(app.$('input[name="pv"][value="max"]').disabled).toBe(true);
    expect(app.$('.toast-region').textContent).toContain('PV-Paket');
  });

  it('zeigt Effizienzhaus 40 Plus, sobald Lüftung und Energiemanager gewählt sind', () => {
    app.actions.goToStep(4);
    expect(app.store.getState().view).toBe('interior');
    app.$('#opt-ventilation').click();
    app.$('#opt-smarthome').click();
    expect(app.$('#sec-komfort').textContent).toContain('Effizienzhaus 40 Plus');
  });

  it('prüft das Anfrageformular und sendet es mit Konfiguration', async () => {
    app.actions.requestOffer();
    expect(app.store.getState().step).toBe(5);
    expect(app.deps.focusElement).toHaveBeenCalledWith('lead-name');
    const form = app.$('#panel-bauherr form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(app.$('#lead-name').getAttribute('aria-invalid')).toBe('true');
    expect(app.deps.submitLead).not.toHaveBeenCalled();

    app.$('#lead-name').value = 'Markus Weber';
    app.$('#lead-phone').value = '+49 170 1234567';
    app.$('#lead-email').value = 'markus@beispiel.de';
    app.$('input[name="consent"]').checked = true;
    app.$('#panel-bauherr form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expect(app.deps.submitLead).toHaveBeenCalledTimes(1);
    const payload = app.deps.submitLead.mock.calls[0][0];
    expect(payload.contact).toMatchObject({ name: 'Markus Weber', email: 'markus@beispiel.de', consultation: 'video' });
    expect(payload.price.total).toBe(284900);
    expect(app.$('#panel-bauherr').textContent).toContain('Vielen Dank, Markus!');
  });

  it('schickt Bots eine Erfolgsmeldung, ohne etwas zu versenden', async () => {
    app.actions.goToStep(5);
    app.$('#lead-name').value = 'Spam Bot';
    app.$('#lead-phone').value = '+49 170 1234567';
    app.$('#lead-email').value = 'bot@spam.example';
    app.$('input[name="consent"]').checked = true;
    app.$('input[name="website"]').value = 'http://spam.example';
    app.$('#panel-bauherr form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expect(app.deps.submitLead).not.toHaveBeenCalled();
    expect(app.store.getState().lead.status).toBe('success');
  });

  it('zeigt Serverfehler verständlich an', async () => {
    app.deps.submitLead.mockRejectedValueOnce(new Error('Keine Verbindung zum Server.'));
    app.actions.goToStep(5);
    app.$('#lead-name').value = 'Markus Weber';
    app.$('#lead-phone').value = '+49 170 1234567';
    app.$('#lead-email').value = 'markus@beispiel.de';
    app.$('input[name="consent"]').checked = true;
    app.$('#panel-bauherr form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expect(app.$('#panel-bauherr [role="alert"]').textContent).toContain('Keine Verbindung');
  });

  it('erzeugt Embed-Code mit Partner-ID und kopiert ihn', async () => {
    app.actions.goToStep(5);
    app.actions.setOfferTab('partner');
    const partner = app.$('#embed-partner');
    partner.value = 'MAKLER-42';
    partner.dispatchEvent(new Event('input', { bubbles: true }));
    const code = app.$('#embed-code').value;
    expect(code).toContain('partner=MAKLER-42');
    expect(code).toContain('<iframe');
    app.$$('button').find((b) => b.textContent.includes('Code kopieren')).click();
    await flush();
    expect(app.deps.copyToClipboard).toHaveBeenCalledWith(code);
  });

  it('zeigt den Grundriss mit Geschossumschalter', () => {
    app.actions.setView('floorplan');
    const svg = app.$('#viewport svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toContain('Erdgeschoss');
    expect(app.$('#viewport').textContent).toContain('Wohnen · Essen · Kochen');
    const og = app.$$('#viewport button[aria-pressed]').find((b) => b.textContent.trim() === 'OG');
    expect(og.getAttribute('aria-label')).toBe('Obergeschoss');
    og.click();
    expect(og.getAttribute('aria-pressed')).toBe('true');
    expect(app.$('#viewport').textContent).toContain('Eltern');
    const exterior = app.$$('#viewport [aria-label="Ansicht"] button').find((b) => b.textContent.includes('3D Außen'));
    expect(exterior.disabled).toBe(true); // ohne 3D-Viewer (jsdom) nur Grundriss verfügbar
  });

  it('rendert Hotspots nur mit bereitem 3D-Viewer', () => {
    app.actions.goToStep(2);
    expect(app.$$('[data-anchor]')).toHaveLength(0);
    app.store.setState((s) => ({ ...s, viewerStatus: 'ready' }));
    expect(app.$$('[data-anchor]').map((h) => h.dataset.anchor)).toEqual(['facade', 'window', 'door']);
    app.$('[data-anchor="door"] button').click();
    expect(app.deps.scrollToSection).toHaveBeenCalledWith('sec-haustuer');
    expect(app.store.getState().highlight).toBe('sec-haustuer');
  });

  it('speichert, teilt und setzt mit Rückgängig-Option zurück', async () => {
    app.actions.setOptions({ facade: 'klinker' });
    app.actions.saveConfig();
    expect(app.store.getState().toasts.at(-1).text).toContain('gespeichert');
    expect(app.actions.shareUrl()).toBe('https://konfigurator.example/#m=one&fa=klinker&s=1');
    app.actions.resetConfig();
    expect(app.store.getState().config.facade).toBe('putz');
    const undo = app.store.getState().toasts.at(-1);
    app.actions.runToastAction(undo);
    expect(app.store.getState().config.facade).toBe('klinker');
  });

  it('exportiert das 3D-Modell nur mit Viewer und meldet Fehler', async () => {
    await app.actions.exportModel();
    expect(app.store.getState().toasts.at(-1).tone).toBe('error');
    app.deps.viewer = () => ({ exportGlb: async () => new Blob(['glb']) });
    await app.actions.exportModel();
    expect(app.deps.download).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^citodomus-CTD-\d{4}-[0-9A-Z]{5}\.glb$/));
    app.deps.printExpose.mockRejectedValueOnce(new Error('kaputt'));
    await app.actions.printExpose();
    expect(app.deps.logError).toHaveBeenCalled();
  });

  it('beschriftet alle Buttons und Bilder zugänglich', () => {
    [1, 2, 3, 4, 5].forEach((step) => {
      app.actions.goToStep(step);
      app.$$('button').forEach((button) => {
        const name = (button.getAttribute('aria-label') ?? button.textContent).trim();
        expect(name.length, button.outerHTML.slice(0, 120)).toBeGreaterThan(0);
      });
      app.$$('img').forEach((img) => expect(img.hasAttribute('alt')).toBe(true));
      app.$$('input:not([type="hidden"])').forEach((input) => {
        const labelled = input.closest('label') || input.id && app.$(`label[for="${input.id}"]`) || input.getAttribute('aria-label');
        expect(Boolean(labelled), input.outerHTML.slice(0, 120)).toBe(true);
      });
    });
  });
});
