/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../../src/ErrorBoundary';
import { MarkdownViewerSafe } from '../../src/MarkdownViewer';

// Component that throws an error for testing
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="success">Rendered successfully</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output (React logs errors)
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  afterEach(() => {
    cleanup();
  });

  describe('error catching', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      const success = document.querySelector('[data-testid="success"]');
      expect(success).toBeTruthy();
      expect(success?.textContent).toBe('Rendered successfully');
    });

    it('should render default fallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const errorDiv = document.querySelector('.markdown-viewer-error');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Failed to render markdown');
    });

    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const fallback = document.querySelector('[data-testid="custom-fallback"]');
      expect(fallback).toBeTruthy();
      expect(fallback?.textContent).toBe('Custom error UI');
    });

    it('should render null fallback when explicitly set', () => {
      const { container } = render(
        <ErrorBoundary fallback={null}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should render nothing (null)
      expect(container.innerHTML).toBe('');
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe('Test error');
    });

    it('should have role="alert" on default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const errorDiv = document.querySelector('.markdown-viewer-error');
      expect(errorDiv?.getAttribute('role')).toBe('alert');
    });
  });
});

describe('MarkdownViewerSafe', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  afterEach(() => {
    cleanup();
  });

  it('should render markdown normally when no error', () => {
    render(<MarkdownViewerSafe text="# Hello World" />);

    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent).toContain('Hello World');
  });

  it('should apply className when no error', () => {
    render(<MarkdownViewerSafe text="test" className="custom-class" />);

    const viewer = document.querySelector('.markdown-viewer');
    expect(viewer?.classList.contains('custom-class')).toBe(true);
  });

  it('should support streaming mode', () => {
    render(<MarkdownViewerSafe text="Hello" isStreaming />);

    const cursor = document.querySelector('[data-cursor]');
    expect(cursor).toBeTruthy();
  });

  it('should accept fallback prop without error', () => {
    render(
      <MarkdownViewerSafe 
        text="# Test" 
        fallback={<div data-testid="fallback">Error occurred</div>}
      />
    );

    // Should render markdown, not fallback
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();

    const fallback = document.querySelector('[data-testid="fallback"]');
    expect(fallback).toBeFalsy();
  });

  it('should accept onError prop without error', () => {
    const onError = vi.fn();

    render(
      <MarkdownViewerSafe 
        text="# Test" 
        onError={onError}
      />
    );

    // Should not call onError when no error occurs
    expect(onError).not.toHaveBeenCalled();
  });
});
