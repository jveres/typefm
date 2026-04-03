/**
 * Default link processor with security hardening.
 * 
 * @module lib/defaults/link
 */

import type { LinkData } from '../../types/hooks';

/** Matches javascript: URLs (case-insensitive, with optional whitespace) */
const JAVASCRIPT_URL_RE = /^\s*javascript:/i;

/** Matches vbscript: URLs */
const VBSCRIPT_URL_RE = /^\s*vbscript:/i;

/** Matches data: URLs (except safe image types) */
const DANGEROUS_DATA_URL_RE = /^\s*data:(?!image\/(?:png|jpeg|jpg|gif|webp|svg\+xml))/i;

/**
 * Check if a URL is potentially dangerous.
 * 
 * @param href - URL to check
 * @returns true if the URL should be sanitized
 */
export function isDangerousUrl(href: string): boolean {
  return (
    JAVASCRIPT_URL_RE.test(href) ||
    VBSCRIPT_URL_RE.test(href) ||
    DANGEROUS_DATA_URL_RE.test(href)
  );
}

/**
 * Check if a URL is external (not anchor or relative).
 * 
 * @param href - URL to check
 * @returns true if the URL is external
 */
export function isExternalUrl(href: string): boolean {
  return (
    !!href &&
    !href.startsWith('#') &&
    !href.startsWith('/') &&
    !href.startsWith('.')
  );
}

/**
 * Default link processor - sanitizes and adds security attributes.
 * 
 * Security measures:
 * - Sanitizes javascript:, vbscript:, and dangerous data: URLs
 * - Adds target="_blank" and rel="noopener noreferrer" to external links
 * 
 * @param data - Link data with href, text, and optional title
 * @returns HTML string for the anchor tag
 * 
 * @example
 * // Internal link
 * processLink({ href: '/about', text: 'About' });
 * // Returns: '<a href="/about">About</a>'
 * 
 * // External link
 * processLink({ href: 'https://example.com', text: 'Example' });
 * // Returns: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>'
 * 
 * // Dangerous link (sanitized)
 * processLink({ href: 'javascript:alert(1)', text: 'Click' });
 * // Returns: '<a href="#">Click</a>'
 */
export function processLink(data: LinkData): string {
  const { href, text, title } = data;

  // Sanitize dangerous URLs
  const safeHref = isDangerousUrl(href) ? '#' : href;

  // Build attributes
  const attrs: string[] = [`href="${safeHref}"`];

  if (title) {
    // Escape quotes in title
    const safeTitle = title.replace(/"/g, '&quot;');
    attrs.push(`title="${safeTitle}"`);
  }

  // Add security attributes to external links
  if (isExternalUrl(safeHref)) {
    attrs.push('target="_blank"');
    attrs.push('rel="noopener noreferrer"');
  }

  return `<a ${attrs.join(' ')}>${text}</a>`;
}
