# Architecture

## Overview

`@typefm/react-markdown-viewer` is a high-performance React component for rendering markdown with streaming support, optimized for LLM chat interfaces. It uses `@typefm/comrak-wasm` (Rust-based CommonMark + GFM parser compiled to WebAssembly) for parsing, with Idiomorph for selection-preserving DOM morphing during streaming.

## Rendering Pipeline

```
markdown text
  │
  ├─ [streaming] append cursor marker (U+2060)
  │
  ▼
healMarkdown()          ← close unclosed delimiters (**, ~~, ```, etc.)
  │
  ▼
insertCursorIntoHealed() ← place cursor at writing position
  │
  ▼
mdToHtml()              ← comrak-wasm: markdown → HTML
  │
  ▼
sanitizeHtml()          ← 7-layer XSS prevention
  │
  ▼
post-processors         ← math, code highlighting, tables, links, images,
  │                       headings, blockquotes, alerts, lists, footnotes
  │
  ├─ hook overrides     ← RenderHooks: string | null per element
  │
  ▼
cursor injection        ← replace U+2060 with <span class="cursor">
  │
  ▼
cache result            ← LRU cache (skip if transient content)
  │
  ▼
DOM update
  ├─ [static]    dangerouslySetInnerHTML (fast first paint)
  └─ [streaming] Idiomorph DOM morphing (preserves selection)
```

## Dual Rendering Modes

### Static Mode (`syncMorphEnabled = false`)

Used for initial load when `isStreaming` is `false` and content hasn't been streamed yet.

- Renders via `dangerouslySetInnerHTML` for instant first paint
- No DOM diffing overhead
- Full re-render on content change

### Streaming Mode (`syncMorphEnabled = true`)

Activated when `isStreaming` is `true` or after streaming has occurred. Persists after streaming ends to maintain selection preservation.

- Empty `<div>` rendered by React; content managed by Idiomorph
- Element-level hash comparison (djb2) — ~99% of elements skip morphing
- Preserves text selection, scroll position, and focus
- Adaptive throttling: adjusts update interval based on morph duration

## WASM Initialization

`@typefm/comrak-wasm` requires explicit initialization before use:

```typescript
// Async (recommended — call at app startup)
await initMarkdownViewer();

// Sync (for tests/SSR)
initMarkdownViewerSync({ module: wasmBytes });
```

The `useMarkdownViewer` hook auto-initializes if not already done, subscribing to `onWasmReady()` to trigger re-render when ready.

## Streaming Architecture

### Throttling

Text updates are throttled via `requestAnimationFrame` with a configurable base interval (default 50ms). Adaptive throttling scales the interval based on morph performance:

- Target: morph time should be ≤25% of throttle interval
- Smoothing factor: 0.3 (gradual adjustment)
- Max throttle: 4x base or 200ms, whichever is larger

### Cursor System

- **Marker**: Word Joiner (U+2060) — invisible Unicode character, rarely in source text
- **Healing**: `healMarkdown()` closes unclosed delimiters before parsing
- **Placement**: `insertCursorIntoHealed()` positions cursor at the user's writing position, handling edge cases:
  - Block closers (` ``` `, `$$`) — cursor on own line
  - Table separators — cursor after table via double newline
  - Link closers (`)`) — cursor after, not inside URL
  - Trailing delimiters (`**`, `~~`) — cursor before, to avoid breaking comrak
- **Animation**: CSS-based blinking, solid during active typing, resumes after 500ms idle

### DOM Morphing (Idiomorph)

- Per-container state tracked via `WeakMap` (auto-cleanup on GC)
- Element hashing with djb2 for fast comparison
- Two strategies:
  - `morphContentOptimized()` — streaming: element-level hash diffing
  - `morphContentSync()` — non-streaming: full content morph

## Caching

Unified LRU cache manager with separate caches:

| Cache | Purpose | Eviction |
|-------|---------|----------|
| `renderCacheSync` | Streaming strategy HTML output | By count + bytes |
| `renderCacheAsync` | Static strategy HTML output | By count + bytes |
| `katexCacheDisplay` | Display math KaTeX output | By count + bytes |
| `katexCacheInline` | Inline math KaTeX output | By count + bytes |
| `highlightCache` | Syntax highlighted code | By count + bytes |

Results with cursor markers or math placeholders are **not cached** (transient content).

## Hook System

Hooks allow per-element customization of rendered output:

```typescript
const hooks: RenderHooks = {
  onCodeBlock: ({ code, language }) => `<pre>${escapeHtml(code)}</pre>`,
  onMath: ({ tex, displayMode }) => null, // use default KaTeX
  onRender: (html) => html, // final HTML transformation
};
```

- **Return `string`** — direct HTML insertion (fast)
- **Return `null`** — use default processor
- Per-element hooks (`onCodeBlock`, `onTable`, `onImage`, …) + a final `onRender` transform

## Lazy Loading

- **KaTeX**: Dynamic `import('katex')` on first math encounter. Placeholder shown until loaded, then component re-renders.
- **highlight.js languages**: Dynamic imports per language via `LANGUAGE_LOADERS` map. Fire-and-forget loading with event notification for re-render.
- **Race condition handling**: Both use generation counters / state checks to detect if the async load completed before `useEffect` subscribed.

## File Structure

```
src/
├── index.ts                    Public exports
├── MarkdownViewer.tsx          Main component (memo'd, dual render)
├── ErrorBoundary.tsx           Error boundary wrapper
├── useMarkdownViewer.ts        Core hook (throttling, morphing, cursor)
├── utils.ts                    Cache utilities
├── types/
│   ├── hooks.ts                RenderHooks interface, data types
│   ├── idiomorph.d.ts          Idiomorph type declarations
│   ├── katex.d.ts              KaTeX type declarations
│   └── global.d.ts             process.env types
├── lib/
│   ├── wasm-init.ts            WASM singleton init manager
│   ├── parser.ts               Sanitizer + renderMarkdown pipeline
│   ├── morph.ts                Idiomorph DOM morphing
│   ├── cursor-controller.ts    Cursor blink animation
│   ├── hook-utils.ts           escapeHtml + resolveHookResult
│   ├── cache-manager.ts        LRU cache (10MB budget)
│   ├── highlighter.ts          highlight.js dynamic loading
│   ├── html.ts                 HTML entity decoding
│   └── defaults/
│       ├── code-block.ts       Syntax highlighting + copy button
│       ├── math.ts             KaTeX lazy loading
│       ├── table.ts            Table wrapper + copy menu
│       ├── table-helpers.ts    Table copy format converters (CSV, TSV, Markdown, HTML)
│       ├── link.ts             Link security
│       └── image.ts            Image lazy loading
└── styles/
    ├── index.css               Import manifest
    ├── viewer.css              Core styles (GitHub Primer)
    ├── hljs.css                Syntax highlighting theme
    ├── alerts.css              GitHub-style alerts
    ├── katex.css               Math rendering
    └── dotted.svg              Table shadow pattern
```
