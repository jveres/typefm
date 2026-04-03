/**
 * Singleton WASM initialization manager for @typefm/comrak-wasm.
 *
 * @module lib/wasm-init
 */

import init, { type InitInput, type SyncInitInput, initSync } from "@typefm/comrak-wasm";

let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;
const readyCallbacks: Array<() => void> = [];

/**
 * Check if WASM module is initialized and ready to use.
 */
export function isWasmReady(): boolean {
	return wasmReady;
}

function notifyReady(): void {
	wasmReady = true;
	for (const cb of readyCallbacks) {
		cb();
	}
	readyCallbacks.length = 0;
}

/**
 * Initialize the WASM module asynchronously.
 * Safe to call multiple times — subsequent calls return the same promise.
 *
 * @param moduleOrPath - Optional WASM module, URL, or path. If omitted, uses the default bundled WASM.
 */
export async function initMarkdownViewer(
	moduleOrPath?: InitInput | Promise<InitInput>,
): Promise<void> {
	if (wasmReady) return;
	if (wasmInitPromise) return wasmInitPromise;
	wasmInitPromise = init(moduleOrPath).then(() => {
		notifyReady();
	});
	return wasmInitPromise;
}

/**
 * Initialize the WASM module synchronously.
 * Useful for tests and SSR where async is not needed.
 *
 * @param module - WASM module as BufferSource or WebAssembly.Module.
 */
export function initMarkdownViewerSync(
	module: { module: SyncInitInput } | SyncInitInput,
): void {
	if (wasmReady) return;
	initSync(module);
	notifyReady();
}

/**
 * Subscribe to WASM ready event. If already ready, callback fires immediately.
 *
 * @returns Unsubscribe function.
 */
export function onWasmReady(cb: () => void): () => void {
	if (wasmReady) {
		cb();
		return () => {};
	}
	readyCallbacks.push(cb);
	return () => {
		const index = readyCallbacks.indexOf(cb);
		if (index !== -1) {
			readyCallbacks.splice(index, 1);
		}
	};
}
