import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';
import {
  DEFAULT_SUN,
  SUN_MAX,
  createInitialState,
  dismissToast,
  goToStep,
  loadConfiguration,
  markInteracted,
  pushToast,
  resetConfiguration,
  selectModel,
  setDialog,
  setEmbedForm,
  setEquity,
  setFullscreen,
  setHighlight,
  setLead,
  setOfferTab,
  setOptions,
  setPlanLevel,
  setSunTime,
  setView,
  setViewerStatus,
  toggleLighting,
} from '../../src/core/state.js';
import { createDefaultConfig } from '../../src/core/config.js';

describe('createStore', () => {
  it('notifies subscribers with next and previous state', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setState((s) => ({ ...s, count: s.count + 1 }));
    expect(store.getState().count).toBe(1);
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
    unsubscribe();
    store.setState({ count: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('skips notifications when the updater returns the same state', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((s) => s);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('state transitions', () => {
  const initial = createInitialState();

  it('starts on step 1 with the exterior view', () => {
    expect(initial).toMatchObject({ step: 1, maxStep: 1, view: 'exterior', lighting: 'day', sunTime: DEFAULT_SUN });
  });

  it('navigates steps, tracks progress and switches to the interior in step 4', () => {
    const s4 = goToStep(initial, 4);
    expect(s4).toMatchObject({ step: 4, maxStep: 4, view: 'interior' });
    expect(goToStep(s4, 2)).toMatchObject({ step: 2, maxStep: 4, view: 'exterior' });
    expect(goToStep(initial, 9).step).toBe(5);
    expect(goToStep(initial, 1)).toBe(initial);
  });

  it('applies options immutably and counts notices', () => {
    const next = setOptions(initial, { facade: 'holz' });
    expect(next.config.facade).toBe('holz');
    expect(initial.config.facade).toBe('putz');
    const warned = setOptions({ ...initial, config: { ...initial.config, pv: 'max' } }, { roof: 'flach' });
    expect(warned.noticeSeq).toBe(1);
    expect(warned.notices[0].id).toBe('pv');
  });

  it('switches models', () => {
    expect(selectModel(initial, 'alpha').config).toMatchObject({ model: 'alpha', floors: 1 });
  });

  it('validates views, sun time and equity', () => {
    expect(setView(initial, 'floorplan').view).toBe('floorplan');
    expect(setView(initial, 'kino')).toBe(initial);
    expect(setPlanLevel(initial, 1).planLevel).toBe(1);
    expect(setPlanLevel(initial, 0)).toBe(initial);
    expect(toggleLighting(initial).lighting).toBe('night');
    expect(setSunTime(initial, 99).sunTime).toBe(SUN_MAX);
    expect(setSunTime(initial, 'abc')).toBe(initial);
    expect(setEquity(initial, 500000, 284900).equity).toBe(110000);
    expect(setEquity(initial, -10, 284900)).toBe(initial);
    expect(setEquity(initial, 25000, 284900).equity).toBe(25000);
  });

  it('manages offer tab, lead status, loading and reset', () => {
    expect(setOfferTab(initial, 'partner').offerTab).toBe('partner');
    expect(setOfferTab(initial, 'bauherr')).toBe(initial);
    expect(setLead(initial, { status: 'sending' }).lead).toEqual({
      status: 'sending',
      errors: {},
      error: null,
      reference: null,
      demo: false,
    });
    const loaded = loadConfiguration(initial, { ...createDefaultConfig('grande') });
    expect(loaded.config.model).toBe('grande');
    const reset = resetConfiguration(goToStep(setOptions(initial, { facade: 'holz' }), 5));
    expect(reset).toMatchObject({ step: 1, maxStep: 1, view: 'exterior' });
    expect(reset.config.facade).toBe('putz');
  });

  it('prefills the embed form with partner data from the URL', () => {
    const partnerState = createInitialState({ partner: 'MAKLER-42', accent: '#FFD400', embed: true });
    expect(partnerState.embedForm).toMatchObject({ partner: 'MAKLER-42', accent: '#FFD400' });
    expect(initial.embedForm.partner).toBe('CITO-PARTNER-7729');
    expect(setEmbedForm(initial, { width: '1200px' }).embedForm).toMatchObject({ width: '1200px', height: '780px' });
  });

  it('opens dialogs, highlights sections and tracks interaction', () => {
    expect(setDialog(initial, 'cito').dialog).toBe('cito');
    expect(setDialog(initial, null)).toBe(initial);
    expect(setHighlight(initial, 'sec-pv').highlight).toBe('sec-pv');
    expect(setHighlight(initial, null)).toBe(initial);
    const touched = markInteracted(initial);
    expect(touched.interacted).toBe(true);
    expect(markInteracted(touched)).toBe(touched);
    expect(setFullscreen(initial, true).fullscreen).toBe(true);
    expect(setFullscreen(initial, false)).toBe(initial);
  });

  it('keeps at most three distinct toasts and dismisses them by id', () => {
    let s = initial;
    ['a', 'b', 'c', 'd'].forEach((text) => {
      s = pushToast(s, { text });
    });
    expect(s.toasts.map((t) => t.text)).toEqual(['b', 'c', 'd']);
    s = pushToast(s, { text: 'c', tone: 'warn' });
    expect(s.toasts.map((t) => t.text)).toEqual(['b', 'd', 'c']);
    const last = s.toasts.at(-1);
    expect(last).toMatchObject({ tone: 'warn', action: null });
    expect(dismissToast(s, last.id).toasts).toHaveLength(2);
    expect(dismissToast(s, 999)).toBe(s);
  });

  it('re-clamps equity when the price drops below the previous maximum', () => {
    const grande = selectModel(initial, 'grande');
    const rich = setEquity(grande, 140000, 358000);
    expect(rich.equity).toBe(140000);
    const cheaper = selectModel(rich, 'alpha');
    expect(cheaper.equity).toBe(95000); // 40 % von 239.000 € auf 5.000 € abgerundet
    expect(setOptions(cheaper, { facade: 'holz' }).equity).toBe(95000);
    expect(loadConfiguration(rich, { ...createDefaultConfig('alpha') }).equity).toBe(95000);
  });

  it('falls back to the floor plan when 3D is unavailable', () => {
    expect(setViewerStatus(initial, 'ready')).toMatchObject({ viewerStatus: 'ready', view: 'exterior' });
    expect(setViewerStatus(initial, 'unsupported')).toMatchObject({ viewerStatus: 'unsupported', view: 'floorplan' });
    expect(setViewerStatus(initial, 'error').view).toBe('floorplan');
    expect(setViewerStatus(initial, 'loading')).toBe(initial);
  });
});
