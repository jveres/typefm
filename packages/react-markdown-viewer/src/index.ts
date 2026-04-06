// Main component
export { MarkdownViewer, MarkdownViewerSafe } from "./MarkdownViewer";
export type {
	MarkdownViewerProps,
	MarkdownViewerRef,
	MarkdownViewerSafeProps,
} from "./MarkdownViewer";

// Error boundary (for custom error handling)
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

// Hook for custom implementations
export { useMarkdownViewer } from "./useMarkdownViewer";
export type { UseMarkdownViewerOptions } from "./useMarkdownViewer";

// WASM initialization
export {
	initMarkdownViewer,
	initMarkdownViewerSync,
	isWasmReady,
} from "./lib/wasm-init";

// Hook types for customizing rendering
export type {
	RenderHooks,
	HookResult,
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
} from "./types/hooks";

// Default processors (for extending/wrapping)
export {
	processCodeBlock,
	processInlineCode,
	injectColorPreviews,
	type CodeBlockOptions,
	type InlineCodeOptions,
} from "./lib/defaults/code-block";

export {
	processMathBlock,
	_setKaTeXLoadDelay,
	_resetKaTeX,
} from "./lib/defaults/math";

export { processTable } from "./lib/defaults/table";

export {
	extractTableDataFromElement,
	tableDataToCSV,
	tableDataToTSV,
	tableDataToMarkdown,
	tableDataToHTML,
	type TableCopyData,
	type TableColumnAlignment,
} from "./lib/defaults/table-helpers";

export {
	processLink,
	isDangerousUrl,
	isExternalUrl,
} from "./lib/defaults/link";

export { processImage, type ImageOptions } from "./lib/defaults/image";

// Preload utilities for performance optimization
export { preloadKaTeX } from "./lib/parser";

// Hook utilities
export { escapeHtml } from "./lib/hook-utils";

// Syntax highlighting utilities
export {
	loadLanguage,
	loadLanguages,
	registerLanguage,
	isLanguageReady,
	isLanguageSupported,
	getRegisteredLanguages,
	getSupportedLanguages,
	_setHighlighterLoadDelay,
	_resetHighlighter,
} from "./lib/highlighter";
