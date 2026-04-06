# Security

## Threat Model

This library renders user-provided and LLM-generated markdown as HTML via `dangerouslySetInnerHTML`. The primary threat is Cross-Site Scripting (XSS) — malicious content injected through markdown that executes in the user's browser.

## Defense Layers

The sanitization pipeline has 7 layers, applied in order after comrak generates HTML:

### Layer 1: Comrak Tagfilter

Comrak's built-in `tagfilter` extension escapes dangerous HTML tags by converting `<` to `&lt;`:

`<script>`, `<style>`, `<title>`, `<textarea>`, `<xmp>`, `<iframe>`, `<noembed>`, `<noframes>`, `<plaintext>`

### Layer 2: Dangerous Tag Removal

Tags not covered by comrak's tagfilter are removed completely (with content):

`object`, `embed`, `form`, `button`, `select`, `meta`, `link`, `base`, `applet`, `frame`, `frameset`, `layer`, `ilayer`, `bgsound`, `xml`, `blink`, `marquee`

Non-checkbox `<input>` elements are also removed. Checkbox inputs are preserved for task lists.

### Layer 3: Tag Unwrapping

These tags are removed but their content is preserved:

`noscript`, `template`

### Layer 4: Event Handler Stripping

All `on*` event handler attributes are removed from every HTML tag:

```
onclick, onerror, onload, onmouseover, onfocus, onanimationend,
ontransitionend, onwheel, oncopy, onpaste, oncut, ondrag,
onpointerover, ontoggle, ...
```

Matches quoted (`"..."`, `'...'`) and unquoted attribute values.

### Layer 5: Dangerous URL Sanitization

URL attributes (`href`, `src`, `srcset`, `action`, `formaction`, `data`, `xlink:href`) are replaced with `#` if they contain dangerous schemes:

- `javascript:` — script execution
- `vbscript:` — IE script execution
- `data:` — inline content (can contain HTML/scripts)
- `file:` — local filesystem access

### Layer 6: Style Sanitization

Style attributes containing dangerous CSS are removed:

- `expression()` — IE CSS expressions
- `javascript:` — CSS url() with script
- `behavior` — IE HTC behaviors
- `binding` — XBL bindings
- `@import` — external stylesheet injection
- `url()` — external resource loading

### Layer 7: DOM Clobbering Prevention

`name` and `id` attributes with values that could shadow global JavaScript objects are removed:

`document`, `window`, `location`, `self`, `top`, `parent`, `frames`, `opener`, `navigator`, `history`, `screen`, `alert`, `confirm`, `prompt`, `eval`, `Function`, `constructor`, `prototype`, `__proto__`, `hasOwnProperty`, `toString`, `valueOf`, `href`, `src`, `cookie`, `domain`

## Additional Protections

### SVG Sanitization

SVG elements containing any of the following are removed entirely:

- `<script>` tags
- `on*` event handler attributes
- `javascript:` URLs
- `attributeName` targeting `on*` event handlers (prevents `<set attributeName="onmouseover">` attacks)

### Link Hardening

External links (not starting with `#` or `/`) automatically receive:

```html
<a href="..." target="_blank" rel="noopener noreferrer">
```

### Code Block Safety

Code inside fenced blocks and inline code is HTML-escaped by comrak before reaching the sanitizer. The content is safe by construction — no additional sanitization needed.

### KaTeX Safety

Math content is rendered by KaTeX with `throwOnError: false` and `trust: true`. The `trust` option enables `\href` and `\url` commands — but any `javascript:` URLs in the rendered output are caught by Layer 5 (link processing runs after math processing).

## What Is NOT Sanitized

- **`ftp:` URLs** — allowed through (safe, browser handles)
- **Custom protocol handlers** (`custom-app://...`) — allowed through
- **Protocol-relative URLs** (`//evil.com/...`) — treated as relative (start with `/`)
- **Homograph attacks** (Cyrillic `а` vs Latin `a`) — browser shows punycode
- **Content Security Policy** — not set by the library; consumers should configure CSP headers

## Test Coverage

Security tests are in `tests/unit/parser.security.test.ts` covering:

- Script injection (direct, mixed case, whitespace, nested)
- Event handler stripping (all common handlers)
- JavaScript/vbscript URL blocking
- Data URL handling
- SVG injection vectors (onload, script, foreignObject, use href, animate, set attributeName)
- Style injection (expression, behavior, @import)
- HTML tag injection (iframe, object, embed, form, input, textarea, button, meta, link, base)
- Link safety (rel attributes, target, special characters, unicode)
- Code block escaping
- Image safety (malformed URLs, javascript URLs, alt/title XSS)
- Math/KaTeX safety
- Table cell XSS
- DOM clobbering (name, id, form-based, anchor-based)
- Template injection (template literals, Angular/Vue/ERB syntax)
- Protocol handler blocking (file:, data:)
- Unicode/encoding attacks (escape sequences, HTML entities, hex encoding, null bytes, RTL override, homographs, zero-width chars)
- Mutation XSS (noscript, textarea, title, style, xmp, math/svg namespace)
- Attribute injection (quote breaking, backtick delimiters, unquoted, newline/tab injection)
- Sanitizer bypass attempts (nested handlers, entity-encoded equals, srcset, formaction)
- HTML5 vectors (details/summary, video/audio, source, picture, marquee)
- CSS attacks (-moz-binding, behavior, @import)
- Markdown-specific injection (blockquotes, lists, headings, link text, footnotes, alerts, description lists)
- Task list checkbox preservation
- DoS prevention (long input, many links, regex patterns)
