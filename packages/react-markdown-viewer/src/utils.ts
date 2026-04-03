// Cache utilities
import { cacheManager } from './lib/cache-manager';
export { cacheManager };
export type { CacheStats } from './lib/cache-manager';

/**
 * Clear all caches (useful for memory management)
 */
export function clearAllCaches(): void {
  cacheManager.clearAll();
}

/**
 * Get cache statistics for debugging/monitoring
 */
export function getCacheStats() {
  return cacheManager.stats;
}

// KaTeX utilities
export { preloadKaTeX, isKaTeXReady } from './lib/parser';
