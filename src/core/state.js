import { applyModel, createDefaultConfig, updateConfig } from './config.js';
import { maxEquity, priceBreakdown } from './pricing.js';

/** Standardansicht je Schritt: in Schritt 4 zeigt der Viewport den Innenraum. */
export const STEP_VIEWS = Object.freeze({ 1: 'exterior', 2: 'exterior', 3: 'exterior', 4: 'interior', 5: 'exterior' });
export const VIEWS = Object.freeze(['exterior', 'floorplan', 'section', 'interior']);
export const SUN_MIN = 6;
export const SUN_MAX = 21;
/** Nachmittagssonne aus Südwest: schönes Streiflicht auf der Gartenfassade. */
export const DEFAULT_SUN = 15;

const initialLead = () => ({ status: 'idle', errors: {}, error: null, reference: null, demo: false });

/** `returnTo`: geprüfte Adresse der aufrufenden Seite (?return=…) oder null. */
export function createInitialState({ config = createDefaultConfig(), step = 1, partner = null, embed = false, accent = null, returnTo = null } = {}) {
  return {
    config,
    step,
    maxStep: step,
    view: STEP_VIEWS[step],
    planLevel: 0,
    lighting: 'day',
    sunTime: DEFAULT_SUN,
    equity: 0,
    notices: [],
    noticeSeq: 0,
    partner,
    embed,
    returnTo,
    offerTab: 'bauherr',
    lead: initialLead(),
    embedForm: {
      partner: partner ?? 'CITO-PARTNER-7729',
      accent: accent ?? '#9D3E1A',
      width: '100%',
      height: '780px',
      includeConfig: true,
    },
    dialog: null,
    highlight: null,
    toasts: [],
    toastSeq: 0,
    viewerStatus: 'loading',
    fullscreen: false,
    interacted: false,
  };
}

export const markInteracted = (state) => (state.interacted ? state : { ...state, interacted: true });

/** Status des 3D-Viewers: loading | ready | unsupported | error. Ohne WebGL bleibt der 2D-Grundriss. */
export function setViewerStatus(state, viewerStatus) {
  if (viewerStatus === state.viewerStatus) return state;
  const fallback = viewerStatus === 'unsupported' || viewerStatus === 'error';
  return { ...state, viewerStatus, view: fallback ? 'floorplan' : state.view };
}

export const setFullscreen = (state, fullscreen) => (fullscreen === state.fullscreen ? state : { ...state, fullscreen });

/** Eigenkapital darf nach Preisänderungen nie über dem neuen Maximum liegen. */
const clampEquity = (equity, config) => Math.min(equity, maxEquity(priceBreakdown(config).total));

function withConfig(state, { config, notices }) {
  return {
    ...state,
    config,
    equity: clampEquity(state.equity, config),
    notices,
    noticeSeq: notices.length > 0 ? state.noticeSeq + 1 : state.noticeSeq,
  };
}

export const selectModel = (state, modelId) => withConfig(state, applyModel(state.config, modelId));

export const setOptions = (state, patch) => withConfig(state, updateConfig(state.config, patch));

export function goToStep(state, step) {
  const target = Math.min(5, Math.max(1, Math.round(step)));
  if (target === state.step) return state;
  return { ...state, step: target, maxStep: Math.max(state.maxStep, target), view: STEP_VIEWS[target] };
}

export const setView = (state, view) => (VIEWS.includes(view) && view !== state.view ? { ...state, view } : state);

export const setPlanLevel = (state, level) => (level === state.planLevel ? state : { ...state, planLevel: level });

export const toggleLighting = (state) => ({ ...state, lighting: state.lighting === 'day' ? 'night' : 'day' });

export function setSunTime(state, hour) {
  const sunTime = Math.min(SUN_MAX, Math.max(SUN_MIN, Number(hour)));
  return Number.isFinite(sunTime) ? { ...state, sunTime } : state;
}

/** Eigenkapital zwischen 0 und dem maximalen Anteil am Gesamtpreis. */
export function setEquity(state, equity, total) {
  const value = Math.min(maxEquity(total), Math.max(0, Math.round(Number(equity) || 0)));
  return value === state.equity ? state : { ...state, equity: value };
}

export const setOfferTab = (state, tab) => (tab === state.offerTab ? state : { ...state, offerTab: tab });

export const setLead = (state, lead) => ({ ...state, lead: { ...state.lead, ...lead } });

export const setEmbedForm = (state, patch) => ({ ...state, embedForm: { ...state.embedForm, ...patch } });

export const setDialog = (state, dialog) => (dialog === state.dialog ? state : { ...state, dialog });

export const setHighlight = (state, highlight) => (highlight === state.highlight ? state : { ...state, highlight });

const MAX_TOASTS = 3;

export function pushToast(state, { tone = 'info', text, action = null }) {
  const id = state.toastSeq + 1;
  const toasts = [...state.toasts.filter((t) => t.text !== text), { id, tone, text, action }].slice(-MAX_TOASTS);
  return { ...state, toasts, toastSeq: id };
}

export const dismissToast = (state, id) =>
  state.toasts.some((t) => t.id === id) ? { ...state, toasts: state.toasts.filter((t) => t.id !== id) } : state;

export function resetConfiguration(state) {
  return {
    ...state,
    config: createDefaultConfig(),
    step: 1,
    maxStep: 1,
    view: STEP_VIEWS[1],
    equity: 0,
    notices: [],
    lead: initialLead(),
  };
}

export const loadConfiguration = (state, config) => ({ ...state, config, equity: clampEquity(state.equity, config), notices: [] });
