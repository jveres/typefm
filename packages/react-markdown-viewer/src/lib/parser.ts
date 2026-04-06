import { decodeHtml } from "./html";
import { mdToHtml, healMarkdown } from "@typefm/comrak-wasm";
import { isWasmReady } from "./wasm-init";
import { cacheManager } from "./cache-manager";
import { highlight, onLanguageLoaded, offLanguageLoaded, getNotificationGeneration } from "./highlighter";
import type {
	RenderHooks,
	CodeBlockData,
	InlineCodeData,
	MathData,
	TableData,
	LinkData,
	ImageData,
	HeadingData,
	BlockquoteData,
	AlertData,
	AlertType,
	ListData,
	HorizontalRuleData,
	FootnoteRefData,
	FootnoteDefData,
	HookResult,
} from "../types/hooks";


// Import default processors
import { injectColorPreviews, COPY_ICON, CHECK_ICON } from "./defaults/code-block";

import {
	processMathBlock as defaultProcessMathBlock,
	preloadKaTeX as defaultPreloadKaTeX,
	isKaTeXReady as defaultIsKaTeXReady,
	ensureKaTeXLoading,
} from "./defaults/math";

import { processTable as defaultProcessTable } from "./defaults/table";

// Re-export for useMarkdownViewer
export { onLanguageLoaded, offLanguageLoaded, getNotificationGeneration };

// Re-export KaTeX utilities
export const preloadKaTeX = defaultPreloadKaTeX;
export const isKaTeXReady = defaultIsKaTeXReady;

/**
 * Cursor marker string and HTML replacement
 * Word Joiner (U+2060) - invisible character used to mark cursor position.
 * We use WJ instead of ZWSP (U+200B) because source markdown may contain ZWSP
 * which gets escaped to HTML entities. WJ is rarely used in source text.
 */
export const CURSOR_MARKER = "\u2060";
export const CURSOR_HTML = "<span class='cursor' data-cursor></span>";

// --------------------------------------------------------------------------
// HTML Sanitizer
// --------------------------------------------------------------------------

/**
 * Tags to completely remove (with content).
 * These are dangerous tags not covered by comrak's tagfilter.
 * Note: 'input' is NOT included because task list checkboxes use <input type="checkbox">
 */
const DANGEROUS_TAGS_REMOVE = new Set([
	"object",
	"embed",
	"form",
	"button",
	"select",
	"meta",
	"link",
	"base",
	"applet",
	"frame",
	"frameset",
	"layer",
	"ilayer",
	"bgsound",
	"xml",
	"blink",
	"marquee",
]);

/**
 * Regex to match dangerous input types (not checkbox which is used for task lists)
 */
