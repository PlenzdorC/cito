// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
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
} from '../../src/app/browser.js';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('browser helpers', () => {
  it('copies via the async clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('falls back to execCommand when the clipboard API is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true);
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported');
    });
    await expect(copyToClipboard('abc')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('downloads blobs through a temporary link', () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['x']), 'haus.glb');
    expect(click).toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
  });

  it('detects missing WebGL support', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(isWebGLAvailable()).toBe(false);
  });

  it('reads the reduced-motion preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('focuses and scrolls to elements', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    document.body.innerHTML = '<form><input id="a" aria-invalid="true"></form><section id="s"></section>';
    Element.prototype.scrollIntoView = vi.fn();
    focusElement('a');
    expect(document.activeElement.id).toBe('a');
    focusElement('missing');
    document.activeElement.blur();
    focusFirstInvalid(document.querySelector('form'));
    expect(document.activeElement.id).toBe('a');
    focusFirstInvalid(null);
    scrollToSection('s');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('toggles fullscreen safely', () => {
    const element = document.createElement('div');
    element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    toggleFullscreen(element);
    expect(element.requestFullscreen).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true });
    document.exitFullscreen = vi.fn();
    toggleFullscreen(element);
    expect(document.exitFullscreen).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  });

  it('publishes header and summary heights as CSS variables', () => {
    let callback;
    window.ResizeObserver = class {
      constructor(cb) {
        callback = cb;
      }
      observe() {}
    };
    document.body.innerHTML = '<header id="app-header"></header><footer id="summary-bar"></footer>';
    observeChromeHeights();
    callback();
    expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('0px');
    expect(document.documentElement.style.getPropertyValue('--summary-height')).toBe('0px');
  });

  it('returns localStorage when available', () => {
    expect(safeLocalStorage()).toBe(window.localStorage);
  });
});
