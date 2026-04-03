import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll } from "vitest";
import { initMarkdownViewerSync, isWasmReady } from "../src/lib/wasm-init";

beforeAll(() => {
	if (isWasmReady()) return;
	const wasmPath = resolve(__dirname, "../../comrak-wasm/pkg/comrak.wasm");
	const wasmBytes = readFileSync(wasmPath);
	initMarkdownViewerSync({ module: wasmBytes });
});