const DANGEROUS_INPUT_RE =
	/<input\s+(?![^>]*type\s*=\s*["']?checkbox["']?)[^>]*>/gi;

/**
 * Tags to unwrap (keep content, remove tag).
 * These can contain malicious attributes but their content is usually safe.
 */
const DANGEROUS_TAGS_UNWRAP = new Set(["noscript", "template"]);

/** Regex to match opening tags with attributes: <tagname ...> */
const TAG_WITH_ATTRS_RE = /<([a-zA-Z][a-zA-Z0-9]*)\s+([^>]*)>/gi;

/** Regex to match self-closing tags: <tagname ... /> */
const SELF_CLOSING_TAG_RE = /<([a-zA-Z][a-zA-Z0-9]*)\s+([^>]*)\s*\/>/gi;

/** Regex to match event handler attributes (on*) */
const EVENT_HANDLER_RE =
	/(?:^|\s+)on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Regex to match dangerous URL schemes in href/src/srcset/action/formaction/data/xlink:href */
const DANGEROUS_URL_ATTR_RE =
	/(?:^|\s+)(href|src|srcset|action|formaction|data|xlink:href)\s*=\s*(?:"[^"]*(?:javascript|vbscript|data|file):[^"]*"|'[^']*(?:javascript|vbscript|data|file):[^']*'|[^\s>]*(?:javascript|vbscript|data|file):[^\s>]*)/gi;

/** Regex to match style attributes with dangerous content */
const DANGEROUS_STYLE_RE =
	/(?:^|\s+)style\s*=\s*["'][^"']*(?:expression|javascript|behavior|binding|@import|url\s*\()[^"']*["']/gi;

/** Regex to match DOM clobbering via name/id attributes with dangerous values.
 *  Lookahead ensures the value is an EXACT match (followed by a quote, whitespace, or >),
 *  preventing false positives like "alerts" matching the "alert" prefix. */
const DOM_CLOBBERING_RE =
	/(?:^|\s+)(?:name|id)\s*=\s*["']?(document|window|location|self|top|parent|frames|opener|navigator|history|screen|alert|confirm|prompt|eval|Function|constructor|prototype|__proto__|hasOwnProperty|toString|valueOf|href|src|cookie|domain)(?=["'\s>]|$)["']?/gi;

/** Regex to match SVG elements with dangerous content */
const SVG_DANGEROUS_RE =
	/<svg[^>]*>[\s\S]*?(?:<script|on[a-z]+=|javascript:|attributeName\s*=\s*["']on)[\s\S]*?<\/svg>/gi;

/** Pre-compiled regexes for dangerous tag removal */
const DANGEROUS_TAG_REMOVAL_REGEXES = [...DANGEROUS_TAGS_REMOVE].map(
	(tag) =>
		new RegExp(
			`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}\\b[^>]*\\/?>`,
			"gi",
		),
);

/** Pre-compiled regexes for dangerous tag unwrapping (keep content, remove tag) */
const DANGEROUS_TAG_UNWRAP_REGEXES = [...DANGEROUS_TAGS_UNWRAP].map(
	(tag) => new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"),
);

/**
 * Sanitize HTML to remove XSS vectors while preserving safe content.
 */
export function sanitizeHtml(html: string): string {
	if (!html) return html;

	let result = html;

	// 1. Remove dangerous SVG elements with scripts
	result = result.replace(SVG_DANGEROUS_RE, "");

	// 2. Remove dangerous tags completely (with content)
	for (const regex of DANGEROUS_TAG_REMOVAL_REGEXES) {
		regex.lastIndex = 0;
		result = result.replace(regex, "");
	}

	// 3. Unwrap dangerous tags (keep content)
	for (const regex of DANGEROUS_TAG_UNWRAP_REGEXES) {
		regex.lastIndex = 0;
		result = result.replace(regex, "$1");
	}

	// 3.5. Remove dangerous input types (but preserve checkbox for task lists)
	result = result.replace(DANGEROUS_INPUT_RE, "");

	// 4. Clean attributes on opening and self-closing tags
	const cleanAttrs = (attrs: string) =>
		attrs
			.replace(EVENT_HANDLER_RE, "")
			.replace(DANGEROUS_URL_ATTR_RE, ' $1="#"')
			.replace(DANGEROUS_STYLE_RE, "")
			.replace(DOM_CLOBBERING_RE, "")
			.trim();

	result = result.replace(TAG_WITH_ATTRS_RE, (_match, tagName, attrs) => {
		const clean = cleanAttrs(attrs);
		return clean ? `<${tagName} ${clean}>` : `<${tagName}>`;
	});

	result = result.replace(SELF_CLOSING_TAG_RE, (_match, tagName, attrs) => {
		const clean = cleanAttrs(attrs);
		return clean ? `<${tagName} ${clean} />` : `<${tagName} />`;
	});

	return result;
}

// --------------------------------------------------------------------------
// Hoisted Regex Patterns
// --------------------------------------------------------------------------

/** Matches <pre><code>...</code></pre> and inline <code>...</code> */
const CODE_AND_FENCE_RE =
	/(<pre[^>]*>)?(<code[^>]*>)([\s\S]*?)(<\/code>)(<\/pre>)?/g;

/** Matches <span data-math-style="inline|display">...</span> */
const MATH_SPAN_RE =
	/<span data-math-style="(inline|display)">([\s\S]*?)<\/span>/g;

/** Matches <table>...</table> */
const TABLE_RE = /(<table>[\s\S]*?<\/table>)/g;

/** Matches <a ...> tags (opening tag only) */
const ANCHOR_TAG_RE = /<a\s+([^>]+)>/gi;

/** Matches full anchor tags: <a href="...">text</a> */
const FULL_ANCHOR_RE = /<a\s+([^>]+)>([\s\S]*?)<\/a>/gi;

/** Matches <img ...> tags */
const IMG_TAG_RE = /<img\s+([^>]*)>/gi;

/** Extracts title attribute value */
const TITLE_ATTR_RE = /title\s*=\s*["']([^"']*)["']/i;

/** Regex to extract language from code tag class attribute */
const LANGUAGE_CLASS_RE = /class="[^"]*language-(\w+)[^"]*"/;

/** Matches heading tags h1-h6 */
const HEADING_RE = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

/** Matches blockquote tags */
const BLOCKQUOTE_RE = /<blockquote>([\s\S]*?)<\/blockquote>/gi;

/** Matches GitHub-style alert divs */
const ALERT_RE =
	/<div class="markdown-alert markdown-alert-(\w+)"[^>]*>\s*<p class="markdown-alert-title"[^>]*>([^<]*)<\/p>([\s\S]*?)<\/div>/gi;

/** Matches ordered and unordered lists */
const LIST_RE = /<(ul|ol)>([\s\S]*?)<\/\1>/gi;

/** Matches horizontal rule tags */
const HR_RE = /<hr\s*\/?>/gi;

/** Matches footnote references */
const FOOTNOTE_REF_RE =
	/<sup class="footnote-ref"><a href="#([^"]+)"[^>]*>(\d+)<\/a><\/sup>/gi;

/** Matches footnote definitions in the footnotes section */
const FOOTNOTE_DEF_RE = /<li id="([^"]+)">([\s\S]*?)<\/li>/gi;

/** Zero-width characters that can interfere with cursor marker (U+2060) */
const ZERO_WIDTH_CHARS_RE = /[\u200B\u200C\u200E\u200F\uFEFF]/g;

export interface ColorOptions {
	fences: boolean;
	inline: boolean;
}

/** Comrak options — hoisted to avoid re-allocation on every renderMarkdown call. */
const COMRAK_OPTIONS = {
	extension: {
		strikethrough: true,
		tagfilter: true,
		table: true,
		autolink: true,
		tasklist: true,
		superscript: true,
		subscript: false,
		alerts: true,
		mathDollars: true,
		underline: false,
		headerIdPrefix: "",
		shortcodes: true,
		descriptionLists: true,
		footnotes: true,
	},
	parse: {
		smart: true,
		ignoreSetext: true,
	},
	render: {
		unsafe: true,
		escape: false,
		hardbreaks: true,
		tasklistClasses: true,
		ignoreEmptyLinks: true,
	},
} as const;

// --------------------------------------------------------------------------
// Cursor + healMarkdown Integration
// --------------------------------------------------------------------------

/**
 * Insert cursor marker into healed markdown at the correct position.
 *
 * healMarkdown may append closing delimiters (e.g., "**", "\n```", "$$").
 * The cursor must appear at the user's writing position (end of original text),
 * without breaking block-level closers that require their own line.
 */
function insertCursorIntoHealed(original: string, healed: string): string {
	const suffix = healed.slice(original.length);

	if (suffix.length === 0) {
		// No healing — append cursor.
		// Some block constructs break if cursor is appended inline:
		// - closing fences (```, $$) must be on their own line
		if (original.endsWith("```") || original.endsWith("$$")) {
			return original + "\n" + CURSOR_MARKER;
		}
		// Table separator row: cursor inline breaks table parsing.
		// Double newline places cursor after the table as a block element.
		if (/\|\s*[-:]+\s*[-:|  ]*$/.test(original)) {
			return original + "\n\n" + CURSOR_MARKER;
		}
		// Trailing inline closing delimiters: cursor directly after them
		// can break comrak's parser (e.g., ~~**bold**~~⁠ fails).
		// Insert cursor before the trailing delimiters instead.
		// Only match actual delimiter sequences (**, ***, ~~, __, not single chars).
		const trailingDelim = /(\*{2,3}|~{2}|_{2,3}|`+)$/.exec(original);
		if (trailingDelim) {
			const delimStart = original.length - trailingDelim[1].length;
			return (
				original.slice(0, delimStart) +
				CURSOR_MARKER +
				original.slice(delimStart)
			);
		}
		return original + CURSOR_MARKER;
	}

	// Block-level closers (```, $$) must be on their own line.
	// Suffix patterns from healMarkdown:
	//   "\n```"  — newline + closing fence (content didn't end with \n)
	//   "```"    — closing fence only (content already ended with \n)
	//   "\n$$"   — newline + closing math
	//   "$$"     — closing math only
	//   "**", "*", "`", "~~", etc. — inline closers

	if (suffix.startsWith("\n```") || suffix.startsWith("\n$$")) {
		// Cursor right after original content. If original has content after
		// the opening fence (contains \n), cursor goes inline. If it's just
		// the opening fence with no content, cursor needs its own line inside.
		if (original.includes("\n")) {
			return original + CURSOR_MARKER + suffix;
		}
		// Bare opening fence (e.g., "```") — cursor on new line inside block
		return original + "\n" + CURSOR_MARKER + suffix;
	}

	if (suffix.startsWith("```") || suffix.startsWith("$$")) {
		// Original ends with \n already. Add cursor, then newline + fence.
		return original + CURSOR_MARKER + "\n" + suffix;
	}

	// Link/image closers: cursor goes after (inside URL would break it)
	if (suffix === ")") {
		return original + suffix + CURSOR_MARKER;
	}

	// Combine the end of original with suffix to find the full closing
	// delimiter sequence (e.g., original ends "~", suffix "~" → "~~").
	// Cursor goes before the entire delimiter to avoid breaking comrak.
	const fullEnd = original + suffix;
	const trailingDelim = /(\*{2,3}|~{2}|_{2,3}|`+)$/.exec(fullEnd);
	if (trailingDelim) {
		const pos = fullEnd.length - trailingDelim[1].length;

		// Guard: the regex can match across the original/suffix boundary
		// (e.g., "to **" + "**" = "****" → regex greedily matches "***").
		// Detect this by checking if original's trailing delimiter chars
		// are an OPENING delimiter (preceded by whitespace or SOL).
		// If so, cursor stays at original.length — between open and close.
		const delimChar = original[original.length - 1];
		if (delimChar && /[*~_`]/.test(delimChar) && pos < original.length) {
			let runStart = original.length;
			while (runStart > 0 && original[runStart - 1] === delimChar) {
				runStart--;
			}
			const before = original[runStart - 1];
			if (before === undefined || /\s/.test(before)) {
				return original + CURSOR_MARKER + suffix;
			}
		}

		return fullEnd.slice(0, pos) + CURSOR_MARKER + fullEnd.slice(pos);
	}

	// Simple inline closers — cursor goes before suffix
	return original + CURSOR_MARKER + suffix;
}

