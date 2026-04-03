import Idiomorph from 'idiomorph/dist/idiomorph.cjs.js';
import type { IdiomorphOptions } from 'idiomorph/dist/idiomorph.cjs.js';

// --------------------------------------------------------------------------
// Hashing Utility
// --------------------------------------------------------------------------

/** Simple djb2 hash for fast string comparison */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return `${str.length}:${hash >>> 0}`;
}

// --------------------------------------------------------------------------
// Per-Instance State (WeakMap for automatic cleanup)
// --------------------------------------------------------------------------

interface MorphStats {
  updated: number;
  skipped: number;
  added: number;
  removed: number;
}

interface ElementMorphState {
  /** Previous element hashes for diff comparison */
  prevHashes: string[];
  /** Last content hash for full-morph skip detection */
  contentHash: string;
  /** Stats from last morph operation */
  lastStats: MorphStats;
}

/** Per-container morph state - auto-cleaned when element is GC'd */
const morphStates = new WeakMap<Element, ElementMorphState>();

/** Get or create state for a container */
function getState(container: Element): ElementMorphState {
  let state = morphStates.get(container);
  if (!state) {
    state = {
      prevHashes: [],
      contentHash: '',
      lastStats: { updated: 0, skipped: 0, added: 0, removed: 0 }
    };
    morphStates.set(container, state);
  }
  return state;
}

// --------------------------------------------------------------------------
// Shared Idiomorph Configuration
// --------------------------------------------------------------------------

const IDIOMORPH_OPTIONS: IdiomorphOptions = {
  morphStyle: 'innerHTML',
  callbacks: {
    // Prevent removal of nodes with data-morph-ignore attribute
    beforeNodeRemoved: (node: Node) => {
      if (node instanceof Element && node.hasAttribute('data-morph-ignore')) {
        return false;
      }
      return true;
    }
  }
};

// --------------------------------------------------------------------------
// RAF-Batched Morphing (for non-streaming updates)
// --------------------------------------------------------------------------

// Track pending RAF to avoid stacking
let pendingMorph: number | null = null;
let pendingElement: Element | null = null;
let pendingHtml: string | null = null;

/**
 * Morph the content of an element using Idiomorph
 * Uses requestAnimationFrame to batch updates and prevent jank
 * 
 * @param element The container element to morph
 * @param newHtml The new HTML content
 */
export function morphContent(element: Element, newHtml: string): void {
  const newHash = simpleHash(newHtml);
  const state = getState(element);
  
  // Fast path: skip if content unchanged
  if (state.contentHash === newHash) return;
  
  // Store for pending morph
  pendingElement = element;
  pendingHtml = newHtml;
  
  // Cancel any pending morph and schedule new one
  if (pendingMorph !== null) {
    cancelAnimationFrame(pendingMorph);
  }
  
  pendingMorph = requestAnimationFrame(() => {
    if (pendingElement && pendingHtml !== null) {
      const pendingState = getState(pendingElement);
      pendingState.contentHash = newHash;
      Idiomorph.morph(pendingElement, pendingHtml, IDIOMORPH_OPTIONS);
    }
    
    pendingMorph = null;
    pendingElement = null;
    pendingHtml = null;
  });
}

/**
 * Morph content synchronously (for testing or immediate updates)
 * 
 * @param element The container element to morph
 * @param newHtml The new HTML content
 */
export function morphContentSync(element: Element, newHtml: string): void {
  const newHash = simpleHash(newHtml);
  const state = getState(element);
  
  // Fast path: skip if content unchanged
  if (state.contentHash === newHash) return;
  
  state.contentHash = newHash;
  Idiomorph.morph(element, newHtml, IDIOMORPH_OPTIONS);
}

/**
 * Reset morph state for a specific container, or clear all pending operations
 * 
 * @param container Optional container to reset state for
 */
export function resetMorphCache(container?: Element): void {
  if (container) {
    // Reset specific container's state
    morphStates.delete(container);
  }
  
  // Cancel any pending morph
  if (pendingMorph !== null) {
    cancelAnimationFrame(pendingMorph);
    pendingMorph = null;
  }
  pendingElement = null;
  pendingHtml = null;
}

// --------------------------------------------------------------------------
// Element-Level Optimized Morphing (for streaming)
// --------------------------------------------------------------------------

/**
 * Get morph stats for a specific container
 * 
 * @param container The container to get stats for
 * @returns Stats from the last morph operation on this container
 */
export function getMorphStats(container?: Element): MorphStats {
  if (!container) {
    // Fallback for backwards compatibility - return empty stats
    return { updated: 0, skipped: 0, added: 0, removed: 0 };
  }
  return getState(container).lastStats;
}

/**
 * Optimized morph that skips unchanged elements
 * 
 * Strategy:
 * 1. Parse new HTML into temp container
 * 2. Hash each top-level element
 * 3. Compare with previous hashes for this container
 * 4. Only morph elements that changed
 * 
 * @param container The container element to morph
 * @param newHtml The new HTML content
 * @returns true if any elements were updated
 */
export function morphContentOptimized(container: Element, newHtml: string): boolean {
  const state = getState(container);
  
  // Parse new HTML into temp container
  const temp = document.createElement('div');
  temp.innerHTML = newHtml;
  
  const newHashes: string[] = [];
  const stats: MorphStats = { updated: 0, skipped: 0, added: 0, removed: 0 };
  
  const oldLen = container.children.length;
  const newLen = temp.children.length;
  const maxLen = Math.max(oldLen, newLen);
  
  // Process each element position
  for (let i = 0; i < maxLen; i++) {
    const oldChild = container.children[i];
    const newChild = temp.children[i];
    
    if (!newChild && oldChild) {
      // Element removed - will handle after loop to avoid index shifting
      continue;
    }
    
    if (!newChild) continue;
    
    const newHash = simpleHash(newChild.outerHTML);
    newHashes.push(newHash);
    
    if (!oldChild) {
      // New element - append (clone since temp will be discarded)
      container.appendChild(newChild.cloneNode(true));
      stats.added++;
    } else if (state.prevHashes[i] !== newHash) {
      // Element changed - morph it
      Idiomorph.morph(oldChild, newChild.outerHTML, {
        morphStyle: 'outerHTML',
        callbacks: IDIOMORPH_OPTIONS.callbacks
      } satisfies IdiomorphOptions);
      stats.updated++;
    } else {
      // Element unchanged - skip!
      stats.skipped++;
    }
  }
  
  // Remove extra elements from the end (if any)
  while (container.children.length > newLen) {
    container.lastElementChild?.remove();
    stats.removed++;
  }
  
  // Update state for this container
  state.prevHashes = newHashes;
  state.lastStats = stats;
  
  return stats.updated > 0 || stats.added > 0 || stats.removed > 0;
}

/**
 * Reset element-level morph state for a container
 * Note: Usually not needed since WeakMap auto-cleans when element is GC'd
 * 
 * @param container Optional container to reset (if omitted, does nothing - use resetMorphCache)
 */
export function resetElementMorphState(container?: Element): void {
  if (container) {
    morphStates.delete(container);
  }
}
