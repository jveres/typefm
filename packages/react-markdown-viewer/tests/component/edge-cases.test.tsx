/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../../src';
import { EDGE_CASES } from '../fixtures/edge-cases';

afterEach(() => {
  cleanup();
});

describe('Edge Cases', () => {
  EDGE_CASES.filter(ec => !ec.skipAutoTest).forEach((ec) => {
    describe(ec.name, () => {
      it(`streaming: ${ec.description}`, () => {
        const { container } = render(
          <MarkdownViewer text={ec.input} isStreaming={true} />
        );
        const html = container.querySelector('.markdown')?.innerHTML ?? '';
        expect(html).toContain(ec.streamingOutput);
      });

      it(`non-streaming: ${ec.description}`, () => {
        const { container } = render(
          <MarkdownViewer text={ec.input} isStreaming={false} />
        );
        const html = container.querySelector('.markdown')?.innerHTML ?? '';
        expect(html).toContain(ec.nonStreamingOutput);
      });
    });
  });

  describe('KaTeX display error centering', () => {
    it('should wrap display-mode KaTeX errors for centering', async () => {
      // Render invalid display math that will trigger a KaTeX error
      const { container } = render(
        <MarkdownViewer text="$$\frac{$$" isStreaming={false} />
      );

      // Wait for KaTeX to load and render the error
      await waitFor(
        () => {
          const html = container.querySelector('.markdown')?.innerHTML ?? '';
          // Check that the error is wrapped with centering classes
          expect(html).toContain('katex-error-display');
        },
        { timeout: 2000 }
      );

      const html = container.querySelector('.markdown')?.innerHTML ?? '';
      expect(html).toContain('katex-display');
      expect(html).toContain('katex-error');
    });
  });
});
