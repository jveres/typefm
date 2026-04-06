/**
 * Default math processor using KaTeX.
 * 
 * @module lib/defaults/math
 */

import { decodeHtml } from '../html';
import { cacheManager } from '../cache-manager';
import type { MathData } from '../../types/hooks';
import type { KaTeXLike } from '../../types/katex';

// --------------------------------------------------------------------------
// Lazy KaTeX Loading
// --------------------------------------------------------------------------

let katexModule: KaTeXLike | null = null;
let katexLoadPromise: Promise<KaTeXLike> | null = null;

let _loadDelayMs = 0;

/**
 * Preload KaTeX module (non-blocking).
 * Call this early to warm up the cache before math is needed.
 *
 * @example
 * // Preload on app startup
 * preloadKaTeX();
 *
 * // Later, math will render immediately
 * processMathBlock({ tex: 'E = mc^2', displayMode: false });
 */
export async function preloadKaTeX(): Promise<void> {
  if (katexModule) return;
  if (!katexLoadPromise) {
    katexLoadPromise = (async () => {
      if (_loadDelayMs > 0) {
        await new Promise<void>(r => setTimeout(r, _loadDelayMs));
      }
      const mod = await import('katex');
      // KaTeX exports renderToString both directly and on default
      const katex = (mod.default || mod) as KaTeXLike;
      katexModule = katex;
      return katex;
    })();
  }
  await katexLoadPromise;
}

/**
 * Check if KaTeX is loaded and ready.
 */
export function isKaTeXReady(): boolean {
  return katexModule !== null;
}

/**
 * Get the KaTeX module if loaded, or null.
 * For internal use by parser.ts.
 */
export function getKaTeXModule(): KaTeXLike | null {
  return katexModule;
}

/**
 * Trigger KaTeX preload if not already started.
 * For internal use during rendering.
 */
export function ensureKaTeXLoading(): void {
  if (!katexModule && !katexLoadPromise) {
    preloadKaTeX();
  }
}

// --------------------------------------------------------------------------
// Processor
// --------------------------------------------------------------------------

/**
 * Default math processor using KaTeX.
 * 
 * If KaTeX isn't loaded yet, returns a placeholder that will be replaced
 * on re-render when KaTeX becomes available.
 * 
 * @param data - Math data with TeX source and display mode
 * @returns HTML string (KaTeX output or placeholder)
 * 
 * @example
 * // Inline math
 * const html = processMathBlock({ tex: 'E = mc^2', displayMode: false });
 * 
 * // Display math
 * const html = processMathBlock({ tex: '\\int_0^1 x^2 dx', displayMode: true });
 */
export function processMathBlock(data: MathData): string {
  const { tex, displayMode } = data;

  // Trigger preload if not started
  ensureKaTeXLoading();

  // Check cache (use separate caches for display/inline)
  const cache = displayMode 
    ? cacheManager.katexCacheDisplay 
    : cacheManager.katexCacheInline;
  
  const cached = cache.get(tex);
  if (cached !== undefined) {
    return cached;
  }

  // Return placeholder if KaTeX not ready
  if (!katexModule) {
    return `<span class="math-placeholder" data-math-style="${displayMode ? 'display' : 'inline'}">${tex}</span>`;
  }

  // Decode HTML entities in TeX source
  const decodedTex = decodeHtml(tex);

  try {
    let result = katexModule.renderToString(decodedTex, {
      displayMode,
      throwOnError: false,
      strict: false, // Suppress warnings for edge cases
      // trust: true enables \href, \url, \includegraphics commands.
      // Security note: javascript: URLs are sanitized by processLinks() downstream.
      trust: true,
    });

    // Wrap display-mode errors in a centered container
    // KaTeX returns <span class="katex-error"> for errors, without display class
    if (displayMode && result.includes('katex-error')) {
      result = `<span class="katex-display katex-error-display">${result}</span>`;
    }

    // Cache the result
    cache.set(tex, result);

    return result;
  } catch {
    // Return placeholder on error
    return `<span class="math-placeholder" data-math-style="${displayMode ? 'display' : 'inline'}">${tex}</span>`;
  }
}

// --------------------------------------------------------------------------
// Dev / Test Utilities
// --------------------------------------------------------------------------

/**
 * Set an artificial delay (in ms) applied before the KaTeX dynamic import.
 * Useful for testing deferred-rendering behaviour in the playground.
 * A value of 0 (default) disables the delay.
 */
export function _setKaTeXLoadDelay(ms: number): void {
  _loadDelayMs = Math.max(0, ms);
}

/**
 * Reset KaTeX to its unloaded state and clear related caches.
 * Intended for dev/test only.
 */
export function _resetKaTeX(): void {
  katexModule = null;
  katexLoadPromise = null;
  cacheManager.katexCacheDisplay.clear();
  cacheManager.katexCacheInline.clear();
  cacheManager.renderCacheSync.clear();
  cacheManager.renderCacheAsync.clear();
}
