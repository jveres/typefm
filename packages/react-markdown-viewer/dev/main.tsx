import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { initMarkdownViewer } from "../src";
import { App } from "./App";
import { GitHubComparison } from "./github-comparison";
import "./App.css";
import "../src/styles/index.css";
import "katex/dist/katex.min.css";

type Tab = "playground" | "github-comparison";
type ThemeMode = "light" | "dark" | "system";

function useTheme() {
	const [mode, setMode] = useState<ThemeMode>("system");
	const [systemDark, setSystemDark] = useState(
		() => window.matchMedia("(prefers-color-scheme: dark)").matches,
	);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const dark = mode === "dark" || (mode === "system" && systemDark);
	return { dark, mode, setMode } as const;
}

function Shell() {
	const [tab, setTab] = useState<Tab>("playground");
	const { dark, mode, setMode } = useTheme();

	return (
		<div className={`app ${dark ? "dark" : ""}`}>
			<header className="header">
				<nav className="header-nav" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={tab === "playground"}
						className={`nav-tab${tab === "playground" ? " active" : ""}`}
						onClick={() => setTab("playground")}
					>
						Playground
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "github-comparison"}
						className={`nav-tab${tab === "github-comparison" ? " active" : ""}`}
						onClick={() => setTab("github-comparison")}
					>
						GitHub Comparison
					</button>
				</nav>
				<div className="header-controls">
					<select
						className="theme-selector"
						aria-label="Theme"
						value={mode}
						onChange={(e) =>
							setMode(e.target.value as ThemeMode)
						}
					>
						<option value="system">System</option>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</select>
				</div>
			</header>

			{tab === "github-comparison" ? (
				<GitHubComparison dark={dark} />
			) : (
				<App dark={dark} />
			)}
		</div>
	);
}

async function bootstrap() {
	await initMarkdownViewer();
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<Shell />
		</StrictMode>,
	);
}

bootstrap();
