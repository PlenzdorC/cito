/** Browser-Seiteneffekte, gekapselt für Testbarkeit. */

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback für unsichere Kontexte (http) und ältere Browser
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function toggleFullscreen(element) {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  element?.requestFullscreen?.().catch(() => {});
}

export function focusElement(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  element.focus({ preventScroll: true });
}

export function focusFirstInvalid(form) {
  const invalid = form?.querySelector('[aria-invalid="true"]');
  if (invalid) {
    invalid.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    invalid.focus({ preventScroll: true });
  }
}

export function scrollToSection(id) {
  const section = document.getElementById(id);
  section?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** Hält CSS-Variablen für Kopf- und Fußzeilenhöhe aktuell (für das mobile Sticky-Layout). */
export function observeChromeHeights() {
  const root = document.documentElement;
  const observer = new ResizeObserver(() => {
    const header = document.getElementById('app-header');
    const summary = document.getElementById('summary-bar');
    if (header) root.style.setProperty('--header-height', `${header.offsetHeight}px`);
    if (summary) root.style.setProperty('--summary-height', `${summary.offsetHeight}px`);
  });
  ['app-header', 'summary-bar'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  });
  return observer;
}

export function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
