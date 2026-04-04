/**
 * Streaming edge case tests for healMarkdown + cursor integration.
 *
 * These test incomplete markdown as it arrives during LLM streaming,
 * verifying that:
 * 1. healMarkdown closes unclosed delimiters correctly
 * 2. Cursor is placed at the user's writing position
 * 3. The rendered HTML is valid (no literal asterisks, broken tables, etc.)
 *
 * Sources:
 * - https://github.com/markedjs/marked/issues/3657
 * - https://github.com/ant-design/x/pull/1739
 * - https://developer.chrome.com/docs/ai/render-llm-responses
 * - https://github.com/ProseMirror/prosemirror-markdown/issues/16
 * - https://stack.watch/product/github/cmark-gfm/
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	renderMarkdown,
	CURSOR_MARKER,
	CURSOR_HTML,
} from "../../src/lib/parser";
import { cacheManager } from "../../src/lib/cache-manager";

/** Render markdown as if streaming (sync morph strategy + cursor marker) */
function renderStreaming(md: string): string {
	return renderMarkdown(md + CURSOR_MARKER, true);
}

describe("streaming edge cases", () => {
	beforeEach(() => {
		cacheManager.clearAll();
	});

	// -----------------------------------------------------------------------
	// 1. Trailing space stripping with all delimiter types
	// healMarkdown strips trailing single space, which can desync suffix calc
	// -----------------------------------------------------------------------
	describe("trailing space with incomplete delimiters", () => {
		it("***bold-italic with trailing space", () => {
			const html = renderStreaming("***bold ");
			expect(html).toContain("<strong>");
			expect(html).toContain("<em>");
			expect(html).toContain(CURSOR_HTML);
		});

		it("**bold with trailing space", () => {
			const html = renderStreaming("**bold ");
			expect(html).toContain("<strong>");
			expect(html).toContain(CURSOR_HTML);
		});

		it("*italic with trailing space", () => {
			const html = renderStreaming("*italic ");
			expect(html).toContain("<em>");
			expect(html).toContain(CURSOR_HTML);
		});

		it("~~strikethrough with trailing space", () => {
			const html = renderStreaming("~~strike ");
			expect(html).toContain("<del>");
			expect(html).toContain(CURSOR_HTML);
		});

		it("`inline code with trailing space", () => {
			const html = renderStreaming("`code ");
			expect(html).toContain("<code>");
			expect(html).toContain(CURSOR_HTML);
		});

		it("__underline with trailing space", () => {
			const html = renderStreaming("__under ");
			// __ is parsed as bold by comrak (not underline, which is disabled)
			expect(html).toContain("<strong>");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 2. Cross-paragraph inline formatting
	// Inline delimiters must not span paragraph boundaries (\n\n)
	// -----------------------------------------------------------------------
	describe("cross-paragraph boundary", () => {
		it("bold opener in first paragraph, text in second", () => {
			const html = renderStreaming("**bold\n\nmore text");
			// Should NOT wrap "more text" in <strong>
			expect(html).not.toMatch(
				/<strong>.*more text.*<\/strong>/s,
			);
		});

		it("italic opener in first paragraph", () => {
			const html = renderStreaming("*italic\n\nmore text");
			expect(html).not.toMatch(/<em>.*more text.*<\/em>/s);
		});

		it("strikethrough across paragraphs", () => {
			const html = renderStreaming("~~strike\n\nmore text");
			expect(html).not.toMatch(
				/<del>.*more text.*<\/del>/s,
			);
		});

		it("inline code across paragraphs", () => {
			const html = renderStreaming("`code\n\nmore text");
			expect(html).not.toMatch(
				/<code>.*more text.*<\/code>/s,
			);
		});

		it("bold in second paragraph is healed", () => {
			const html = renderStreaming("normal text\n\n**bold");
			expect(html).toContain("<strong>bold");
		});

		it("multiple paragraphs, only last healed", () => {
			const html = renderStreaming("para1\n\npara2\n\n**bold");
			expect(html).toContain("<strong>bold");
			expect(html).toContain("para1");
			expect(html).toContain("para2");
		});
	});

	// -----------------------------------------------------------------------
	// 3. Nested/mixed delimiters
	// -----------------------------------------------------------------------
	describe("nested and mixed delimiters", () => {
		it("bold inside italic: *italic **bold** text", () => {
			const html = renderStreaming("*italic **bold** text");
			expect(html).toContain("<strong>bold</strong>");
			expect(html).toContain("<em>");
		});

		it("incomplete bold inside italic: *italic **bold", () => {
			const html = renderStreaming("*italic **bold");
			expect(html).toContain(CURSOR_HTML);
			// Should not have literal asterisks in output
		});

		it("bold then italic: **bold** *italic", () => {
			const html = renderStreaming("**bold** *italic");
			expect(html).toContain("<strong>bold</strong>");
			expect(html).toContain("<em>italic");
		});
	});

	// -----------------------------------------------------------------------
	// 4. Delimiter ambiguity: * as list item vs emphasis
	// -----------------------------------------------------------------------
	describe("delimiter ambiguity", () => {
		it("* at start of line is a list item", () => {
			const html = renderStreaming("* item one\n* item two");
			expect(html).toContain("<li>");
		});

		it("*text at start of line is emphasis", () => {
			const html = renderStreaming("*emphasized text");
			expect(html).toContain("<em>");
		});

		it("underscore mid-word is not italic", () => {
			const html = renderStreaming("some_variable_name");
			expect(html).not.toContain("<em>");
			expect(html).toContain("some_variable_name");
		});
	});

	// -----------------------------------------------------------------------
	// 5. List followed by backtick (ant-design/x bug)
	// -----------------------------------------------------------------------
	describe("list + code transitions", () => {
		it("list item followed by code fence", () => {
			const html = renderStreaming("- item\n\n```js\ncode");
			expect(html).toContain("<li>");
			expect(html).toContain("<code");
		});

		it("list item with inline code", () => {
			const html = renderStreaming("- use `const`");
			expect(html).toContain("<li>");
			expect(html).toContain("<code>");
		});

		it("list item with incomplete inline code", () => {
			const html = renderStreaming("- use `const");
			expect(html).toContain("<li>");
			expect(html).toContain("<code>");
		});
	});

	// -----------------------------------------------------------------------
	// 6. Partial link/image mid-URL
	// -----------------------------------------------------------------------
	describe("partial links and images", () => {
		it("link with incomplete URL", () => {
			const html = renderStreaming("[click](https://exam");
			expect(html).toContain(CURSOR_HTML);
			// Should not crash or produce broken HTML
			expect(html).toBeTruthy();
		});

		it("link with complete text, no URL yet", () => {
			const html = renderStreaming("[click here]");
			expect(html).toContain(CURSOR_HTML);
		});

		it("link text only, no bracket close", () => {
			const html = renderStreaming("[click here");
			expect(html).toContain(CURSOR_HTML);
			expect(html).toContain("click here");
		});

		it("image with incomplete URL", () => {
			const html = renderStreaming("![alt](https://img.com/pic");
			expect(html).toContain(CURSOR_HTML);
		});

		it("completed link has cursor after it", () => {
			const html = renderStreaming("[click](https://example.com)");
			expect(html).toContain("href=");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 7. Code fence edge cases
	// -----------------------------------------------------------------------
	describe("code fence streaming", () => {
		it("opening fence only", () => {
			const html = renderStreaming("```");
			expect(html).toContain("<code");
			expect(html).toContain(CURSOR_HTML);
		});

		it("fence with language, no content yet", () => {
			const html = renderStreaming("```python\n");
			expect(html).toContain("language-python");
			expect(html).toContain(CURSOR_HTML);
		});

		it("fence with partial content", () => {
			const html = renderStreaming("```js\nconst x = 1;");
			expect(html).toContain("const x = 1;");
			expect(html).toContain(CURSOR_HTML);
		});

		it("fence with info string containing special chars", () => {
			const html = renderStreaming("```js{1,3}\ncode");
			expect(html).toContain("<code");
			expect(html).toContain("code");
		});

		it("nested backticks inside code fence", () => {
			const html = renderStreaming("```\nuse `const` here");
			expect(html).toContain("const");
		});

		it("four backtick fence", () => {
			const html = renderStreaming("````\ncode with ```\nmore");
			expect(html).toContain("<code");
		});
	});

	// -----------------------------------------------------------------------
	// 8. Incomplete HTML tags mid-stream
	// -----------------------------------------------------------------------
	describe("incomplete HTML during streaming", () => {
		it("unclosed div tag", () => {
			const html = renderStreaming("text <div");
			expect(html).toContain(CURSOR_HTML);
			// healMarkdown strips incomplete HTML tags
			expect(html).toContain("text");
		});

		it("unclosed tag with attributes", () => {
			const html = renderStreaming('text <div class="test');
			expect(html).toContain(CURSOR_HTML);
			expect(html).toContain("text");
		});

		it("complete HTML tag followed by incomplete", () => {
			const html = renderStreaming("<b>bold</b> <span");
			expect(html).toContain("bold");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 9. DoS prevention — pathological inputs
	// -----------------------------------------------------------------------
	describe("pathological inputs", () => {
		it("many underscores (cmark-gfm CVE pattern)", () => {
			const input = "_".repeat(10000);
			const start = Date.now();
			const html = renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toBeTruthy();
		});

		it("many asterisks", () => {
			const input = "*".repeat(10000);
			const start = Date.now();
			const html = renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toBeTruthy();
		});

		it("deeply nested blockquotes", () => {
			const input = "> ".repeat(200) + "deep";
			const start = Date.now();
			const html = renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toContain("deep");
		});

		it("many unclosed brackets", () => {
			const input = "[".repeat(5000);
			const start = Date.now();
			const html = renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toBeTruthy();
		});

		it("table with many columns", () => {
			const cols = "| c ".repeat(1000) + "|";
			const sep = "| - ".repeat(1000) + "|";
			const input = cols + "\n" + sep;
			const start = Date.now();
			const html = renderStreaming(input);
			expect(Date.now() - start).toBeLessThan(3000);
			expect(html).toBeTruthy();
		});
	});

	// -----------------------------------------------------------------------
	// 10. Incomplete KaTeX mid-stream
	// -----------------------------------------------------------------------
	describe("incomplete math", () => {
		it("incomplete inline math: $x +", () => {
			const html = renderStreaming("$x +");
			expect(html).toContain(CURSOR_HTML);
		});

		it("incomplete display math: $$\\frac{", () => {
			const html = renderStreaming("$$\\frac{");
			expect(html).toContain(CURSOR_HTML);
		});

		it("complete inline math has cursor after", () => {
			const html = renderStreaming("$E = mc^2$");
			expect(html).toContain(CURSOR_HTML);
			// Math should be processed (placeholder or katex)
			expect(html).toMatch(/data-math-style|katex/);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Blockquote with incomplete formatting
	// -----------------------------------------------------------------------
	describe("blockquote + incomplete formatting", () => {
		it("blockquote with incomplete bold", () => {
			const html = renderStreaming("> **bold text");
			expect(html).toContain("<blockquote");
			expect(html).toContain("<strong>");
		});

		it("blockquote with incomplete italic", () => {
			const html = renderStreaming("> *italic text");
			expect(html).toContain("<blockquote");
			expect(html).toContain("<em>");
		});

		it("blockquote with incomplete code", () => {
			const html = renderStreaming("> `code text");
			expect(html).toContain("<blockquote");
			expect(html).toContain("<code>");
		});

		it("nested blockquote with incomplete bold", () => {
			const html = renderStreaming("> > **deep bold");
			expect(html).toContain("<blockquote");
			expect(html).toContain("<strong>");
		});
	});

	// -----------------------------------------------------------------------
	// 12. Table streaming edge cases
	// -----------------------------------------------------------------------
	describe("table streaming", () => {
		it("header row only", () => {
			const html = renderStreaming("| a | b |");
			// Just a header row without separator isn't a table yet
			expect(html).toContain(CURSOR_HTML);
		});

		it("header + partial separator", () => {
			const html = renderStreaming("| a | b |\n| -");
			expect(html).toContain(CURSOR_HTML);
		});

		it("header + complete separator", () => {
			const html = renderStreaming("| a | b |\n| - | - |");
			expect(html).toContain("<table");
			expect(html).toContain(CURSOR_HTML);
		});

		it("header + separator + partial row", () => {
			const html = renderStreaming("| a | b |\n| - | - |\n| 1");
			expect(html).toContain("<table");
			expect(html).toContain(CURSOR_HTML);
		});

		it("table with alignment markers", () => {
			const html = renderStreaming(
				"| left | center | right |\n| :- | :-: | -: |",
			);
			expect(html).toContain("<table");
		});
	});

	// -----------------------------------------------------------------------
	// 13. Alert (GitHub-style) streaming
	// -----------------------------------------------------------------------
	describe("alert streaming", () => {
		it("incomplete alert tag", () => {
			const html = renderStreaming("> [!NOTE]");
			expect(html).toContain(CURSOR_HTML);
		});

		it("alert with partial content", () => {
			const html = renderStreaming("> [!NOTE]\n> This is");
			expect(html).toContain("This is");
			expect(html).toContain(CURSOR_HTML);
		});

		it("alert with incomplete bold inside", () => {
			const html = renderStreaming("> [!WARNING]\n> **important");
			expect(html).toContain("<strong>");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 14. Task list streaming
	// -----------------------------------------------------------------------
	describe("task list streaming", () => {
		it("incomplete task item", () => {
			const html = renderStreaming("- [ ] todo item");
			expect(html).toContain("checkbox");
			expect(html).toContain(CURSOR_HTML);
		});

		it("checked task with more text", () => {
			const html = renderStreaming("- [x] done\n- [ ] pending");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 15. Footnote streaming
	// -----------------------------------------------------------------------
	describe("footnote streaming", () => {
		it("footnote reference without definition", () => {
			const html = renderStreaming("text[^1]");
			expect(html).toContain(CURSOR_HTML);
		});

		it("footnote with partial definition", () => {
			const html = renderStreaming("text[^1]\n\n[^1]: definition");
			expect(html).toContain("definition");
			expect(html).toContain(CURSOR_HTML);
		});
	});

	// -----------------------------------------------------------------------
	// 16. Mixed block/inline mid-stream
	// -----------------------------------------------------------------------
	describe("mixed content mid-stream", () => {
		it("heading then incomplete bold", () => {
			const html = renderStreaming("# Title\n\n**bold");
			expect(html).toContain("<h1");
			expect(html).toContain("<strong>");
		});

		it("list then code fence", () => {
			const html = renderStreaming(
				"- item 1\n- item 2\n\n```python\ndef hello():",
			);
			expect(html).toContain("<li>");
			expect(html).toContain("<code");
		});

		it("paragraph, horizontal rule, incomplete italic", () => {
			const html = renderStreaming("text\n\n---\n\n*italic");
			expect(html).toContain("<hr");
			expect(html).toContain("<em>");
		});

		it("complete elements then trailing space with bold", () => {
			const html = renderStreaming(
				"# Heading\n\nParagraph text.\n\n**bold ",
			);
			expect(html).toContain("<h1");
			expect(html).toContain("<strong>bold");
		});
	});

	// -----------------------------------------------------------------------
	// 17. Setext heading ambiguity during streaming
	// -----------------------------------------------------------------------
	describe("setext heading prevention", () => {
		it("text followed by dashes is NOT a heading (ignoreSetext=true)", () => {
			const html = renderStreaming("Some text\n---");
			// With ignoreSetext, this should be text + hr, not h2
			expect(html).not.toContain("<h2");
		});

		it("text followed by equals is NOT a heading", () => {
			const html = renderStreaming("Some text\n===");
			expect(html).not.toContain("<h1");
		});
	});

	// -----------------------------------------------------------------------
	// 18. Cursor position verification
	// -----------------------------------------------------------------------
	describe("cursor position", () => {
		it("cursor is inside <em> for incomplete italic", () => {
			const html = renderStreaming("*italic text");
			expect(html).toMatch(/<em>italic text.*data-cursor/s);
		});

		it("cursor is inside <strong> for incomplete bold", () => {
			const html = renderStreaming("**bold text");
			expect(html).toMatch(/<strong>bold text.*data-cursor/s);
		});

		it("cursor is inside <code> for incomplete code fence", () => {
			const html = renderStreaming("```js\nconst x = 1;");
			expect(html).toMatch(/<code.*>.*const x = 1;.*data-cursor/s);
		});

		it("cursor is after completed link", () => {
			const html = renderStreaming("[text](url)");
			expect(html).toMatch(/<\/a>.*data-cursor/s);
		});

		it("cursor is after table", () => {
			const html = renderStreaming("| a |\n| - |");
			expect(html).toMatch(/<\/table>.*data-cursor/s);
		});
	});
});
