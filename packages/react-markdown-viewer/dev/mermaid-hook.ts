/**
 * Mermaid diagram rendering for streaming markdown
 *
 * Approach: Let mermaid code blocks render as normal code blocks,
 * then replace with rendered diagrams after content stabilizes.
 * Supports automatic theme switching and a copy menu (SVG / PNG / Markdown).
 */

import mermaid from 'mermaid';

let currentTheme: 'light' | 'dark' = 'light';
const svgCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

// --------------------------------------------------------------------------
// Icons (reused from the viewer's copy button pattern)
// --------------------------------------------------------------------------

const COPY_ICON = `<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
const CHECK_ICON = `<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;
const CHEVRON_ICON = `<svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

const COPY_MENU_HTML =
  `<div class="mermaid-copy-menu">` +
    `<button type="button" class="mermaid-copy-btn" aria-label="Copy diagram">` +
      `${COPY_ICON}${CHECK_ICON}${CHEVRON_ICON}` +
    `</button>` +
    `<div class="mermaid-copy-dropdown">` +
      `<button type="button" class="mermaid-copy-option" data-format="svg">SVG</button>` +
      `<button type="button" class="mermaid-copy-option" data-format="png">PNG</button>` +
      `<button type="button" class="mermaid-copy-option" data-format="markdown">Markdown</button>` +
    `</div>` +
  `</div>`;

// --------------------------------------------------------------------------
// Init / render
// --------------------------------------------------------------------------

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

    if (!svg || svg.includes('-Infinity') || svg.includes('NaN')) {
      return null;
    }

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
      div.innerHTML = COPY_MENU_HTML + `<div class="mermaid-diagram">${svg}</div>`;
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

// --------------------------------------------------------------------------
// Copy click handler (event delegation)
// --------------------------------------------------------------------------

const copyTimeoutIds = new Set<number>();

function showCopied(el: Element) {
  el.classList.add('copied');
  const id = window.setTimeout(() => {
    el.classList.remove('copied');
    copyTimeoutIds.delete(id);
  }, 2000);
  copyTimeoutIds.add(id);
}

function closeMenus(container: HTMLElement, except?: Element | null) {
  if (!container.querySelector('.mermaid-copy-menu.open')) return;
  container.querySelectorAll('.mermaid-copy-menu.open').forEach((m) => {
    if (m !== except) m.classList.remove('open');
  });
}

/** Convert an SVG string to a PNG blob via offscreen canvas */
async function svgToPngBlob(svgString: string, scale = 2): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.documentElement;

  // Resolve dimensions: explicit attrs → viewBox → style max-width → fallback
  let width = parseFloat(svgEl.getAttribute('width') || '0');
  let height = parseFloat(svgEl.getAttribute('height') || '0');

  if (!width || !height) {
    const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    if (vb && vb.length === 4) {
      width = width || vb[2];
      height = height || vb[3];
    }
  }

  if (!width) {
    const maxW = svgEl.style.maxWidth;
    if (maxW) width = parseFloat(maxW);
  }

  width = width || 800;
  height = height || 600;

  // Ensure the SVG has explicit width/height so the <img> renders at the right size
  svgEl.setAttribute('width', String(width));
  svgEl.setAttribute('height', String(height));
  const fixedSvg = new XMLSerializer().serializeToString(svgEl);

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Data URL avoids the cross-origin taint that blob URLs cause
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fixedSvg);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    );
  });
}

/**
 * Attach to a container's click event to handle mermaid copy menu interactions.
 *
 * Usage: `container.addEventListener('click', handleMermaidCopyClick)`
 */
export function handleMermaidCopyClick(event: Event) {
  const target = event.target as HTMLElement;
  const container = event.currentTarget as HTMLElement;

  // ── Dropdown option ───────────────────────────────────────────
  const option = target.closest('.mermaid-copy-option') as HTMLButtonElement | null;
  if (option) {
    const format = option.dataset.format;
    const menu = option.closest('.mermaid-copy-menu');
    const rendered = menu?.closest('.mermaid-rendered');
    if (!rendered || !menu) return;

    const code = rendered.getAttribute('data-mermaid-code') ?? '';
    const svgHtml = rendered.querySelector('.mermaid-diagram')?.innerHTML ?? '';

    const done = () => {
      menu.classList.remove('open');
      showCopied(menu);
    };
    const fail = (err: unknown) =>
      console.error('Failed to copy mermaid diagram:', err);

    switch (format) {
      case 'svg':
        navigator.clipboard.writeText(svgHtml).then(done).catch(fail);
        break;
      case 'png':
        // Pass the blob as a promise to ClipboardItem so the write()
        // call happens synchronously within the user gesture context.
        navigator.clipboard
          .write([
            new ClipboardItem({ 'image/png': svgToPngBlob(svgHtml) }),
          ])
          .then(done)
          .catch(fail);
        break;
      case 'markdown':
        navigator.clipboard
          .writeText('```mermaid\n' + code + '\n```')
          .then(done)
          .catch(fail);
        break;
      default:
        return;
    }
    return;
  }

  // ── Toggle dropdown button ────────────────────────────────────
  const copyBtn = target.closest('.mermaid-copy-btn') as HTMLButtonElement | null;
  if (copyBtn) {
    const menu = copyBtn.closest('.mermaid-copy-menu');
    closeMenus(container, menu);
    menu?.classList.toggle('open');
    return;
  }

  // ── Click outside — close open menus ──────────────────────────
  closeMenus(container);
}

// --------------------------------------------------------------------------
// Styles
// --------------------------------------------------------------------------

/** CSS styles for rendered Mermaid diagrams + copy menu */
export const mermaidStyles = `
/* Diagram container */
.mermaid-rendered {
  position: relative;
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

/* Copy menu — mirrors the table-copy-menu pattern */
.mermaid-copy-menu {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.mermaid-copy-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 6px;
  background: var(--bgColor-default, #fff);
  color: var(--fgColor-muted, #656d76);
  cursor: pointer;
  opacity: 0;
  will-change: opacity;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mermaid-rendered:hover .mermaid-copy-btn {
  opacity: 1;
}

.mermaid-copy-btn:hover {
  background: var(--bgColor-muted, #f6f8fa);
  color: var(--fgColor-default, #1f2328);
}

.mermaid-copy-btn:active {
  transform: scale(0.95);
}

/* Icon states */
.mermaid-copy-btn .copy-icon,
.mermaid-copy-btn .check-icon,
.mermaid-copy-btn .chevron-icon {
  flex-shrink: 0;
}

.mermaid-copy-btn .check-icon {
  display: none;
}

.mermaid-copy-menu.copied .mermaid-copy-btn .copy-icon,
.mermaid-copy-menu.copied .mermaid-copy-btn .chevron-icon {
  display: none;
}

.mermaid-copy-menu.copied .mermaid-copy-btn .check-icon {
  display: block;
  color: #22c55e;
}

.mermaid-copy-menu.copied .mermaid-copy-btn {
  opacity: 1;
}

/* Dropdown */
.mermaid-copy-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 110px;
  padding: 4px;
  border: 1px solid var(--borderColor-default, #d0d7de);
  border-radius: 8px;
  background: var(--bgColor-default, #fff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  flex-direction: column;
}

.mermaid-copy-menu.open .mermaid-copy-dropdown {
  display: flex;
}

.mermaid-copy-menu.open .mermaid-copy-btn {
  opacity: 1;
}

/* Dropdown items */
.mermaid-copy-option {
  display: block;
  width: 100%;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--fgColor-default, #1f2328);
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
}

.mermaid-copy-option:hover {
  background: var(--bgColor-muted, #f6f8fa);
}

.mermaid-copy-option:active {
  background: var(--borderColor-default, #d0d7de);
}
`;
