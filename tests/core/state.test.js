import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';
import {
  DEFAULT_SUN,
  SUN_MAX,
  createInitialState,
  goToStep,
  loadConfiguration,
  resetConfiguration,
  selectModel,
  setEquity,
  setLead,
  setOfferTab,
  setOptions,
  setPlanLevel,
  setSunTime,
  setView,
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
    expect(setLead(initial, { status: 'sending' }).lead).toEqual({ status: 'sending', error: null, reference: null });
    const loaded = loadConfiguration(initial, { ...createDefaultConfig('grande') });
    expect(loaded.config.model).toBe('grande');
    const reset = resetConfiguration(goToStep(setOptions(initial, { facade: 'holz' }), 5));
    expect(reset).toMatchObject({ step: 1, maxStep: 1, view: 'exterior' });
    expect(reset.config.facade).toBe('putz');
  });
});
