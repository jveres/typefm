import { useState, useRef, useEffect, useMemo, useCallback, startTransition } from "react";
import {
	MarkdownViewer,
	type MarkdownViewerRef,
	_setHighlighterLoadDelay,
	_resetHighlighter,
	_setKaTeXLoadDelay,
	_resetKaTeX,
} from "../src";
import {
	useStreamingSimulation,
	type SpeedPreset,
	type LatencyPreset,
} from "./use-streaming-simulation";
import { sampleMarkdown } from "./sample-markdown";
import { generateChatMessages, type ChatMessage } from "./chat-data";
import {
	generateStressContent,
	STRESS_PRESETS,
	type StressPreset,
} from "./stress-content";
import { deferredContent } from "./deferred-content";
import { mermaidContent } from "./mermaid-content";
import {
	initMermaid,
	renderMermaidDiagrams,
	updateMermaidTheme,
	handleMermaidCopyClick,
	mermaidStyles,
} from "./mermaid-hook";
import { imageGalleryContent } from "./image-gallery-content";
import {
	createImageGalleryHooks,
	initImageGallery,
	imageGalleryStyles,
} from "./image-gallery-hook";
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-thumbnail.css";

type TestCase = "showcase" | "chat" | "stress" | "edge-cases" | "deferred-loading" | "mermaid" | "image-gallery";

const TEST_CASES: Record<TestCase, { label: string }> = {
	showcase: { label: "Full Showcase" },
	chat: { label: "AI Chat" },
	stress: { label: "Stress Test (Adaptive Throttling)" },
	"edge-cases": { label: "Edge Cases" },
	"deferred-loading": { label: "Deferred Loading" },
	mermaid: { label: "Mermaid Diagrams" },
	"image-gallery": { label: "Image Gallery" },
};

const SPEED_OPTIONS: { value: SpeedPreset; label: string }[] = [
	{ value: "ultra-slow", label: "Ultra Slow" },
	{ value: "very-slow", label: "Very Slow" },
	{ value: "slow", label: "Slow" },
	{ value: "normal", label: "Normal" },
	{ value: "fast", label: "Fast" },
	{ value: "very-fast", label: "Very Fast" },
];

const LATENCY_OPTIONS: { value: LatencyPreset; label: string }[] = [
	{ value: "none", label: "None" },
	{ value: "light", label: "Light" },
	{ value: "medium", label: "Medium" },
	{ value: "heavy", label: "Heavy" },
	{ value: "extreme", label: "Extreme" },
];

const STRESS_OPTIONS: { value: StressPreset; label: string }[] = [
	{ value: "light", label: "Light (~3KB)" },
	{ value: "medium", label: "Medium (~7KB)" },
	{ value: "heavy", label: "Heavy (~20KB)" },
	{ value: "extreme", label: "Extreme (~550KB)" },
];

// Edge case fixtures for streaming
const EDGE_CASES = [
	{
		id: "paragraph",
		name: "Simple Paragraph",
		input: "Hello **world**, this is a _test_.",
	},
	{
		id: "code-fence",
		name: "Incomplete Code Fence",
		input: "```javascript\nconst x = 1;\nconst y = 2;",
	},
	{
		id: "bold-unclosed",
		name: "Unclosed Bold",
		input: "This is **bold text that never closes",
	},
	{
		id: "math-incomplete",
		name: "Incomplete Math",
		input: "The formula is $E = mc",
	},
	{
		id: "table-partial",
		name: "Partial Table",
		input: "| a | b |\n| - | -",
	},
	{
		id: "nested-lists",
		name: "Nested Lists",
		input: "- Item 1\n  - Sub 1\n  - Sub 2\n- Item 2",
	},
	{
		id: "link-unclosed",
		name: "Unclosed Link",
		input: "Click [here](https://example.com",
	},
	{
		id: "mixed-formatting",
		name: "Mixed Formatting",
		input: "# Title\n\n**Bold** and *italic* and `code` and ~~strike~~\n\n> Blockquote\n\n- List item",
	},
];

