import katex from "katex";
import "katex/contrib/mhchem";
import { createHighlighter, type Highlighter } from "shiki";
import init, {
	ansiThemeDark,
	ansiThemeLight,
	comrakVersion,
	healMarkdown,
	mdToAnsi,
	mdToCommonmark,
	mdToHtml,
	mdToHtmlWithPlugins,
	mdToText,
	mdToTypst,
	mdToXml,
	SyntaxHighlighter,
} from "../../pkg/comrak.js";

const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLDivElement;
const outputLabel = document.getElementById("output-label") as HTMLDivElement;
const formatSelect = document.getElementById("format") as HTMLSelectElement;
const healCheck = document.getElementById("heal") as HTMLInputElement;
const unsafeCheck = document.getElementById("unsafe") as HTMLInputElement;
const gfmCheck = document.getElementById("gfm") as HTMLInputElement;
const shikiCheck = document.getElementById("shiki") as HTMLInputElement;
const katexCheck = document.getElementById("katex") as HTMLInputElement;
const themeSelect = document.getElementById("theme") as HTMLSelectElement;
const showMarkdownCheck = document.getElementById(
	"showMarkdown",
) as HTMLInputElement;
const showUrlsCheck = document.getElementById("showUrls") as HTMLInputElement;
const tableShadowCheck = document.getElementById(
	"tableShadow",
) as HTMLInputElement;
const formatOptions = document.getElementById(
	"formatOptions",
) as HTMLDivElement;
const status = document.getElementById("status") as HTMLSpanElement;
const version = document.getElementById("version") as HTMLSpanElement;

let shiki: Highlighter | null = null;

const [, highlighter] = await Promise.all([
	init(),
	createHighlighter({
		themes: ["github-dark", "github-light"],
		langs: [
			"typescript",
			"javascript",
			"rust",
			"bash",
			"json",
			"html",
			"css",
			"python",
			"go",
			"yaml",
			"toml",
			"markdown",
		],
	}),
]);

shiki = highlighter;
version.textContent = `comrak ${comrakVersion()}`;
status.textContent = "Ready";

function getOptions() {
	const opts: Record<string, unknown> = {
		render: { unsafe: unsafeCheck.checked },
	};
	if (gfmCheck.checked) {
		opts.extension = {
			strikethrough: true,
			table: true,
			tasklist: true,
			autolink: true,
			headerIds: "",
			frontMatterDelimiter: "---",
			alerts: true,
			footnotes: true,
			inlineFootnotes: true,
			mathDollars: true,
			mathCode: true,
			superscript: true,
			subscript: true,
			underline: true,
			spoiler: true,
			highlight: true,
			insert: true,
			descriptionLists: true,
			multilineBlockQuotes: true,
			wikilinksTitleAfterPipe: true,
			shortcodes: true,
		};
	}
	return opts;
}

