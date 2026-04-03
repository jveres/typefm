import { useImperativeHandle, memo, useRef, type ReactNode, type ComponentProps, type Ref } from 'react';
import { useMarkdownViewer } from './useMarkdownViewer';
import { ErrorBoundary } from './ErrorBoundary';
import type { RenderHooks } from './types/hooks';

export interface MarkdownViewerRef {
  /** Reset the component state (call when switching content sources) */
  reset: () => void;
  /** Get the container element */
  getContainer: () => HTMLDivElement | null;
  /** Focus the viewer (activates cursor) */
  focus: () => void;
}

export interface MarkdownViewerProps extends Omit<ComponentProps<'div'>, 'children' | 'ref'> {
  /** Markdown source text */
  text: string;
  /** Enable streaming mode (throttling + cursor) */
  isStreaming?: boolean;
  /** Minimum ms between updates during streaming (default: 50) */
  throttleMs?: number;
  /** Callback when streaming ends */
  onStreamingEnd?: () => void;
  /** Ref to access imperative methods (React 19+) */
  ref?: Ref<MarkdownViewerRef>;
  /** Hooks for customizing markdown rendering */
  hooks?: RenderHooks;
}

/**
 * High-performance React component for rendering markdown with streaming support,
 * optimized for LLM chat interfaces.
 */
export const MarkdownViewer = memo(function MarkdownViewer({
  text,
  isStreaming = false,
  throttleMs = 50,
  className,
  onStreamingEnd,
  ref,
  onClick,
  hooks,
  ...props
}: MarkdownViewerProps) {
  const {
    containerRef,
    syncMorphEnabled,
    getRenderedContent,
    handleClick,
    reset,
  } = useMarkdownViewer({
    text,
    isStreaming,
    throttleMs,
    onStreamingEnd,
    hooks,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    reset,
    getContainer: () => containerRef.current,
    focus: () => wrapperRef.current?.focus(),
  }), [reset]);

  // Build className without array allocation
  let rootClassName = 'markdown-viewer';
  if (className) rootClassName += ' ' + className;

  // Merge click handlers
  const handleRootClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleClick(e);
    onClick?.(e);
  };

  // Shared props for both render paths
  const rootProps = {
    ref: wrapperRef,
    className: rootClassName,
    onClick: handleRootClick,
    tabIndex: 0,
    // Data attributes for state-based styling
    'data-slot': 'markdown-viewer',
    'data-state': isStreaming ? 'streaming' : 'idle',
    // ARIA attributes for accessibility
    role: 'article' as const,
    'aria-label': props['aria-label'] ?? 'Markdown content',
    'aria-busy': isStreaming,
    ...props,
  };

  /*
   * If `syncMorphEnabled` is TRUE (Streaming or Finished Streaming):
   * We use DOM morphing via `morphContent`. This patches the DOM intelligently.
   * It prevents full re-renders and preserves selection.
   * The content is rendered empty initially and morphed in the hook.
   *
   * If `syncMorphEnabled` is FALSE (Initial Static Load):
   * We use dangerouslySetInnerHTML for speed.
   */
  if (syncMorphEnabled) {
    return (
      <div {...rootProps}>
        <div ref={containerRef} className="markdown" data-slot="markdown-content" />
      </div>
    );
  }

  return (
    <div {...rootProps}>
      <div
        ref={containerRef}
        className="markdown"
        data-slot="markdown-content"
        dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
      />
    </div>
  );
});

export interface MarkdownViewerSafeProps extends Omit<MarkdownViewerProps, 'onError'> {
  /** Fallback UI when an error occurs */
  fallback?: ReactNode;
  /** Callback when a rendering error is caught by the error boundary */
  onError?: (error: Error) => void;
}

/**
 * MarkdownViewer wrapped with an error boundary.
 * Catches rendering errors and displays fallback UI instead of crashing.
 */
export const MarkdownViewerSafe = memo(function MarkdownViewerSafe({
  fallback,
  onError,
  ...props
}: MarkdownViewerSafeProps) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <MarkdownViewer {...props} />
    </ErrorBoundary>
  );
});
