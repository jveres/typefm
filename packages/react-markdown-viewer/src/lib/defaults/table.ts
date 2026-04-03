/**
 * Default table processor.
 * 
 * @module lib/defaults/table
 */

import type { TableData } from '../../types/hooks';

/**
 * Default table processor - wraps in scrollable container.
 * 
 * @param data - Table data with raw HTML
 * @returns HTML string with table wrapped in scrollable container
 * 
 * @example
 * const html = processTable({ html: '<table>...</table>' });
 * // Returns: '<div class="table-wrapper"><table>...</table></div>'
 */
export function processTable(data: TableData): string {
  return `<div class="table-wrapper">${data.html}</div>`;
}
