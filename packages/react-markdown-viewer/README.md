<p align="center">
  <img src="./assets/logo.png" alt="react-markdown-viewer" width="80" />
</p>

<h1 align="center">@typefm/react-markdown-viewer</h1>

<p align="center">
  <strong>High-performance React component for rendering markdown with streaming support</strong>
  <br />
  <em>GitHub-style rendering optimized for LLM chat interfaces</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19+-087ea4" alt="React 19+" />
  <img src="https://img.shields.io/badge/typescript-5+-3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
  <img src="https://img.shields.io/badge/styling-GitHub%20Primer-24292f" alt="GitHub Primer" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#security">Security</a> •
  <a href="#demo">Demo</a>
</p>

---

## Features

- **GitHub-Style Rendering** — Visual parity with GitHub's markdown using Primer design tokens
- **Streaming Support** — Optimized for real-time LLM output with adaptive throttling and DOM morphing
- **Element-Level Diffing** — Skips unchanged blocks during streaming (~99% skip rate)
- **Syntax Highlighting** — GitHub Prettylights theme, 40+ languages via highlight.js with dynamic loading
- **Math Rendering** — KaTeX with lazy loading
- **Color Previews** — Auto-detects hex, rgb, hsl colors and shows visual swatches
- **GitHub Flavored Markdown** — Tables, task lists, strikethrough, alerts, footnotes
- **Smart Caching** — LRU caches for rendered content, syntax highlighting, and KaTeX output
- **Cursor Animation** — Blinking cursor during streaming with focus-aware styling
- **Dark Mode** — CSS-based theming (Tailwind `.dark`, `data-theme`, or OS preference)
- **Error Boundary** — Built-in error handling with customizable fallback UI
- **Markdown Healing** — `healMarkdown()` closes unclosed delimiters during streaming

## Architecture

See **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** for the full internal architecture:

- Rendering pipeline (markdown → WASM parse → sanitize → post-process → DOM)
- Dual rendering modes (static `dangerouslySetInnerHTML` vs streaming Idiomorph morphing)
- WASM initialization, streaming throttling, cursor system
- Caching strategy, hook system, lazy loading

```
Markdown → comrak-wasm → HTML → Sanitization → Post-Processing → DOM
               │                      │
          GFM Extensions          • KaTeX math
          • Tables                • Syntax highlighting
          • Task lists            • Color previews
          • Alerts                • Link security
          • Math syntax           • Copy buttons
```

## Installation

```bash
pnpm add @typefm/react-markdown-viewer
```

Requires React 19:

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Usage

```tsx
import { initMarkdownViewer, MarkdownViewer } from '@typefm/react-markdown-viewer';
import '@typefm/react-markdown-viewer/styles.css';
import 'katex/dist/katex.min.css';

// Initialize WASM once at app startup
await initMarkdownViewer();

function ChatMessage({ content, isStreaming }) {
  return (
    <MarkdownViewer
      text={content}
      isStreaming={isStreaming}
      throttleMs={50}
    />
  );
}
```

### With Error Boundary

```tsx
import { MarkdownViewerSafe } from '@typefm/react-markdown-viewer';

<MarkdownViewerSafe
  text={content}
  isStreaming={isStreaming}
  fallback={<div>Failed to render markdown</div>}
  onError={(error) => console.error(error)}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | Markdown source text |
| `isStreaming` | `boolean` | `false` | Enable streaming mode (throttling + cursor) |
| `throttleMs` | `number` | `50` | Minimum ms between updates during streaming |
| `className` | `string` | — | Additional CSS class names |
| `onStreamingEnd` | `() => void` | — | Callback when streaming ends |
| `hooks` | `RenderHooks` | — | Customize element rendering |

## Render Hooks

Customize how specific markdown elements are rendered:

```tsx
import { MarkdownViewer, escapeHtml, type RenderHooks } from '@typefm/react-markdown-viewer';

const hooks: RenderHooks = {
  onCodeBlock: ({ code, language }) => {
    if (language === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }
    return null; // use default
  },
  onLink: ({ href, text }) => {
    if (href.includes('youtube.com')) {
      return `<div class="youtube-embed">...</div>`;
    }
    return null; // use default
  },
  onRender: (html) => html.replace(/TODO/g, '<mark>TODO</mark>'),
};

<MarkdownViewer text={content} hooks={hooks} />
```

**Return `string`** for custom HTML, **`null`** to use the default processor.

Available hooks: `onCodeBlock`, `onInlineCode`, `onMath`, `onTable`, `onLink`, `onImage`, `onHeading`, `onBlockquote`, `onAlert`, `onList`, `onHorizontalRule`, `onFootnoteRef`, `onFootnoteDef`, `onRender`.

## Security

See **[docs/SECURITY.md](./docs/SECURITY.md)** for complete security documentation.

7-layer defense-in-depth against XSS:

1. **Comrak tagfilter** — escapes `<script>`, `<iframe>`, `<style>`, etc.
2. **Tag removal** — removes `<object>`, `<embed>`, `<form>`, `<meta>`, etc.
3. **Tag unwrapping** — strips `<noscript>`, `<template>` (keeps content)
4. **Event handler filter** — strips all `on*` attributes
5. **URL sanitizer** — blocks `javascript:`, `vbscript:`, `data:`, `file:` schemes
6. **DOM clobbering filter** — removes dangerous `name`/`id` values
7. **SVG sanitizer** — removes SVG with embedded scripts or event handler injection

```tsx
// Safe to render untrusted content
<MarkdownViewer text={userInput} />
```

## Styling

See **[docs/STYLING.md](./docs/STYLING.md)** for complete styling documentation.

```tsx
import '@typefm/react-markdown-viewer/styles.css';
```

Dark mode works automatically via `.dark` class, `data-theme="dark"`, or OS preference. Override CSS custom properties on `.markdown-viewer` to customize colors, fonts, and cursor.

## Demo

```bash
cd packages/react-markdown-viewer
pnpm install
pnpm dev
```

The playground includes:

- **Playground** — Full showcase, AI chat simulation, stress test, edge cases, deferred loading, mermaid diagrams, image gallery
- **GitHub Comparison** — Side-by-side rendering comparison with GitHub's Markdown API

## Testing

```bash
pnpm test
```

Test coverage includes: parser rendering, XSS prevention, streaming edge cases, DOM morphing, syntax highlighting, KaTeX lazy loading, component API, error boundary, cursor placement, and DoS prevention.

## Dependencies

| Package | Purpose | Loading |
|---------|---------|---------|
| `@typefm/comrak-wasm` | Markdown parser (Rust/WASM) | Requires init |
| `highlight.js` | Syntax highlighting | Core bundled, languages lazy loaded |
| `katex` | Math rendering | Lazy loaded |
| `idiomorph` | DOM morphing | Bundled |

## License

MIT
