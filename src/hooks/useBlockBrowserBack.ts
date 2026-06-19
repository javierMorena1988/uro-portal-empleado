import { useEffect } from 'react';

const BLOCK_STATE = { portalBlockBack: true } as const;
const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'click', 'keydown'] as const;
/** WebKit considera válido pushState ~10s tras una interacción del usuario */
const SEED_INTERVAL_MS = 8000;

let refCount = 0;
let installed = false;
let lastSeedAt = 0;
let hasGestureSeed = false;
let handlingPopState = false;

function seedHistory(force = false) {
  const now = Date.now();
  if (!force && now - lastSeedAt < 300) return;

  try {
    window.history.pushState(BLOCK_STATE, '', window.location.href);
    lastSeedAt = now;
  } catch {
    // ignore
  }
}

function seedHistoryOnGesture() {
  const now = Date.now();
  if (now - lastSeedAt < SEED_INTERVAL_MS && hasGestureSeed) return;

  seedHistory(true);

  // Primera interacción: segunda entrada para profundidad en Safari/iOS
  if (!hasGestureSeed) {
    hasGestureSeed = true;
    seedHistory(true);
  }
}

function handlePopState() {
  if (handlingPopState) return;
  handlingPopState = true;

  try {
    window.history.pushState(BLOCK_STATE, '', window.location.href);
    window.history.go(1);
  } catch {
    // ignore
  }

  window.setTimeout(() => {
    handlingPopState = false;
  }, 0);
}

function handlePageShow(event: PageTransitionEvent) {
  if (!event.persisted) return;
  lastSeedAt = 0;
  hasGestureSeed = false;
  seedHistory(true);
}

function installBlocker() {
  if (installed) return;
  installed = true;

  seedHistory(true);

  for (const eventName of GESTURE_EVENTS) {
    window.addEventListener(eventName, seedHistoryOnGesture, { capture: true });
  }
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('pageshow', handlePageShow);
}

function uninstallBlocker() {
  if (!installed) return;
  installed = false;
  lastSeedAt = 0;
  hasGestureSeed = false;
  handlingPopState = false;

  for (const eventName of GESTURE_EVENTS) {
    window.removeEventListener(eventName, seedHistoryOnGesture, { capture: true });
  }
  window.removeEventListener('popstate', handlePopState);
  window.removeEventListener('pageshow', handlePageShow);
}

/**
 * Impide usar el botón "Atrás" del navegador (incl. Safari/iOS).
 * Safari ignora pushState sin gesto del usuario: se re-siembra el historial
 * en la primera interacción (tap, click, tecla) y periódicamente mientras dura el bloqueo.
 */
export function useBlockBrowserBack(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    refCount += 1;
    installBlocker();

    return () => {
      refCount -= 1;
      if (refCount <= 0) {
        refCount = 0;
        uninstallBlocker();
      }
    };
  }, [enabled]);
}
