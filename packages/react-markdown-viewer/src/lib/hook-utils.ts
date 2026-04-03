/**
 * Utilities for processing hook results.
 *
 * @module lib/hook-utils
 */

import type { HookResult } from "../types/hooks";

/**
 * Escape HTML special characters to prevent XSS.
 *
 * Use this when inserting user content into HTML strings in hooks.
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 *
 * @example
 * import { escapeHtml } from '@typefm/react-markdown-viewer';
 *
 * const hooks: RenderHooks = {
 *   onCodeBlock: ({ code, language }) =>
 *     `<pre data-lang="${escapeHtml(language || '')}">${escapeHtml(code)}</pre>`,
 * };
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Resolve a hook result to a string or null.
 *
 * Hooks return `string | null`:
 * - `string` → HTML to insert (direct, fast)
 * - `null` → Use the default processor
 */
export function resolveHookResult(result: HookResult): string | null {
	if (typeof result === "string") return result;
	return null;
}
