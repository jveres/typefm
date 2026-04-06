/**
 * Image gallery hook using lightGallery.
 *
 * Transforms markdown images into clickable lightbox items with zoom,
 * thumbnails, keyboard navigation, and touch/swipe support.
 */

import { escapeHtml } from "../src";
import type { RenderHooks } from "../src";

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

/**
 * Create hooks that render images as lightGallery-enabled elements.
 * Call `initImageGallery(container)` after content renders.
 */
export function createImageGalleryHooks(): RenderHooks {
  return {
    onImage: ({ src, alt, title }) => {
      const caption = title || alt || "";
      return (
        `<a href="${escapeHtml(src)}" class="lg-item" ` +
        `data-lg-size="800-600" ` +
        `data-sub-html="${escapeHtml(caption)}" ` +
        `onclick="event.preventDefault()">` +
        `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt || "")}" loading="lazy" class="gallery-img">` +
        `</a>`
      );
    },
  };
}

// --------------------------------------------------------------------------
// lightGallery initialisation (lazy-loaded)
// --------------------------------------------------------------------------

const galleryInstances = new WeakMap<HTMLElement, { destroy: () => void }>();

/**
 * Initialise lightGallery on a container element.
 * Returns a cleanup function to destroy the instance.
 */
export function initImageGallery(container: HTMLElement): () => void {
  const existing = galleryInstances.get(container);
  if (existing) {
    existing.destroy();
    galleryInstances.delete(container);
  }

  const options = {
    selector: ".lg-item",
    zoomFromOrigin: true,
    startAnimationDuration: 300,
    speed: 300,
    backdropDuration: 300,
    download: false,
  };

  Promise.all([
    import("lightgallery"),
    import("lightgallery/plugins/thumbnail"),
  ])
    .then(([lgModule, lgThumbModule]) => {
      if (!container.isConnected) return;

      const instance = lgModule.default(container, {
        ...options,
        plugins: [lgThumbModule.default],
      });
      galleryInstances.set(container, instance);
    })
    .catch((err) => {
      console.error("Failed to load lightGallery:", err);
    });

  return () => {
    const instance = galleryInstances.get(container);
    if (instance) {
      instance.destroy();
      galleryInstances.delete(container);
    }
  };
}

// --------------------------------------------------------------------------
// Styles
// --------------------------------------------------------------------------

export const imageGalleryStyles = `
.gallery-img {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
  border-radius: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.gallery-img:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
`;
