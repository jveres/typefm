// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { MarkdownViewer } from '../../src/MarkdownViewer';
import { cacheManager } from '../../src/lib/cache-manager';

afterEach(() => cleanup());
beforeEach(() => cacheManager.clearAll());

describe('async re-render', () => {
  it('re-renders with KaTeX after load', async () => {
    const { container } = render(
      <MarkdownViewer text={'Inline math: $E = mc^2$'} />
    );
    await waitFor(() => {
      const html = container.querySelector('.markdown')?.innerHTML ?? '';
      expect(html).toContain('katex');
    }, { timeout: 5000 });
  });

  it('re-renders code block with highlighting after language loads', async () => {
    const { container } = render(
      <MarkdownViewer text={'```python\ndef hello():\n    pass\n```'} />
    );

    const getCodeHtml = () => container.querySelector('code')?.innerHTML ?? '';
    console.log('INITIAL:', getCodeHtml().substring(0, 80));

    await waitFor(() => {
      const html = getCodeHtml();
      console.log('POLL:', html.substring(0, 80));
      expect(html).toContain('hljs');
    }, { timeout: 5000 });
  });
});