// --------------------------------------------------------------------------
// Main Render Function
// --------------------------------------------------------------------------

/**
 * Render Markdown to HTML using @typefm/comrak-wasm + Post-processing.
 *
 * @param src Markdown source
 * @param useSyncStrategy If true, uses sync morph path (streaming).
 * @param colorOptions Options for color preview injection.
 * @param hooks Optional hooks for customizing rendering.
 */
export function renderMarkdown(
	src: string,
	useSyncStrategy: boolean,
	colorOptions: ColorOptions = { fences: true, inline: true },
	hooks?: RenderHooks,
): string {
	if (!src) return "";

	// Guard: WASM must be initialized
	if (!isWasmReady()) return "";

	// Check global cache for repeated content
	const renderCache = useSyncStrategy
		? cacheManager.renderCacheSync
		: cacheManager.renderCacheAsync;
	if (!hooks) {
		const cached = renderCache.get(src);
		if (cached !== undefined) {
			return cached;
		}
	}

	// 1. Pre-process: Use healMarkdown to close unclosed delimiters during streaming.
	// Strip cursor marker, heal, then insert cursor at the user's writing position.
	// Cursor must not break closing delimiters (e.g., ``` must be on its own line).
	const hasCursorMarker = src.includes(CURSOR_MARKER);
	let source: string;
	if (hasCursorMarker) {
		const stripped = src.replace(CURSOR_MARKER, "");
		const healed = healMarkdown(stripped);
		// healMarkdown may strip a trailing single space before healing.
		// Match that here so insertCursorIntoHealed's suffix calculation
		// uses the same base length as the healed string.
		const base =
			stripped.endsWith(" ") && !stripped.endsWith("  ")
				? stripped.slice(0, -1)
				: stripped;
		source = insertCursorIntoHealed(base, healed);
	} else {
		source = src;
	}

	// 2. Comrak Render
	let html = mdToHtml(source, COMRAK_OPTIONS);

	// 3. Escape zero-width characters in HTML output
	ZERO_WIDTH_CHARS_RE.lastIndex = 0;
	html = html.replace(ZERO_WIDTH_CHARS_RE, (char) => `&#${char.charCodeAt(0)};`);

	// 4. Sanitize HTML (XSS prevention)
	html = sanitizeHtml(html);

	// 5. Post-process Pipeline

	// Math (KaTeX)
	html = processMath(html, hooks?.onMath);

	// Unwrap display math from <p> wrapper
	html = html.replace(
		/<p>(\s*<span class="math-placeholder" data-math-style="display">[\s\S]*?<\/span>\s*)(\u2060)?<\/p>/g,
		"$1$2",
	);
	html = html.replace(
		/<p>(\s*<span class="katex-display">[\s\S]*?<\/span>\s*)(\u2060)?<\/p>/g,
		"$1$2",
	);

	// Code & Colors
	html = processCodeAndColors(
		html,
		useSyncStrategy,
		colorOptions,
		hooks?.onCodeBlock,
		hooks?.onInlineCode,
	);

	// Tables
	html = processTables(html, hooks?.onTable);

	// Links
	html = processLinks(html, hooks?.onLink);

	// Images
	html = processImages(html, hooks?.onImage);

	// Headings
	html = processHeadings(html, hooks?.onHeading);

	// Blockquotes
	html = processBlockquotes(html, hooks?.onBlockquote);

	// Alerts
	html = processAlerts(html, hooks?.onAlert);

	// Lists
	html = processLists(html, hooks?.onList);

	// Horizontal rules
	html = processHorizontalRules(html, hooks?.onHorizontalRule);

	// Footnotes
	html = processFootnoteRefs(html, hooks?.onFootnoteRef);
	html = processFootnoteDefs(html, hooks?.onFootnoteDef);

	// Final transformation hook
	if (hooks?.onRender) {
		html = hooks.onRender(html);
	}

	// 6. Inject Cursor
	if (html.includes(CURSOR_MARKER)) {
		html = html.replaceAll(CURSOR_MARKER, CURSOR_HTML);

		// Fix empty paragraph wrapper around cursor
		html = html.replace(
			/\n?<p>\s*(<span[^>]*data-cursor[^>]*><\/span>)\s*<\/p>\n?/g,
			"$1",
		);
	}

	// Cache the result (skip transient content)
	if (
		!hooks &&
		!html.includes(CURSOR_HTML) &&
		!html.includes("math-placeholder")
	) {
		renderCache.set(src, html);
	}

	return html;
}

