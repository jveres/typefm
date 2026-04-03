import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadLanguage,
  loadLanguages,
  highlight,
  highlightCode,
  isLanguageReady,
  isLanguageSupported,
  getRegisteredLanguages,
  getSupportedLanguages,
  onLanguageLoaded,
  offLanguageLoaded,
  registerLanguage,
  clearHighlightCache,
} from '../../src/lib/highlighter';
import { cacheManager } from '../../src/lib/cache-manager';

describe('highlighter', () => {
  beforeEach(() => {
    cacheManager.highlightCache.clear();
  });

  describe('loadLanguage', () => {
    it('should load a supported language', async () => {
      const result = await loadLanguage('javascript');
      expect(result).toBe(true);
      expect(isLanguageReady('javascript')).toBe(true);
    });

    it('should return true for already loaded language', async () => {
      // First load
      await loadLanguage('javascript');
      
      // Second load should return true immediately
      const result = await loadLanguage('javascript');
      expect(result).toBe(true);
    });

    it('should return false for unsupported language', async () => {
      const result = await loadLanguage('nonexistent-language-xyz');
      expect(result).toBe(false);
    });

    it('should handle concurrent loads (deduplication)', async () => {
      // Start multiple loads for same language
      const promise1 = loadLanguage('typescript');
      const promise2 = loadLanguage('typescript');
      const promise3 = loadLanguage('typescript');

      const results = await Promise.all([promise1, promise2, promise3]);
      
      // All should succeed
      expect(results).toEqual([true, true, true]);
      expect(isLanguageReady('typescript')).toBe(true);
    });

    it('should resolve language aliases', async () => {
      const result = await loadLanguage('js');
      expect(result).toBe(true);
      expect(isLanguageReady('javascript')).toBe(true);
    });

    it('should mark failed languages to avoid retry', async () => {
      // First attempt
      const result1 = await loadLanguage('fake-lang-123');
      expect(result1).toBe(false);

      // Second attempt should fail fast (cached failure)
      const result2 = await loadLanguage('fake-lang-123');
      expect(result2).toBe(false);
    });
  });

  describe('loadLanguages', () => {
    it('should load multiple languages in parallel', async () => {
      await loadLanguages(['python', 'rust', 'go']);

      expect(isLanguageReady('python')).toBe(true);
      expect(isLanguageReady('rust')).toBe(true);
      expect(isLanguageReady('go')).toBe(true);
    });

    it('should deduplicate languages', async () => {
      // Load with duplicates
      await loadLanguages(['ruby', 'ruby', 'rb']); // rb is alias for ruby

      expect(isLanguageReady('ruby')).toBe(true);
    });

    it('should skip already loaded languages', async () => {
      await loadLanguage('java');
      
      // Should not throw or reload
      await loadLanguages(['java', 'kotlin']);

      expect(isLanguageReady('java')).toBe(true);
      expect(isLanguageReady('kotlin')).toBe(true);
    });

    it('should handle empty array', async () => {
      await expect(loadLanguages([])).resolves.toBeUndefined();
    });
  });

  describe('highlightCode', () => {
    it('should return escaped HTML for empty code', () => {
      const result = highlightCode('', 'javascript');
      expect(result.html).toBe('');
      expect(result.isHighlighted).toBe(false);
    });

    it('should return escaped HTML when no language specified', () => {
      const result = highlightCode('<div>test</div>');
      expect(result.html).toBe('&lt;div&gt;test&lt;/div&gt;');
      expect(result.language).toBe('plaintext');
      expect(result.isHighlighted).toBe(false);
    });

    it('should highlight code with loaded language', async () => {
      await loadLanguage('javascript');

      const result = highlightCode('const x = 1;', 'javascript');
      
      expect(result.isHighlighted).toBe(true);
      expect(result.language).toBe('javascript');
      expect(result.html).toContain('hljs-'); // highlight.js classes
    });

    it('should return escaped HTML for unloaded language', () => {
      // Don't load the language first
      const result = highlightCode('fn main() {}', 'zig'); // zig not in our loader map
      
      expect(result.isHighlighted).toBe(false);
      expect(result.html).toBe('fn main() {}');
    });

    it('should trigger async load for supported but unloaded language', async () => {
      // Clear to ensure swift isn't loaded
      const wasReady = isLanguageReady('swift');
      
      if (!wasReady) {
        // First call triggers load
        const result1 = highlightCode('let x = 1', 'swift');
        expect(result1.isHighlighted).toBe(false);

        // Wait for async load
        await loadLanguage('swift');

        // Now should highlight
        const result2 = highlightCode('let x = 1', 'swift');
        expect(result2.isHighlighted).toBe(true);
      }
    });

    it('should use cache for repeated highlights', async () => {
      await loadLanguage('javascript');

      const code = 'const test = "cached";';
      
      // First highlight
      const result1 = highlightCode(code, 'javascript');
      
      // Second highlight should use cache
      const result2 = highlightCode(code, 'javascript');

      expect(result1.html).toBe(result2.html);
    });

    it('should escape HTML entities in unhighlighted code', () => {
      const result = highlightCode('<script>alert("xss")</script>', 'unknown-lang');
      
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&quot;');
      expect(result.html).not.toContain('<script>');
    });

    it('should handle plaintext language', () => {
      const result = highlightCode('plain text here', 'plaintext');
      
      expect(result.isHighlighted).toBe(true);
      expect(result.language).toBe('plaintext');
      expect(result.html).toBe('plain text here');
    });
  });

  describe('highlight', () => {
    it('should return just the HTML string', async () => {
      await loadLanguage('javascript');

      const html = highlight('const x = 1;', 'javascript');
      
      expect(typeof html).toBe('string');
      expect(html).toContain('hljs-');
    });

    it('should return escaped HTML for unknown language', () => {
      const html = highlight('<div>', 'unknown');
      expect(html).toBe('&lt;div&gt;');
    });
  });

  describe('language aliases', () => {
    it('should resolve js → javascript', async () => {
      await loadLanguage('js');
      expect(isLanguageReady('javascript')).toBe(true);
      
      const result = highlightCode('const x = 1;', 'js');
      expect(result.language).toBe('javascript');
    });

    it('should resolve ts → typescript', async () => {
      await loadLanguage('ts');
      expect(isLanguageReady('typescript')).toBe(true);
    });

    it('should resolve html → xml', async () => {
      await loadLanguage('html');
      expect(isLanguageReady('xml')).toBe(true);
    });

    it('should resolve py → python', async () => {
      await loadLanguage('py');
      expect(isLanguageReady('python')).toBe(true);
    });

    it('should resolve sh → bash', async () => {
      await loadLanguage('sh');
      expect(isLanguageReady('bash')).toBe(true);
    });

    it('should resolve yml → yaml', async () => {
      await loadLanguage('yml');
      expect(isLanguageReady('yaml')).toBe(true);
    });

    it('should resolve cs → csharp', async () => {
      await loadLanguage('cs');
      expect(isLanguageReady('csharp')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      await loadLanguage('JavaScript');
      expect(isLanguageReady('javascript')).toBe(true);

      await loadLanguage('PYTHON');
      expect(isLanguageReady('python')).toBe(true);
    });
  });

  describe('event system', () => {
    it('should notify listeners when language loads', async () => {
      const listener = vi.fn();
      onLanguageLoaded(listener);

      await loadLanguage('sql');

      // Wait for microtask (batched notifications)
      await new Promise(resolve => queueMicrotask(resolve));

      expect(listener).toHaveBeenCalled();

      offLanguageLoaded(listener);
    });

    it('should batch notifications for parallel loads', async () => {
      const listener = vi.fn();
      onLanguageLoaded(listener);

      // Load multiple languages in parallel
      await loadLanguages(['cpp', 'c']);

      // Wait for microtask (batched notifications)
      await new Promise(resolve => queueMicrotask(resolve));

      // Batching reduces calls but may not always batch to exactly 1
      // if languages finish loading at different times
      // The key is that it's less than or equal to the number of languages
      expect(listener.mock.calls.length).toBeLessThanOrEqual(2);
      expect(listener).toHaveBeenCalled();

      offLanguageLoaded(listener);
    });

    it('should allow unsubscribe', async () => {
      const listener = vi.fn();
      onLanguageLoaded(listener);
      offLanguageLoaded(listener);

      await loadLanguage('lua');
      await new Promise(resolve => queueMicrotask(resolve));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle errors in listeners gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      onLanguageLoaded(errorListener);
      onLanguageLoaded(goodListener);

      // Should not throw
      await loadLanguage('perl');
      await new Promise(resolve => queueMicrotask(resolve));

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();

      offLanguageLoaded(errorListener);
      offLanguageLoaded(goodListener);
    });
  });

  describe('registerLanguage', () => {
    it('should register a custom language', () => {
      // Create a simple mock language definition
      const mockLanguage = () => ({
        name: 'custom',
        contains: [],
      });

      registerLanguage('custom-test', mockLanguage);
      
      expect(isLanguageReady('custom-test')).toBe(true);
      expect(getRegisteredLanguages()).toContain('custom-test');
    });

    it('should notify listeners when custom language registered', async () => {
      const listener = vi.fn();
      onLanguageLoaded(listener);

      const mockLanguage = () => ({ name: 'custom2', contains: [] });
      registerLanguage('custom-notify-test', mockLanguage);

      await new Promise(resolve => queueMicrotask(resolve));

      expect(listener).toHaveBeenCalled();

      offLanguageLoaded(listener);
    });

    it('should skip if language already registered', () => {
      const mockLanguage = () => ({ name: 'dupe', contains: [] });
      
      registerLanguage('dupe-test', mockLanguage);
      const countBefore = getRegisteredLanguages().length;
      
      // Register again
      registerLanguage('dupe-test', mockLanguage);
      const countAfter = getRegisteredLanguages().length;

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('isLanguageReady', () => {
    it('should return true for registered language', async () => {
      await loadLanguage('javascript');
      expect(isLanguageReady('javascript')).toBe(true);
    });

    it('should return false for unregistered language', () => {
      expect(isLanguageReady('never-registered-xyz')).toBe(false);
    });

    it('should resolve aliases', async () => {
      await loadLanguage('javascript');
      expect(isLanguageReady('js')).toBe(true);
    });

    it('should return true for plaintext (always bundled)', () => {
      expect(isLanguageReady('plaintext')).toBe(true);
      expect(isLanguageReady('text')).toBe(true);
      expect(isLanguageReady('txt')).toBe(true);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for registered language', async () => {
      await loadLanguage('javascript');
      expect(isLanguageSupported('javascript')).toBe(true);
    });

    it('should return true for loadable but unregistered language', () => {
      // Even if not loaded yet, it's supported
      expect(isLanguageSupported('haskell')).toBe(true);
    });

    it('should return false for unknown language', () => {
      expect(isLanguageSupported('totally-fake-lang')).toBe(false);
    });

    it('should resolve aliases', () => {
      expect(isLanguageSupported('jsx')).toBe(true); // alias for javascript
      expect(isLanguageSupported('tsx')).toBe(true); // alias for typescript
    });
  });

  describe('getRegisteredLanguages', () => {
    it('should return array of registered languages', () => {
      const languages = getRegisteredLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('plaintext'); // always bundled
    });

    it('should include dynamically loaded languages', async () => {
      await loadLanguage('javascript');
      
      const languages = getRegisteredLanguages();
      expect(languages).toContain('javascript');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages (registered + loadable)', () => {
      const languages = getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(30); // We have 40+ in the loader map
      
      // Should include common languages
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('rust');
      expect(languages).toContain('go');
    });
  });

  describe('clearHighlightCache', () => {
    it('should clear the highlight cache', async () => {
      await loadLanguage('javascript');
      
      const code = 'const clearTest = 1;';
      
      // Populate cache
      highlightCode(code, 'javascript');
      
      // Verify it's cached
      expect(cacheManager.highlightCache.has(`javascript:${code}`)).toBe(true);

      clearHighlightCache();

      // Verify cache is cleared
      expect(cacheManager.highlightCache.has(`javascript:${code}`)).toBe(false);
    });
  });

  describe('HTML escaping', () => {
    it('should escape all dangerous characters', () => {
      const dangerous = `<script>alert("xss");</script> & 'quotes'`;
      const result = highlightCode(dangerous, 'unknown-lang');
      
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;');
      expect(result.html).toContain('&gt;');
      expect(result.html).toContain('&quot;');
      expect(result.html).toContain('&amp;');
      expect(result.html).toContain('&#39;');
    });
  });

  describe('syntax highlighting quality', () => {
    it('should highlight JavaScript keywords', async () => {
      await loadLanguage('javascript');
      
      const result = highlightCode('const x = function() { return true; }', 'javascript');
      
      expect(result.html).toContain('hljs-keyword'); // const, function, return
      expect(result.html).toContain('hljs-literal'); // true
    });

    it('should highlight TypeScript types', async () => {
      await loadLanguage('typescript');
      
      const result = highlightCode('const x: string = "hello";', 'typescript');
      
      expect(result.html).toContain('hljs-'); // Some highlighting applied
    });

    it('should highlight Python syntax', async () => {
      await loadLanguage('python');
      
      const result = highlightCode('def hello():\n    print("world")', 'python');
      
      expect(result.html).toContain('hljs-keyword'); // def
      expect(result.html).toContain('hljs-string'); // "world"
    });

    it('should highlight JSON structure', async () => {
      await loadLanguage('json');
      
      const result = highlightCode('{"key": "value", "num": 123}', 'json');
      
      expect(result.html).toContain('hljs-attr'); // key
      expect(result.html).toContain('hljs-string'); // value
      expect(result.html).toContain('hljs-number'); // 123
    });

    it('should highlight SQL queries', async () => {
      await loadLanguage('sql');
      
      const result = highlightCode('SELECT * FROM users WHERE id = 1;', 'sql');
      
      expect(result.html).toContain('hljs-keyword'); // SELECT, FROM, WHERE
    });

    it('should highlight shell commands', async () => {
      await loadLanguage('bash');
      
      const result = highlightCode('echo "hello" && ls -la', 'bash');
      
      expect(result.html).toContain('hljs-'); // Some highlighting
    });
  });
});
