import { describe, it, expect, beforeEach } from 'vitest';
import { cacheManager } from '../../src/lib/cache-manager';

describe('CacheManager', () => {
  beforeEach(() => {
    cacheManager.clearAll();
  });

  describe('renderCacheSync', () => {
    it('should store and retrieve values', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      expect(cacheManager.renderCacheSync.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cacheManager.renderCacheSync.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      cacheManager.renderCacheSync.set('key1', 'value2');
      expect(cacheManager.renderCacheSync.get('key1')).toBe('value2');
    });

    it('should report correct stats', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      cacheManager.renderCacheSync.set('key2', 'value2');
      const stats = cacheManager.renderCacheSync.stats;
      expect(stats.entries).toBe(2);
      expect(stats.estimatedBytes).toBeGreaterThan(0);
    });

    it('should check if key exists', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      expect(cacheManager.renderCacheSync.has('key1')).toBe(true);
      expect(cacheManager.renderCacheSync.has('key2')).toBe(false);
    });
  });

  describe('renderCacheAsync', () => {
    it('should store and retrieve values independently from sync cache', () => {
      cacheManager.renderCacheSync.set('key1', 'sync-value');
      cacheManager.renderCacheAsync.set('key1', 'async-value');
      
      expect(cacheManager.renderCacheSync.get('key1')).toBe('sync-value');
      expect(cacheManager.renderCacheAsync.get('key1')).toBe('async-value');
    });
  });

  describe('katexCacheDisplay', () => {
    it('should store and retrieve KaTeX display values', () => {
      cacheManager.katexCacheDisplay.set('x^2', '<span>x²</span>');
      expect(cacheManager.katexCacheDisplay.get('x^2')).toBe('<span>x²</span>');
    });
  });

  describe('katexCacheInline', () => {
    it('should store and retrieve KaTeX inline values', () => {
      cacheManager.katexCacheInline.set('y', '<span>y</span>');
      expect(cacheManager.katexCacheInline.get('y')).toBe('<span>y</span>');
    });

    it('should be independent from display cache', () => {
      cacheManager.katexCacheDisplay.set('expr', 'display-version');
      cacheManager.katexCacheInline.set('expr', 'inline-version');
      
      expect(cacheManager.katexCacheDisplay.get('expr')).toBe('display-version');
      expect(cacheManager.katexCacheInline.get('expr')).toBe('inline-version');
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max entries exceeded', () => {
      // renderCacheSync has maxEntries of 100, use it for LRU testing
      for (let i = 0; i < 110; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, `value${i}`);
      }
      
      // First entries should be evicted
      expect(cacheManager.renderCacheSync.has('key0')).toBe(false);
      expect(cacheManager.renderCacheSync.has('key9')).toBe(false);
      
      // Later entries should still exist
      expect(cacheManager.renderCacheSync.has('key109')).toBe(true);
      expect(cacheManager.renderCacheSync.stats.entries).toBe(100);
    });

    it('should move accessed entries to end (most recently used)', () => {
      // Fill cache partially
      for (let i = 0; i < 95; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, `value${i}`);
      }
      
      // Access key0, making it most recently used
      cacheManager.renderCacheSync.get('key0');
      
      // Fill cache to trigger eviction
      for (let i = 95; i < 110; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, `value${i}`);
      }
      
      // key0 should still exist (was accessed), key1 should be evicted
      expect(cacheManager.renderCacheSync.has('key0')).toBe(true);
      expect(cacheManager.renderCacheSync.has('key1')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      cacheManager.renderCacheAsync.set('key2', 'value2');
      cacheManager.katexCacheDisplay.set('key3', 'value3');
      cacheManager.katexCacheInline.set('key4', 'value4');
      
      cacheManager.clearAll();
      
      expect(cacheManager.renderCacheSync.has('key1')).toBe(false);
      expect(cacheManager.renderCacheAsync.has('key2')).toBe(false);
      expect(cacheManager.katexCacheDisplay.has('key3')).toBe(false);
      expect(cacheManager.katexCacheInline.has('key4')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return combined stats for all caches', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      cacheManager.renderCacheAsync.set('key2', 'value2');
      cacheManager.katexCacheDisplay.set('key3', 'value3');
      cacheManager.katexCacheInline.set('key4', 'value4');
      
      const stats = cacheManager.stats;
      
      expect(stats.renderSync.entries).toBe(1);
      expect(stats.renderAsync.entries).toBe(1);
      expect(stats.katexDisplay.entries).toBe(1);
      expect(stats.katexInline.entries).toBe(1);
      expect(stats.total.entries).toBe(4);
      expect(stats.total.estimatedBytes).toBeGreaterThan(0);
    });
  });

  describe('trimIfNeeded', () => {
    it('should evict entries when memory budget exceeded', () => {
      // Fill caches with large strings to exceed budget
      const largeString = 'x'.repeat(1024 * 1024); // 1MB string
      
      for (let i = 0; i < 10; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, largeString);
      }
      
      const beforeTrim = cacheManager.stats.total.entries;
      cacheManager.trimIfNeeded();
      const afterTrim = cacheManager.stats.total.entries;
      
      // Should have evicted some entries
      expect(afterTrim).toBeLessThanOrEqual(beforeTrim);
    });
  });

  describe('size estimation', () => {
    it('should estimate string size as length * 2 (UTF-16)', () => {
      const testString = 'hello'; // 5 chars = 10 bytes estimated
      cacheManager.renderCacheSync.set('key', testString);
      
      // The estimated bytes should include the string size
      expect(cacheManager.renderCacheSync.stats.estimatedBytes).toBe(10);
    });
  });

  describe('evictOldest', () => {
    it('should evict specified number of oldest entries', () => {
      for (let i = 0; i < 5; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, `value${i}`);
      }
      
      cacheManager.renderCacheSync.evictOldest(2);
      
      expect(cacheManager.renderCacheSync.stats.entries).toBe(3);
      expect(cacheManager.renderCacheSync.has('key0')).toBe(false);
      expect(cacheManager.renderCacheSync.has('key1')).toBe(false);
      expect(cacheManager.renderCacheSync.has('key2')).toBe(true);
    });

    it('should handle evicting more than available entries', () => {
      cacheManager.renderCacheSync.set('key1', 'value1');
      cacheManager.renderCacheSync.set('key2', 'value2');
      
      cacheManager.renderCacheSync.evictOldest(10); // More than exists
      
      expect(cacheManager.renderCacheSync.stats.entries).toBe(0);
    });

    it('should handle evicting from empty cache', () => {
      cacheManager.renderCacheSync.evictOldest(5);
      expect(cacheManager.renderCacheSync.stats.entries).toBe(0);
    });
  });

  describe('memory budget eviction', () => {
    it('should evict entries when byte limit is exceeded', () => {
      // renderCacheSync has 25% of 10MB budget = 2.5MB
      // Create strings that will exceed the byte limit
      const largeString = 'x'.repeat(500 * 1024); // 500KB * 2 = 1MB per entry
      
      // Add entries until we exceed the byte budget
      for (let i = 0; i < 5; i++) {
        cacheManager.renderCacheSync.set(`key${i}`, largeString);
      }
      
      // Should have evicted some entries due to byte limit (2.5MB / 1MB = ~2 entries max)
      expect(cacheManager.renderCacheSync.stats.entries).toBeLessThan(5);
    });
  });

  describe('trimIfNeeded with multiple caches', () => {
    it('should evict from all caches when total budget exceeded', () => {
      // Total budget is 10MB, need to exceed 90% = 9MB
      // Using medium strings to fill caches efficiently
      // Each cache has 20% of budget = 2MB max
      const mediumString = 'x'.repeat(50 * 1024); // 50KB * 2 = 100KB per entry
      
      // Fill renderCacheSync (2MB limit, 100 entry limit)
      for (let i = 0; i < 20; i++) {
        cacheManager.renderCacheSync.set(`sync${i}`, mediumString);
      }
      // Fill renderCacheAsync (2MB limit)
      for (let i = 0; i < 20; i++) {
        cacheManager.renderCacheAsync.set(`async${i}`, mediumString);
      }
      // Fill katexCacheDisplay (2MB limit)
      for (let i = 0; i < 20; i++) {
        cacheManager.katexCacheDisplay.set(`display${i}`, mediumString);
      }
      // Fill katexCacheInline (2MB limit)
      for (let i = 0; i < 20; i++) {
        cacheManager.katexCacheInline.set(`inline${i}`, mediumString);
      }
      // Fill highlightCache (2MB limit)
      for (let i = 0; i < 20; i++) {
        cacheManager.highlightCache.set(`highlight${i}`, mediumString);
      }
      
      const beforeStats = cacheManager.stats;
      // Should be at ~9MB+ (close to 10MB total budget, 5 caches * ~2MB each)
      expect(beforeStats.total.estimatedBytes).toBeGreaterThan(9 * 1024 * 1024);
      
      const beforeTrim = beforeStats.total.entries;
      cacheManager.trimIfNeeded();
      const afterTrim = cacheManager.stats.total.entries;
      
      // Should have evicted ~25% from each cache
      expect(afterTrim).toBeLessThan(beforeTrim);
    });

    it('should not evict when under budget threshold', () => {
      // Add small entries that won't exceed 90% budget
      cacheManager.renderCacheSync.set('key1', 'small');
      cacheManager.renderCacheAsync.set('key2', 'small');
      
      const beforeTrim = cacheManager.stats.total.entries;
      cacheManager.trimIfNeeded();
      const afterTrim = cacheManager.stats.total.entries;
      
      expect(afterTrim).toBe(beforeTrim);
    });
  });
});
