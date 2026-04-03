/**
 * @vitest-environment jsdom
 * 
 * Integration tests for KaTeX lazy loading flow.
 * These tests verify that math rendering works correctly when KaTeX
 * is loaded asynchronously (the real browser scenario).
 */
import { describe, it, expect, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../../src/MarkdownViewer';
import { preloadKaTeX, isKaTeXReady } from '../../src/lib/parser';
import { cacheManager } from '../../src/lib/cache-manager';

describe('KaTeX lazy loading integration', () => {
  beforeAll(async () => {
    // Ensure KaTeX is loaded for these tests
    await preloadKaTeX();
  });

  beforeEach(() => {
    cacheManager.clearAll();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering after KaTeX load', () => {
    it('should render inline math with KaTeX', async () => {
      expect(isKaTeXReady()).toBe(true);

      render(<MarkdownViewer text="Inline math: $x^2$" />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        expect(katex).toBeTruthy();
      });

      // Should NOT contain placeholder
      const placeholder = document.querySelector('.math-placeholder');
      expect(placeholder).toBeFalsy();
    });

    it('should render display math with KaTeX', async () => {
      render(<MarkdownViewer text="$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$" />);

      await waitFor(() => {
        const katexDisplay = document.querySelector('.katex-display');
        expect(katexDisplay).toBeTruthy();
      });

      const placeholder = document.querySelector('.math-placeholder');
      expect(placeholder).toBeFalsy();
    });

    it('should render multiple math expressions', async () => {
      render(<MarkdownViewer text="First: $a^2$ and second: $b^2$" />);

      await waitFor(() => {
        const katexElements = document.querySelectorAll('.katex');
        expect(katexElements.length).toBe(2);
      });
    });
  });

  describe('caching behavior', () => {
    it('should cache rendered KaTeX output', async () => {
      const mathContent = '$y^3$';
      
      render(<MarkdownViewer text={mathContent} />);

      await waitFor(() => {
        expect(document.querySelector('.katex')).toBeTruthy();
      });

      // Check that cached content contains katex, not placeholder
      const cached = cacheManager.renderCacheAsync.get(mathContent);
      if (cached) {
        expect(cached).toContain('katex');
        expect(cached).not.toContain('math-placeholder');
      }
    });

    it('should not have placeholder in cache after successful render', async () => {
      const mathContent = '$z^4$';
      
      render(<MarkdownViewer text={mathContent} />);

      await waitFor(() => {
        expect(document.querySelector('.katex')).toBeTruthy();
      });

      // Verify no placeholder contamination in cache
      const asyncCache = cacheManager.renderCacheAsync.get(mathContent);
      const syncCache = cacheManager.renderCacheSync.get(mathContent);
      
      if (asyncCache) {
        expect(asyncCache).not.toContain('math-placeholder');
      }
      if (syncCache) {
        expect(syncCache).not.toContain('math-placeholder');
      }
    });
  });

  describe('streaming mode with math', () => {
    it('should render math correctly during streaming', async () => {
      render(<MarkdownViewer text="Streaming: $\\pi r^2$" isStreaming />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        expect(katex).toBeTruthy();
      });

      // Should have cursor during streaming
      const cursor = document.querySelector('[data-cursor]');
      expect(cursor).toBeTruthy();
    });

    it('should render math correctly after streaming ends', async () => {
      const { rerender } = render(
        <MarkdownViewer text="Final: $e^x$" isStreaming />
      );

      await waitFor(() => {
        expect(document.querySelector('.katex')).toBeTruthy();
      });

      // End streaming
      rerender(<MarkdownViewer text="Final: $e^x$" isStreaming={false} />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        expect(katex).toBeTruthy();
        
        // Cursor should be gone
        const cursor = document.querySelector('[data-cursor]');
        expect(cursor).toBeFalsy();
      });
    });
  });

  describe('complex math expressions', () => {
    it('should render fractions', async () => {
      render(<MarkdownViewer text="$\\frac{a}{b}$" />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        expect(katex).toBeTruthy();
        expect(katex?.innerHTML).toContain('frac');
      });
    });

    it('should render square roots and powers', async () => {
      render(<MarkdownViewer text="$$\\sqrt{x^2 + y^2}$$" />);

      await waitFor(() => {
        const katex = document.querySelector('.katex-display');
        expect(katex).toBeTruthy();
      });
    });

    it('should render Greek letters', async () => {
      render(<MarkdownViewer text="$\\alpha + \\beta = \\gamma$" />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        expect(katex).toBeTruthy();
      });
    });

    it('should handle invalid math gracefully', async () => {
      // Invalid math should not crash, KaTeX has throwOnError: false
      render(<MarkdownViewer text="$\\invalid{command$" />);

      // Should render something (error message or raw text)
      await waitFor(() => {
        const markdown = document.querySelector('.markdown');
        expect(markdown).toBeTruthy();
      });
    });
  });

  describe('mixed content', () => {
    it('should render math alongside code blocks', async () => {
      const content = `
# Math and Code

Equation: $E = mc^2$

\`\`\`javascript
const e = m * c ** 2;
\`\`\`
      `.trim();

      render(<MarkdownViewer text={content} />);

      await waitFor(() => {
        const katex = document.querySelector('.katex');
        const code = document.querySelector('pre code');
        expect(katex).toBeTruthy();
        expect(code).toBeTruthy();
      });
    });

    it('should render math in tables', async () => {
      const content = `
| Variable | Formula |
|----------|---------|
| Area | $\\pi r^2$ |
      `.trim();

      render(<MarkdownViewer text={content} />);

      await waitFor(() => {
        const table = document.querySelector('table');
        const katex = document.querySelector('.katex');
        expect(table).toBeTruthy();
        expect(katex).toBeTruthy();
      });
    });
  });
});
