/**
 * Default code block processor with syntax highlighting and copy button.
 * 
 * @module lib/defaults/code-block
 */

import { highlight } from '../highlighter';
import type { CodeBlockData, InlineCodeData } from '../../types/hooks';

// --------------------------------------------------------------------------
// Constants (hoisted for performance)
// --------------------------------------------------------------------------

/** SVG icon for copy button */
export const COPY_ICON = `<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;

/** SVG icon for copied state */
export const CHECK_ICON = `<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;

/** 
 * Matches hex, rgb, rgba, hsl, hsla colors.
 * Negative lookbehind prevents matching HTML entities like &#124; or &amp;#124;
 */
export const COLOR_RE = /(?<!&)(?<!;)#([0-9a-fA-F]{3,8})\b|(?:rgba?|hsla?)\([\d\s,.%]+\)/gi;

// --------------------------------------------------------------------------
// Options
// --------------------------------------------------------------------------

export interface CodeBlockOptions {
  /** Enable color preview injection (default: true) */
  colorPreviews?: boolean;
  /** 
   * Wrap lines in `<span class="code-line">` for streaming stability (default: false).
   * 
   * Note: The default parser wraps lines automatically during streaming.
   * Set this to `true` if you override `onCodeBlock` and want similar behavior.
   */
  wrapLines?: boolean;
}

export interface InlineCodeOptions {
  /** Enable color preview injection (default: true) */
  colorPreviews?: boolean;
}

// --------------------------------------------------------------------------
// Processors
// --------------------------------------------------------------------------

/**
 * Inject color preview boxes into content containing color codes.
 * 
 * @param content - Content to process
 * @returns Content with color preview boxes injected
 */
export function injectColorPreviews(content: string): string {
  if (!content.includes('#') && !content.includes('rgb') && !content.includes('hsl')) {
    return content;
  }

  return content.replace(COLOR_RE, (colorMatch: string) => {
    // Validate hex colors
    if (colorMatch.startsWith('#')) {
      const hex = colorMatch.slice(1);
      if (![3, 4, 6, 8].includes(hex.length)) {
        return colorMatch;
      }
    }
    return `<span style="white-space: nowrap;"><span class="color-box" style="background-color: ${colorMatch};"></span>${colorMatch}</span>`;
  });
}

/**
 * Default code block processor.
 * 
 * Applies syntax highlighting, optional color previews, and wraps in a
 * container with a copy button.
 * 
 * @param data - Code block data with code and language
 * @param options - Processing options
 * @returns HTML string for the code block
 * 
 * @example
 * const html = processCodeBlock(
 *   { code: 'const x = 1;', language: 'javascript' },
 *   { colorPreviews: true, wrapLines: false }
 * );
 */
export function processCodeBlock(
  data: CodeBlockData,
  options: CodeBlockOptions = {}
): string {
  const { code, language } = data;
  const { colorPreviews = true, wrapLines = false } = options;

  // 1. Apply syntax highlighting
  let content = highlight(code, language);

  // 2. Apply color previews if enabled
  if (colorPreviews) {
    content = injectColorPreviews(content);
  }

  // 3. Wrap lines for streaming stability
  if (wrapLines && content) {
    content = content.replace(/^(.*)$/gm, '<span class="code-line">$1</span>');
  }

  // 4. Build the code block with wrapper and copy button
  const langClass = language ? `language-${language}` : '';
  const codeTag = langClass 
    ? `<code class="${langClass}">${content}</code>`
    : `<code>${content}</code>`;

  return `<div class="code-block-wrapper"><button type="button" class="copy-btn" aria-label="Copy code">${COPY_ICON}${CHECK_ICON}</button><pre>${codeTag}</pre></div>`;
}

/**
 * Default inline code processor.
 * 
 * Optionally injects color preview boxes for color codes.
 * 
 * @param data - Inline code data
 * @param options - Processing options
 * @returns HTML string for the inline code
 * 
 * @example
 * const html = processInlineCode(
 *   { code: '#ff0000' },
 *   { colorPreviews: true }
 * );
 */
export function processInlineCode(
  data: InlineCodeData,
  options: InlineCodeOptions = {}
): string {
  const { code } = data;
  const { colorPreviews = true } = options;

  let content = code;

  // Apply color previews if enabled
  if (colorPreviews) {
    content = injectColorPreviews(content);
  }

  return `<code>${content}</code>`;
}
