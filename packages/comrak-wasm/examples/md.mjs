#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { initSync, mdToAnsi, mdToText } from "../pkg/comrak.js";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("../pkg/comrak.wasm");
initSync({ module: await readFile(wasmPath) });

const args = process.argv.slice(2);
let format = "ansi";
let showMarkdown = false;
let noShadow = false;
let filePath;

for (const arg of args) {
	if (arg === "--text" || arg === "-t") {
		format = "text";
	} else if (arg === "--ansi" || arg === "-a") {
		format = "ansi";
	} else if (arg === "--markdown" || arg === "-m") {
		showMarkdown = true;
	} else if (arg === "--no-shadow") {
		noShadow = true;
	} else if (arg === "--help" || arg === "-h") {
		console.log("Usage: md [options] <file|->");
		console.log("");
		console.log("Options:");
		console.log("  -a, --ansi       ANSI colored output (default)");
		console.log("  -t, --text       Plain text output");
		console.log("  -m, --markdown   Show markdown markers (#, ```, **, *, `)");
		console.log("      --no-shadow  Disable table shadow");
		console.log("  -h, --help       Show help");
		console.log("");
		console.log("Pass - to read from stdin.");
		process.exit(0);
	} else {
		filePath = arg;
	}
}

let md;

if (!filePath || filePath === "-") {
	const chunks = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	md = Buffer.concat(chunks).toString("utf-8");
} else {
	md = await readFile(resolve(filePath), "utf-8");
}

const opts = {
	extension: {
		strikethrough: true,
		table: true,
		tasklist: true,
		autolink: true,
		headerIds: "",
		frontMatterDelimiter: "---",
		alerts: true,
		footnotes: true,
		mathDollars: true,
		superscript: true,
		subscript: true,
		underline: true,
		spoiler: true,
		highlight: true,
		insert: true,
		descriptionLists: true,
		multilineBlockQuotes: true,
		shortcodes: true,
		wikilinksTitleAfterPipe: true,
	},
};

const shadow = noShadow ? undefined : "░";

if (format === "text") {
	console.log(mdToText(md, opts, true, showMarkdown, shadow));
} else {
	console.log(mdToAnsi(md, opts, { showMarkdown, tableShadow: shadow }));
}