// --------------------------------------------------------------------------
// Post-Processors
// --------------------------------------------------------------------------

function processCodeAndColors(
	html: string,
	useSyncStrategy: boolean,
	options: ColorOptions,
	onCodeBlock?: RenderHooks["onCodeBlock"],
	onInlineCode?: RenderHooks["onInlineCode"],
): string {
	if (!html.includes("<code")) return html;

	return html.replace(
		CODE_AND_FENCE_RE,
		(_match, preOpen, codeOpen, content, codeClose, preClose) => {
			const isBlock = !!preOpen && !!preClose;

			const doColors =
				(isBlock && options.fences) || (!isBlock && options.inline);

			const hasCursor = content.includes(CURSOR_MARKER);
			const cleanContent = hasCursor
				? content.replaceAll(CURSOR_MARKER, "")
				: content;

			// 1. Block Code Processing
			if (isBlock) {
				const langMatch = LANGUAGE_CLASS_RE.exec(codeOpen);
				const language = langMatch?.[1];

				const decodedContent = decodeHtml(cleanContent);

				let code = decodedContent;
				if (code.endsWith("\n")) {
					code = code.slice(0, -1);
				}

				if (onCodeBlock) {
					const hookData: CodeBlockData = { code, language };
					const hookResult = (onCodeBlock(hookData));
					if (hookResult !== null) {
						return hasCursor ? hookResult + CURSOR_MARKER : hookResult;
					}
				}

				let highlightedContent = highlight(code, language);

				if (doColors) {
					highlightedContent = injectColorPreviews(highlightedContent);
				}

				if (useSyncStrategy && highlightedContent) {
					highlightedContent = highlightedContent.replace(
						/^(.*)$/gm,
						'<span class="code-line">$1</span>',
					);
				}

				if (hasCursor) {
					highlightedContent += CURSOR_MARKER;
				}

				const codeBlock = `${preOpen}${codeOpen}${highlightedContent}${codeClose}${preClose}`;
				return `<div class="code-block-wrapper"><button type="button" class="copy-btn" aria-label="Copy code">${COPY_ICON}${CHECK_ICON}</button>${codeBlock}</div>`;
			}

			// 2. Inline Code Processing
			if (onInlineCode) {
				const hookData: InlineCodeData = { code: cleanContent };
				const hookResult = (onInlineCode(hookData));
				if (hookResult !== null) {
					return hasCursor ? hookResult + CURSOR_MARKER : hookResult;
				}
			}

			let finalContent = cleanContent;
			if (doColors) {
				finalContent = injectColorPreviews(finalContent);
			}

			if (hasCursor) {
				finalContent += CURSOR_MARKER;
			}

			return `${preOpen || ""}${codeOpen}${finalContent}${codeClose}${preClose || ""}`;
		},
	);
}

