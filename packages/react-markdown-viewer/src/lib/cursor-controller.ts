export interface CursorBlinkOptions {
  blinkEnabled?: boolean;
  blinkSpeed?: number; // Seconds
  blinkDelay?: number; // Seconds
}

const DEFAULT_OPTIONS: Required<CursorBlinkOptions> = {
  blinkEnabled: true,
  blinkSpeed: 1.0,
  blinkDelay: 0.5,
};

export function createCursorController(options: CursorBlinkOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Time to wait after typing stops before blinking resumes.
  const IDLE_TIMEOUT_MS = 500;

  let activeTimer: number | null = null;
  let isBlinkAlt = false;
  let currentContainer: HTMLElement | null = null;

  // Initialize CSS variables on container
  const initConfig = (el: HTMLElement): void => {
    el.style.setProperty("--cursor-blink-name", "cursor-blink");
    el.style.setProperty(
      "--cursor-blink-duration",
      config.blinkEnabled ? `${config.blinkSpeed.toFixed(2)}s` : "0s",
    );
    el.style.setProperty(
      "--cursor-blink-delay",
      `${config.blinkDelay.toFixed(2)}s`,
    );
  };

  // Ensure container is initialized, returns cursor element if found
  const ensureInit = (container: HTMLElement): HTMLElement | null => {
    if (container !== currentContainer) {
      currentContainer = container;
      initConfig(container);
    }
    return container.querySelector("[data-cursor]");
  };

  // Clear active timer if exists
  const clearTimer = (): void => {
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
  };

  // Toggle animation name to restart CSS animation at 0%
  const resetBlinkAnimation = (el: HTMLElement): void => {
    isBlinkAlt = !isBlinkAlt;
    el.style.setProperty(
      "--cursor-blink-name",
      isBlinkAlt ? "cursor-blink-" : "cursor-blink",
    );
  };

  // Called on each content update during streaming
  const update = (container: HTMLElement): void => {
    const cursor = ensureInit(container);
    if (!cursor) return;

    clearTimer();
    resetBlinkAnimation(container);

    // Restore configured blink delay (may have been set to 0 by setBlinking)
    container.style.setProperty(
      "--cursor-blink-delay",
      `${config.blinkDelay.toFixed(2)}s`,
    );

    // Make cursor solid while receiving updates
    cursor.classList.add("cursor-active");

    // Resume blinking after idle timeout
    activeTimer = window.setTimeout(() => {
      if (cursor.isConnected) {
        cursor.classList.remove("cursor-active");
      }
      activeTimer = null;
    }, IDLE_TIMEOUT_MS);
  };

  // Directly set blinking state (for empty content waiting state)
  const setBlinking = (container: HTMLElement, blinking: boolean): void => {
    const cursor = ensureInit(container);
    if (!cursor) return;

    clearTimer();

    if (blinking) {
      // Set delay to 0 for immediate blinking (waiting state)
      container.style.setProperty("--cursor-blink-delay", "0s");
      cursor.classList.remove("cursor-active");
    } else {
      // Restore configured delay
      container.style.setProperty(
        "--cursor-blink-delay",
        `${config.blinkDelay.toFixed(2)}s`,
      );
      cursor.classList.add("cursor-active");
    }
  };

  const reset = (): void => {
    clearTimer();
    if (currentContainer) {
      const cursor = currentContainer.querySelector(
        "[data-cursor]",
      ) as HTMLElement | null;
      cursor?.classList.remove("cursor-active");
    }
  };

  const destroy = (): void => {
    reset();
    if (currentContainer) {
      currentContainer.style.removeProperty("--cursor-blink-name");
      currentContainer.style.removeProperty("--cursor-blink-duration");
      currentContainer.style.removeProperty("--cursor-blink-delay");
    }
    currentContainer = null;
  };

  return { update, setBlinking, reset, destroy };
}

export type CursorController = ReturnType<typeof createCursorController>;
