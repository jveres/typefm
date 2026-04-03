const HTML_ENTITY_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&'
};
const HTML_ENTITY_RE = /&lt;|&gt;|&quot;|&#39;|&amp;/g;

export function decodeHtml(html: string): string {
  return html.replace(HTML_ENTITY_RE, (match) => HTML_ENTITY_MAP[match]);
}
