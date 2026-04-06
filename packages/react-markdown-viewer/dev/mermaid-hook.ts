/**
 * Mermaid diagram rendering for streaming markdown
 *
 * Approach: Let mermaid code blocks render as normal code blocks,
 * then replace with rendered diagrams after content stabilizes.
 * Supports automatic theme switching.
 */

import mermaid from 'mermaid';

let currentTheme: 'light' | 'dark' = 'light';
const svgCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

/** Initialize mermaid with theme */
export function initMermaid(dark: boolean) {
  currentTheme = dark ? 'dark' : 'light';
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    suppressErrorRendering: true,
  });
}

/** Render mermaid code to SVG, with caching */
async function renderToSvg(code: string): Promise<string | null> {
  const cacheKey = `${currentTheme}:${code}`;
  const cached = svgCache.get(cacheKey);
  if (cached) return cached;

  try {
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { svg } = await mermaid.render(id, code);

    // Validate - mermaid can produce invalid SVGs for incomplete diagrams
    if (!svg || svg.includes('-Infinity') || svg.includes('NaN')) {
      return null;
    }

    // LRU eviction
    if (svgCache.size >= MAX_CACHE_SIZE) {
      const firstKey = svgCache.keys().next().value;
      if (firstKey) svgCache.delete(firstKey);
    }
    svgCache.set(cacheKey, svg);
    return svg;
  } catch {
    return null;
  }
}

/** Find and render all mermaid code blocks in a container */
export async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const codeBlocks = container.querySelectorAll(
    '.code-block-wrapper:has(code.language-mermaid):not(.mermaid-rendered)'
  );

  for (const wrapper of codeBlocks) {
    const code = wrapper.querySelector('code.language-mermaid')?.textContent?.trim();
    if (!code) continue;

    const svg = await renderToSvg(code);
    if (svg) {
      const div = document.createElement('div');
      div.className = 'mermaid-rendered';
      div.setAttribute('data-mermaid-code', code);
      div.innerHTML = `<div class="mermaid-diagram">${svg}</div>`;
      wrapper.replaceWith(div);
    }
  }
}

/** Update theme for all rendered mermaid diagrams */
export async function updateMermaidTheme(container: HTMLElement, dark: boolean): Promise<void> {
  initMermaid(dark);

  const rendered = container.querySelectorAll('.mermaid-rendered[data-mermaid-code]');

  for (const element of rendered) {
    const code = element.getAttribute('data-mermaid-code');
    if (!code) continue;

    const svg = await renderToSvg(code);
    if (svg) {
      const diagram = element.querySelector('.mermaid-diagram');
      if (diagram) diagram.innerHTML = svg;
    }
  }
}

/** CSS styles for rendered Mermaid diagrams */
export const mermaidStyles = `
.mermaid-rendered {
  margin: 1rem 0;
}
.mermaid-diagram {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}
`;
