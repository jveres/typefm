/**
 * Default image processor with lazy loading and lightbox support.
 * 
 * @module lib/defaults/image
 */

import type { ImageData } from '../../types/hooks';
import { escapeHtml } from '../hook-utils';

/**
 * Options for image processing.
 */
export interface ImageOptions {
  /** Add loading="lazy" attribute (default: true) */
  lazyLoad?: boolean;
  /** Wrap in anchor for lightbox integration (default: false) */
  linkWrapper?: boolean;
  /** Custom class for the image (default: none) */
  className?: string;
}

/**
 * Process an image with optional lazy loading and lightbox wrapper.
 * 
 * @param data - Image data from the hook
 * @param options - Processing options
 * @returns HTML string for the image
 * 
 * @example
 * // Basic usage with lazy loading (default)
 * processImage({ src: 'photo.jpg', alt: 'A photo' })
 * // => <img src="photo.jpg" alt="A photo" loading="lazy">
 * 
 * @example
 * // With lightbox wrapper
 * processImage({ src: 'photo.jpg', alt: 'A photo' }, { linkWrapper: true })
 * // => <a href="photo.jpg" data-lightbox><img src="photo.jpg" alt="A photo" loading="lazy"></a>
 * 
 * @example
 * // Custom class
 * processImage({ src: 'photo.jpg', alt: 'A photo' }, { className: 'rounded shadow' })
 * // => <img src="photo.jpg" alt="A photo" loading="lazy" class="rounded shadow">
 */
export function processImage(data: ImageData, options?: ImageOptions): string {
  const { lazyLoad = true, linkWrapper = false, className } = options || {};
  const { src, alt, title } = data;
  
  const attrs = [
    `src="${escapeHtml(src)}"`,
    `alt="${escapeHtml(alt)}"`,
    title ? `title="${escapeHtml(title)}"` : '',
    lazyLoad ? 'loading="lazy"' : '',
    className ? `class="${escapeHtml(className)}"` : '',
  ].filter(Boolean).join(' ');
  
  const img = `<img ${attrs}>`;
  
  if (linkWrapper) {
    return `<a href="${escapeHtml(src)}" data-lightbox>${img}</a>`;
  }
  
  return img;
}