function processMath(
	html: string,
	onMath?: RenderHooks["onMath"],
): string {
	if (!html.includes("data-math-style")) return html;

	ensureKaTeXLoading();

	return html.replace(MATH_SPAN_RE, (_match, style, content) => {
		const displayMode = style === "display";

		const hasCursor = content.includes(CURSOR_MARKER);
		const cleanContent = hasCursor
			? content.replaceAll(CURSOR_MARKER, "")
			: content;
		const tex = decodeHtml(cleanContent);

		if (onMath) {
			const hookData: MathData = { tex, displayMode };
			const hookResult = (onMath(hookData));
			if (hookResult !== null) {
				return hasCursor ? hookResult + CURSOR_MARKER : hookResult;
			}
		}

		const result = defaultProcessMathBlock({
			tex: cleanContent,
			displayMode,
		});
		return hasCursor ? result + CURSOR_MARKER : result;
	});
}

function parseTableData(
	tableHtml: string,
): { headers?: string[]; rows?: string[][] } {
	const headerMatches = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
	const headers = headerMatches?.map((th) =>
		th.replace(/<[^>]+>/g, "").trim(),
	);

	const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
	if (!tbodyMatch) return { headers };

	const rowMatches = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
	const rows = rowMatches?.map((tr) => {
		const cellMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
		return cellMatches?.map((td) => td.replace(/<[^>]+>/g, "").trim()) || [];
	});

	return { headers, rows };
}

