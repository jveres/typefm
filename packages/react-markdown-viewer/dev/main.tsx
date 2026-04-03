import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initMarkdownViewer } from "../src";
import { App } from "./App";
import "./App.css";
import "../src/styles/index.css";
import "katex/dist/katex.min.css";

async function bootstrap() {
	await initMarkdownViewer();
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

bootstrap();
