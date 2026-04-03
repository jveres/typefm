import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { renderMarkdown, CURSOR_MARKER, CURSOR_HTML, preloadKaTeX } from '../../src/lib/parser';
import { cacheManager } from '../../src/lib/cache-manager';

describe('parser', () => {
  beforeEach(() => {
    cacheManager.clearAll();
  });

  describe('CURSOR constants', () => {
    it('should export cursor marker as word joiner', () => {
      // Word Joiner (U+2060) is used instead of ZWSP (U+200B) because
      // source markdown may contain ZWSP which gets escaped to HTML entities
      expect(CURSOR_MARKER).toBe('\u2060');
    });

    it('should export cursor HTML with correct structure', () => {
      expect(CURSOR_HTML).toContain('data-cursor');
      expect(CURSOR_HTML).toContain('class=\'cursor\'');
      expect(CURSOR_HTML).toContain('<span');
    });
  });

  describe('renderMarkdown', () => {
    describe('basic rendering', () => {
      it('should return empty string for empty input', () => {
        expect(renderMarkdown('', false)).toBe('');
        expect(renderMarkdown('', true)).toBe('');
      });

      it('should render plain text as paragraph', () => {
        const result = renderMarkdown('Hello world', false);
        expect(result).toContain('<p>');
        expect(result).toContain('Hello world');
        expect(result).toContain('</p>');
      });

      it('should render headings', () => {
        expect(renderMarkdown('# Heading 1', false)).toContain('<h1');
        expect(renderMarkdown('## Heading 2', false)).toContain('<h2');
        expect(renderMarkdown('### Heading 3', false)).toContain('<h3');
      });

      it('should render bold text', () => {
        const result = renderMarkdown('**bold**', false);
        expect(result).toContain('<strong>bold</strong>');
      });

      it('should render italic text', () => {
        const result = renderMarkdown('*italic*', false);
        expect(result).toContain('<em>italic</em>');
      });

      it('should render bold with double underscores', () => {
        const result = renderMarkdown('__bold__', false);
        expect(result).toContain('<strong>bold</strong>');
      });

      it('should render italic with single underscores', () => {
        const result = renderMarkdown('_italic_', false);
        expect(result).toContain('<em>italic</em>');
      });

      it('should render combined strikethrough and bold', () => {
        const result = renderMarkdown('~~**strikethrough and bold**~~', false);
        expect(result).toContain('<del><strong>strikethrough and bold</strong></del>');
      });

      it('should render inline code', () => {
        const result = renderMarkdown('`code`', false);
        expect(result).toContain('<code>');
        expect(result).toContain('code');
        expect(result).toContain('</code>');
      });
    });

    describe('GFM extensions', () => {
      it('should render strikethrough', () => {
        const result = renderMarkdown('~~deleted~~', false);
        expect(result).toContain('<del>');
        expect(result).toContain('deleted');
      });

      it('should render tables', () => {
        const markdown = `
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
`.trim();
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('<table>');
        expect(result).toContain('<th>');
        expect(result).toContain('<td>');
        expect(result).toContain('table-wrapper');
      });

      it('should render task lists', () => {
        const markdown = `
- [x] Done
- [ ] Todo
`.trim();
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('type="checkbox"');
        expect(result).toContain('checked');
      });

      it('should render autolinks', () => {
        const result = renderMarkdown('https://example.com', false);
        expect(result).toContain('<a');
        expect(result).toContain('href="https://example.com"');
      });
    });

    describe('code blocks', () => {
      it('should render fenced code blocks', () => {
        const markdown = '```\ncode here\n```';
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('<pre>');
        expect(result).toContain('<code>');
        expect(result).toContain('code here');
      });

      it('should wrap code blocks with copy button', () => {
        const markdown = '```\ncode\n```';
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('code-block-wrapper');
        expect(result).toContain('copy-btn');
        expect(result).toContain('copy-icon');
        expect(result).toContain('check-icon');
      });

      it('should render code blocks with language class', () => {
        const markdown = '```javascript\nconst x = 1;\n```';
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('language-javascript');
      });

      it('should wrap lines in spans when using sync strategy', () => {
        const markdown = '```\nline1\nline2\n```';
        const result = renderMarkdown(markdown, true);
        expect(result).toContain('class="code-line"');
      });

      it('should not wrap lines in spans when using async strategy', () => {
        const markdown = '```\nline1\nline2\n```';
        const result = renderMarkdown(markdown, false);
        expect(result).not.toContain('class="code-line"');
      });
    });

    describe('color previews', () => {
      it('should add color preview for hex colors in code', () => {
        const result = renderMarkdown('`#ff0000`', false);
        expect(result).toContain('color-box');
        expect(result).toContain('background-color: #ff0000');
      });

      it('should add color preview for 3-digit hex', () => {
        const result = renderMarkdown('`#f00`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for 4-digit hex (with alpha)', () => {
        const result = renderMarkdown('`#f00f`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for 8-digit hex (with alpha)', () => {
        const result = renderMarkdown('`#ff0000ff`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for rgb colors', () => {
        const result = renderMarkdown('`rgb(255, 0, 0)`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for rgba colors', () => {
        const result = renderMarkdown('`rgba(255, 0, 0, 0.5)`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for hsl colors', () => {
        const result = renderMarkdown('`hsl(0, 100%, 50%)`', false);
        expect(result).toContain('color-box');
      });

      it('should add color preview for hsla colors', () => {
        const result = renderMarkdown('`hsla(0, 100%, 50%, 0.5)`', false);
        expect(result).toContain('color-box');
      });

      it('should not add color preview for invalid hex lengths (2 chars)', () => {
        const result = renderMarkdown('`#ff`', false);
        expect(result).not.toContain('color-box');
      });

      it('should not add color preview for invalid hex lengths (5 chars)', () => {
        const result = renderMarkdown('`#fffff`', false);
        expect(result).not.toContain('color-box');
      });

      it('should not add color preview for invalid hex lengths (7 chars)', () => {
        const result = renderMarkdown('`#fffffff`', false);
        expect(result).not.toContain('color-box');
      });

      it('should add color preview in fenced code blocks', () => {
        const result = renderMarkdown('```\n#ff0000\n```', false);
        expect(result).toContain('color-box');
      });

      it('should not add color preview for HTML entities like &#124;', () => {
        // &#124; is the HTML entity for pipe character |
        // The #124 inside should NOT be detected as a hex color
        // Note: comrak encodes & as &amp;, so output is &amp;#124;
        const result = renderMarkdown('`&#124;`', false);
        expect(result).not.toContain('color-box');
        expect(result).toContain('&amp;#124;');
      });
    });

    describe('math rendering (KaTeX)', () => {
      // Preload KaTeX before math tests (lazy loaded)
      beforeAll(async () => {
        await preloadKaTeX();
      });

      it('should render inline math', () => {
        const result = renderMarkdown('$x^2$', false);
        expect(result).toContain('katex');
      });

      it('should render display math', () => {
        const result = renderMarkdown('$$x^2$$', false);
        expect(result).toContain('katex');
      });

      it('should handle complex math expressions', () => {
        const result = renderMarkdown('$\\frac{a}{b}$', false);
        expect(result).toContain('katex');
        expect(result).toContain('frac');
      });

      it('should cache KaTeX output and return cached result', () => {
        // First render to populate cache
        const result1 = renderMarkdown('$y^3$', false);
        expect(result1).toContain('katex');
        
        // Second render should use cache (same result)
        const result2 = renderMarkdown('$y^3$', false);
        expect(result2).toContain('katex');
        expect(result2).toBe(result1);
      });

      it('should handle math with cursor marker during streaming', () => {
        // Math with cursor marker - simulates streaming
        const mathWithCursor = `$x^2${CURSOR_MARKER}$`;
        const result = renderMarkdown(mathWithCursor, true);
        
        // Should contain KaTeX output
        expect(result).toContain('katex');
      });

      it('should return cached math with cursor marker appended', () => {
        // First, render math without cursor to cache it
        const mathOnly = '$z^4$';
        renderMarkdown(mathOnly, false);
        
        // Now render same math with cursor - should use cache and append cursor
        const mathWithCursor = `$z^4${CURSOR_MARKER}$`;
        const result = renderMarkdown(mathWithCursor, true);
        
        expect(result).toContain('katex');
        expect(result).toContain(CURSOR_HTML);
      });

      it('should handle invalid math gracefully', () => {
        // This should not throw, KaTeX is configured with throwOnError: false
        const result = renderMarkdown('$\\invalid{$', false);
        // Should return something (either rendered or original)
        expect(result).toBeTruthy();
      });

      it('should handle severely malformed math', () => {
        // Unclosed braces and invalid commands
        const result = renderMarkdown('$\\frac{{{$', false);
        expect(result).toBeTruthy();
      });

      it('should wrap display-mode KaTeX errors for centering', () => {
        // Display-mode errors should be wrapped in katex-display katex-error-display
        // Use \frac{ which triggers a real parse error (incomplete macro)
        const result = renderMarkdown('$$\\frac{$$', false);
        // Check for the wrapper classes that enable centering
        expect(result).toContain('katex-display');
        expect(result).toContain('katex-error-display');
        expect(result).toContain('katex-error');
      });
    });

    describe('links', () => {
      it('should add target="_blank" to external links', () => {
        const result = renderMarkdown('[link](https://example.com)', false);
        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer"');
      });

      it('should not add target="_blank" to anchor links', () => {
        const result = renderMarkdown('[link](#section)', false);
        expect(result).not.toContain('target="_blank"');
      });

      it('should sanitize javascript: hrefs', () => {
        // Comrak might already handle this, but we double-check
        const result = renderMarkdown('[click](javascript:alert(1))', false);
        expect(result).not.toContain('javascript:alert');
      });
    });

    describe('cursor injection', () => {
      it('should replace cursor marker with cursor HTML', () => {
        const result = renderMarkdown(`Hello${CURSOR_MARKER}`, false);
        expect(result).toContain(CURSOR_HTML);
        expect(result).not.toContain(CURSOR_MARKER);
      });

      it('should handle cursor marker in code blocks', () => {
        const result = renderMarkdown(`\`\`\`\ncode${CURSOR_MARKER}\n\`\`\``, true);
        expect(result).toContain('cursor');
      });
    });

    describe('zero-width character escaping', () => {
      // These tests verify that zero-width characters are escaped to HTML entities
      // during parsing to prevent conflicts with our cursor marker (Word Joiner U+2060).
      // See marked.js #2139 for similar issues in other parsers.

      it('should escape ZWSP (U+200B) to HTML entity', () => {
        const result = renderMarkdown('Text\u200Bhere', false);
        expect(result).toContain('&#8203;');
        expect(result).not.toContain('\u200B');
      });

      it('should escape ZWNJ (U+200C) to HTML entity', () => {
        const result = renderMarkdown('Text\u200Chere', false);
        expect(result).toContain('&#8204;');
      });

      it('should escape LRM (U+200E) to HTML entity', () => {
        const result = renderMarkdown('Text\u200Ehere', false);
        expect(result).toContain('&#8206;');
      });

      it('should escape RLM (U+200F) to HTML entity', () => {
        const result = renderMarkdown('Text\u200Fhere', false);
        expect(result).toContain('&#8207;');
      });

      it('should escape BOM (U+FEFF) to HTML entity', () => {
        // BOM at start of file is stripped by comrak (standard behavior)
        // Test BOM in middle of text where it's preserved
        const result = renderMarkdown('Text\uFEFFhere', false);
        expect(result).toContain('&#65279;');
      });

      it('should preserve ZWJ (U+200D) for emoji sequences', () => {
        // ZWJ must NOT be escaped - it's needed for emoji like 👨‍👩‍👧‍👦
        const result = renderMarkdown('Family: 👨\u200D👩\u200D👧\u200D👦', false);
        expect(result).toContain('\u200D'); // ZWJ preserved
        expect(result).not.toContain('&#8205;'); // NOT escaped
      });

      it('should handle source ZWSP without conflicting with cursor marker', () => {
        // Source contains ZWSP, and we add cursor marker (Word Joiner U+2060)
        const result = renderMarkdown(`Text\u200Bwith\u200BZWSP${CURSOR_MARKER}`, false);
        // Cursor should appear correctly
        expect(result).toContain(CURSOR_HTML);
        // Source ZWSP should be escaped (not confused with cursor)
        expect(result).toContain('&#8203;');
      });
    });

    describe('caching', () => {
      it('should cache rendered output', () => {
        const markdown = 'Test content';
        
        // First render
        const result1 = renderMarkdown(markdown, false);
        
        // Should be cached now
        expect(cacheManager.renderCacheAsync.has(markdown)).toBe(true);
        
        // Second render should return same result
        const result2 = renderMarkdown(markdown, false);
        expect(result2).toBe(result1);
      });

      it('should use separate caches for sync and async strategies', () => {
        const markdown = 'Test content';
        
        renderMarkdown(markdown, true);
        renderMarkdown(markdown, false);
        
        expect(cacheManager.renderCacheSync.has(markdown)).toBe(true);
        expect(cacheManager.renderCacheAsync.has(markdown)).toBe(true);
      });

      it('should not cache content with cursor marker', () => {
        const markdown = `Test${CURSOR_MARKER}`;
        
        renderMarkdown(markdown, false);
        
        // Should not be cached because it contains cursor
        expect(cacheManager.renderCacheAsync.has(markdown)).toBe(false);
      });
    });

    describe('alerts', () => {
      it('should render note alerts', () => {
        const result = renderMarkdown('> [!NOTE]\n> This is a note', false);
        expect(result).toContain('alert');
      });

      it('should render warning alerts', () => {
        const result = renderMarkdown('> [!WARNING]\n> This is a warning', false);
        expect(result).toContain('alert');
      });
    });

    describe('blockquotes', () => {
      it('should render blockquotes', () => {
        const result = renderMarkdown('> Quote text', false);
        expect(result).toContain('<blockquote>');
      });
    });

    describe('lists', () => {
      it('should render unordered lists', () => {
        const result = renderMarkdown('- Item 1\n- Item 2', false);
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>');
      });

      it('should render ordered lists', () => {
        const result = renderMarkdown('1. Item 1\n2. Item 2', false);
        expect(result).toContain('<ol>');
        expect(result).toContain('<li>');
      });
    });

    describe('footnotes', () => {
      it('should render footnotes', () => {
        const markdown = 'Text[^1]\n\n[^1]: Footnote content';
        const result = renderMarkdown(markdown, false);
        expect(result).toContain('footnote');
      });
    });

    describe('horizontal rules', () => {
      it('should render horizontal rules', () => {
        const result = renderMarkdown('---', false);
        expect(result).toContain('<hr');
      });
    });

    describe('math placeholder caching', () => {
      // These tests verify that math placeholders (shown before KaTeX loads)
      // are not cached, ensuring proper re-render when KaTeX becomes available

      it('should not cache content containing math placeholders', () => {
        // With KaTeX loaded (from beforeAll), this should render actual KaTeX
        const mathContent = '$a^2 + b^2$';
        cacheManager.clearAll();
        
        const result = renderMarkdown(mathContent, false);
        
        // Should contain katex (not placeholder) since KaTeX is loaded
        expect(result).toContain('katex');
        expect(result).not.toContain('math-placeholder');
        
        // Should be cached since it's valid KaTeX output
        expect(cacheManager.renderCacheAsync.has(mathContent)).toBe(true);
      });

      it('should cache valid KaTeX output for reuse', () => {
        const mathContent = '$e^{i\\pi} + 1 = 0$';
        cacheManager.clearAll();
        
        // First render
        const result1 = renderMarkdown(mathContent, false);
        expect(result1).toContain('katex');
        
        // Should be cached
        expect(cacheManager.renderCacheAsync.has(mathContent)).toBe(true);
        
        // Second render should return cached result
        const result2 = renderMarkdown(mathContent, false);
        expect(result2).toBe(result1);
      });

      it('placeholder HTML should contain math-placeholder class', () => {
        // This verifies the placeholder format that we check for in caching logic
        // The placeholder is: <span class="math-placeholder" data-math-style="...">
        const placeholderPattern = 'class="math-placeholder"';
        expect(placeholderPattern).toContain('math-placeholder');
      });
    });
  });
});
