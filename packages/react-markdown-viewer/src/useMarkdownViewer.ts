import {
	useRef,
	useState,
	useCallback,
	useEffect,
} from "react";
import {
	CURSOR_MARKER,
	CURSOR_HTML,
	renderMarkdown,
	preloadKaTeX,
	isKaTeXReady,
	onLanguageLoaded,
	offLanguageLoaded,
	getNotificationGeneration,
} from "./lib/parser";
import { cacheManager } from "./lib/cache-manager";
import type { RenderHooks } from "./types/hooks";
import {
	morphContentSync,
	morphContentOptimized,
	getMorphStats,
	resetMorphCache,
} from "./lib/morph";
import {
	createCursorController,
	type CursorController,
} from "./lib/cursor-controller";
import {
	isWasmReady,
	initMarkdownViewer,
	onWasmReady,
} from "./lib/wasm-init";

export interface UseMarkdownViewerOptions {
	text: string;
	isStreaming: boolean;
	throttleMs: number;
	onStreamingEnd?: () => void;
	/** Hooks for customizing markdown rendering */
	hooks?: RenderHooks;
}

interface StreamingStats {
	morphCount: number;
	morphTotalMs: number;
	morphMinMs: number;
	morphMaxMs: number;
	throttleMaxMs: number;
	startTime: number;
}

export interface UseMarkdownViewerReturn {
	containerRef: React.RefObject<HTMLDivElement | null>;
	syncMorphEnabled: boolean;
	getRenderedContent: () => string;
	handleClick: (event: React.MouseEvent) => void;
	reset: () => void;
}

