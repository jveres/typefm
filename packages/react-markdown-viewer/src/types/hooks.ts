/**
 * Hook type definitions for customizing markdown rendering.
 *
 * @module types/hooks
 */

/**
 * Hook return type — string HTML or null to use default processor.
 *
 * - `string` → HTML to insert (direct, fast)
 * - `null` → Use the default processor
 *
 * @example
 * // Direct HTML string (recommended)
 * onCodeBlock: ({ code }) => `<pre>${escapeHtml(code)}</pre>`
 *
 * // Use default processor
 * onCodeBlock: () => null
 */
export type HookResult = string | null;

/**
 * Data passed to code block hook.
 */
export interface CodeBlockData {
	/** Raw code content (HTML-decoded) */
	code: string;
	/** Language identifier (normalized, e.g., 'javascript' not 'js') */
	language?: string;
}

/**
 * Data passed to inline code hook.
 */
export interface InlineCodeData {
	/** Raw code content */
	code: string;
}

/**
 * Data passed to math hook.
 */
export interface MathData {
	/** TeX source (HTML-decoded) */
	tex: string;
	/** true for $$...$$ display blocks, false for $...$ inline */
	displayMode: boolean;
}

/**
 * Data passed to table hook.
 */
export interface TableData {
	/** Raw table HTML from parser (sanitized) */
	html: string;
	/** Parsed header cell contents (convenience, extracted from html) */
	headers?: string[];
	/** Parsed row data - array of rows, each row is array of cell contents */
	rows?: string[][];
}

/**
 * Data passed to link hook.
 */
export interface LinkData {
	/** href attribute value */
	href: string;
	/** Link text content */
	text: string;
	/** title attribute value (optional) */
	title?: string;
}

/**
 * Data passed to image hook.
 */
export interface ImageData {
	/** Image source URL */
	src: string;
	/** Alt text */
	alt: string;
	/** Title attribute (optional) */
	title?: string;
}

/**
 * Data passed to heading hook.
 */
export interface HeadingData {
	/** Heading level (1-6) */
	level: 1 | 2 | 3 | 4 | 5 | 6;
	/** Text content of the heading (HTML stripped) */
	text: string;
	/** Generated ID for anchor links (slugified text) */
	id: string;
	/** Raw HTML content (may contain inline formatting) */
	html: string;
}

/**
 * Data passed to blockquote hook.
 */
export interface BlockquoteData {
	/** Inner HTML content of the blockquote */
	content: string;
}

/**
 * Alert type for GitHub-style alerts.
 */
export type AlertType = "note" | "tip" | "important" | "warning" | "caution";

/**
 * Data passed to alert hook.
 */
export interface AlertData {
	/** Alert type */
	type: AlertType;
	/** Alert title (e.g., "Note", "Warning") */
	title: string;
	/** Inner HTML content of the alert */
	content: string;
}

/**
 * Data passed to list hook.
 */
export interface ListData {
	/** List type */
	type: "ordered" | "unordered";
	/** Raw HTML of the list */
	html: string;
	/** List items (text content, HTML stripped) */
	items: string[];
}

/**
 * Data passed to horizontal rule hook.
 */
export interface HorizontalRuleData {
	/** Always empty - horizontal rules have no content */
}

/**
 * Data passed to footnote reference hook.
 */
export interface FootnoteRefData {
	/** Footnote identifier */
	id: string;
	/** Footnote number (1-based index) */
	index: number;
}

/**
 * Data passed to footnote definition hook.
 */
export interface FootnoteDefData {
	/** Footnote identifier */
	id: string;
	/** Footnote number (1-based index) */
	index: number;
	/** Inner HTML content of the footnote */
	content: string;
}

/**
 * Hooks for customizing markdown rendering.
 *
 * Each hook receives element data and can return:
 * - `string` → HTML to insert (fast, recommended)
 * - `null` → Use the default processor
 *
 * @example
 * const hooks: RenderHooks = {
 *   // Custom code block
 *   onCodeBlock: ({ code, language }) =>
 *     `<pre data-lang="${language}"><code>${escapeHtml(code)}</code></pre>`,
 *
 *   // Selective override - mermaid gets custom, others use default
 *   onCodeBlock: ({ code, language }) => {
 *     if (language === 'mermaid') {
 *       return `<div class="mermaid">${escapeHtml(code)}</div>`;
 *     }
 *     return null; // Use default for other languages
 *   },
 *
 *   // Final transformation (string only)
 *   onRender: (html) => html.replace(/TODO/g, '<mark>TODO</mark>'),
 * };
 */
export interface RenderHooks {
	/** Transform fenced code blocks (```language ... ```). */
	onCodeBlock?: (data: CodeBlockData) => HookResult;

	/** Transform inline code spans (`code`). */
	onInlineCode?: (data: InlineCodeData) => HookResult;

	/** Transform math blocks (KaTeX). */
	onMath?: (data: MathData) => HookResult;

	/** Transform tables. */
	onTable?: (data: TableData) => HookResult;

	/** Transform links. */
	onLink?: (data: LinkData) => HookResult;

	/** Transform images. */
	onImage?: (data: ImageData) => HookResult;

	/** Transform headings (h1-h6). */
	onHeading?: (data: HeadingData) => HookResult;

	/** Transform blockquotes. */
	onBlockquote?: (data: BlockquoteData) => HookResult;

	/** Transform GitHub-style alerts ([!NOTE], [!WARNING], etc.). */
	onAlert?: (data: AlertData) => HookResult;

	/** Transform lists (ordered and unordered). */
	onList?: (data: ListData) => HookResult;

	/** Transform horizontal rules. */
	onHorizontalRule?: (data: HorizontalRuleData) => HookResult;

	/** Transform footnote references (the [^1] in text). */
	onFootnoteRef?: (data: FootnoteRefData) => HookResult;

	/** Transform footnote definitions (at the bottom). */
	onFootnoteDef?: (data: FootnoteDefData) => HookResult;

	/**
	 * Final transformation on the complete HTML output.
	 * String-only — runs after all other processing.
	 */
	onRender?: (html: string) => string;
}
