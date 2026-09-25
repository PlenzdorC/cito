import '@fontsource-variable/plus-jakarta-sans';
import './styles/main.css';

import { render } from 'lit-html';
import { createActions } from './app/actions.js';
import {
  copyToClipboard,
  downloadBlob,
  focusElement,
  focusFirstInvalid,
  isWebGLAvailable,
  observeChromeHeights,
  prefersReducedMotion,
  safeLocalStorage,
  scrollToSection,
  toggleFullscreen,
} from './app/browser.js';
import { accentPalette } from './core/color.js';
import { deriveView } from './core/derive.js';
import { formatEuro } from './core/format.js';
import { decodeConfig, encodeConfig } from './core/serialize.js';
import * as S from './core/state.js';
import { createStore } from './core/store.js';
import { parseEmbedParams } from './services/embed.js';
import { submitLead } from './services/lead.js';
import { clearSavedConfiguration, loadSavedConfiguration } from './services/storage.js';
import { appTemplate } from './ui/app.js';
import { exposeTemplate } from './ui/print-expose.js';

const root = document.getElementById('app');
const printRoot = document.getElementById('print-root');
const announcer = document.getElementById('sr-announcer');

/* --- Startzustand: URL-Hash > gespeicherte Konfiguration > Standard ----------------------- */
const embedParams = parseEmbedParams(window.location.search);
const fromUrl = decodeConfig(window.location.hash);
const saved = fromUrl ? null : loadSavedConfiguration(safeLocalStorage());
const store = createStore(
  S.createInitialState({
    config: fromUrl?.config ?? saved?.config,
    step: fromUrl?.step ?? 1,
    partner: embedParams.partner,
    embed: embedParams.embed,
    accent: embedParams.accent ? embedParams.accent.toUpperCase() : null,
  }),
);

/* --- Partner-Theming per ?accent=RRGGBB ---------------------------------------------------- */
const palette = accentPalette(embedParams.accent);
if (palette) {
  const style = document.documentElement.style;
  style.setProperty('--color-primary', palette.primary);
  style.setProperty('--color-primary-container', palette.primaryContainer);
  style.setProperty('--color-primary-fixed', palette.primaryFixed);
  style.setProperty('--color-on-primary-fixed', palette.onPrimaryFixed);
  style.setProperty('--color-accent', palette.accent);
}

/* --- Viewer & Render-Schleife --------------------------------------------------------------- */
let viewer = null;
let frame = 0;
const afterRenderQueue = [];

const afterRender = (fn) => {
  afterRenderQueue.push(fn);
  scheduleRender();
};

const { actions, toast } = createActions(store, {
  viewer: () => viewer,
  storage: safeLocalStorage,
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  afterRender,
  onStepChanged: () => {
    document.getElementById('panel-body')?.scrollTo({ top: 0 });
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('panel-title')?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  },
  shareUrl: (hash) => `${window.location.origin}${window.location.pathname}${window.location.search}#${hash}`,
  copyToClipboard,
  submitLead: (payload) => submitLead(payload),
  scrollToSection,
  focusElement,
  focusFirstInvalid,
  toggleFullscreen: () => toggleFullscreen(document.getElementById('viewport')),
  download: downloadBlob,
  logError: (error) => console.error('[Konfigurator]', error),
  printExpose,
});

function syncDialogs(state) {
  [
    ['cito-dialog', 'cito'],
    ['share-dialog', 'share'],
  ].forEach(([id, name]) => {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (state.dialog === name && !dialog.open) dialog.showModal();
    if (state.dialog !== name && dialog.open) dialog.close();
  });
}

let lastHash = '';
function syncUrl(state) {
  const hash = encodeConfig(state.config, { step: state.step });
  if (hash === lastHash) return;
  lastHash = hash;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hash}`);
}

let announceTimer = 0;
let lastTotal = null;
function announceTotal(total) {
  if (total === lastTotal) return;
  const first = lastTotal === null;
  lastTotal = total;
  if (first) return;
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    announcer.textContent = `Gesamtpreis ${formatEuro(total)}`;
  }, 900);
}

function renderNow() {
  frame = 0;
  const state = store.getState();
  const derived = deriveView(state);
  render(appTemplate(state, derived, actions), root);
  syncDialogs(state);
  syncUrl(state);
  announceTotal(derived.breakdown.total);
  viewer?.update(state, derived);
  afterRenderQueue.splice(0).forEach((fn) => fn());
}

function scheduleRender() {
  if (!frame) frame = window.requestAnimationFrame(renderNow);
}

store.subscribe(scheduleRender);

/* --- Exposé-Druck ------------------------------------------------------------------------- */
async function printExpose() {
  const state = store.getState();
  const image = viewer ? await viewer.snapshot({ width: 1600, height: 900 }) : null;
  render(exposeTemplate(state, deriveView(state), { image, createdAt: new Date() }), printRoot);
  const img = printRoot.querySelector('img');
  if (img?.decode) await img.decode().catch(() => {});
  window.print();
}

/* --- 3D-Viewer nachladen (Code-Splitting: UI ist sofort bedienbar) -------------------------- */
async function startViewer() {
  if (!isWebGLAvailable()) {
    store.setState((s) => S.setViewerStatus(s, 'unsupported'));
    return;
  }
  try {
    const { createViewer } = await import('./scene/viewer.js');
    const host = document.getElementById('viewport-canvas');
    viewer = createViewer(host, {
      reducedMotion: prefersReducedMotion(),
      onInteract: actions.markInteracted,
      hotspotLayer: () => document.getElementById('hotspot-layer'),
    });
    store.setState((s) => S.setViewerStatus(s, 'ready'));
    renderNow();
  } catch (error) {
    console.error('[Konfigurator] 3D-Viewer konnte nicht gestartet werden', error);
    store.setState((s) => S.setViewerStatus(s, 'error'));
  }
}

/* --- Start ------------------------------------------------------------------------------- */
root.replaceChildren(); // Boot-Platzhalter entfernen – lit-html hängt sonst nur an
renderNow();
observeChromeHeights();
document.addEventListener('fullscreenchange', () => store.setState((s) => S.setFullscreen(s, Boolean(document.fullscreenElement))));
window.addEventListener('hashchange', () => {
  const decoded = decodeConfig(window.location.hash);
  if (decoded && encodeConfig(decoded.config, { step: decoded.step ?? undefined }) !== lastHash) {
    store.setState((s) => S.goToStep(S.loadConfiguration(s, decoded.config), decoded.step ?? s.step));
  }
});
if (saved) {
  toast('info', 'Deine gespeicherte Konfiguration wurde geladen.', {
    label: 'Neu beginnen',
    run: () => {
      clearSavedConfiguration(safeLocalStorage());
      store.setState(S.resetConfiguration);
    },
  });
}
startViewer();

// Nur im Entwicklungsmodus: Zugriff für Debugging und manuelle Tests in der Browser-Konsole
if (import.meta.env.DEV) window.__citodomus = { store, actions, viewer: () => viewer };
