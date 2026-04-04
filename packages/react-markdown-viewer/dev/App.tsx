import { useState, useRef, useEffect, useMemo } from "react";
import { MarkdownViewer, type MarkdownViewerRef } from "../src";
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

type TestCase = "showcase" | "chat" | "stress" | "edge-cases";

const TEST_CASES: Record<TestCase, { label: string }> = {
	showcase: { label: "Full Showcase" },
	chat: { label: "AI Chat" },
	stress: { label: "Stress Test (Adaptive Throttling)" },
	"edge-cases": { label: "Edge Cases" },
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
		if (testCase === "showcase" || testCase === "stress") {
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
		if (testCase === "showcase" || testCase === "stress") {
			controls.loadInstant();
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

				{testCase === "edge-cases" ? (
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

				{testCase !== "edge-cases" && (
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

			{testCase === "edge-cases" ? (
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