export function useMarkdownViewer({
	text,
	isStreaming,
	throttleMs,
	onStreamingEnd,
	hooks,
}: UseMarkdownViewerOptions): UseMarkdownViewerReturn {
	// Refs for DOM and mutable state (avoid re-renders)
	const containerRef = useRef<HTMLDivElement>(null);
	const cursorControllerRef = useRef<CursorController | null>(null);

	// Store callback in ref to avoid effect re-runs
	const onStreamingEndRef = useRef(onStreamingEnd);
	onStreamingEndRef.current = onStreamingEnd;

	// Store hooks in ref to avoid re-renders when hooks object changes
	const hooksRef = useRef(hooks);
	hooksRef.current = hooks;

	// Throttling state (mutable refs to avoid re-renders)
	const throttledTextRef = useRef("");
	const lastThrottleTimeRef = useRef(0);
	const rafScheduledRef = useRef(false);
	const rafIdRef = useRef<number | null>(null);
	const copyTimeoutIdsRef = useRef<Set<number>>(new Set());

	// Adaptive throttling state
	const adaptiveThrottleMsRef = useRef(0);
	const lastMorphDurationRef = useRef(0);

	// Streaming state
	const hasStreamedRef = useRef(false);
	const wasStreamingRef = useRef(false);
	const streamingStatsRef = useRef<StreamingStats>({
		morphCount: 0,
		morphTotalMs: 0,
		morphMinMs: Infinity,
		morphMaxMs: 0,
		throttleMaxMs: 0,
		startTime: 0,
	});

	// Memoization cache
	const lastSourceRef = useRef("");
	const lastStrategyRef = useRef(false);
	const lastStreamingRef = useRef(false);
	const lastResultRef = useRef("");
	const lastLoggedContentLengthRef = useRef(0);

	// Force update trigger (for KaTeX loading / WASM ready)
	const [updateCounter, setUpdateCounter] = useState(0);

	// WASM readiness state
	const [wasmReady, setWasmReady] = useState(isWasmReady());

	// Computed: use sync morph strategy when streaming or has streamed
	const syncMorphEnabled = isStreaming || hasStreamedRef.current;

	// Get effective throttle (adaptive)
	const getEffectiveThrottleMs = useCallback(() => {
		return adaptiveThrottleMsRef.current || throttleMs;
	}, [throttleMs]);

	// Track last logged throttle to avoid spam
	const lastLoggedThrottleRef = useRef(0);
	const morphCountRef = useRef(0);

	// Adjust adaptive throttle based on morph performance
	const adjustAdaptiveThrottle = useCallback(() => {
		const morphTime = lastMorphDurationRef.current;
		const targetMorphBudget = 0.25;
		const idealThrottle = morphTime / targetMorphBudget;
		const smoothingFactor = 0.3;
		const currentThrottle = adaptiveThrottleMsRef.current || throttleMs;
		const newThrottle =
			currentThrottle + (idealThrottle - currentThrottle) * smoothingFactor;
		const minThrottle = throttleMs;
		const maxThrottle = Math.max(throttleMs * 4, 200);
		const clampedThrottle = Math.max(
			minThrottle,
			Math.min(maxThrottle, newThrottle),
		);
		adaptiveThrottleMsRef.current = clampedThrottle;

		if (process.env.NODE_ENV !== "production") {
			morphCountRef.current++;
			const rounded = Math.round(clampedThrottle);

			const shouldLog =
				morphCountRef.current % 10 === 0 ||
				Math.abs(rounded - lastLoggedThrottleRef.current) >= 3;

			if (shouldLog && morphTime >= 1) {
				lastLoggedThrottleRef.current = rounded;
				const direction =
					rounded > throttleMs
						? "📈"
						: rounded < throttleMs
							? "📉"
							: "➡️";
				const status = rounded === throttleMs ? "(at minimum)" : "";
				console.log(
					`${direction} Throttle: ${rounded}ms ${status} | morph: ${morphTime.toFixed(1)}ms | ideal: ${idealThrottle.toFixed(0)}ms`,
				);
			}
		}
	}, [throttleMs]);

	// Track morph stats
	const trackMorphStats = useCallback(() => {
		const morphTime = lastMorphDurationRef.current;
		if (morphTime < 2) return;

		const stats = streamingStatsRef.current;
		stats.morphCount++;
		stats.morphTotalMs += morphTime;
		stats.morphMinMs = Math.min(stats.morphMinMs, morphTime);
		stats.morphMaxMs = Math.max(stats.morphMaxMs, morphTime);
		stats.throttleMaxMs = Math.max(
			stats.throttleMaxMs,
			adaptiveThrottleMsRef.current,
		);
	}, []);

	// Reset streaming stats
	const resetStreamingStats = useCallback(() => {
		streamingStatsRef.current = {
			morphCount: 0,
			morphTotalMs: 0,
			morphMinMs: Infinity,
			morphMaxMs: 0,
			throttleMaxMs: 0,
			startTime: performance.now(),
		};
	}, []);

	// Track text length in ref for logging
	const textLengthRef = useRef(0);
	textLengthRef.current = text.length;

	// Log streaming stats (dev only)
	const logStreamingStats = useCallback(() => {
		if (process.env.NODE_ENV === "production") return;

		const stats = streamingStatsRef.current;
		if (stats.morphCount === 0) return;

		const duration = performance.now() - stats.startTime;
		const avgMorph = stats.morphTotalMs / stats.morphCount;

		console.log(
			`📊 Streaming complete:\n` +
				`   Duration: ${(duration / 1000).toFixed(2)}s\n` +
				`   Morphs: ${stats.morphCount} (avg ${avgMorph.toFixed(1)}ms, min ${stats.morphMinMs.toFixed(1)}ms, max ${stats.morphMaxMs.toFixed(1)}ms)\n` +
				`   Throttle: base ${throttleMs}ms → max ${stats.throttleMaxMs.toFixed(1)}ms\n` +
				`   Content: ${(textLengthRef.current / 1024).toFixed(1)}KB`,
		);
	}, [throttleMs]);

	// Render markdown with memoization
	const getRenderedContent = useCallback(() => {
		// Guard: WASM must be ready
		if (!wasmReady) return "";

		const baseText = isStreaming ? throttledTextRef.current : text;
		const source = isStreaming ? baseText + CURSOR_MARKER : baseText;
		if (!source) return "";

		if (
			baseText === lastSourceRef.current &&
			syncMorphEnabled === lastStrategyRef.current &&
			isStreaming === lastStreamingRef.current
		) {
			return lastResultRef.current;
		}

		lastSourceRef.current = baseText;
		lastStrategyRef.current = syncMorphEnabled;
		lastStreamingRef.current = isStreaming;

		let html = renderMarkdown(
			source,
			syncMorphEnabled,
			undefined,
			hooksRef.current,
		);

		// Streaming guard: ensure cursor is visible when streaming
		if (isStreaming) {
			const cursorIndex = html.indexOf(CURSOR_HTML);
			if (cursorIndex === -1) {
				html += CURSOR_HTML;
			} else {
				const beforeCursor = html.slice(0, cursorIndex);
				const lastOpenBracket = beforeCursor.lastIndexOf("<");
				const lastCloseBracket = beforeCursor.lastIndexOf(">");
				if (lastOpenBracket > lastCloseBracket) {
					html = html.replace(CURSOR_HTML, "");
					if (html.includes("<code")) {
						html = html.replace(/(<code[^>]*>)/, "$1" + CURSOR_HTML);
					} else {
						html += CURSOR_HTML;
					}
				}
			}
		}

		lastResultRef.current = html;
		return lastResultRef.current;
	}, [text, isStreaming, syncMorphEnabled, wasmReady]);

	// Ensure KaTeX is loaded
	const ensureKaTeXLoaded = useCallback(() => {
		if (isKaTeXReady()) return;

		preloadKaTeX().then(() => {
			lastSourceRef.current = "";
			lastResultRef.current = "";
			cacheManager.renderCacheSync.clear();
			cacheManager.renderCacheAsync.clear();
			setUpdateCounter((n) => n + 1);
		});
	}, []);

	// Apply DOM morphing
	const applyMorph = useCallback(() => {
		const container = containerRef.current;
		if (!container || !syncMorphEnabled) return;

		const content = getRenderedContent();

		if (isStreaming) {
			const startTime = performance.now();
			morphContentOptimized(container, content);
			lastMorphDurationRef.current = performance.now() - startTime;
			adjustAdaptiveThrottle();
			trackMorphStats();

			if (process.env.NODE_ENV !== "production") {
				const stats = getMorphStats(container);
				const contentLength = throttledTextRef.current.length;
				if (
					(stats.added > 0 || stats.removed > 0) &&
					contentLength !== lastLoggedContentLengthRef.current
				) {
					lastLoggedContentLengthRef.current = contentLength;
					const parts = [];
					if (stats.added > 0) parts.push(`+${stats.added} added`);
					if (stats.removed > 0) parts.push(`-${stats.removed} removed`);
					console.log(
						`🔄 Morph: ${parts.join(", ")} (${stats.skipped} unchanged)`,
					);
				}
			}

			if (!cursorControllerRef.current) {
				cursorControllerRef.current = createCursorController();
			}

			cursorControllerRef.current.update(container);
		} else {
			morphContentSync(container, content);
		}
	}, [
		isStreaming,
		syncMorphEnabled,
		getRenderedContent,
		adjustAdaptiveThrottle,
		trackMorphStats,
	]);

	// Update throttled text
	const updateThrottledText = useCallback(() => {
		if (!isStreaming) {
			throttledTextRef.current = text;
			rafScheduledRef.current = false;
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			return;
		}

		const now = Date.now();
		const effectiveThrottle = getEffectiveThrottleMs();

		if (now - lastThrottleTimeRef.current >= effectiveThrottle) {
			throttledTextRef.current = text;
			lastThrottleTimeRef.current = now;
			applyMorph();
		} else if (!rafScheduledRef.current) {
			rafScheduledRef.current = true;
			rafIdRef.current = requestAnimationFrame(() => {
				if (rafScheduledRef.current && isStreaming) {
					throttledTextRef.current = text;
					lastThrottleTimeRef.current = Date.now();
					applyMorph();
				}
				rafScheduledRef.current = false;
				rafIdRef.current = null;
			});
		}
	}, [text, isStreaming, getEffectiveThrottleMs, applyMorph]);

	// Handle copy button clicks
	const handleClick = useCallback((event: React.MouseEvent) => {
		const target = event.target as HTMLElement;
		const copyBtn = target.closest(".copy-btn") as HTMLButtonElement | null;
		if (!copyBtn) return;

		const wrapper = copyBtn.closest(".code-block-wrapper");
		const codeElement = wrapper?.querySelector("pre code");
		if (!codeElement) return;

		const code = codeElement.textContent ?? "";

		navigator.clipboard
			.writeText(code)
			.then(() => {
				copyBtn.classList.add("copied");
				const timeoutId = window.setTimeout(() => {
					copyBtn.classList.remove("copied");
					copyTimeoutIdsRef.current.delete(timeoutId);
				}, 2000);
				copyTimeoutIdsRef.current.add(timeoutId);
			})
			.catch((err) => {
				console.error("Failed to copy code:", err);
			});
	}, []);

	// Reset component state
	const reset = useCallback(() => {
		hasStreamedRef.current = false;
		throttledTextRef.current = "";
		lastSourceRef.current = "";
		lastStrategyRef.current = false;
		lastStreamingRef.current = false;
		lastResultRef.current = "";
		adaptiveThrottleMsRef.current = 0;
		lastMorphDurationRef.current = 0;
		lastLoggedContentLengthRef.current = 0;
		lastLoggedThrottleRef.current = 0;
		morphCountRef.current = 0;
		resetStreamingStats();
		resetMorphCache(containerRef.current ?? undefined);
		cursorControllerRef.current?.reset();
	}, [resetStreamingStats]);

	// Effect: Initialize WASM if not ready
	useEffect(() => {
		if (wasmReady) return;
		initMarkdownViewer();
		return onWasmReady(() => setWasmReady(true));
	}, [wasmReady]);

	// Effect: Handle streaming state changes
	useEffect(() => {
		if (isStreaming && !wasStreamingRef.current) {
			hasStreamedRef.current = true;
			resetStreamingStats();
			containerRef.current?.focus();
		} else if (!isStreaming && wasStreamingRef.current) {
			logStreamingStats();
			onStreamingEndRef.current?.();
		}
		wasStreamingRef.current = isStreaming;
	}, [isStreaming, resetStreamingStats, logStreamingStats]);

	// Effect: Ensure KaTeX is loaded when text changes.
	// Also handles the case where KaTeX loaded between render and effect
	// (Vite dev mode resolves dynamic imports before useEffect runs).
	const katexWasReady = useRef(isKaTeXReady());
	useEffect(() => {
		if (!text) return;
		if (!isKaTeXReady()) {
			ensureKaTeXLoaded();
		} else if (!katexWasReady.current) {
			// KaTeX loaded between render and effect — trigger re-render
			katexWasReady.current = true;
			lastSourceRef.current = "";
			lastResultRef.current = "";
			cacheManager.renderCacheSync.clear();
			cacheManager.renderCacheAsync.clear();
			setUpdateCounter((n) => n + 1);
		}
	}, [text, ensureKaTeXLoaded]);

	// Stable ref for applyMorph to avoid re-subscribing language listener
	const applyMorphRef = useRef(applyMorph);
	applyMorphRef.current = applyMorph;

	// Stable ref for syncMorphEnabled to avoid re-subscribing language listener
	const syncMorphEnabledRef = useRef(syncMorphEnabled);
	syncMorphEnabledRef.current = syncMorphEnabled;

	// Capture notification generation before render so the effect can detect
	// if languages loaded between render and effect mount (race condition
	// in Vite dev mode where dynamic imports resolve before useEffect runs).
	const preRenderGeneration = useRef(getNotificationGeneration());
	preRenderGeneration.current = getNotificationGeneration();

	// Effect: Re-highlight when dynamically loaded languages become available
	useEffect(() => {
		const triggerUpdate = () => {
			lastSourceRef.current = "";
			lastResultRef.current = "";
			cacheManager.renderCacheSync.clear();
			cacheManager.renderCacheAsync.clear();
			cacheManager.highlightCache.clear();

			if (syncMorphEnabledRef.current) {
				applyMorphRef.current();
			} else {
				setUpdateCounter((n) => n + 1);
			}
		};

		const handleLanguageLoaded = (_language: string) => {
			triggerUpdate();
		};

		onLanguageLoaded(handleLanguageLoaded);

		// Detect missed notifications: if languages loaded between render
		// and this effect (useEffect runs after paint), trigger update now.
		if (getNotificationGeneration() !== preRenderGeneration.current) {
			triggerUpdate();
		}

		return () => offLanguageLoaded(handleLanguageLoaded);
	}, []);

	// Effect: Update throttled text when text or streaming state changes
	useEffect(() => {
		updateThrottledText();
	}, [text, isStreaming, updateThrottledText]);

	// Effect: Apply morph after render for sync strategy
	useEffect(() => {
		if (syncMorphEnabled && !isStreaming) {
			applyMorph();
		}
	}, [syncMorphEnabled, isStreaming, applyMorph, updateCounter]);

	// Effect: Cleanup on unmount
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			for (const timeoutId of copyTimeoutIdsRef.current) {
				clearTimeout(timeoutId);
			}
			copyTimeoutIdsRef.current.clear();
			cursorControllerRef.current?.destroy();
		};
	}, []);

	return {
		containerRef,
		syncMorphEnabled,
		getRenderedContent,
		handleClick,
		reset,
	};
}