function isDark(): boolean {
	const v = themeSelect.value;
	if (v === "dark") return true;
	if (v === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme() {
	document.documentElement.setAttribute(
		"data-theme",
		isDark() ? "dark" : "light",
	);
}

const shikiThemes = {
	dark: { name: "github-dark", bg: "#24292e", fg: "#e1e4e8" },
	light: { name: "github-light", bg: "#ffffff", fg: "#1f2328" },
};

function createHighlighterAdapter(): SyntaxHighlighter | null {
	if (!shikiCheck.checked || !shiki) return null;
	const t = isDark() ? shikiThemes.dark : shikiThemes.light;
	return new SyntaxHighlighter(
		(code: string, lang: string | undefined) => {
			if (!lang || !shiki) return code;
			try {
				const highlighted = shiki.codeToHtml(code, {
					lang,
					theme: t.name,
				});
				const match = highlighted.match(
					/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/,
				);
				return match?.[1] ?? code;
			} catch {
				return code;
			}
		},
		(attrs: Record<string, string>) => {
			const cls = attrs.class ? ` ${attrs.class}` : "";
			return `<pre class="shiki ${t.name}${cls}" style="background-color:${t.bg};color:${t.fg};padding:1em;border-radius:6px;overflow-x:auto">`;
		},
		(attrs: Record<string, string>) => {
			const cls = attrs.class ? ` class="${attrs.class}"` : "";
			return `<code${cls}>`;
		},
	);
}

function renderMath(container: HTMLElement) {
	if (!katexCheck.checked) return;
	container.querySelectorAll("[data-math-style]").forEach((el) => {
		const display = el.getAttribute("data-math-style") === "display";
		katex.render(el.textContent ?? "", el as HTMLElement, {
			displayMode: display,
			throwOnError: false,
		});
	});
}

function ansiToHtml(text: string): string {
	const map: Record<string, string> = {
		"1": "font-weight:bold",
		"2": "opacity:0.6",
		"3": "font-style:italic",
		"4": "text-decoration:underline",
		"9": "text-decoration:line-through",
		"22": "font-weight:normal;opacity:1",
		"23": "font-style:normal",
		"24": "text-decoration:none",
		"29": "text-decoration:none",
		"30": "color:#636c76",
		"31": "color:#f85149",
		"32": "color:#3fb950",
		"33": "color:#d29922",
		"34": "color:#58a6ff",
		"35": "color:#bc8cff",
		"36": "color:#39c5cf",
		"37": "color:#b1bac4",
		"41": "background:#f85149;padding:1px 4px",
		"42": "background:#3fb950;padding:1px 4px",
		"43": "background:#d29922;padding:1px 4px",
		"44": "background:#58a6ff;padding:1px 4px",
		"45": "background:#bc8cff;padding:1px 4px",
		"47": "background:#d0d7de;padding:1px 4px",
		"90": "color:#636c76",
		"91": "color:#ff7b72",
		"92": "color:#7ee787",
		"93": "color:#e3b341",
		"94": "color:#79c0ff",
		"95": "color:#d2a8ff",
		"96": "color:#56d4dd",
		"97": "color:#f0f6fc",
	};

	let result = "";
	let openSpans = 0;
	let i = 0;
	while (i < text.length) {
		if (text[i] === "\x1b" && text[i + 1] === "[") {
			const end = text.indexOf("m", i + 2);
			if (end !== -1) {
				const codes = text.slice(i + 2, end).split(";");
				if (codes[0] === "0" || codes[0] === "") {
					if (openSpans > 0) {
						result += "</span>";
						openSpans--;
					}
				} else {
					const styles = codes
						.map((c) => map[c] || "")
						.filter(Boolean)
						.join(";");
					if (styles) {
						result += `<span style="${styles}">`;
						openSpans++;
					}
				}
				i = end + 1;
				continue;
			}
		}
		if (text[i] === "<") {
			result += "&lt;";
		} else if (text[i] === ">") {
			result += "&gt;";
		} else if (text[i] === "&") {
			result += "&amp;";
		} else if (text[i] === "\n") {
			result += "<br>";
		} else {
			result += text[i];
		}
		i++;
	}
	while (openSpans > 0) {
		result += "</span>";
		openSpans--;
	}
	return result;
}

function updateFormatOptions() {
	const format = formatSelect.value;
	formatOptions.style.display =
		format === "ansi" || format === "text" ? "flex" : "none";
}

function render() {
	applyTheme();
	updateFormatOptions();
	const md = healCheck.checked ? healMarkdown(input.value) : input.value;
	const format = formatSelect.value;
	const opts = getOptions();
	const t0 = performance.now();

	let result: string;
	output.style.background = "";
	output.style.color = "";

	switch (format) {
		case "preview": {
			const sh = createHighlighterAdapter();
			result = sh ? mdToHtmlWithPlugins(md, opts, sh) : mdToHtml(md, opts);
			output.className = "preview";
			output.innerHTML = result;
			renderMath(output);
			outputLabel.textContent = "HTML (preview)";
			break;
		}
		case "html": {
			const sh = createHighlighterAdapter();
			result = sh ? mdToHtmlWithPlugins(md, opts, sh) : mdToHtml(md, opts);
			output.className = "source";
			output.textContent = result;
			outputLabel.textContent = "HTML (source)";
			break;
		}
		case "commonmark":
			result = mdToCommonmark(md, opts);
			output.className = "source";
			output.textContent = result;
			outputLabel.textContent = "CommonMark";
			break;
		case "xml":
			result = mdToXml(md, opts);
			output.className = "source";
			output.textContent = result;
			outputLabel.textContent = "XML";
			break;
		case "typst":
			result = mdToTypst(md, opts);
			output.className = "source";
			output.textContent = result;
			outputLabel.textContent = "Typst";
			break;
		case "text":
			result = mdToText(
				md,
				opts,
				showUrlsCheck.checked,
				showMarkdownCheck.checked,
				tableShadowCheck.checked ? "░" : "",
			);
			output.className = "source";
			output.textContent = result;
			outputLabel.textContent = "Text";
			break;
		case "ansi": {
			const dark = isDark();
			const theme = dark ? ansiThemeDark() : ansiThemeLight();
			theme.showMarkdown = showMarkdownCheck.checked;
			theme.showUrls = showUrlsCheck.checked;
			theme.tableShadow = tableShadowCheck.checked ? "░" : undefined;
			result = mdToAnsi(md, opts, theme);
			output.className = "ansi";
			if (dark) {
				output.style.background = "#1e1e1e";
				output.style.color = "#d4d4d4";
			} else {
				output.style.background = "#ffffff";
				output.style.color = "#1f2328";
			}
			output.innerHTML = ansiToHtml(result);
			outputLabel.textContent = "ANSI";
			break;
		}
		default:
			return;
	}

	const ms = (performance.now() - t0).toFixed(1);
	status.textContent = `Rendered in ${ms}ms`;
}

input.addEventListener("input", render);
formatSelect.addEventListener("change", render);
healCheck.addEventListener("change", render);
unsafeCheck.addEventListener("change", render);
gfmCheck.addEventListener("change", render);
shikiCheck.addEventListener("change", render);
katexCheck.addEventListener("change", render);
themeSelect.addEventListener("change", render);
showMarkdownCheck.addEventListener("change", render);
showUrlsCheck.addEventListener("change", render);
tableShadowCheck.addEventListener("change", render);
window
	.matchMedia("(prefers-color-scheme: dark)")
	.addEventListener("change", render);

// Handle anchor clicks within the output pane (e.g., footnotes)
output.addEventListener("click", (e) => {
	const link = (e.target as HTMLElement).closest("a[href^='#']");
	if (!link) return;
	e.preventDefault();
	const id = link.getAttribute("href")?.slice(1);
	if (!id) return;
	const target = output.querySelector(`[id="${id}"]`) as HTMLElement | null;
	if (target) {
		output.scrollTop = target.offsetTop - output.offsetTop;
	}
});

render();
