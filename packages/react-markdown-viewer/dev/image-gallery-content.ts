/**
 * Sample markdown with images for the lightGallery demo.
 */

export const imageGalleryContent = `# Image Gallery Demo

Click any image to open the **lightbox** with zoom, thumbnails, and keyboard navigation.

---

## Photo Gallery

![Mountain Landscape](https://picsum.photos/800/600?random=1 "Mountain view at sunset")

![Ocean Sunset](https://picsum.photos/800/600?random=2 "Calm ocean waves")

![Forest Path](https://picsum.photos/800/600?random=3 "Peaceful forest trail")

![City Skyline](https://picsum.photos/800/600?random=4 "Downtown at night")

---

## Features

- **Zoom** — scroll or pinch to zoom
- **Thumbnails** — preview strip at the bottom
- **Keyboard** — arrow keys to navigate, Escape to close
- **Touch / Swipe** — mobile-friendly gestures

## Implementation

Uses the \`onImage\` hook to wrap each image in a lightGallery anchor:

\`\`\`typescript
const hooks = createImageGalleryHooks();
// After render:
const cleanup = initImageGallery(containerRef.current);
\`\`\`
`;
