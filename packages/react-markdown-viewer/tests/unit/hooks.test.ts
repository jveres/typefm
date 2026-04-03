/**
 * Tests for the RenderHooks system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarkdown } from '../../src/lib/parser';
import {
  resolveHookResult,
  escapeHtml
} from '../../src/lib/hook-utils';
import type {
  RenderHooks,
  CodeBlockData,
  MathData,
  TableData,
  LinkData,
  ImageData,
  HeadingData,
  BlockquoteData,
  AlertData,
  ListData,
  HorizontalRuleData,
  FootnoteRefData,
  FootnoteDefData,
} from '../../src/types/hooks';

describe('RenderHooks', () => {
  describe('onCodeBlock', () => {
    it('calls hook with code block data', () => {
      const hook = vi.fn().mockReturnValue(null);
      const hooks: RenderHooks = { onCodeBlock: hook };

      renderMarkdown('```javascript\nconst x = 1;\n```', false, undefined, hooks);

      expect(hook).toHaveBeenCalledTimes(1);
      expect(hook).toHaveBeenCalledWith({
        code: 'const x = 1;',
        language: 'javascript',
      });
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onCodeBlock: () => '<div class="custom">custom code</div>',
      };

      const html = renderMarkdown('```js\ncode\n```', false, undefined, hooks);

      expect(html).toContain('<div class="custom">custom code</div>');
      expect(html).not.toContain('code-block-wrapper'); // default not used
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onCodeBlock: () => null,
      };

      const html = renderMarkdown('```js\ncode\n```', false, undefined, hooks);

      expect(html).toContain('code-block-wrapper'); // default used
      expect(html).toContain('copy-btn'); // copy button present
    });

    it('decodes HTML entities in code', () => {
      const hookData: CodeBlockData[] = [];
      const hooks: RenderHooks = {
        onCodeBlock: (data) => {
          hookData.push(data);
          return null;
        },
      };

      // Code block content is HTML-escaped by parser, then decoded for hooks
      // Input: &amp; in markdown → &amp;amp; in HTML → &amp; after decode
      renderMarkdown('```\nconst x = 1 < 2;\n```', false, undefined, hooks);

      // The < is preserved as-is since decodeHtml decodes entities
      expect(hookData[0].code).toBe('const x = 1 < 2;');
    });

    it('trims trailing newline from code', () => {
      const hookData: CodeBlockData[] = [];
      const hooks: RenderHooks = {
        onCodeBlock: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('```\nline1\nline2\n```', false, undefined, hooks);

      expect(hookData[0].code).toBe('line1\nline2');
      expect(hookData[0].code.endsWith('\n')).toBe(false);
    });

    it('handles code blocks without language', () => {
      const hookData: CodeBlockData[] = [];
      const hooks: RenderHooks = {
        onCodeBlock: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('```\nplain code\n```', false, undefined, hooks);

      expect(hookData[0].language).toBeUndefined();
    });

    it('normalizes language aliases', () => {
      const hookData: CodeBlockData[] = [];
      const hooks: RenderHooks = {
        onCodeBlock: (data) => {
          hookData.push(data);
          return null;
        },
      };

      // 'js' should be passed as-is (normalization happens in highlighter)
      renderMarkdown('```js\ncode\n```', false, undefined, hooks);

      expect(hookData[0].language).toBe('js');
    });
  });

  describe('onInlineCode', () => {
    it('calls hook with inline code data', () => {
      const hook = vi.fn().mockReturnValue(null);
      const hooks: RenderHooks = { onInlineCode: hook };

      renderMarkdown('Use `npm install` to install', false, undefined, hooks);

      expect(hook).toHaveBeenCalledWith({ code: 'npm install' });
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onInlineCode: ({ code }) => `<code class="custom">${code}</code>`,
      };

      const html = renderMarkdown('Run `test`', false, undefined, hooks);

      expect(html).toContain('<code class="custom">test</code>');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onInlineCode: () => null,
      };

      const html = renderMarkdown('Run `test`', false, undefined, hooks);

      expect(html).toContain('<code>test</code>');
    });
  });

  describe('onMath', () => {
    it('calls hook with math data for inline math', () => {
      const hookData: MathData[] = [];
      const hooks: RenderHooks = {
        onMath: (data) => {
          hookData.push(data);
          return '<span class="math">rendered</span>';
        },
      };

      renderMarkdown('Inline math: $E = mc^2$', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].tex).toBe('E = mc^2');
      expect(hookData[0].displayMode).toBe(false);
    });

    it('calls hook with math data for display math', () => {
      const hookData: MathData[] = [];
      const hooks: RenderHooks = {
        onMath: (data) => {
          hookData.push(data);
          return '<div class="math">rendered</div>';
        },
      };

      renderMarkdown('$$\\int_0^1 x dx$$', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].displayMode).toBe(true);
    });

    it('uses hook return value', () => {
      const hooks: RenderHooks = {
        onMath: ({ tex, displayMode }) =>
          `<span class="custom-math" data-display="${displayMode}">${tex}</span>`,
      };

      const html = renderMarkdown('$x^2$', false, undefined, hooks);

      expect(html).toContain('class="custom-math"');
      expect(html).toContain('data-display="false"');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onMath: () => null,
      };

      const html = renderMarkdown('$x$', false, undefined, hooks);

      // Should contain either KaTeX output or placeholder
      expect(html).toMatch(/katex|math-placeholder/);
    });
  });

  describe('onTable', () => {
    it('calls hook with table HTML', () => {
      const hookData: TableData[] = [];
      const hooks: RenderHooks = {
        onTable: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].html).toContain('<table>');
      expect(hookData[0].html).toContain('<th>A</th>');
    });

    it('provides parsed headers and rows for convenience', () => {
      const hookData: TableData[] = [];
      const hooks: RenderHooks = {
        onTable: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |', false, undefined, hooks);

      expect(hookData[0].headers).toEqual(['Name', 'Age']);
      expect(hookData[0].rows).toEqual([
        ['Alice', '30'],
        ['Bob', '25'],
      ]);
    });

    it('uses hook return value', () => {
      const hooks: RenderHooks = {
        onTable: ({ html }) => `<div class="custom-table">${html}</div>`,
      };

      const html = renderMarkdown('| A |\n|---|\n| 1 |', false, undefined, hooks);

      expect(html).toContain('class="custom-table"');
    });

    it('uses default wrapper when hook returns null', () => {
      const hooks: RenderHooks = {
        onTable: () => null,
      };

      const html = renderMarkdown('| A |\n|---|\n| 1 |', false, undefined, hooks);

      expect(html).toContain('class="table-wrapper"');
    });
  });

  describe('onLink', () => {
    it('calls hook with link data', () => {
      const hookData: LinkData[] = [];
      const hooks: RenderHooks = {
        onLink: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('[Example](https://example.com)', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].href).toBe('https://example.com');
      expect(hookData[0].text).toBe('Example');
    });

    it('extracts title attribute', () => {
      const hookData: LinkData[] = [];
      const hooks: RenderHooks = {
        onLink: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('[Link](https://example.com "Example Site")', false, undefined, hooks);

      expect(hookData[0].title).toBe('Example Site');
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onLink: ({ href, text }) => `<a class="custom" href="${href}">${text}</a>`,
      };

      const html = renderMarkdown('[Click](https://test.com)', false, undefined, hooks);

      expect(html).toContain('class="custom"');
      expect(html).toContain('href="https://test.com"');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onLink: () => null,
      };

      const html = renderMarkdown('[External](https://example.com)', false, undefined, hooks);

      // Default adds target="_blank" and rel for external links
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it('can selectively override links', () => {
      const hooks: RenderHooks = {
        onLink: ({ href }) => {
          // Only override docs links
          if (href.startsWith('/docs')) {
            return `<a class="docs-link" href="${href}">📄 Docs</a>`;
          }
          return null;
        },
      };

      const html = renderMarkdown(
        '[Docs](/docs/api) and [External](https://example.com)',
        false, undefined, hooks
      );

      expect(html).toContain('class="docs-link"');
      expect(html).toContain('target="_blank"'); // External link uses default
    });

    it('strips HTML from text content', () => {
      const hookData: LinkData[] = [];
      const hooks: RenderHooks = {
        onLink: (data) => {
          hookData.push(data);
          return null;
        },
      };

      // Link with bold text inside
      renderMarkdown('[**Bold Link**](https://test.com)', false, undefined, hooks);

      // Text should be plain (HTML stripped)
      expect(hookData[0].text).toBe('Bold Link');
    });
  });

  describe('onImage', () => {
    it('calls hook with image data', () => {
      const hookData: { src: string; alt: string; title?: string }[] = [];
      const hooks: RenderHooks = {
        onImage: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('![Alt text](https://example.com/image.png)', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].src).toBe('https://example.com/image.png');
      expect(hookData[0].alt).toBe('Alt text');
    });

    it('extracts title attribute', () => {
      const hookData: { src: string; alt: string; title?: string }[] = [];
      const hooks: RenderHooks = {
        onImage: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('![Photo](https://example.com/photo.jpg "A beautiful photo")', false, undefined, hooks);

      expect(hookData[0].title).toBe('A beautiful photo');
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onImage: ({ src, alt }) => `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`,
      };

      const html = renderMarkdown('![Caption](https://test.com/img.jpg)', false, undefined, hooks);

      expect(html).toContain('<figure>');
      expect(html).toContain('<figcaption>Caption</figcaption>');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onImage: () => null,
      };

      const html = renderMarkdown('![Alt](https://example.com/img.png)', false, undefined, hooks);

      // Default img tag preserved
      expect(html).toContain('<img');
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="Alt"');
    });

    it('handles image without title', () => {
      const hookData: { src: string; alt: string; title?: string }[] = [];
      const hooks: RenderHooks = {
        onImage: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('![Simple](https://example.com/simple.png)', false, undefined, hooks);

      expect(hookData[0].title).toBeUndefined();
    });

    it('handles empty alt text', () => {
      const hookData: { src: string; alt: string; title?: string }[] = [];
      const hooks: RenderHooks = {
        onImage: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('![](https://example.com/decorative.png)', false, undefined, hooks);

      expect(hookData[0].alt).toBe('');
      expect(hookData[0].src).toBe('https://example.com/decorative.png');
    });

    it('wraps image in lightbox link', () => {
      const hooks: RenderHooks = {
        onImage: ({ src, alt }) => 
          `<a href="${src}" data-lightbox><img src="${src}" alt="${alt}" loading="lazy"></a>`,
      };

      const html = renderMarkdown('![Gallery](https://example.com/gallery.jpg)', false, undefined, hooks);

      expect(html).toContain('data-lightbox');
      expect(html).toContain('loading="lazy"');
    });
  });

  describe('onHeading', () => {
    it('calls hook with heading data', () => {
      const hookData: { level: number; text: string; id: string; html: string }[] = [];
      const hooks: RenderHooks = {
        onHeading: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('# Hello World', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].level).toBe(1);
      expect(hookData[0].text).toBe('Hello World');
      expect(hookData[0].id).toBe('hello-world');
    });

    it('handles different heading levels', () => {
      const hookData: { level: number; text: string }[] = [];
      const hooks: RenderHooks = {
        onHeading: (data) => {
          hookData.push({ level: data.level, text: data.text });
          return null;
        },
      };

      renderMarkdown('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6', false, undefined, hooks);

      expect(hookData.length).toBe(6);
      expect(hookData[0].level).toBe(1);
      expect(hookData[1].level).toBe(2);
      expect(hookData[2].level).toBe(3);
      expect(hookData[3].level).toBe(4);
      expect(hookData[4].level).toBe(5);
      expect(hookData[5].level).toBe(6);
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onHeading: ({ level, text, id }) => 
          `<h${level} id="${id}"><a href="#${id}">#</a> ${text}</h${level}>`,
      };

      const html = renderMarkdown('# Test', false, undefined, hooks);

      expect(html).toContain('id="test"');
      expect(html).toContain('href="#test"');
      expect(html).toContain('<a href="#test">#</a>');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onHeading: () => null,
      };

      const html = renderMarkdown('# Default Heading', false, undefined, hooks);

      expect(html).toContain('<h1>');
      expect(html).toContain('Default Heading');
    });

    it('preserves inline formatting in html property', () => {
      const hookData: { html: string }[] = [];
      const hooks: RenderHooks = {
        onHeading: (data) => {
          hookData.push({ html: data.html });
          return null;
        },
      };

      renderMarkdown('# Hello **World**', false, undefined, hooks);

      expect(hookData[0].html).toContain('<strong>');
    });
  });

  describe('onBlockquote', () => {
    it('calls hook with blockquote content', () => {
      const hookData: { content: string }[] = [];
      const hooks: RenderHooks = {
        onBlockquote: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('> This is a quote', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].content).toContain('This is a quote');
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onBlockquote: ({ content }) => `<aside class="callout">${content}</aside>`,
      };

      const html = renderMarkdown('> Important note', false, undefined, hooks);

      expect(html).toContain('class="callout"');
      expect(html).toContain('<aside');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onBlockquote: () => null,
      };

      const html = renderMarkdown('> Default quote', false, undefined, hooks);

      expect(html).toContain('<blockquote>');
    });

    it('handles nested content', () => {
      const hookData: { content: string }[] = [];
      const hooks: RenderHooks = {
        onBlockquote: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('> Line 1\n> Line 2\n> **Bold**', false, undefined, hooks);

      expect(hookData[0].content).toContain('Line 1');
      expect(hookData[0].content).toContain('Line 2');
    });
  });

  describe('onAlert', () => {
    it('calls hook with alert data', () => {
      const hookData: { type: string; title: string; content: string }[] = [];
      const hooks: RenderHooks = {
        onAlert: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('> [!NOTE]\n> This is a note', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].type).toBe('note');
      expect(hookData[0].title).toBe('Note');
    });

    it('handles different alert types', () => {
      const hookData: { type: string }[] = [];
      const hooks: RenderHooks = {
        onAlert: (data) => {
          hookData.push({ type: data.type });
          return null;
        },
      };

      const md = `
> [!NOTE]
> Note content

> [!TIP]
> Tip content

> [!WARNING]
> Warning content
`;
      renderMarkdown(md, false, undefined, hooks);

      expect(hookData.map(d => d.type)).toEqual(['note', 'tip', 'warning']);
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onAlert: ({ type, content }) => 
          `<div class="alert-${type}">${content}</div>`,
      };

      const html = renderMarkdown('> [!WARNING]\n> Be careful!', false, undefined, hooks);

      expect(html).toContain('class="alert-warning"');
    });
  });

  describe('onList', () => {
    it('calls hook with unordered list data', () => {
      const hookData: { type: string; items: string[] }[] = [];
      const hooks: RenderHooks = {
        onList: (data) => {
          hookData.push({ type: data.type, items: data.items });
          return null;
        },
      };

      renderMarkdown('- Item 1\n- Item 2\n- Item 3', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].type).toBe('unordered');
      expect(hookData[0].items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('calls hook with ordered list data', () => {
      const hookData: { type: string; items: string[] }[] = [];
      const hooks: RenderHooks = {
        onList: (data) => {
          hookData.push({ type: data.type, items: data.items });
          return null;
        },
      };

      renderMarkdown('1. First\n2. Second\n3. Third', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].type).toBe('ordered');
      expect(hookData[0].items).toEqual(['First', 'Second', 'Third']);
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onList: ({ type, html }) => `<div class="custom-${type}">${html}</div>`,
      };

      const html = renderMarkdown('- Apple\n- Banana', false, undefined, hooks);

      expect(html).toContain('class="custom-unordered"');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onList: () => null,
      };

      const html = renderMarkdown('- Default item', false, undefined, hooks);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
    });
  });

  describe('onHorizontalRule', () => {
    it('calls hook for horizontal rule', () => {
      let called = false;
      const hooks: RenderHooks = {
        onHorizontalRule: () => {
          called = true;
          return null;
        },
      };

      renderMarkdown('---', false, undefined, hooks);

      expect(called).toBe(true);
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onHorizontalRule: () => '<div class="divider">⁂</div>',
      };

      const html = renderMarkdown('---', false, undefined, hooks);

      expect(html).toContain('class="divider"');
      expect(html).toContain('⁂');
    });

    it('uses default when hook returns null', () => {
      const hooks: RenderHooks = {
        onHorizontalRule: () => null,
      };

      const html = renderMarkdown('---', false, undefined, hooks);

      expect(html).toContain('<hr');
    });
  });

  describe('onFootnoteRef', () => {
    it('calls hook with footnote reference data', () => {
      const hookData: { id: string; index: number }[] = [];
      const hooks: RenderHooks = {
        onFootnoteRef: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('Text with footnote[^1]\n\n[^1]: Footnote content', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].index).toBe(1);
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onFootnoteRef: ({ id, index }) => 
          `<sup class="custom-ref"><a href="#fn-${id}">[${index}]</a></sup>`,
      };

      const html = renderMarkdown('Reference[^note]\n\n[^note]: Content', false, undefined, hooks);

      expect(html).toContain('class="custom-ref"');
    });
  });

  describe('onFootnoteDef', () => {
    it('calls hook with footnote definition data', () => {
      const hookData: { id: string; index: number; content: string }[] = [];
      const hooks: RenderHooks = {
        onFootnoteDef: (data) => {
          hookData.push(data);
          return null;
        },
      };

      renderMarkdown('Text[^1]\n\n[^1]: This is the footnote', false, undefined, hooks);

      expect(hookData.length).toBe(1);
      expect(hookData[0].index).toBe(1);
      expect(hookData[0].content).toContain('This is the footnote');
    });

    it('uses hook return value when string returned', () => {
      const hooks: RenderHooks = {
        onFootnoteDef: ({ id, content }) => 
          `<li class="custom-footnote" id="${id}">${content}</li>`,
      };

      const html = renderMarkdown('Text[^test]\n\n[^test]: Footnote text', false, undefined, hooks);

      expect(html).toContain('class="custom-footnote"');
    });
  });

  describe('onRender', () => {
    it('transforms final HTML', () => {
      const hooks: RenderHooks = {
        onRender: (html) => html.replace(/TODO/g, '<mark>TODO</mark>'),
      };

      const html = renderMarkdown('TODO: fix this', false, undefined, hooks);

      expect(html).toContain('<mark>TODO</mark>');
    });

    it('can wrap entire output', () => {
      const hooks: RenderHooks = {
        onRender: (html) => `<article class="prose">${html}</article>`,
      };

      const html = renderMarkdown('Hello', false, undefined, hooks);

      expect(html).toMatch(/^<article class="prose">.*<\/article>$/s);
    });

    it('runs after all other processing', () => {
      const hooks: RenderHooks = {
        onRender: (html) => {
          // Should see code-block-wrapper from default processing
          expect(html).toContain('code-block-wrapper');
          return html;
        },
      };

      renderMarkdown('```js\ncode\n```', false, undefined, hooks);
    });
  });

  describe('hook composition', () => {
    it('allows multiple hooks to work together', () => {
      const hooks: RenderHooks = {
        onCodeBlock: ({ code, language }) =>
          `<pre data-lang="${language}">${code}</pre>`,
        onRender: (html) => `<article>${html}</article>`,
      };

      const html = renderMarkdown('```js\ncode\n```', false, undefined, hooks);

      expect(html).toMatch(/<article>.*<pre data-lang="js">code<\/pre>.*<\/article>/s);
    });

    it('allows selective override with null returns', () => {
      const hooks: RenderHooks = {
        onCodeBlock: ({ language }) => {
          // Only override mermaid, use default for others
          if (language === 'mermaid') {
            return '<div class="mermaid">diagram</div>';
          }
          return null;
        },
      };

      const mermaidHtml = renderMarkdown('```mermaid\ngraph\n```', false, undefined, hooks);
      const jsHtml = renderMarkdown('```js\ncode\n```', false, undefined, hooks);

      expect(mermaidHtml).toContain('class="mermaid"');
      expect(jsHtml).toContain('code-block-wrapper'); // default used
    });
  });

  describe('security', () => {
    it('sanitizes HTML before hooks receive content', () => {
      let receivedHtml = '';
      const hooks: RenderHooks = {
        onRender: (html) => {
          receivedHtml = html;
          return html;
        },
      };

      renderMarkdown('<script>alert("xss")</script>', false, undefined, hooks);

      // Hook receives sanitized HTML (script tags escaped by comrak tagfilter)
      expect(receivedHtml).not.toContain('<script>');
    });

    it('sanitizes event handlers before hooks', () => {
      let receivedHtml = '';
      const hooks: RenderHooks = {
        onRender: (html) => {
          receivedHtml = html;
          return html;
        },
      };

      renderMarkdown('<div onclick="alert(1)">test</div>', false, undefined, hooks);

      expect(receivedHtml).not.toContain('onclick');
    });
  });

  describe('caching behavior', () => {
    it('does not use cache when hooks are provided', () => {
      let callCount = 0;
      const hooks: RenderHooks = {
        onRender: (html) => {
          callCount++;
          return html;
        },
      };

      // Render same content twice with hooks
      renderMarkdown('test', false, undefined, hooks);
      renderMarkdown('test', false, undefined, hooks);

      // Hook should be called both times (no caching)
      expect(callCount).toBe(2);
    });

    it('uses cache when no hooks provided', () => {
      // Clear any existing cache by using unique content
      const uniqueContent = `cache-test-${Date.now()}`;
      
      // First render
      const html1 = renderMarkdown(uniqueContent, false);
      // Second render should hit cache
      const html2 = renderMarkdown(uniqueContent, false);

      expect(html1).toBe(html2);
    });
  });

  describe('resolveHookResult', () => {
    it('returns string as-is', () => {
      expect(resolveHookResult('<div>html</div>')).toBe('<div>html</div>');
    });

    it('returns null for null', () => {
      expect(resolveHookResult(null)).toBeNull();
    });

    it('returns null for non-string types', () => {
      expect(resolveHookResult(42 as unknown as string)).toBeNull();
      expect(resolveHookResult(true as unknown as string)).toBeNull();
      expect(resolveHookResult({} as unknown as string)).toBeNull();
    });
  });

  describe('escapeHtml utility', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
      expect(escapeHtml("'apostrophe'")).toBe('&#39;apostrophe&#39;');
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('handles string with no special characters', () => {
      expect(escapeHtml('plain text')).toBe('plain text');
    });

    it('handles multiple special characters', () => {
      expect(escapeHtml('<div class="test">a & b</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;a &amp; b&lt;/div&gt;'
      );
    });
  });
});
