// Edge case definitions with key fragments for testing
// Tests use toContain() to verify these fragments exist in DOM output
//
// NOTE: Automated tests use jsdom, while the dev UI uses the real browser DOM.
// jsdom and browsers may produce slightly different innerHTML output (whitespace,
// attribute ordering, etc.). Using key fragments with toContain() makes tests
// resilient to these minor differences.

// Note: jsdom normalizes boolean attributes to data-cursor=""
export const CURSOR = '<span class="cursor cursor-active" data-cursor=""></span>';

export interface EdgeCase {
  id: string;
  name: string;
  description: string;
  input: string;
  streamingOutput: string;
  nonStreamingOutput: string;
  /** Skip this case in automated sync tests (e.g., requires async loading) */
  skipAutoTest?: boolean;
}

export const EDGE_CASES: EdgeCase[] = [
  {
    id: "paragraph",
    name: "Paragraph",
    description: "Cursor inline at end of text",
    input: "Hello world",
    streamingOutput: `<p>Hello world${CURSOR}</p>`,
    nonStreamingOutput: "<p>Hello world</p>",
  },
  {
    id: "heading",
    name: "Heading",
    description: "Cursor after heading text",
    input: "# Hello World",
    streamingOutput: `Hello World${CURSOR}</h1>`,
    nonStreamingOutput: "Hello World</h1>",
  },
  {
    id: "emphasis",
    name: "Emphasis",
    description: "Bold and italic text",
    input: "**Bold** and *italic* and ***both***.",
    streamingOutput: `<strong>Bold</strong> and <em>italic</em> and <em><strong>both</strong></em>.${CURSOR}</p>`,
    nonStreamingOutput:
      "<strong>Bold</strong> and <em>italic</em> and <em><strong>both</strong></em>.</p>",
  },
  {
    id: "inline-code",
    name: "Inline Code",
    description: "Code in paragraph",
    input: "Use `const` or `let` to declare variables.",
    streamingOutput: `<code>const</code> or <code>let</code> to declare variables.${CURSOR}</p>`,
    nonStreamingOutput:
      "<code>const</code> or <code>let</code> to declare variables.</p>",
  },
  {
    id: "link",
    name: "Link",
    description: "Markdown link",
    input: "Visit [Example](https://example.com) for more.",
    streamingOutput: `<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a> for more.${CURSOR}</p>`,
    nonStreamingOutput:
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a> for more.</p>',
  },
  {
    id: "image",
    name: "Image",
    description: "Markdown image",
    input: "![Alt text](https://via.placeholder.com/150)",
    streamingOutput: `<img src="https://via.placeholder.com/150" alt="Alt text">${CURSOR}</p>`,
    nonStreamingOutput:
      '<img src="https://via.placeholder.com/150" alt="Alt text"></p>',
  },
  {
    id: "code-fence-just-backticks",
    name: "Code Fence (just backticks)",
    description: "Cursor injected into empty code element",
    input: "```",
    streamingOutput: `<pre><code>${CURSOR}</code></pre></div>`,
    nonStreamingOutput: "<pre><code></code></pre></div>",
  },
  {
    id: "code-fence-empty-with-lang",
    name: "Code Fence (empty with language)",
    description: "Empty code block with language",
    input: "```python\n",
    // Note: data-hljs-pending attribute may be present when language is loading
    streamingOutput: `<pre><code class="language-python">${CURSOR}</code></pre></div>`,
    nonStreamingOutput:
      '<pre><code class="language-python"></code></pre></div>',
  },
  {
    id: "code-fence-empty-no-lang",
    name: "Code Fence (empty no language)",
    description: "Empty code block without language",
    input: "```\n",
    streamingOutput: `<pre><code>${CURSOR}</code></pre></div>`,
    nonStreamingOutput: "<pre><code></code></pre></div>",
  },
  {
    id: "code-fence-unclosed",
    name: "Code Fence (unclosed)",
    description: "Streaming mid-code-block",
    input: "```javascript\nlet value = 42;",
    // With syntax highlighting, content has hljs spans
    streamingOutput: `</span>${CURSOR}</code></pre></div>`,
    nonStreamingOutput: "</code></pre></div>",
  },
  {
    id: "code-fence-unclosed-with-quote",
    name: "Code Fence (unclosed with quote)",
    description:
      "Content ending with quote character should not relocate cursor",
    input: "```\n// Error: Argument of type '",
    // No language specified, so no highlighting, just raw text.
    // healMarkdown closes the fence; cursor goes on its own line before closing fence.
    streamingOutput: `<span class="code-line">// Error: Argument of type '</span>\n<span class="code-line"></span>${CURSOR}</code></pre></div>`,
    nonStreamingOutput: ">// Error: Argument of type '</code></pre></div>",
  },
  {
    id: "code-fence-closed",
    name: "Code Fence (closed)",
    description: "Complete code block",
    input: "```typescript\nconst x = 1;\n```\n",
    // Note: With syntax highlighting, content has hljs spans
    // Check for structure and cursor placement
    streamingOutput: `</code></pre></div>${CURSOR}`,
    nonStreamingOutput: "</code></pre></div>",
  },
  {
    id: "code-fence-closed-empty",
    name: "Code Fence (closed empty)",
    description:
      "Empty code block with closing fence - cursor should not show fence as content",
    input: "```haskell\n```",
    // Cursor should be outside code block, fence should NOT appear as content
    // Empty <p> wrapper is stripped, cursor appears directly after code block
    streamingOutput: `<code class="language-haskell"></code></pre></div>${CURSOR}`,
    nonStreamingOutput: '<code class="language-haskell"></code></pre></div>',
  },
  {
    id: "code-fence-unknown-language",
    name: "Code Fence (unknown language)",
    description: "Non-existent language falls back to plain text",
    input: "```xxx\nsome code here\n```\n",
    // Unknown language renders as escaped plain text (no highlighting)
    streamingOutput: `<span class="code-line">some code here</span></code></pre></div>${CURSOR}`,
    nonStreamingOutput: ">some code here</code></pre></div>",
  },
  {
    id: "table-complete",
    name: "Table (complete)",
    description: "Table with trailing newlines",
    input: "| A | B |\n|---|---|\n| 1 | 2 |\n\n",
    streamingOutput: `</table></div>${CURSOR}`,
    nonStreamingOutput:
      "<td>1</td>\n<td>2</td>\n</tr>\n</tbody>\n</table></div>",
  },
  {
    id: "table-no-newline",
    name: "Table (no trailing newline)",
    description: "Cursor appended after table",
    input: "| A | B |\n|---|---|\n| 1 | 2 |",
    streamingOutput: `</table></div>${CURSOR}`,
    nonStreamingOutput:
      "<td>1</td>\n<td>2</td>\n</tr>\n</tbody>\n</table></div>",
  },
  {
    id: "table-forming",
    name: "Table (incomplete syntax)",
    description: "Missing separator - renders as text",
    input: "| A | B |\n| 1 | 2 |",
    streamingOutput: `| A | B |<br>\n| 1 | 2 |${CURSOR}</p>`,
    nonStreamingOutput: "| A | B |<br>\n| 1 | 2 |</p>",
  },
  {
    id: "blockquote",
    name: "Blockquote",
    description: "Simple blockquote",
    input: "> This is a quote",
    streamingOutput: `<blockquote>\n<p>This is a quote${CURSOR}</p>\n</blockquote>`,
    nonStreamingOutput: "<blockquote>\n<p>This is a quote</p>\n</blockquote>",
  },
  {
    id: "blockquote-multiline",
    name: "Blockquote (multiline)",
    description: "Blockquote spanning lines",
    input: "> This is a quote\n> spanning multiple lines",
    streamingOutput: `This is a quote<br>\nspanning multiple lines${CURSOR}</p>\n</blockquote>`,
    nonStreamingOutput:
      "This is a quote<br>\nspanning multiple lines</p>\n</blockquote>",
  },
  {
    id: "blockquote-nested",
    name: "Blockquote (nested)",
    description: "Nested blockquote structure",
    input: "> Level 1\n> > Level 2\n> > > Level 3",
    streamingOutput: `<p>Level 3${CURSOR}</p>\n</blockquote>\n</blockquote>\n</blockquote>`,
    nonStreamingOutput:
      "<p>Level 3</p>\n</blockquote>\n</blockquote>\n</blockquote>",
  },
  {
    id: "list-simple",
    name: "List (simple)",
    description: "Unordered list",
    input: "- Item 1\n- Item 2\n- Item 3",
    streamingOutput: `<li>Item 3${CURSOR}</li>\n</ul>`,
    nonStreamingOutput: "<li>Item 3</li>\n</ul>",
  },
  {
    id: "list-nested",
    name: "List (nested)",
    description: "List with nested items",
    input: "- Parent\n  - Child 1\n  - Child 2",
    streamingOutput: `<li>Child 2${CURSOR}</li>\n</ul>`,
    nonStreamingOutput: "<li>Child 2</li>\n</ul>",
  },
  {
    id: "task-list",
    name: "Task List",
    description: "Checkboxes in list",
    input: "- [ ] Unchecked\n- [x] Checked",
    streamingOutput: `<input type="checkbox" class="task-list-item-checkbox" checked="" disabled=""> Checked${CURSOR}</li>`,
    nonStreamingOutput:
      '<input type="checkbox" class="task-list-item-checkbox" checked="" disabled=""> Checked</li>',
  },
  {
    id: "horizontal-rule",
    name: "Horizontal Rule",
    description: "Thematic break",
    input: "Above\n\n---\n\nBelow",
    streamingOutput: `<p>Above</p><hr><p>Below${CURSOR}</p>`,
    nonStreamingOutput: "<p>Above</p>\n<hr>\n<p>Below</p>",
  },
  {
    id: "math-inline",
    name: "Math (inline)",
    description: "Inline math",
    input: "The formula $x^2 + y^2 = r^2$ describes a circle.",
    streamingOutput: `<p>The formula <span class="math-placeholder" data-math-style="inline">x^2 + y^2 = r^2</span> describes a circle.${CURSOR}</p>`,
    nonStreamingOutput:
      '<p>The formula <span class="math-placeholder" data-math-style="inline">x^2 + y^2 = r^2</span> describes a circle.</p>',
  },
  {
    id: "math-block",
    name: "Math (block)",
    description: "Display math (unwrapped from <p>)",
    input: "$$\nE = mc^2\n$$",
    streamingOutput: `<span class="math-placeholder" data-math-style="display">\nE = mc^2\n</span>`,
    nonStreamingOutput:
      '<span class="math-placeholder" data-math-style="display">\nE = mc^2\n</span>',
  },
  {
    id: "alert-note",
    name: "Alert (note)",
    description: "GitHub-style note",
    input: "> [!NOTE]\n> This is a note.",
    streamingOutput: `<p class="markdown-alert-title">Note</p>\n<p>This is a note.${CURSOR}</p>`,
    nonStreamingOutput:
      '<p class="markdown-alert-title">Note</p>\n<p>This is a note.</p>',
  },
  {
    id: "alert-warning",
    name: "Alert (warning)",
    description: "GitHub-style warning",
    input: "> [!WARNING]\n> This is a warning.",
    streamingOutput: `<p class="markdown-alert-title">Warning</p>\n<p>This is a warning.${CURSOR}</p>`,
    nonStreamingOutput:
      '<p class="markdown-alert-title">Warning</p>\n<p>This is a warning.</p>',
  },
  {
    id: "html-raw",
    name: "Raw HTML",
    description: "Safe HTML tags are allowed",
    input: "<div>Raw HTML</div>",
    // In streaming, cursor appears after the complete tag
    streamingOutput: "<div>Raw HTML</div>" + CURSOR,
    nonStreamingOutput: "<div>Raw HTML</div>",
  },
  {
    id: "empty",
    name: "Empty",
    description: "No content",
    input: "",
    streamingOutput: `${CURSOR}`,
    nonStreamingOutput: "",
  },
  {
    id: "strikethrough-single-tilde",
    name: "Strikethrough (single tilde)",
    description: "Single tilde strikethrough like GitHub",
    input: "Price: ~$99.99~ on sale",
    streamingOutput: `<p>Price: <del>$99.99</del> on sale${CURSOR}</p>`,
    nonStreamingOutput: "<p>Price: <del>$99.99</del> on sale</p>",
  },
  {
    id: "strikethrough-double-tilde",
    name: "Strikethrough (double tilde)",
    description: "Standard GFM double tilde strikethrough",
    input: "Price: ~~$99.99~~ on sale",
    streamingOutput: `<p>Price: <del>$99.99</del> on sale${CURSOR}</p>`,
    nonStreamingOutput: "<p>Price: <del>$99.99</del> on sale</p>",
  },
  // Zero-width character handling tests
  // These characters are escaped to HTML entities during parsing to avoid
  // conflicts with our cursor marker (Word Joiner U+2060). The browser decodes
  // entities back to characters when reading innerHTML, so we test for the
  // decoded characters. See marked.js #2139 for similar issues.
  {
    id: "zero-width-zwsp",
    name: "Zero-width (ZWSP U+200B)",
    description: "ZWSP in source renders correctly without cursor conflict",
    input: "Text\u200Bwith\u200BZWSP",
    // Browser decodes &#8203; back to \u200B when reading innerHTML
    streamingOutput: `<p>Text\u200Bwith\u200BZWSP${CURSOR}</p>`,
    nonStreamingOutput: "<p>Text\u200Bwith\u200BZWSP</p>",
  },
  {
    id: "zero-width-zwnj",
    name: "Zero-width (ZWNJ U+200C)",
    description: "ZWNJ renders correctly",
    input: "Text\u200Cwith\u200CZWNJ",
    streamingOutput: `<p>Text\u200Cwith\u200CZWNJ${CURSOR}</p>`,
    nonStreamingOutput: "<p>Text\u200Cwith\u200CZWNJ</p>",
  },
  {
    id: "zero-width-lrm",
    name: "Zero-width (LRM U+200E)",
    description: "Left-to-right mark renders correctly",
    input: "Text\u200Ewith\u200ELRM",
    streamingOutput: `<p>Text\u200Ewith\u200ELRM${CURSOR}</p>`,
    nonStreamingOutput: "<p>Text\u200Ewith\u200ELRM</p>",
  },
  {
    id: "zero-width-rlm",
    name: "Zero-width (RLM U+200F)",
    description: "Right-to-left mark renders correctly",
    input: "Text\u200Fwith\u200FRLM",
    streamingOutput: `<p>Text\u200Fwith\u200FRLM${CURSOR}</p>`,
    nonStreamingOutput: "<p>Text\u200Fwith\u200FRLM</p>",
  },
  {
    id: "zero-width-bom",
    name: "Zero-width (BOM U+FEFF)",
    description: "Byte order mark in middle of text renders correctly",
    // BOM at start of file is stripped by comrak (standard behavior)
    // Test BOM in middle of text where it's preserved
    input: "Text\uFEFFwith\uFEFFBOM",
    streamingOutput: `<p>Text\uFEFFwith\uFEFFBOM${CURSOR}</p>`,
    nonStreamingOutput: "<p>Text\uFEFFwith\uFEFFBOM</p>",
  },
  {
    id: "zero-width-zwj-preserved",
    name: "Zero-width (ZWJ U+200D preserved)",
    description: "ZWJ preserved for emoji sequences like family emoji",
    input: "Family: 👨\u200D👩\u200D👧\u200D👦",
    // ZWJ is NOT escaped - it must remain for emoji sequences to work
    streamingOutput: `<p>Family: 👨\u200D👩\u200D👧\u200D👦${CURSOR}</p>`,
    nonStreamingOutput: "<p>Family: 👨\u200D👩\u200D👧\u200D👦</p>",
  },
  // KaTeX error centering - display errors should be centered like valid display math
  // jsdom shows placeholder; async component test verifies error wrapper after KaTeX loads
  {
    id: "katex-display-error",
    name: "KaTeX (display error centered)",
    description: "Display-mode KaTeX errors are centered (placeholder before KaTeX loads)",
    input: "$$\\frac{$$",
    // jsdom output: placeholder shown before KaTeX loads async
    // After KaTeX loads in browser, becomes: <span class="katex-display katex-error-display">...
    streamingOutput: `<span class="math-placeholder" data-math-style="display">\\frac{</span>`,
    nonStreamingOutput: `<span class="math-placeholder" data-math-style="display">\\frac{</span>`,
  },
];