function processTables(
	html: string,
	onTable?: RenderHooks["onTable"],
): string {
	if (!html.includes("<table")) return html;

	return html.replace(TABLE_RE, (_match, tableHtml) => {
		if (onTable) {
			const { headers, rows } = parseTableData(tableHtml);
			const hookData: TableData = { html: tableHtml, headers, rows };
			const hookResult = (onTable(hookData));
			if (hookResult !== null) {
				return hookResult;
			}
		}

		return defaultProcessTable({ html: tableHtml });
	});
}

/** Matches javascript: hrefs for sanitization */
const JAVASCRIPT_HREF_RE = /href\s*=\s*["']\s*javascript:[^"']*["']/gi;

/** Extracts href value from attributes */
const HREF_VALUE_RE = /href\s*=\s*["']([^"']*)["']/i;

function processLinks(
	html: string,
	onLink?: (data: LinkData) => HookResult,
): string {
	if (!html.includes("<a")) return html;

	let result = html;

	if (onLink) {
		result = result.replace(FULL_ANCHOR_RE, (_match, attributes, content) => {
			const hrefMatch = HREF_VALUE_RE.exec(attributes);
			const href = hrefMatch ? hrefMatch[1] : "";

			const titleMatch = TITLE_ATTR_RE.exec(attributes);
			const title = titleMatch ? titleMatch[1] : undefined;

			const text = content.replace(/<[^>]*>/g, "");

			const hookData: LinkData = { href, text, title };
			const hookResult = (onLink(hookData));

			if (hookResult !== null) {
				return hookResult;
			}

			return _match;
		});
	}

	// Default processing: sanitize and add security attributes
	return result.replace(ANCHOR_TAG_RE, (_match, attributes) => {
		let newAttributes = attributes.replace(
			JAVASCRIPT_HREF_RE,
			'href="#"',
		);

		const hrefMatch = HREF_VALUE_RE.exec(newAttributes);
		if (hrefMatch) {
			const href = hrefMatch[1];
			if (href && !href.startsWith("#") && !href.startsWith("/")) {
				if (!newAttributes.includes("target=")) {
					newAttributes += ' target="_blank" rel="noopener noreferrer"';
				}
			}
		}

		return `<a ${newAttributes}>`;
	});
}

