/**
 * KaTeX types for lazy loading
 * 
 * We define our own minimal interface rather than importing @types/katex
 * because we load KaTeX dynamically and only use renderToString.
 */

export interface KaTeXOptions {
  /** Render in display mode (block) vs inline mode */
  displayMode?: boolean;
  /** Throw on parse errors instead of rendering error message */
  throwOnError?: boolean;
  /** Error color for invalid LaTeX */
  errorColor?: string;
  /** Strict mode: true, false, "warn", "error", or handler function */
  strict?: boolean | string | ((errorCode: string, errorMsg: string, token: unknown) => string | void);
  /** Trust input (enables \href, \url, \includegraphics) */
  trust?: boolean | ((context: { command: string; url: string; protocol: string }) => boolean);
  /** Macro definitions */
  macros?: Record<string, string>;
  /** Minimum thickness for fraction lines */
  minRuleThickness?: number;
  /** Max expand depth for macros */
  maxExpand?: number;
  /** Max size for user-specified sizes */
  maxSize?: number;
  /** Global group for persistent macros */
  globalGroup?: boolean;
}

export interface KaTeXLike {
  /**
   * Render LaTeX to HTML string
   * @param tex LaTeX source
   * @param options Rendering options
   * @returns HTML string
   */
  renderToString(tex: string, options?: KaTeXOptions): string;
}
