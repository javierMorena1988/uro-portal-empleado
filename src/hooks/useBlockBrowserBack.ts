import { useEffect } from 'react';

/**
 * Impide usar el botón "Atrás" del navegador para salir o retroceder involuntariamente.
 */
export function useBlockBrowserBack(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };

    blockBack();
    window.addEventListener('popstate', blockBack);

    return () => {
      window.removeEventListener('popstate', blockBack);
    };
  }, [enabled]);
}
