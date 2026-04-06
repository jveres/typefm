/**
 * Default table processor with copy menu.
 *
 * @module lib/defaults/table
 */

import type { TableData } from '../../types/hooks';
import { COPY_ICON, CHECK_ICON } from './code-block';

/** SVG icon for the chevron-down indicator on the copy button */
const CHEVRON_ICON = `<svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

/**
 * Default table processor - wraps in scrollable container with a copy menu.
 *
 * The copy menu uses the same efficient pattern as the code-block copy
 * button: static HTML injected at render time, with event delegation in
 * `useMarkdownViewer` handling clicks.
 *
 * @param data - Table data with raw HTML
 * @returns HTML string with table wrapped in scrollable container
 *
 * @example
 * const html = processTable({ html: '<table>...</table>' });
 */
export function processTable(data: TableData): string {
  return (
    `<div class="table-wrapper">` +
      `<div class="table-copy-menu" data-morph-ignore="true">` +
        `<button type="button" class="table-copy-btn" aria-label="Copy table">` +
          `${COPY_ICON}${CHECK_ICON}${CHEVRON_ICON}` +
        `</button>` +
        `<div class="table-copy-dropdown">` +
          `<button type="button" class="table-copy-option" data-format="csv">CSV</button>` +
          `<button type="button" class="table-copy-option" data-format="tsv">TSV</button>` +
          `<button type="button" class="table-copy-option" data-format="markdown">Markdown</button>` +
          `<button type="button" class="table-copy-option" data-format="html">HTML</button>` +
        `</div>` +
      `</div>` +
      `${data.html}` +
    `</div>`
  );
}