export function App({ dark }: { dark: boolean }) {
	const [testCase, setTestCase] = useState<TestCase>("showcase");
	const [speed, setSpeed] = useState<SpeedPreset>("normal");
	const [latency, setLatency] = useState<LatencyPreset>("medium");
	const [initialLatency, setInitialLatency] = useState(true);
	const [stressPreset, setStressPreset] = useState<StressPreset>("medium");
	const [edgeCaseId, setEdgeCaseId] = useState("paragraph");
	const [edgeCaseStreaming, setEdgeCaseStreaming] = useState(true);
	const [useCustomMarkdown, setUseCustomMarkdown] = useState(false);
	const [customMarkdown, setCustomMarkdown] = useState("");
	const viewerRef = useRef<MarkdownViewerRef>(null);

	// Deferred loading state
	const [codeDelay, setCodeDelay] = useState(2000);
	const [mathDelay, setMathDelay] = useState(3000);
	const [deferredKey, setDeferredKey] = useState(0);

	const handleDeferredReload = useCallback(() => {
		// Reset async modules to unloaded state
		_resetHighlighter();
		_resetKaTeX();
		// Apply configured delays
		_setHighlighterLoadDelay(codeDelay);
		_setKaTeXLoadDelay(mathDelay);
		// Force remount of the viewer
		setDeferredKey((k) => k + 1);
	}, [codeDelay, mathDelay]);

	// Mermaid state
	const mermaidContainerRef = useRef<HTMLDivElement>(null);

	// Image gallery state
	const imageGalleryContainerRef = useRef<HTMLDivElement>(null);
	const imageGalleryHooks = useMemo(() => createImageGalleryHooks(), []);

	// Chat state
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [streamingMessageId, setStreamingMessageId] = useState<number | null>(
		null,
	);
	const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>(
		[],
	);
	const chatContainerRef = useRef<HTMLDivElement>(null);

	const [state, controls] = useStreamingSimulation();

	const stressContent = useMemo(
		() => generateStressContent(STRESS_PRESETS[stressPreset]),
		[stressPreset],
	);

	const currentEdgeCase = useMemo(
		() =>
			useCustomMarkdown
				? { id: "custom", name: "Custom", input: customMarkdown }
				: (EDGE_CASES.find((ec) => ec.id === edgeCaseId) ?? EDGE_CASES[0]),
		[edgeCaseId, useCustomMarkdown, customMarkdown],
	);

	// Set source when test case changes
	useEffect(() => {
		if (testCase === "deferred-loading") {
			controls.stop();
			controls.setSource("");
			// Clear any previous delays
			_setHighlighterLoadDelay(0);
			_setKaTeXLoadDelay(0);
			return;
		}
		if (testCase === "showcase") {
			controls.setSource(sampleMarkdown);
			viewerRef.current?.reset();
			setTimeout(() => controls.loadInstant(), 0);
		} else if (testCase === "stress") {
			setSpeed("fast");
			setLatency("none");
			setStressPreset("heavy");
			setInitialLatency(false);
			controls.setSpeed("fast");
			controls.setLatency("none");
			controls.setInitialLatency(false);
			viewerRef.current?.reset();
		} else if (testCase === "edge-cases") {
			setEdgeCaseStreaming(true);
			viewerRef.current?.reset();
		} else if (testCase === "mermaid") {
			controls.setSource(mermaidContent);
			viewerRef.current?.reset();
			setTimeout(() => controls.loadInstant(), 0);
		} else if (testCase === "image-gallery") {
			controls.setSource(imageGalleryContent);
			viewerRef.current?.reset();
			setTimeout(() => {
				controls.loadInstant();
				setTimeout(() => {
					if (imageGalleryContainerRef.current) {
						initImageGallery(imageGalleryContainerRef.current);
					}
				}, 100);
			}, 0);
		} else {
			// Chat mode
			const messages = generateChatMessages(16);
			setChatMessages(messages);
			setDisplayedMessages(messages);
			setStreamingMessageId(null);
			controls.setSource("");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [testCase]);

	useEffect(() => {
		controls.setSpeed(speed);
	}, [speed, controls]);

	useEffect(() => {
		controls.setLatency(latency);
	}, [latency, controls]);

	useEffect(() => {
		controls.setInitialLatency(initialLatency);
	}, [initialLatency, controls]);

	useEffect(() => {
		if (testCase === "stress") {
			controls.setSource(stressContent);
			viewerRef.current?.reset();
			setTimeout(() => controls.loadInstant(), 0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stressContent, testCase]);

	useEffect(() => {
		if (testCase === "edge-cases") {
			viewerRef.current?.reset();
			setTimeout(() => viewerRef.current?.focus(), 0);
		}
	}, [edgeCaseId, testCase]);

	// Mermaid: update theme (also initializes on first call)
	useEffect(() => {
		if (mermaidContainerRef.current) {
			startTransition(() => {
				updateMermaidTheme(mermaidContainerRef.current!, dark);
			});
		} else {
			initMermaid(dark);
		}
	}, [dark]);

	// Mermaid: attach copy-menu click handler
	useEffect(() => {
		const el = mermaidContainerRef.current;
		if (!el || testCase !== "mermaid") return;
		el.addEventListener("click", handleMermaidCopyClick);
		return () => el.removeEventListener("click", handleMermaidCopyClick);
	}, [testCase]);

	// Mermaid: render diagrams after content changes
	useEffect(() => {
		if (testCase !== "mermaid" || !mermaidContainerRef.current) return;
		const timer = setTimeout(() => {
			if (mermaidContainerRef.current) {
				renderMermaidDiagrams(mermaidContainerRef.current);
			}
		}, 50);
		return () => clearTimeout(timer);
	}, [testCase, state.text]);

	useEffect(() => {
		if (chatContainerRef.current && testCase === "chat") {
			chatContainerRef.current.scrollTop =
				chatContainerRef.current.scrollHeight;
		}
	}, [state.text, displayedMessages, testCase]);

	// Track streaming completion for chat
	const wasStreamingRef = useRef(false);

	useEffect(() => {
		const justFinished = wasStreamingRef.current && !state.isStreaming;
		wasStreamingRef.current = state.isStreaming;

		// Init lightGallery when image-gallery streaming completes
		if (testCase === "image-gallery" && justFinished && imageGalleryContainerRef.current) {
			const timer = setTimeout(() => {
				if (imageGalleryContainerRef.current) {
					initImageGallery(imageGalleryContainerRef.current);
				}
			}, 100);
			return () => clearTimeout(timer);
		}

		if (
			testCase === "chat" &&
			streamingMessageId !== null &&
			justFinished
		) {
			const currentIndex = chatMessages.findIndex(
				(m) => m.id === streamingMessageId,
			);
			if (currentIndex < chatMessages.length - 1) {
				const nextMessage = chatMessages[currentIndex + 1];
				setTimeout(() => {
					setDisplayedMessages((prev) => [...prev, nextMessage]);
					setStreamingMessageId(nextMessage.id);
					controls.setSource(nextMessage.content);
					controls.start(true);
				}, 300);
			} else {
				setStreamingMessageId(null);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.isStreaming, testCase]);

	const handleStartStream = () => {
		if (testCase === "showcase" || testCase === "stress" || testCase === "mermaid" || testCase === "image-gallery") {
			controls.start(true);
			setTimeout(() => viewerRef.current?.focus(), 0);
		} else if (testCase === "chat") {
			setDisplayedMessages([]);
			if (chatMessages.length > 0) {
				const firstMessage = chatMessages[0];
				setDisplayedMessages([firstMessage]);
				setStreamingMessageId(firstMessage.id);
				controls.setSource(firstMessage.content);
				controls.start(true);
			}
		}
	};

	const handleStop = () => {
		controls.stop();
		setStreamingMessageId(null);
	};

	const handleLoadInstant = () => {
		if (testCase === "showcase" || testCase === "stress" || testCase === "mermaid" || testCase === "image-gallery") {
			controls.loadInstant();
			if (testCase === "image-gallery") {
				setTimeout(() => {
					if (imageGalleryContainerRef.current) {
						initImageGallery(imageGalleryContainerRef.current);
					}
				}, 100);
			}
		} else {
			setDisplayedMessages(chatMessages);
			setStreamingMessageId(null);
			controls.stop();
		}
	};

	const handleClear = () => {
		controls.clear();
		viewerRef.current?.reset();
		if (testCase === "chat") {
			setDisplayedMessages([]);
			setStreamingMessageId(null);
		}
	};

	const getStatusLabel = () => {
		switch (state.status) {
			case "waiting":
				return "Waiting...";
			case "streaming":
				return "Streaming";
			case "paused":
				return "Paused";
			default:
				return "Idle";
		}
	};

	const getMessageText = (message: ChatMessage) => {
		if (message.id === streamingMessageId) {
			return state.text;
		}
		return message.content;
	};

	return (
		<>
			<div className="controls">
				<div className="controls-row">
					<label className="control-group">
						<span>Test Case:</span>
						<select
							value={testCase}
							onChange={(e) =>
								setTestCase(e.target.value as TestCase)
							}
						>
							{Object.entries(TEST_CASES).map(
								([key, { label }]) => (
									<option key={key} value={key}>
										{label}
									</option>
								),
							)}
						</select>
					</label>
				</div>

				{testCase === "deferred-loading" ? null : testCase === "edge-cases" ? (
					<div className="controls-row edge-case-controls">
						<label className="control-group">
							<span>Edge Case:</span>
							<select
								value={edgeCaseId}
								onChange={(e) => {
									setEdgeCaseId(e.target.value);
									setUseCustomMarkdown(false);
								}}
								disabled={useCustomMarkdown}
							>
								{EDGE_CASES.map((ec) => (
									<option key={ec.id} value={ec.id}>
										{ec.name}
									</option>
								))}
							</select>
						</label>
						<label className="control-group checkbox">
							<input
								type="checkbox"
								checked={useCustomMarkdown}
								onChange={(e) =>
									setUseCustomMarkdown(e.target.checked)
								}
							/>
							<span>Custom</span>
						</label>
						<label className="control-group checkbox streaming-toggle">
							<input
								type="checkbox"
								checked={edgeCaseStreaming}
								onChange={(e) => {
									viewerRef.current?.reset();
									setEdgeCaseStreaming(e.target.checked);
								}}
							/>
							<span>isStreaming</span>
						</label>
					</div>
				) : (
					<>
						<div className="controls-row">
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleStartStream}
								disabled={state.isStreaming}
							>
								{testCase === "chat"
									? "Stream New Chat"
									: "Start Stream"}
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={handleStop}
								disabled={!state.isStreaming}
							>
								Stop
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={handleLoadInstant}
								disabled={state.isStreaming}
							>
								{testCase === "chat"
									? "Reload"
									: "Load Instant"}
							</button>
							<button
								type="button"
								className="btn btn-danger"
								onClick={handleClear}
								disabled={state.isStreaming}
							>
								Clear
							</button>
						</div>

						<div className="controls-row">
							<label className="control-group">
								<span>Speed:</span>
								<select
									value={speed}
									onChange={(e) =>
										setSpeed(
											e.target.value as SpeedPreset,
										)
									}
								>
									{SPEED_OPTIONS.map(({ value, label }) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</label>

							<label className="control-group">
								<span>Latency:</span>
								<select
									value={latency}
									onChange={(e) =>
										setLatency(
											e.target.value as LatencyPreset,
										)
									}
								>
									{LATENCY_OPTIONS.map(
										({ value, label }) => (
											<option key={value} value={value}>
												{label}
											</option>
										),
									)}
								</select>
							</label>

							<label className="control-group checkbox">
								<input
									type="checkbox"
									checked={initialLatency}
									onChange={(e) =>
										setInitialLatency(e.target.checked)
									}
								/>
								<span>Initial latency</span>
							</label>

							{testCase === "stress" && (
								<label className="control-group">
									<span>Complexity:</span>
									<select
										value={stressPreset}
										onChange={(e) =>
											setStressPreset(
												e.target
													.value as StressPreset,
											)
										}
									>
										{STRESS_OPTIONS.map(
											({ value, label }) => (
												<option
													key={value}
													value={value}
												>
													{label}
												</option>
											),
										)}
									</select>
								</label>
							)}
						</div>
					</>
				)}

				{testCase !== "edge-cases" && testCase !== "deferred-loading" && (
					<div className="status-bar">
						<div className="status-item">
							<span className="status-label">Status:</span>
							<span
								className={`status-value ${state.status}`}
							>
								{getStatusLabel()}
							</span>
						</div>
						{testCase === "chat" ? (
							<div className="status-item">
								<span className="status-label">Messages:</span>
								<span className="status-value">
									{displayedMessages.length}
								</span>
							</div>
						) : (
							<>
								<div className="status-item">
									<span className="status-label">
										Characters:
									</span>
									<span className="status-value">
										{state.currentIndex.toLocaleString()}
									</span>
								</div>
								<div className="status-item">
									<span className="status-label">
										Progress:
									</span>
									<span className="status-value">
										{state.progress}%
									</span>
								</div>
								{testCase === "stress" && (
									<div className="status-item">
										<span className="status-label">
											Size:
										</span>
										<span className="status-value">
											{(
												state.text.length / 1024
											).toFixed(1)}
											KB
										</span>
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>

			{testCase === "deferred-loading" ? (
				<>
					<div className="controls">
						<div className="controls-row">
							<label className="control-group">
								<span>Code highlight delay:</span>
								<input
									type="range"
									min={0}
									max={10000}
									step={250}
									value={codeDelay}
									onChange={(e) =>
										setCodeDelay(
											Number(e.target.value),
										)
									}
								/>
								<span className="range-value">
									{codeDelay >= 1000
										? `${(codeDelay / 1000).toFixed(1)}s`
										: `${codeDelay}ms`}
								</span>
							</label>
							<label className="control-group">
								<span>KaTeX delay:</span>
								<input
									type="range"
									min={0}
									max={10000}
									step={250}
									value={mathDelay}
									onChange={(e) =>
										setMathDelay(
											Number(e.target.value),
										)
									}
								/>
								<span className="range-value">
									{mathDelay >= 1000
										? `${(mathDelay / 1000).toFixed(1)}s`
										: `${mathDelay}ms`}
								</span>
							</label>
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleDeferredReload}
							>
								Reload with delays
							</button>
						</div>
					</div>
					<main className="viewer-container">
						<MarkdownViewer
							key={deferredKey}
							text={deferredContent}
							isStreaming={false}
							throttleMs={50}
						/>
					</main>
				</>
			) : testCase === "edge-cases" ? (
				<div className="edge-case-layout">
					<div className="edge-case-info">
						<div className="edge-case-info-header">
							<div className="edge-case-info-title">
								{useCustomMarkdown
									? "Custom Markdown"
									: currentEdgeCase.name}
							</div>
							<span
								className={`streaming-status ${edgeCaseStreaming ? "on" : "off"}`}
							>
								{edgeCaseStreaming
									? "Streaming"
									: "Non-Streaming"}
							</span>
						</div>
						<div className="edge-case-raw">
							<div className="edge-case-raw-label">
								{useCustomMarkdown
									? "Enter Markdown:"
									: "Input:"}
							</div>
							{useCustomMarkdown ? (
								<textarea
									className="edge-case-input"
									value={customMarkdown}
									onChange={(e) =>
										setCustomMarkdown(e.target.value)
									}
									placeholder="Enter your markdown here..."
									rows={8}
								/>
							) : (
								<code className="edge-case-raw-content">
									{currentEdgeCase.input}
								</code>
							)}
						</div>
					</div>
					<div className="edge-case-preview">
						<div className="edge-case-preview-label">
							Live Preview
						</div>
						<div className="edge-case-preview-content">
							<MarkdownViewer
								ref={viewerRef}
								text={currentEdgeCase.input}
								isStreaming={edgeCaseStreaming}
								throttleMs={50}
							/>
						</div>
					</div>
				</div>
			) : testCase === "mermaid" ? (
				state.text || state.isStreaming ? (
					<main className="viewer-container" ref={mermaidContainerRef}>
						<style>{mermaidStyles}</style>
						<MarkdownViewer
							ref={viewerRef}
							text={state.text}
							isStreaming={state.isStreaming}
							throttleMs={50}
						/>
					</main>
				) : null
			) : testCase === "image-gallery" ? (
				state.text || state.isStreaming ? (
					<main className="viewer-container">
						<style>{imageGalleryStyles}</style>
						<div ref={imageGalleryContainerRef}>
							<MarkdownViewer
								ref={viewerRef}
								text={state.text}
								isStreaming={state.isStreaming}
								throttleMs={50}
								hooks={imageGalleryHooks}
							/>
						</div>
					</main>
				) : null
			) : testCase === "showcase" || testCase === "stress" ? (
				state.text || state.isStreaming ? (
					<main className="viewer-container">
						<MarkdownViewer
							ref={viewerRef}
							text={state.text}
							isStreaming={state.isStreaming}
							throttleMs={50}
						/>
					</main>
				) : null
			) : (
				<main className="chat-container" ref={chatContainerRef}>
					<div className="chat-messages">
						{displayedMessages.map((message) => (
							<div
								key={message.id}
								className={`chat-message ${message.role}`}
							>
								<div className="chat-avatar">
									{message.role === "user" ? "U" : "AI"}
								</div>
								<div className="chat-bubble">
									<MarkdownViewer
										text={getMessageText(message)}
										isStreaming={
											message.id ===
												streamingMessageId &&
											state.isStreaming
										}
										throttleMs={50}
									/>
								</div>
							</div>
						))}
					</div>
				</main>
			)}
		</>
	);
}