/** Extracts src attribute value */
const SRC_VALUE_RE = /src\s*=\s*["']([^"']*)["']/i;

/** Extracts alt attribute value */
const ALT_VALUE_RE = /alt\s*=\s*["']([^"']*)["']/i;

function processImages(
	html: string,
	onImage?: (data: ImageData) => HookResult,
): string {
	if (!onImage || !html.includes("<img")) return html;

	return html.replace(IMG_TAG_RE, (match, attributes) => {
		const srcMatch = SRC_VALUE_RE.exec(attributes);
		const src = srcMatch ? srcMatch[1] : "";

		const altMatch = ALT_VALUE_RE.exec(attributes);
		const alt = altMatch ? altMatch[1] : "";

		const titleMatch = TITLE_ATTR_RE.exec(attributes);
		const title = titleMatch ? titleMatch[1] : undefined;

		const hookData: ImageData = { src, alt, title };
		const hookResult = (onImage(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/<[^>]*>/g, "")
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/--+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
}

function processHeadings(
	html: string,
	onHeading?: (data: HeadingData) => HookResult,
): string {
	if (!onHeading || !/<h[1-6]/i.test(html)) return html;

	return html.replace(HEADING_RE, (match, level, _attrs, content) => {
		const levelNum = parseInt(level, 10) as 1 | 2 | 3 | 4 | 5 | 6;
		const text = content.replace(/<[^>]*>/g, "").trim();
		const id = slugify(text);

		const hookData: HeadingData = {
			level: levelNum,
			text,
			id,
			html: content,
		};
		const hookResult = (onHeading(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processBlockquotes(
	html: string,
	onBlockquote?: (data: BlockquoteData) => HookResult,
): string {
	if (!onBlockquote || !html.includes("<blockquote>")) return html;

	return html.replace(BLOCKQUOTE_RE, (match, content) => {
		const hookData: BlockquoteData = { content: content.trim() };
		const hookResult = (onBlockquote(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processAlerts(
	html: string,
	onAlert?: (data: AlertData) => HookResult,
): string {
	if (!onAlert || !html.includes("markdown-alert")) return html;

	return html.replace(ALERT_RE, (match, type, title, content) => {
		const alertType = type.toLowerCase() as AlertType;
		const hookData: AlertData = {
			type: alertType,
			title: title.trim(),
			content: content.trim(),
		};
		const hookResult = (onAlert(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processLists(
	html: string,
	onList?: (data: ListData) => HookResult,
): string {
	if (!onList || (!html.includes("<ul>") && !html.includes("<ol>")))
		return html;

	return html.replace(LIST_RE, (match, tag, content) => {
		const type = tag.toLowerCase() === "ol" ? "ordered" : "unordered";

		const items: string[] = [];
		const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
		let liMatch;
		while ((liMatch = liRegex.exec(content)) !== null) {
			items.push(liMatch[1].replace(/<[^>]*>/g, "").trim());
		}

		const hookData: ListData = { type, html: match, items };
		const hookResult = (onList(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processHorizontalRules(
	html: string,
	onHorizontalRule?: (data: HorizontalRuleData) => HookResult,
): string {
	if (!onHorizontalRule || !html.includes("<hr")) return html;

	return html.replace(HR_RE, (match) => {
		const hookData: HorizontalRuleData = {};
		const hookResult = (onHorizontalRule(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processFootnoteRefs(
	html: string,
	onFootnoteRef?: (data: FootnoteRefData) => HookResult,
): string {
	if (!onFootnoteRef || !html.includes("footnote-ref")) return html;

	return html.replace(FOOTNOTE_REF_RE, (match, id, index) => {
		const hookData: FootnoteRefData = { id, index: parseInt(index, 10) };
		const hookResult = (onFootnoteRef(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}

function processFootnoteDefs(
	html: string,
	onFootnoteDef?: (data: FootnoteDefData) => HookResult,
): string {
	if (!onFootnoteDef || !html.includes('class="footnotes"')) return html;

	let index = 0;

	return html.replace(FOOTNOTE_DEF_RE, (match, id, content) => {
		index++;
		const hookData: FootnoteDefData = {
			id,
			index,
			content: content.trim(),
		};
		const hookResult = (onFootnoteDef(hookData));

		if (hookResult !== null) {
			return hookResult;
		}

		return match;
	});
}
