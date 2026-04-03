import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

export type SpeedPreset = 'ultra-slow' | 'very-slow' | 'slow' | 'normal' | 'fast' | 'very-fast';
export type LatencyPreset = 'none' | 'light' | 'medium' | 'heavy' | 'extreme';

export interface StreamingSimulationState {
  /** Current text being displayed */
  text: string;
  /** Whether streaming is active */
  isStreaming: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current character index */
  currentIndex: number;
  /** Total characters in source */
  totalChars: number;
  /** Current status */
  status: 'idle' | 'waiting' | 'streaming' | 'paused';
}

export interface StreamingSimulationControls {
  /** Start streaming from current position or beginning */
  start: (fromBeginning?: boolean) => void;
  /** Stop/pause streaming */
  stop: () => void;
  /** Load full content instantly */
  loadInstant: () => void;
  /** Clear all content */
  clear: () => void;
  /** Set the source content */
  setSource: (content: string) => void;
  /** Set speed preset */
  setSpeed: (speed: SpeedPreset) => void;
  /** Set latency preset */
  setLatency: (latency: LatencyPreset) => void;
  /** Set initial latency enabled */
  setInitialLatency: (enabled: boolean) => void;
}

// Speed presets: [charsPerTick, intervalMs]
const SPEED_CONFIGS: Record<SpeedPreset, [number, number]> = {
  'ultra-slow': [1, 150],  // ~7 chars/sec
  'very-slow': [1, 80],    // ~12 chars/sec
  'slow': [2, 60],         // ~33 chars/sec
  'normal': [4, 40],       // ~100 chars/sec
  'fast': [10, 30],        // ~333 chars/sec
  'very-fast': [25, 20],   // ~1250 chars/sec
};

// Latency presets: [probability, minDelayMs, maxDelayMs]
// Simulates network hiccups - random pauses during streaming
const LATENCY_CONFIGS: Record<LatencyPreset, [number, number, number]> = {
  'none': [0, 0, 0],
  'light': [0.05, 200, 500],      // 5% chance of 200-500ms pause
  'medium': [0.08, 300, 1500],    // 8% chance of 300-1500ms pause
  'heavy': [0.12, 500, 3000],     // 12% chance of 500-3000ms pause
  'extreme': [0.15, 1000, 5000],  // 15% chance of 1-5 second pause
};

const INITIAL_DELAY_MS = 2000;

export function useStreamingSimulation(): [StreamingSimulationState, StreamingSimulationControls] {
  const [source, setSource] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'streaming' | 'paused'>('idle');
  
  // Settings
  const [speed, setSpeed] = useState<SpeedPreset>('normal');
  const [latency, setLatency] = useState<LatencyPreset>('none');
  const [initialLatencyEnabled, setInitialLatencyEnabled] = useState(false);
  
  // Use refs for values needed in the streaming loop to avoid stale closures
  const speedRef = useRef(speed);
  const latencyRef = useRef(latency);
  const sourceRef = useRef(source);
  const streamingActiveRef = useRef(false);
  
  // Generation counter to cancel stale loops
  const generationRef = useRef(0);
  
  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { latencyRef.current = latency; }, [latency]);
  useEffect(() => { sourceRef.current = source; }, [source]);

  const timeoutRef = useRef<number | null>(null);

  // Derived state
  const text = source.slice(0, currentIndex);
  const totalChars = source.length;
  const progress = totalChars > 0 ? Math.round((currentIndex / totalChars) * 100) : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingActiveRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Helper: delay promise
  const delay = useCallback((ms: number) => {
    return new Promise<void>(resolve => {
      timeoutRef.current = window.setTimeout(resolve, ms);
    });
  }, []);

  // Main streaming loop
  const runStreamingLoop = useCallback(async (generation: number) => {
    const src = sourceRef.current;
    let index = 0;
    
    // Check if this loop is still valid
    const isValid = () => streamingActiveRef.current && generationRef.current === generation;
    
    setCurrentIndex(0);
    setStatus('streaming');
    
    while (isValid() && index < src.length) {
      const [charsPerTick, interval] = SPEED_CONFIGS[speedRef.current];
      const [latencyProb, latencyMin, latencyMax] = LATENCY_CONFIGS[latencyRef.current];
      
      // Random network latency simulation
      if (latencyProb > 0 && Math.random() < latencyProb) {
        const latencyMs = latencyMin + Math.random() * (latencyMax - latencyMin);
        setStatus('paused');
        await delay(latencyMs);
        if (!isValid()) break;
        setStatus('streaming');
      }
      
      // Emit next chunk
      index = Math.min(index + charsPerTick, src.length);
      if (!isValid()) break;
      setCurrentIndex(index);
      
      // Wait for next tick
      if (index < src.length) {
        await delay(interval);
      }
    }
    
    // Streaming complete - only update state if this is still the active generation
    if (isValid()) {
      streamingActiveRef.current = false;
      setIsStreaming(false);
      setStatus('idle');
    }
  }, [delay]);

  const start = useCallback(async (fromBeginning = true) => {
    // Stop any existing streaming and increment generation
    streamingActiveRef.current = false;
    generationRef.current++;
    const thisGeneration = generationRef.current;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (fromBeginning) {
      setCurrentIndex(0);
    }
    
    streamingActiveRef.current = true;
    setIsStreaming(true);
    
    if (initialLatencyEnabled) {
      setStatus('waiting');
      await delay(INITIAL_DELAY_MS);
      // Check if we're still the active generation after delay
      if (generationRef.current !== thisGeneration) return;
    }
    
    runStreamingLoop(thisGeneration);
  }, [initialLatencyEnabled, delay, runStreamingLoop]);

  const stop = useCallback(() => {
    streamingActiveRef.current = false;
    generationRef.current++; // Invalidate any running loops
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsStreaming(false);
    setStatus('idle');
  }, []);

  const loadInstant = useCallback(() => {
    stop();
    setCurrentIndex(sourceRef.current.length);
  }, [stop]);

  const clear = useCallback(() => {
    stop();
    setCurrentIndex(0);
  }, [stop]);

  const setSourceContent = useCallback((content: string) => {
    stop();
    setSource(content);
    sourceRef.current = content;
    setCurrentIndex(0);
  }, [stop]);

  const state: StreamingSimulationState = useMemo(() => ({
    text,
    isStreaming,
    progress,
    currentIndex,
    totalChars,
    status,
  }), [text, isStreaming, progress, currentIndex, totalChars, status]);

  const controls: StreamingSimulationControls = useMemo(() => ({
    start,
    stop,
    loadInstant,
    clear,
    setSource: setSourceContent,
    setSpeed,
    setLatency,
    setInitialLatency: setInitialLatencyEnabled,
  }), [start, stop, loadInstant, clear, setSourceContent]);

  return [state, controls];
}
