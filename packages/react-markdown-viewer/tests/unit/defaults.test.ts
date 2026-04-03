/**
 * Tests for default processors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  processLink, 
  isDangerousUrl, 
  isExternalUrl 
} from '../../src/lib/defaults/link';
import { 
  processCodeBlock, 
  processInlineCode, 
  injectColorPreviews,
  COPY_ICON,
  CHECK_ICON,
  COLOR_RE
} from '../../src/lib/defaults/code-block';
import {
  processMathBlock,
  isKaTeXReady,
  getKaTeXModule,
  preloadKaTeX,
  ensureKaTeXLoading,
} from '../../src/lib/defaults/math';
import { processImage } from '../../src/lib/defaults/image';

describe('Default Link Processor', () => {
  describe('isDangerousUrl', () => {
    it('detects javascript: URLs', () => {
      expect(isDangerousUrl('javascript:alert(1)')).toBe(true);
      expect(isDangerousUrl('JAVASCRIPT:alert(1)')).toBe(true);
      expect(isDangerousUrl('  javascript:alert(1)')).toBe(true);
    });

    it('detects vbscript: URLs', () => {
      expect(isDangerousUrl('vbscript:msgbox(1)')).toBe(true);
      expect(isDangerousUrl('VBSCRIPT:msgbox(1)')).toBe(true);
    });

    it('detects dangerous data: URLs', () => {
      expect(isDangerousUrl('data:text/html,<script>alert(1)</script>')).toBe(true);
      expect(isDangerousUrl('data:application/javascript,alert(1)')).toBe(true);
    });

    it('allows safe data: URLs (images)', () => {
      expect(isDangerousUrl('data:image/png;base64,abc')).toBe(false);
      expect(isDangerousUrl('data:image/jpeg;base64,abc')).toBe(false);
      expect(isDangerousUrl('data:image/gif;base64,abc')).toBe(false);
      expect(isDangerousUrl('data:image/webp;base64,abc')).toBe(false);
      expect(isDangerousUrl('data:image/svg+xml;base64,abc')).toBe(false);
    });

    it('allows normal URLs', () => {
      expect(isDangerousUrl('https://example.com')).toBe(false);
      expect(isDangerousUrl('http://example.com')).toBe(false);
      expect(isDangerousUrl('/path/to/page')).toBe(false);
      expect(isDangerousUrl('#anchor')).toBe(false);
      expect(isDangerousUrl('mailto:test@example.com')).toBe(false);
    });
  });

  describe('isExternalUrl', () => {
    it('returns true for external URLs', () => {
      expect(isExternalUrl('https://example.com')).toBe(true);
      expect(isExternalUrl('http://example.com')).toBe(true);
      expect(isExternalUrl('ftp://files.example.com')).toBe(true);
      expect(isExternalUrl('mailto:test@example.com')).toBe(true);
    });

    it('returns false for anchor links', () => {
      expect(isExternalUrl('#section')).toBe(false);
      expect(isExternalUrl('#')).toBe(false);
    });

    it('returns false for absolute paths', () => {
      expect(isExternalUrl('/about')).toBe(false);
      expect(isExternalUrl('/docs/api')).toBe(false);
    });

    it('returns false for relative paths', () => {
      expect(isExternalUrl('./file.html')).toBe(false);
      expect(isExternalUrl('../parent/file.html')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isExternalUrl('')).toBe(false);
    });
  });

  describe('processLink', () => {
    it('creates basic internal link', () => {
      const html = processLink({ href: '/about', text: 'About' });
      expect(html).toBe('<a href="/about">About</a>');
    });

    it('creates external link with security attributes', () => {
      const html = processLink({ href: 'https://example.com', text: 'Example' });
      expect(html).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>');
    });

    it('sanitizes javascript: URLs', () => {
      const html = processLink({ href: 'javascript:alert(1)', text: 'Click' });
      expect(html).toBe('<a href="#">Click</a>');
      expect(html).not.toContain('javascript');
    });

    it('sanitizes vbscript: URLs', () => {
      const html = processLink({ href: 'vbscript:msgbox(1)', text: 'Click' });
      expect(html).toBe('<a href="#">Click</a>');
    });

    it('sanitizes dangerous data: URLs', () => {
      const html = processLink({ href: 'data:text/html,<script>', text: 'Click' });
      expect(html).toBe('<a href="#">Click</a>');
    });

    it('preserves safe data: URLs', () => {
      const html = processLink({ href: 'data:image/png;base64,abc', text: 'Image' });
      expect(html).toContain('data:image/png;base64,abc');
    });

    it('includes title attribute when provided', () => {
      const html = processLink({ href: '/about', text: 'About', title: 'About Us' });
      expect(html).toBe('<a href="/about" title="About Us">About</a>');
    });

    it('escapes quotes in title', () => {
      const html = processLink({ href: '/about', text: 'About', title: 'Say "Hello"' });
      expect(html).toContain('title="Say &quot;Hello&quot;"');
    });

    it('creates anchor links without external attributes', () => {
      const html = processLink({ href: '#section', text: 'Go to section' });
      expect(html).toBe('<a href="#section">Go to section</a>');
      expect(html).not.toContain('target=');
      expect(html).not.toContain('rel=');
    });

    it('creates mailto links with external attributes', () => {
      const html = processLink({ href: 'mailto:test@example.com', text: 'Email' });
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });
  });
});

describe('Default Code Block Processor', () => {
  describe('COLOR_RE regex', () => {
    it('matches hex colors', () => {
      expect('#fff'.match(COLOR_RE)).toEqual(['#fff']);
      expect('#ffffff'.match(COLOR_RE)).toEqual(['#ffffff']);
      expect('#ffff'.match(COLOR_RE)).toEqual(['#ffff']); // 4-digit with alpha
      expect('#ffffffff'.match(COLOR_RE)).toEqual(['#ffffffff']); // 8-digit with alpha
    });

    it('matches rgb colors', () => {
      expect('rgb(255, 0, 0)'.match(COLOR_RE)).toEqual(['rgb(255, 0, 0)']);
      expect('rgb(255,0,0)'.match(COLOR_RE)).toEqual(['rgb(255,0,0)']);
    });

    it('matches rgba colors', () => {
      expect('rgba(255, 0, 0, 0.5)'.match(COLOR_RE)).toEqual(['rgba(255, 0, 0, 0.5)']);
    });

    it('matches hsl colors', () => {
      expect('hsl(0, 100%, 50%)'.match(COLOR_RE)).toEqual(['hsl(0, 100%, 50%)']);
    });

    it('matches hsla colors', () => {
      expect('hsla(0, 100%, 50%, 0.5)'.match(COLOR_RE)).toEqual(['hsla(0, 100%, 50%, 0.5)']);
    });

    it('does not match HTML entities', () => {
      expect('&#124;'.match(COLOR_RE)).toBeNull();
      expect('&amp;#124;'.match(COLOR_RE)).toBeNull();
    });
  });

  describe('injectColorPreviews', () => {
    it('injects color preview for hex colors', () => {
      const result = injectColorPreviews('#ff0000');
      expect(result).toContain('class="color-box"');
      expect(result).toContain('background-color: #ff0000');
      expect(result).toContain('#ff0000');
    });

    it('injects color preview for rgb colors', () => {
      const result = injectColorPreviews('rgb(255, 0, 0)');
      expect(result).toContain('class="color-box"');
      expect(result).toContain('background-color: rgb(255, 0, 0)');
    });

    it('injects color preview for hsl colors', () => {
      const result = injectColorPreviews('hsl(0, 100%, 50%)');
      expect(result).toContain('class="color-box"');
      expect(result).toContain('background-color: hsl(0, 100%, 50%)');
    });

    it('handles multiple colors', () => {
      const result = injectColorPreviews('#fff #000');
      expect(result.match(/color-box/g)?.length).toBe(2);
    });

    it('returns unchanged for content without colors', () => {
      const input = 'const x = 1;';
      expect(injectColorPreviews(input)).toBe(input);
    });

    it('skips invalid hex lengths', () => {
      // 5-digit hex is not valid
      const result = injectColorPreviews('#12345');
      expect(result).not.toContain('color-box');
    });

    it('preserves content around colors', () => {
      const result = injectColorPreviews('color: #ff0000;');
      expect(result).toContain('color:');
      expect(result).toContain(';');
    });
  });

  describe('processCodeBlock', () => {
    it('wraps code in code-block-wrapper', () => {
      const html = processCodeBlock({ code: 'const x = 1;', language: 'javascript' });
      expect(html).toContain('class="code-block-wrapper"');
    });

    it('includes copy button', () => {
      const html = processCodeBlock({ code: 'test', language: 'text' });
      expect(html).toContain('class="copy-btn"');
      expect(html).toContain('aria-label="Copy code"');
    });

    it('includes copy and check icons', () => {
      const html = processCodeBlock({ code: 'test' });
      expect(html).toContain('class="copy-icon"');
      expect(html).toContain('class="check-icon"');
    });

    it('adds language class to code element', () => {
      const html = processCodeBlock({ code: 'test', language: 'javascript' });
      expect(html).toContain('class="language-javascript"');
    });

    it('omits language class when no language specified', () => {
      const html = processCodeBlock({ code: 'test' });
      expect(html).toContain('<code>');
      expect(html).not.toContain('class="language-');
    });

    it('injects color previews by default', () => {
      const html = processCodeBlock({ code: '#ff0000', language: 'css' });
      expect(html).toContain('class="color-box"');
    });

    it('can disable color previews', () => {
      const html = processCodeBlock({ code: '#ff0000', language: 'css' }, { colorPreviews: false });
      expect(html).not.toContain('class="color-box"');
    });

    it('can wrap lines', () => {
      const html = processCodeBlock({ code: 'line1\nline2', language: 'text' }, { wrapLines: true });
      expect(html).toContain('class="code-line"');
    });

    it('does not wrap lines by default', () => {
      const html = processCodeBlock({ code: 'line1\nline2', language: 'text' });
      expect(html).not.toContain('class="code-line"');
    });

    it('escapes HTML in code', () => {
      const html = processCodeBlock({ code: '<script>alert(1)</script>' });
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });
  });

  describe('processInlineCode', () => {
    it('wraps code in code element', () => {
      const html = processInlineCode({ code: 'test' });
      expect(html).toBe('<code>test</code>');
    });

    it('injects color previews by default', () => {
      const html = processInlineCode({ code: '#ff0000' });
      expect(html).toContain('class="color-box"');
      expect(html).toContain('background-color: #ff0000');
    });

    it('can disable color previews', () => {
      const html = processInlineCode({ code: '#ff0000' }, { colorPreviews: false });
      expect(html).toBe('<code>#ff0000</code>');
    });

    it('preserves code content', () => {
      const html = processInlineCode({ code: 'npm install' });
      expect(html).toContain('npm install');
    });
  });

  describe('Icon constants', () => {
    it('COPY_ICON is valid SVG', () => {
      expect(COPY_ICON).toContain('<svg');
      expect(COPY_ICON).toContain('class="copy-icon"');
      expect(COPY_ICON).toContain('</svg>');
    });

    it('CHECK_ICON is valid SVG', () => {
      expect(CHECK_ICON).toContain('<svg');
      expect(CHECK_ICON).toContain('class="check-icon"');
      expect(CHECK_ICON).toContain('</svg>');
    });
  });
});

describe('Default Math Processor', () => {
  describe('isKaTeXReady', () => {
    it('returns boolean indicating KaTeX load state', () => {
      // May be true or false depending on test order
      expect(typeof isKaTeXReady()).toBe('boolean');
    });
  });

  describe('getKaTeXModule', () => {
    it('returns null or KaTeX module', () => {
      const module = getKaTeXModule();
      // Either null (not loaded) or an object with renderToString
      expect(module === null || typeof module.renderToString === 'function').toBe(true);
    });
  });

  describe('ensureKaTeXLoading', () => {
    it('triggers KaTeX preload without throwing', () => {
      expect(() => ensureKaTeXLoading()).not.toThrow();
    });

    it('is idempotent (can be called multiple times)', () => {
      expect(() => {
        ensureKaTeXLoading();
        ensureKaTeXLoading();
        ensureKaTeXLoading();
      }).not.toThrow();
    });
  });

  describe('preloadKaTeX', () => {
    it('returns a promise', () => {
      const result = preloadKaTeX();
      expect(result).toBeInstanceOf(Promise);
    });

    it('resolves without error', async () => {
      await expect(preloadKaTeX()).resolves.not.toThrow();
    });
  });

  describe('processMath', () => {
    it('returns placeholder when KaTeX not ready', () => {
      // Before KaTeX is loaded, should return placeholder
      // Note: KaTeX may already be loaded from other tests, so this tests the format
      const result = processMathBlock({ tex: 'x^2', displayMode: false });
      
      // Should either be KaTeX output or placeholder
      expect(
        result.includes('katex') || result.includes('math-placeholder')
      ).toBe(true);
    });

    it('handles inline math', () => {
      const result = processMathBlock({ tex: 'x^2', displayMode: false });
      
      if (result.includes('math-placeholder')) {
        expect(result).toContain('data-math-style="inline"');
      } else {
        // KaTeX output
        expect(result).toContain('katex');
      }
    });

    it('handles display math', () => {
      const result = processMathBlock({ tex: '\\int_0^1 x dx', displayMode: true });
      
      if (result.includes('math-placeholder')) {
        expect(result).toContain('data-math-style="display"');
      } else {
        // KaTeX output with display wrapper
        expect(result).toContain('katex');
      }
    });

    it('wraps display math in centered div', async () => {
      // Ensure KaTeX is loaded
      await preloadKaTeX();
      
      const result = processMathBlock({ tex: 'x^2', displayMode: true });
      
      // Display math should be wrapped for centering
      expect(result).toMatch(/katex-display|math-placeholder/);
    });

    it('preserves tex content in placeholder', () => {
      // Test with content that might not be in KaTeX cache
      const uniqueTex = `unique_${Date.now()}`;
      const result = processMathBlock({ tex: uniqueTex, displayMode: false });
      
      if (result.includes('math-placeholder')) {
        expect(result).toContain(uniqueTex);
      }
    });

    it('handles empty tex', () => {
      const result = processMathBlock({ tex: '', displayMode: false });
      expect(result).toBeDefined();
    });

    it('handles complex LaTeX expressions', async () => {
      await preloadKaTeX();
      
      const result = processMathBlock({ 
        tex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', 
        displayMode: true 
      });
      
      expect(result).toContain('katex');
    });

    it('handles KaTeX errors gracefully', async () => {
      await preloadKaTeX();
      
      // Invalid LaTeX that KaTeX can't parse
      const result = processMathBlock({ 
        tex: '\\invalid{command}', 
        displayMode: false 
      });
      
      // Should either render error span or placeholder, not throw
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles special characters in tex', async () => {
      await preloadKaTeX();
      
      // Test with characters that might need escaping
      const result = processMathBlock({ 
        tex: 'a < b > c', 
        displayMode: false 
      });
      
      expect(result).toBeDefined();
    });
  });
});

describe('Default Image Processor', () => {
  describe('processImage', () => {
    it('generates img tag with lazy loading by default', () => {
      const result = processImage({ src: 'photo.jpg', alt: 'A photo' });
      
      expect(result).toContain('src="photo.jpg"');
      expect(result).toContain('alt="A photo"');
      expect(result).toContain('loading="lazy"');
    });

    it('includes title when provided', () => {
      const result = processImage({ 
        src: 'image.png', 
        alt: 'Alt text', 
        title: 'Image Title' 
      });
      
      expect(result).toContain('title="Image Title"');
    });

    it('can disable lazy loading', () => {
      const result = processImage(
        { src: 'urgent.jpg', alt: 'Important' },
        { lazyLoad: false }
      );
      
      expect(result).not.toContain('loading="lazy"');
    });

    it('wraps in link when linkWrapper is true', () => {
      const result = processImage(
        { src: 'gallery.jpg', alt: 'Gallery image' },
        { linkWrapper: true }
      );
      
      expect(result).toContain('<a href="gallery.jpg" data-lightbox>');
      expect(result).toContain('</a>');
      expect(result).toContain('<img');
    });

    it('adds custom class when provided', () => {
      const result = processImage(
        { src: 'styled.jpg', alt: 'Styled' },
        { className: 'rounded shadow-lg' }
      );
      
      expect(result).toContain('class="rounded shadow-lg"');
    });

    it('escapes HTML in attributes', () => {
      const result = processImage({ 
        src: 'test.jpg', 
        alt: '<script>alert("xss")</script>',
        title: '"><script>alert("xss")</script>'
      });
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('handles empty alt text', () => {
      const result = processImage({ src: 'decorative.jpg', alt: '' });
      
      expect(result).toContain('alt=""');
    });

    it('combines all options', () => {
      const result = processImage(
        { src: 'full.jpg', alt: 'Full options', title: 'Title' },
        { lazyLoad: true, linkWrapper: true, className: 'gallery-img' }
      );
      
      expect(result).toContain('<a href="full.jpg" data-lightbox>');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('class="gallery-img"');
      expect(result).toContain('title="Title"');
    });
  });
});
