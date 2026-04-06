/**
 * Table data extraction and format conversion utilities.
 *
 * @module lib/defaults/table-helpers
 */

import { escapeHtml } from "../hook-utils";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type TableColumnAlignment = "left" | "center" | "right" | "none";

export interface TableCopyData {
  headers: string[];
  rows: string[][];
  alignments: TableColumnAlignment[];
}

// --------------------------------------------------------------------------
// DOM extraction
// --------------------------------------------------------------------------

/**
 * Extract structured table data from a `<table>` DOM element.
 *
 * Reads `thead th` for headers (including alignment from inline style or
 * `align` attribute) and `tbody tr > td` for body rows.
 */
export function extractTableDataFromElement(
  table: HTMLTableElement,
): TableCopyData {
  const headers: string[] = [];
  const alignments: TableColumnAlignment[] = [];
  const rows: string[][] = [];

  // Headers + alignment
  const headerCells = table.querySelectorAll("thead th");
  for (const cell of headerCells) {
    headers.push(cell.textContent?.trim() ?? "");

    const el = cell as HTMLElement;
    const align =
      el.style.textAlign?.toLowerCase() ||
      el.getAttribute("align")?.toLowerCase();

    if (align === "left") alignments.push("left");
    else if (align === "center") alignments.push("center");
    else if (align === "right") alignments.push("right");
    else alignments.push("none");
  }

  // Body rows
  for (const row of table.querySelectorAll("tbody tr")) {
    const rowData: string[] = [];
    for (const cell of row.querySelectorAll("td")) {
      rowData.push(cell.textContent?.trim() ?? "");
    }
    rows.push(rowData);
  }

  // Fallback: infer column count when headers are absent
  if (alignments.length === 0 && rows.length > 0) {
    for (let i = 0; i < rows[0].length; i++) {
      alignments.push("none");
    }
  }

  return { headers, rows, alignments };
}

// --------------------------------------------------------------------------
// CSV
// --------------------------------------------------------------------------

function escapeCSV(value: string): string {
  let needsQuoting = false;
  let hasQuote = false;

  for (const ch of value) {
    if (ch === '"') {
      needsQuoting = true;
      hasQuote = true;
      break;
    }
    if (ch === "," || ch === "\n") {
      needsQuoting = true;
    }
  }

  if (!needsQuoting) return value;
  return hasQuote ? `"${value.replace(/"/g, '""')}"` : `"${value}"`;
}

/** Convert table data to CSV. */
export function tableDataToCSV(data: TableCopyData): string {
  const { headers, rows } = data;
  const total = headers.length > 0 ? rows.length + 1 : rows.length;
  const out: string[] = new Array(total);
  let idx = 0;

  if (headers.length > 0) {
    out[idx++] = headers.map(escapeCSV).join(",");
  }
  for (const row of rows) {
    out[idx++] = row.map(escapeCSV).join(",");
  }
  return out.join("\n");
}

// --------------------------------------------------------------------------
// TSV
// --------------------------------------------------------------------------

function escapeTSV(value: string): string {
  let needsEscaping = false;
  for (const ch of value) {
    if (ch === "\t" || ch === "\n" || ch === "\r") {
      needsEscaping = true;
      break;
    }
  }
  if (!needsEscaping) return value;

  const parts: string[] = [];
  for (const ch of value) {
    if (ch === "\t") parts.push("\\t");
    else if (ch === "\n") parts.push("\\n");
    else if (ch === "\r") parts.push("\\r");
    else parts.push(ch);
  }
  return parts.join("");
}

/** Convert table data to TSV. */
export function tableDataToTSV(data: TableCopyData): string {
  const { headers, rows } = data;
  const total = headers.length > 0 ? rows.length + 1 : rows.length;
  const out: string[] = new Array(total);
  let idx = 0;

  if (headers.length > 0) {
    out[idx++] = headers.map(escapeTSV).join("\t");
  }
  for (const row of rows) {
    out[idx++] = row.map(escapeTSV).join("\t");
  }
  return out.join("\n");
}

// --------------------------------------------------------------------------
// Markdown (GFM)
// --------------------------------------------------------------------------

function escapeMarkdownCell(cell: string): string {
  let needsEscaping = false;
  for (const ch of cell) {
    if (ch === "\\" || ch === "|") {
      needsEscaping = true;
      break;
    }
  }
  if (!needsEscaping) return cell;

  const parts: string[] = [];
  for (const ch of cell) {
    if (ch === "\\") parts.push("\\\\");
    else if (ch === "|") parts.push("\\|");
    else parts.push(ch);
  }
  return parts.join("");
}

/** Convert table data to a GFM Markdown table. */
export function tableDataToMarkdown(data: TableCopyData): string {
  const { headers, rows, alignments } = data;
  if (headers.length === 0) return "";

  const out: string[] = new Array(rows.length + 2);
  let idx = 0;

  // Header row
  out[idx++] = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;

  // Separator with alignment
  const sep = new Array(headers.length);
  for (let i = 0; i < headers.length; i++) {
    const a = alignments[i] ?? "none";
    sep[i] =
      a === "left"
        ? ":---"
        : a === "center"
          ? ":---:"
          : a === "right"
            ? "---:"
            : "---";
  }
  out[idx++] = `| ${sep.join(" | ")} |`;

  // Data rows
  for (const row of rows) {
    if (row.length < headers.length) {
      const padded = new Array(headers.length);
      for (let i = 0; i < headers.length; i++) {
        padded[i] = i < row.length ? escapeMarkdownCell(row[i]) : "";
      }
      out[idx++] = `| ${padded.join(" | ")} |`;
    } else {
      out[idx++] = `| ${row.map(escapeMarkdownCell).join(" | ")} |`;
    }
  }

  return out.join("\n");
}

// --------------------------------------------------------------------------
// HTML
// --------------------------------------------------------------------------

/** Convert table data to a standalone HTML table (for rich clipboard). */
export function tableDataToHTML(data: TableCopyData): string {
  const { headers, rows, alignments } = data;

  const style = (i: number) => {
    const a = alignments[i];
    return a && a !== "none" ? ` style="text-align: ${a};"` : "";
  };

  let html = "<table>";

  if (headers.length > 0) {
    html += "<thead><tr>";
    for (let i = 0; i < headers.length; i++) {
      html += `<th${style(i)}>${escapeHtml(headers[i])}</th>`;
    }
    html += "</tr></thead>";
  }

  html += "<tbody>";
  for (const row of rows) {
    html += "<tr>";
    for (let i = 0; i < row.length; i++) {
      html += `<td${style(i)}>${escapeHtml(row[i])}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  return html;
}
