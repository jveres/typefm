/**
 * DOM-dependent table copy helper tests.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  extractTableDataFromElement,
  tableDataToHTML,
  type TableCopyData,
} from '../../src/lib/defaults/table-helpers';

const createTable = (html: string): HTMLTableElement => {
  const table = document.createElement('table');
  table.innerHTML = html;
  return table;
};

describe('extractTableDataFromElement', () => {
  it('extracts basic headers and rows', () => {
    const table = createTable(`
      <thead><tr><th>Name</th><th>Age</th></tr></thead>
      <tbody>
        <tr><td>Alice</td><td>30</td></tr>
        <tr><td>Bob</td><td>25</td></tr>
      </tbody>
    `);

    const result = extractTableDataFromElement(table);
    expect(result.headers).toEqual(['Name', 'Age']);
    expect(result.rows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('detects alignments from align attribute', () => {
    const table = createTable(`
      <thead><tr>
        <th align="left">L</th>
        <th align="center">C</th>
        <th align="right">R</th>
        <th>N</th>
      </tr></thead>
      <tbody></tbody>
    `);

    expect(extractTableDataFromElement(table).alignments).toEqual([
      'left', 'center', 'right', 'none',
    ]);
  });

  it('detects alignments from inline style', () => {
    const table = createTable(`
      <thead><tr>
        <th style="text-align: left">L</th>
        <th style="text-align: center">C</th>
        <th style="text-align: right">R</th>
      </tr></thead>
      <tbody></tbody>
    `);

    expect(extractTableDataFromElement(table).alignments).toEqual([
      'left', 'center', 'right',
    ]);
  });

  it('prioritizes style over align attribute', () => {
    const table = createTable(`
      <thead><tr>
        <th align="left" style="text-align: right">X</th>
      </tr></thead>
      <tbody></tbody>
    `);

    expect(extractTableDataFromElement(table).alignments).toEqual(['right']);
  });

  it('trims whitespace from content', () => {
    const table = createTable(`
      <tbody><tr><td>  padded  </td></tr></tbody>
    `);

    expect(extractTableDataFromElement(table).rows[0][0]).toBe('padded');
  });

  it('infers column count when headers are absent', () => {
    const table = createTable(`
      <tbody><tr><td>A</td><td>B</td><td>C</td></tr></tbody>
    `);

    const result = extractTableDataFromElement(table);
    expect(result.headers).toEqual([]);
    expect(result.alignments).toEqual(['none', 'none', 'none']);
  });
});

describe('tableDataToHTML (DOM round-trip)', () => {
  const parseHTMLTable = (html: string): HTMLTableElement => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.querySelector('table') as HTMLTableElement;
  };

  it('generates basic table structure', () => {
    const data: TableCopyData = {
      headers: ['Col 1', 'Col 2'],
      rows: [['Val 1', 'Val 2']],
      alignments: ['none', 'none'],
    };

    const table = parseHTMLTable(tableDataToHTML(data));
    expect(table.querySelectorAll('thead th').length).toBe(2);
    expect(table.querySelectorAll('tbody tr').length).toBe(1);
    expect(table.querySelector('th')?.textContent).toBe('Col 1');
    expect(table.querySelector('td')?.textContent).toBe('Val 1');
  });

  it('applies text-align styles based on alignment', () => {
    const data: TableCopyData = {
      headers: ['L', 'C', 'R', 'N'],
      rows: [],
      alignments: ['left', 'center', 'right', 'none'],
    };

    const table = parseHTMLTable(tableDataToHTML(data));
    const ths = table.querySelectorAll('th');
    expect((ths[0] as HTMLElement).style.textAlign).toBe('left');
    expect((ths[1] as HTMLElement).style.textAlign).toBe('center');
    expect((ths[2] as HTMLElement).style.textAlign).toBe('right');
    expect((ths[3] as HTMLElement).style.textAlign).toBe('');
  });

  it('applies alignment styles to body cells', () => {
    const data: TableCopyData = {
      headers: ['L', 'R'],
      rows: [['Cell L', 'Cell R']],
      alignments: ['left', 'right'],
    };

    const table = parseHTMLTable(tableDataToHTML(data));
    const tds = table.querySelectorAll('td');
    expect((tds[0] as HTMLElement).style.textAlign).toBe('left');
    expect((tds[1] as HTMLElement).style.textAlign).toBe('right');
  });

  it('omits thead when headers are empty', () => {
    const data: TableCopyData = {
      headers: [],
      rows: [['Data']],
      alignments: ['none'],
    };

    const table = parseHTMLTable(tableDataToHTML(data));
    expect(table.querySelector('thead')).toBeNull();
    expect(table.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('escapes HTML entities in cell content', () => {
    const data: TableCopyData = {
      headers: ['Expression'],
      rows: [['a < b & c > d']],
      alignments: ['none'],
    };

    const table = parseHTMLTable(tableDataToHTML(data));
    // textContent round-trips correctly when entities are escaped
    expect(table.querySelector('td')?.textContent).toBe('a < b & c > d');
  });
});
