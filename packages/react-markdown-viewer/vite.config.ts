import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	root: "dev",
	envDir: "..",
	server: {
		port: 5173,
		open: true,
	},
	resolve: {
		alias: {
			"@typefm/react-markdown-viewer": "/src/index.ts",
		},
	},
});
