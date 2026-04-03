import { describe, it, expect } from 'vitest';
import { decodeHtml } from '../../src/lib/html';

describe('utils', () => {
  describe('decodeHtml', () => {
    it('should decode &lt; to <', () => {
      expect(decodeHtml('&lt;')).toBe('<');
    });

    it('should decode &gt; to >', () => {
      expect(decodeHtml('&gt;')).toBe('>');
    });

    it('should decode &quot; to "', () => {
      expect(decodeHtml('&quot;')).toBe('"');
    });

    it('should decode &#39; to \'', () => {
      expect(decodeHtml('&#39;')).toBe("'");
    });

    it('should decode &amp; to &', () => {
      expect(decodeHtml('&amp;')).toBe('&');
    });

    it('should decode multiple entities in a string', () => {
      expect(decodeHtml('&lt;div&gt;')).toBe('<div>');
    });

    it('should handle mixed content', () => {
      expect(decodeHtml('Hello &amp; &lt;world&gt;')).toBe('Hello & <world>');
    });

    it('should return unchanged string with no entities', () => {
      expect(decodeHtml('Hello world')).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(decodeHtml('')).toBe('');
    });

    it('should decode all entities in complex expression', () => {
      const input = '&lt;a href=&quot;link&quot;&gt;text&lt;/a&gt;';
      const expected = '<a href="link">text</a>';
      expect(decodeHtml(input)).toBe(expected);
    });

    it('should handle &amp; before other entities', () => {
      // &amp;lt; should become &lt; (not <)
      expect(decodeHtml('&amp;lt;')).toBe('&lt;');
    });
  });
});
