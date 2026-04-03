/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MarkdownViewer, type MarkdownViewerRef } from '../../src/MarkdownViewer';
import { preloadKaTeX } from '../../src/lib/parser';
import { createRef } from 'react';

describe('MarkdownViewer component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render empty when no text provided', () => {
      render(<MarkdownViewer text="" />);
      const viewer = document.querySelector('.markdown-viewer');
      expect(viewer).toBeTruthy();
    });

    it('should render plain text as paragraph', () => {
      render(<MarkdownViewer text="Hello world" />);
      
      const markdown = document.querySelector('.markdown');
      expect(markdown?.innerHTML).toContain('<p>');
      expect(markdown?.innerHTML).toContain('Hello world');
    });

    it('should render headings', () => {
      render(<MarkdownViewer text="# Heading 1" />);
      
      const h1 = document.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toContain('Heading 1');
    });

    it('should render code blocks with copy button', () => {
      render(<MarkdownViewer text={'```\ncode\n```'} />);
      
      const copyBtn = document.querySelector('.copy-btn');
      expect(copyBtn).toBeTruthy();
    });

    it('should render tables wrapped in table-wrapper', () => {
      const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
      render(<MarkdownViewer text={markdown} />);
      
      const wrapper = document.querySelector('.table-wrapper');
      expect(wrapper).toBeTruthy();
      const table = document.querySelector('table');
      expect(table).toBeTruthy();
    });
  });

  describe('props', () => {
    it('should inherit dark theme from parent .dark class', () => {
      // Dark theme is controlled via CSS, not props
      // When a parent has .dark class, the component inherits dark styles
      const { container } = render(
        <div className="dark">
          <MarkdownViewer text="test" />
        </div>
      );
      
      const viewer = container.querySelector('.markdown-viewer');
      expect(viewer).toBeTruthy();
      // The component itself doesn't have .dark class - it inherits from parent via CSS
    });

    it('should apply custom className', () => {
      render(<MarkdownViewer text="test" className="custom-class" />);
      
      const viewer = document.querySelector('.markdown-viewer');
      expect(viewer?.classList.contains('custom-class')).toBe(true);
    });

    it('should have tabIndex for focusability', () => {
      render(<MarkdownViewer text="test" />);
      
      const viewer = document.querySelector('.markdown-viewer');
      expect(viewer?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('streaming mode', () => {
    it('should show cursor when streaming', () => {
      render(<MarkdownViewer text="Hello" isStreaming />);
      
      const cursor = document.querySelector('[data-cursor]');
      expect(cursor).toBeTruthy();
    });

    it('should not show cursor when not streaming', () => {
      render(<MarkdownViewer text="Hello" isStreaming={false} />);
      
      const cursor = document.querySelector('[data-cursor]');
      expect(cursor).toBeFalsy();
    });

    it('should show cursor inside empty code block during streaming', () => {
      // This tests the edge case where streaming produces an empty code fence
      render(<MarkdownViewer text={'```python\n'} isStreaming />);
      
      const cursor = document.querySelector('[data-cursor]');
      expect(cursor).toBeTruthy();
      
      // Cursor should be inside the code element
      const code = document.querySelector('pre code');
      expect(code).toBeTruthy();
      expect(code?.contains(cursor)).toBe(true);
    });

    it('should show cursor inside code block with content during streaming', () => {
      render(<MarkdownViewer text={'```js\nconst x = 1;'} isStreaming />);
      
      const cursor = document.querySelector('[data-cursor]');
      expect(cursor).toBeTruthy();
      
      const code = document.querySelector('pre code');
      expect(code?.textContent).toContain('const x = 1;');
    });
  });

  describe('ref methods', () => {
    it('should expose reset method', () => {
      const ref = createRef<MarkdownViewerRef>();
      render(<MarkdownViewer ref={ref} text="Hello" />);
      
      expect(ref.current?.reset).toBeInstanceOf(Function);
    });

    it('should expose getContainer method', () => {
      const ref = createRef<MarkdownViewerRef>();
      render(<MarkdownViewer ref={ref} text="Hello" />);
      
      const container = ref.current?.getContainer();
      expect(container).toBeInstanceOf(HTMLDivElement);
      expect(container?.classList.contains('markdown')).toBe(true);
    });

    it('should expose focus method', () => {
      const ref = createRef<MarkdownViewerRef>();
      render(<MarkdownViewer ref={ref} text="Hello" />);
      
      expect(ref.current?.focus).toBeInstanceOf(Function);
    });

    it('should focus the wrapper when focus() is called', () => {
      const ref = createRef<MarkdownViewerRef>();
      render(<MarkdownViewer ref={ref} text="Hello" />);
      
      ref.current?.focus();
      
      const viewer = document.querySelector('.markdown-viewer');
      expect(document.activeElement).toBe(viewer);
    });
  });

  describe('copy functionality', () => {
    it('should have copy button in code blocks', () => {
      render(<MarkdownViewer text={'```js\nconst x = 1;\n```'} />);
      
      const copyBtn = document.querySelector('.copy-btn');
      expect(copyBtn).toBeTruthy();
      expect(copyBtn?.getAttribute('aria-label')).toBe('Copy code');
    });
  });

  describe('math rendering', () => {
    beforeAll(async () => {
      await preloadKaTeX();
    });

    it('should render inline math', () => {
      render(<MarkdownViewer text="$x^2$" />);
      
      const katex = document.querySelector('.katex');
      expect(katex).toBeTruthy();
    });

    it('should render display math', () => {
      render(<MarkdownViewer text="$$x^2$$" />);
      
      const katex = document.querySelector('.katex-display');
      expect(katex).toBeTruthy();
    });
  });

  describe('memoization', () => {
    it('should not re-render with same props', () => {
      const { rerender } = render(<MarkdownViewer text="Hello" />);
      
      const markdown1 = document.querySelector('.markdown');
      const content1 = markdown1?.innerHTML;
      
      rerender(<MarkdownViewer text="Hello" />);
      
      const markdown2 = document.querySelector('.markdown');
      const content2 = markdown2?.innerHTML;
      
      expect(content1).toBe(content2);
    });
  });
});
