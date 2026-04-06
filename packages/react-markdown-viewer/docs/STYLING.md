# Styling

## Design System

Styles are based on GitHub's Primer design system. All styling uses CSS custom properties for theming, with no runtime CSS-in-JS.

## Theme Support

Three detection methods, in priority order:

1. **Manual class**: `.dark` on parent element
2. **Data attribute**: `data-theme="dark"` on parent element
3. **System preference**: `prefers-color-scheme: dark` media query

```html
<!-- Method 1: Class -->
<div class="dark">
  <MarkdownViewer text="..." />
</div>

<!-- Method 2: Data attribute (next-themes compatible) -->
<div data-theme="dark">
  <MarkdownViewer text="..." />
</div>

<!-- Method 3: Automatic (no wrapper needed) -->
<MarkdownViewer text="..." />
```

## CSS Custom Properties

Override on `.markdown-viewer` to customize:

```css
.markdown-viewer {
  /* Colors */
  --bgColor-default: #ffffff;
  --bgColor-muted: #f6f8fa;
  --fgColor-default: #1f2328;
  --fgColor-muted: #656d76;
  --fgColor-accent: #0969da;

  /* Borders */
  --borderColor-default: #d1d9e0;
  --borderColor-muted: #d8dee4;

  /* Typography */
  --fontStack-monospace: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
  --base-text-weight-semibold: 600;

  /* Cursor */
  --cursor-color: #f5a1ff;
}
```

## Style Files

| File | Purpose |
|------|---------|
| `viewer.css` | Core layout, typography, dark mode, cursor animation, copy menus |
| `hljs.css` | Prettylights syntax highlighting theme (light + dark) |
| `alerts.css` | GitHub-style alerts (NOTE, TIP, WARNING, CAUTION, IMPORTANT) |
| `katex.css` | Math rendering adjustments |
| `index.css` | Import manifest |
| `dotted.svg` | Table shadow dot pattern |

## Importing Styles

```typescript
// Import all styles
import '@typefm/react-markdown-viewer/styles.css';

// KaTeX styles (separate — from katex package)
import 'katex/dist/katex.min.css';
```

## Key Visual Elements

### Tables

Tables use a dotted shadow pattern inspired by turbopuffer.com:

- `table-wrapper` div with `::after` pseudo-element
- Dotted SVG pattern offset 6px bottom-right
- 0.2 opacity (light mode), inverted white dots in dark mode
- Table header cells have the same dotted pattern as background texture (`background-blend-mode: overlay`)
- Alternating row colors via `nth-child(2n)`

### Code Blocks

- Wrapped in `.code-block-wrapper` with copy button
- Copy button: SVG clipboard icon, transitions to checkmark on copy
- Rounded corners (6px)
- Syntax highlighting via Prettylights theme (GitHub's color scheme)
- Line wrapping with `.code-line` spans during streaming

### Cursor

```css
.cursor::after {
  content: "";
  display: inline-block;
  width: 0.6em;
  background-color: var(--cursor-color);  /* #f5a1ff */
  animation: cursor-blink var(--cursor-blink-duration) step-end infinite;
}

/* Solid (no blink) while actively streaming */
.cursor.cursor-active::after {
  animation: none;
}
```

### Alerts

GitHub-style callout boxes with colored left border and icon:

- `[!NOTE]` — blue
- `[!TIP]` — green
- `[!IMPORTANT]` — purple
- `[!WARNING]` — yellow
- `[!CAUTION]` — red

### Syntax Highlighting

Uses the Prettylights theme (GitHub's own syntax colors):

- Light mode: dark text on white
- Dark mode: light text on dark background
- Color previews: inline swatches for hex/rgb/hsl values in code

## Accessibility

- `role="article"` on root element
- `aria-label="Markdown content"` (customizable via props)
- `aria-busy={isStreaming}` during streaming
- `tabIndex={0}` for keyboard focus
- `data-state="streaming" | "idle"` for state-based styling

## Responsive Behavior

No breakpoint-specific overrides in the library. The viewer fills its container width with `max-width: 100%` on tables and code blocks. Consumers control layout via their own CSS.
