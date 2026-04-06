/**
 * Streaming edge case tests for healMarkdown + cursor integration.
 *
 * These test incomplete markdown as it arrives during LLM streaming,
 * asserting exact output to catch structural regressions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	renderMarkdown,
	CURSOR_MARKER,
	CURSOR_HTML,
} from "../../src/lib/parser";
import { cacheManager } from "../../src/lib/cache-manager";

const C = CURSOR_HTML;

/** Render markdown as if streaming (sync morph strategy + cursor marker) */
function renderStreaming(md: string): string {
	return renderMarkdown(md + CURSOR_MARKER, true);
}

describe("streaming edge cases", () => {
	beforeEach(() => {
		cacheManager.clearAll();
	});

	// -----------------------------------------------------------------------
	// 1. Trailing space with incomplete delimiters
	// healMarkdown strips trailing single space, which can desync suffix calc
	// -----------------------------------------------------------------------
	describe("trailing space with incomplete delimiters", () => {
		it.each([
			{ input: "***bold ", expected: `<p><em><strong>bold${C}</strong></em></p>\n` },
			{ input: "**bold ", expected: `<p><strong>bold${C}</strong></p>\n` },
			{ input: "*italic ", expected: `<p><em>italic${C}</em></p>\n` },
			{ input: "~~strike ", expected: `<p><del>strike${C}</del></p>\n` },
			{ input: "`code ", expected: `<p><code>code${C}</code></p>\n` },
			{ input: "__under ", expected: `<p><strong>under${C}</strong></p>\n` },
		])("$input heals correctly", ({ input, expected }) => {
			expect(renderStreaming(input)).toBe(expected);
		});
	});

	// -----------------------------------------------------------------------
	// 2. Cross-paragraph inline formatting
	// Inline delimiters must not span paragraph boundaries (\n\n)
	// -----------------------------------------------------------------------
	describe("cross-paragraph boundary", () => {
		it.each([
			{ delim: "**", label: "bold" },
			{ delim: "*", label: "italic" },
			{ delim: "~~", label: "strikethrough" },
			{ delim: "`", label: "inline code" },
		])("$label opener in first paragraph does not wrap second", ({ delim }) => {
			const html = renderStreaming(`${delim}text\n\nmore`);
			expect(html).toBe(`<p>${delim}text</p>\n<p>more${C}</p>\n`);
		});

		it("bold in second paragraph is healed", () => {
			expect(renderStreaming("normal text\n\n**bold")).toBe(
				`<p>normal text</p>\n<p><strong>bold${C}</strong></p>\n`,
			);
		});

		it("multiple paragraphs, only last healed", () => {
			expect(renderStreaming("para1\n\npara2\n\n**bold")).toBe(
				`<p>para1</p>\n<p>para2</p>\n<p><strong>bold${C}</strong></p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 3. Nested/mixed delimiters
	// -----------------------------------------------------------------------
	describe("nested and mixed delimiters", () => {
		it("bold inside italic", () => {
			expect(renderStreaming("*italic **bold** text")).toBe(
				`<p><em>italic <strong>bold</strong> text${C}</em></p>\n`,
			);
		});

		it("incomplete bold inside italic", () => {
			expect(renderStreaming("*italic **bold")).toBe(
				`<p><em>italic <strong>bold${C}</strong></em></p>\n`,
			);
		});

		it("bold then italic", () => {
			expect(renderStreaming("**bold** *italic")).toBe(
				`<p><strong>bold</strong> <em>italic${C}</em></p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 4. Delimiter ambiguity
	// -----------------------------------------------------------------------
	describe("delimiter ambiguity", () => {
		it("* at start of line is a list item", () => {
			expect(renderStreaming("* item one\n* item two")).toBe(
				`<ul>\n<li>item one</li>\n<li>item two${C}</li>\n</ul>\n`,
			);
		});

		it("*text at start of line is emphasis", () => {
			expect(renderStreaming("*emphasized text")).toBe(
				`<p><em>emphasized text${C}</em></p>\n`,
			);
		});

		it("underscore mid-word is not italic", () => {
			expect(renderStreaming("some_variable_name")).toBe(
				`<p>some_variable_name${C}</p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 4b. Cursor with just-opened delimiters (no content yet)
	// -----------------------------------------------------------------------
	describe("cursor with just-opened delimiters", () => {
		it("cursor after opening ** with preceding text", () => {
			// "They respond to **" → cursor should be inside <strong>, not mid-delimiter
			expect(renderStreaming("They respond to **")).toBe(
				`<p>They respond to <strong>${C}</strong></p>\n`,
			);
		});

		it("cursor after opening * with preceding text", () => {
			expect(renderStreaming("text *")).toBe(
				`<p>text <em>${C}</em></p>\n`,
			);
		});

		it("cursor after opening ~~", () => {
			expect(renderStreaming("text ~~")).toBe(
				`<p>text <del>${C}</del></p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 5. List + code transitions
	// -----------------------------------------------------------------------
	describe("list + code transitions", () => {
		it("list item followed by code fence", () => {
			const html = renderStreaming("- item\n\n```js\ncode");
			expect(html).toContain("<li>item</li>");
			expect(html).toContain(`<span class="code-line">code</span>${C}</code></pre></div>`);
		});

		it("list item with inline code", () => {
			expect(renderStreaming("- use `const`")).toBe(
				`<ul>\n<li>use <code>const${C}</code></li>\n</ul>\n`,
			);
		});

		it("list item with incomplete inline code", () => {
			expect(renderStreaming("- use `const")).toBe(
				`<ul>\n<li>use <code>const${C}</code></li>\n</ul>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 6. Partial links and images
	// -----------------------------------------------------------------------
	describe("partial links and images", () => {
		it.each([
			{
				input: "[click](https://exam",
				expected: `<p><a href="https://exam" target="_blank" rel="noopener noreferrer">click</a>${C}</p>\n`,
				label: "link with incomplete URL",
			},
			{
				input: "[click here]",
				expected: `<p>[click here]${C}</p>\n`,
				label: "link text with no URL",
			},
			{
				input: "[click here",
				expected: `<p>[click here${C}</p>\n`,
				label: "unclosed bracket",
			},
			{
				input: "![alt](https://img.com/pic",
				expected: `<p><img src="https://img.com/pic" alt="alt" />${C}</p>\n`,
				label: "image with incomplete URL",
			},
			{
				input: "[click](https://example.com)",
				expected: `<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">click</a>${C}</p>\n`,
				label: "completed link",
			},
		])("$label", ({ input, expected }) => {
			expect(renderStreaming(input)).toBe(expected);
		});
	});

	// -----------------------------------------------------------------------
	// 7. Code fence edge cases
	// -----------------------------------------------------------------------
	describe("code fence streaming", () => {
		it("opening fence only", () => {
			const html = renderStreaming("```");
			expect(html).toContain(`<code>${C}</code></pre></div>`);
		});

		it("fence with language, no content yet", () => {
			const html = renderStreaming("```python\n");
			expect(html).toContain(`<code class="language-python">${C}</code></pre></div>`);
		});

		it("fence with partial content", () => {
			const html = renderStreaming("```js\nconst x = 1;");
			expect(html).toContain(`<span class="code-line">const x = 1;</span>${C}</code></pre></div>`);
		});

		it("fence with info string containing special chars", () => {
			const html = renderStreaming("```js{1,3}\ncode");
			expect(html).toContain(`class="language-js{1,3}"`);
			expect(html).toContain(`<span class="code-line">code</span>${C}`);
		});

		it("nested backticks inside code fence", () => {
			const html = renderStreaming("```\nuse `const` here");
			expect(html).toContain("use `const` here");
		});
	});

	// -----------------------------------------------------------------------
	// 8. Incomplete HTML during streaming
	// -----------------------------------------------------------------------
	describe("incomplete HTML during streaming", () => {
		it("complete HTML tag followed by incomplete", () => {
			expect(renderStreaming("<b>bold</b> <span")).toBe(
				`<p><b>bold</b> &lt;span${C}</p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 9. DoS prevention
	// -----------------------------------------------------------------------
	describe("pathological inputs", () => {
		it.each([
			{ input: "_".repeat(10000), label: "many underscores" },
			{ input: "*".repeat(10000), label: "many asterisks" },
			{ input: "[".repeat(5000), label: "many unclosed brackets" },
		])("$label completes within 3s", ({ input }) => {
			const start = Date.now();
			renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
		});

		it("deeply nested blockquotes", () => {
			const start = Date.now();
			const html = renderStreaming("> ".repeat(200) + "deep");
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toContain("deep");
		});

		it("table with many columns", () => {
			const cols = "| c ".repeat(1000) + "|";
			const sep = "| - ".repeat(1000) + "|";
			const start = Date.now();
			renderStreaming(cols + "\n" + sep);
			expect(Date.now() - start).toBeLessThan(3000);
		});
	});

	// -----------------------------------------------------------------------
	// 10. Incomplete math
	// -----------------------------------------------------------------------
	describe("incomplete math", () => {
		it("incomplete inline math renders as text", () => {
			expect(renderStreaming("$x +")).toBe(`<p>$x +${C}</p>\n`);
		});

		it("complete inline math renders as placeholder", () => {
			expect(renderStreaming("$E = mc^2$")).toBe(
				`<p><span class="math-placeholder" data-math-style="inline">E = mc^2</span>${C}</p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Blockquote + incomplete formatting
	// -----------------------------------------------------------------------
	describe("blockquote + incomplete formatting", () => {
		it.each([
			{
				input: "> **bold text",
				expected: `<blockquote>\n<p><strong>bold text${C}</strong></p>\n</blockquote>\n`,
				label: "bold",
			},
			{
				input: "> *italic text",
				expected: `<blockquote>\n<p><em>italic text${C}</em></p>\n</blockquote>\n`,
				label: "italic",
			},
			{
				input: "> `code text",
				expected: `<blockquote>\n<p><code>code text${C}</code></p>\n</blockquote>\n`,
				label: "code",
			},
		])("blockquote with incomplete $label", ({ input, expected }) => {
			expect(renderStreaming(input)).toBe(expected);
		});

		it("nested blockquote with incomplete bold", () => {
			expect(renderStreaming("> > **deep bold")).toBe(
				`<blockquote>\n<blockquote>\n<p><strong>deep bold${C}</strong></p>\n</blockquote>\n</blockquote>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 12. Table streaming
	// -----------------------------------------------------------------------
	describe("table streaming", () => {
		it("header row only is not a table yet", () => {
			expect(renderStreaming("| a | b |")).toBe(`<p>| a | b |${C}</p>\n`);
		});

		it("header + complete separator renders table", () => {
			const html = renderStreaming("| a | b |\n| - | - |");
			expect(html).toContain("<table>");
			expect(html).toContain("<th>a</th>");
			expect(html).toContain(`</table></div>${C}`);
		});

		it("header + separator + partial row has cursor in cell", () => {
			const html = renderStreaming("| a | b |\n| - | - |\n| 1");
			expect(html).toContain(`<td>1${C}</td>`);
		});
	});

	// -----------------------------------------------------------------------
	// 13. Alert streaming
	// -----------------------------------------------------------------------
	describe("alert streaming", () => {
		it("alert with partial content", () => {
			expect(renderStreaming("> [!NOTE]\n> This is")).toBe(
				`<div class="markdown-alert markdown-alert-note">\n<p class="markdown-alert-title">Note</p>\n<p>This is${C}</p>\n</div>\n`,
			);
		});

		it("alert with incomplete bold inside", () => {
			expect(renderStreaming("> [!WARNING]\n> **important")).toBe(
				`<div class="markdown-alert markdown-alert-warning">\n<p class="markdown-alert-title">Warning</p>\n<p><strong>important${C}</strong></p>\n</div>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 14. Task list streaming
	// -----------------------------------------------------------------------
	describe("task list streaming", () => {
		it("unchecked task item", () => {
			expect(renderStreaming("- [ ] todo item")).toBe(
				`<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled="" /> todo item${C}</li>\n</ul>\n`,
			);
		});

		it("checked + unchecked task items", () => {
			expect(renderStreaming("- [x] done\n- [ ] pending")).toBe(
				`<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" checked="" disabled="" /> done</li>\n<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled="" /> pending${C}</li>\n</ul>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 15. Mixed content mid-stream
	// -----------------------------------------------------------------------
	describe("mixed content mid-stream", () => {
		it("heading then incomplete bold", () => {
			expect(renderStreaming("# Title\n\n**bold")).toBe(
				`<h1><a href="#title" aria-hidden="true" class="anchor" id="title"></a>Title</h1>\n<p><strong>bold${C}</strong></p>\n`,
			);
		});

		it("paragraph, horizontal rule, incomplete italic", () => {
			expect(renderStreaming("text\n\n---\n\n*italic")).toBe(
				`<p>text</p>\n<hr />\n<p><em>italic${C}</em></p>\n`,
			);
		});

		it("complete elements then trailing space with bold", () => {
			expect(renderStreaming("# Heading\n\nParagraph text.\n\n**bold ")).toBe(
				`<h1><a href="#heading" aria-hidden="true" class="anchor" id="heading"></a>Heading</h1>\n<p>Paragraph text.</p>\n<p><strong>bold${C}</strong></p>\n`,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 16. Setext heading prevention
	// -----------------------------------------------------------------------
	describe("setext heading prevention", () => {
		it("text followed by dashes is NOT a heading", () => {
			expect(renderStreaming("Some text\n---")).not.toContain("<h2");
		});

		it("text followed by equals is NOT a heading", () => {
			expect(renderStreaming("Some text\n===")).not.toContain("<h1");
		});
	});

	// -----------------------------------------------------------------------
	// 17. Cursor position verification
	// -----------------------------------------------------------------------
	describe("cursor position", () => {
		it("inside <em> for incomplete italic", () => {
			expect(renderStreaming("*italic text")).toBe(
				`<p><em>italic text${C}</em></p>\n`,
			);
		});

		it("inside <strong> for incomplete bold", () => {
			expect(renderStreaming("**bold text")).toBe(
				`<p><strong>bold text${C}</strong></p>\n`,
			);
		});

		it("after completed link", () => {
			expect(renderStreaming("[text](url)")).toBe(
				`<p><a href="url" target="_blank" rel="noopener noreferrer">text</a>${C}</p>\n`,
			);
		});

		it("after table", () => {
			const html = renderStreaming("| a |\n| - |");
			expect(html).toContain(`</table></div>${C}`);
		});
	});

	// -----------------------------------------------------------------------
	// 18. Closing delimiter + cursor interaction
	// Cursor after closing delimiters can break comrak's parser.
	// -----------------------------------------------------------------------
	describe("closing delimiter cursor placement", () => {
		it.each([
			{
				input: "~~**strikethrough and bold**~~",
				expected: `<del><strong>strikethrough and bold</strong>${C}</del>`,
				label: "~~**nested**~~",
			},
			{
				input: "**~~nested~~**",
				expected: `<strong><del>nested</del>${C}</strong>`,
				label: "**~~nested~~**",
			},
			{
				input: "**bold**",
				expected: `<strong>bold${C}</strong>`,
				label: "**bold**",
			},
			{
				input: "~~strike~~",
				expected: `<del>strike${C}</del>`,
				label: "~~strike~~",
			},
			{
				input: "***bold-italic***",
				expected: `<em><strong>bold-italic${C}</strong></em>`,
				label: "***bold-italic***",
			},
		])("$label cursor before closing delimiter", ({ input, expected }) => {
			expect(renderStreaming(input)).toContain(expected);
		});

		// Half-closed delimiters: healing appends partial closer
		it.each([
			{
				input: "~~*strikethrough and italic*~",
				expected: `<del><em>strikethrough and italic</em>${C}</del>`,
				label: "~~*...*~",
			},
			{
				input: "**bold*",
				expected: `<strong>bold${C}</strong>`,
				label: "**bold*",
			},
			{
				input: "__under_",
				expected: `<strong>under${C}</strong>`,
				label: "__under_",
			},
			{
				input: "~~strike~",
				expected: `<del>strike${C}</del>`,
				label: "~~strike~",
			},
		])("$label half-closed heals correctly", ({ input, expected }) => {
			expect(renderStreaming(input)).toContain(expected);
		});

		// Single characters must NOT be treated as closing delimiters
		it.each([
			{ input: "text ~", contains: `~${C}`, label: "single ~" },
			{ input: "a * b", contains: `b${C}`, label: "single *" },
			{ input: "some_var", contains: `some_var${C}`, label: "single _ mid-word" },
		])("$label is not a delimiter", ({ input, contains }) => {
			expect(renderStreaming(input)).toContain(contains);
		});
	});
});
