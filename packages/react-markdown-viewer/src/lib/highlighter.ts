/**
 * Syntax highlighter using highlight.js with dynamic language loading
 * 
 * Features:
 * - Minimal core bundle (~8KB gzipped)
 * - Dynamic language loading on demand with code-splitting
 * - Event system for re-highlighting when languages load
 * - LRU caching for performance
 * 
 * @see https://highlightjs.org/
 */

import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import { cacheManager } from './cache-manager';

// --------------------------------------------------------------------------
// Bundled Languages (minimal set, always available)
// --------------------------------------------------------------------------

import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('plaintext', plaintext);

// --------------------------------------------------------------------------
// Dynamic Language Import Map
// Explicit imports enable bundler code-splitting and tree-shaking
// --------------------------------------------------------------------------

const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: LanguageFn }>> = {
  // Web essentials
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  json: () => import('highlight.js/lib/languages/json'),
  css: () => import('highlight.js/lib/languages/css'),
  scss: () => import('highlight.js/lib/languages/scss'),
  less: () => import('highlight.js/lib/languages/less'),
  xml: () => import('highlight.js/lib/languages/xml'), // includes HTML
  markdown: () => import('highlight.js/lib/languages/markdown'),
  
  // Shell & config
  bash: () => import('highlight.js/lib/languages/bash'),
  shell: () => import('highlight.js/lib/languages/shell'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  ini: () => import('highlight.js/lib/languages/ini'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  nginx: () => import('highlight.js/lib/languages/nginx'),
  makefile: () => import('highlight.js/lib/languages/makefile'),
  
  // Data & query
  sql: () => import('highlight.js/lib/languages/sql'),
  graphql: () => import('highlight.js/lib/languages/graphql'),
  
  // Systems programming
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  rust: () => import('highlight.js/lib/languages/rust'),
  go: () => import('highlight.js/lib/languages/go'),
  
  // JVM languages
  java: () => import('highlight.js/lib/languages/java'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  scala: () => import('highlight.js/lib/languages/scala'),
  
  // .NET
  csharp: () => import('highlight.js/lib/languages/csharp'),
  
  // Scripting languages
  python: () => import('highlight.js/lib/languages/python'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  php: () => import('highlight.js/lib/languages/php'),
  perl: () => import('highlight.js/lib/languages/perl'),
  lua: () => import('highlight.js/lib/languages/lua'),
  r: () => import('highlight.js/lib/languages/r'),
  
  // Mobile
  swift: () => import('highlight.js/lib/languages/swift'),
  objectivec: () => import('highlight.js/lib/languages/objectivec'),
  
  // Other
  diff: () => import('highlight.js/lib/languages/diff'),
  wasm: () => import('highlight.js/lib/languages/wasm'),
  latex: () => import('highlight.js/lib/languages/latex'),
  haskell: () => import('highlight.js/lib/languages/haskell'),
  elixir: () => import('highlight.js/lib/languages/elixir'),
  erlang: () => import('highlight.js/lib/languages/erlang'),
  clojure: () => import('highlight.js/lib/languages/clojure'),
  lisp: () => import('highlight.js/lib/languages/lisp'),
  scheme: () => import('highlight.js/lib/languages/scheme'),
  ocaml: () => import('highlight.js/lib/languages/ocaml'),
  fsharp: () => import('highlight.js/lib/languages/fsharp'),
  powershell: () => import('highlight.js/lib/languages/powershell'),
  vim: () => import('highlight.js/lib/languages/vim'),
  toml: () => import('highlight.js/lib/languages/ini'), // TOML uses ini grammar
  delphi: () => import('highlight.js/lib/languages/delphi'), // Pascal/Delphi
};

// --------------------------------------------------------------------------
// Language Aliases
// --------------------------------------------------------------------------

const LANGUAGE_ALIASES: Record<string, string> = {
  // JavaScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  
  // TypeScript
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  
  // Shell
  sh: 'bash',
  zsh: 'bash',
  
  // Python
  py: 'python',
  py3: 'python',
  python3: 'python',
  
  // Ruby
  rb: 'ruby',
  
  // YAML
  yml: 'yaml',
  
  // Markup
  htm: 'xml',
  html: 'xml',
  xhtml: 'xml',
  svg: 'xml',
  vue: 'xml',
  
  // Config
  jsonc: 'json',
  json5: 'json',
  
  // C family
  h: 'c',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  
  // C#
  cs: 'csharp',
  
  // Dockerfile
  docker: 'dockerfile',
  
  // Makefile
  mk: 'makefile',
  
  // Objective-C
  objc: 'objectivec',
  'm': 'objectivec',
  
  // F#
  fs: 'fsharp',
  
  // Pascal/Delphi
  pascal: 'delphi',
  pas: 'delphi',
  
  // Text
  text: 'plaintext',
  txt: 'plaintext',
  plain: 'plaintext',
};

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------

const registeredLanguages = new Set<string>(['plaintext']);
const loadingLanguages = new Map<string, Promise<void>>();
const failedLanguages = new Set<string>();

// Event listeners for language load events
type LanguageLoadListener = (language: string) => void;
const languageLoadListeners = new Set<LanguageLoadListener>();

// Batched notification state (avoids multiple re-renders when several languages load)
let pendingNotifications = new Set<string>();
let notificationScheduled = false;

// --------------------------------------------------------------------------
// Dynamic Language Loading
// --------------------------------------------------------------------------

// Dev-only logging helper
const isDev = process.env.NODE_ENV !== 'production';

function devLog(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.log(`[hljs] ${message}`, ...args);
  }
}

function devWarn(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.warn(`[hljs] ${message}`, ...args);
  }
}

/**
 * Load a language dynamically
 * Returns a promise that resolves when the language is ready
 */
export async function loadLanguage(language: string): Promise<boolean> {
  const normalized = normalizeLanguage(language);
  
  // Already registered
  if (registeredLanguages.has(normalized)) {
    devLog(`✓ "${normalized}" already loaded`);
    return true;
  }
  
  // Already failed
  if (failedLanguages.has(normalized)) {
    devLog(`✗ "${normalized}" previously failed, skipping`);
    return false;
  }
  
  // Already loading - wait for it
  const existing = loadingLanguages.get(normalized);
  if (existing) {
    devLog(`⏳ "${normalized}" already loading, waiting...`);
    await existing;
    return registeredLanguages.has(normalized);
  }
  
  // Check if we have a loader for this language
  const loader = LANGUAGE_LOADERS[normalized];
  if (!loader) {
    devWarn(`✗ "${normalized}" not supported (no loader available)`);
    failedLanguages.add(normalized);
    return false;
  }
  
  // Start loading
  devLog(`⏳ "${normalized}" loading...`);
  const startTime = performance.now();
  
  const loadPromise = (async () => {
    try {
      if (_loadDelayMs > 0) {
        await new Promise<void>(r => setTimeout(r, _loadDelayMs));
      }
      const module = await loader();
      hljs.registerLanguage(normalized, module.default);
      registeredLanguages.add(normalized);
      
      const duration = (performance.now() - startTime).toFixed(1);
      devLog(`✓ "${normalized}" loaded in ${duration}ms`);
      
      // Notify listeners
      notifyLanguageLoaded(normalized);
    } catch (error) {
      failedLanguages.add(normalized);
      devWarn(`✗ "${normalized}" failed to load:`, error);
    } finally {
      loadingLanguages.delete(normalized);
    }
  })();
  
  loadingLanguages.set(normalized, loadPromise);
  await loadPromise;
  
  return registeredLanguages.has(normalized);
}

/**
 * Load multiple languages in parallel
 */
export async function loadLanguages(languages: string[]): Promise<void> {
  const unique = [...new Set(languages.map(normalizeLanguage))];
  const toLoad = unique.filter(lang => 
    !registeredLanguages.has(lang) && 
    !failedLanguages.has(lang) &&
    LANGUAGE_LOADERS[lang]
  );
  
  if (toLoad.length > 0) {
    devLog(`⏳ Loading ${toLoad.length} languages in parallel: [${toLoad.join(', ')}]`);
    const startTime = performance.now();
    await Promise.all(toLoad.map(loadLanguage));
    const duration = (performance.now() - startTime).toFixed(1);
    devLog(`✓ Parallel load complete in ${duration}ms`);
  }
}

// --------------------------------------------------------------------------
// Highlighting API
// --------------------------------------------------------------------------

export interface HighlightResult {
  html: string;
  language: string;
  isHighlighted: boolean;
}

/**
 * Highlight code synchronously if language is available
 * Triggers async language load if not available
 * 
 * @param code - Source code to highlight
 * @param language - Language identifier
 * @returns Highlighted HTML and status
 */
export function highlightCode(code: string, language?: string): HighlightResult {
  if (!code) {
    return { html: '', language: 'plaintext', isHighlighted: false };
  }
  
  if (!language) {
    return { html: escapeHtml(code), language: 'plaintext', isHighlighted: false };
  }
  
  const normalized = normalizeLanguage(language);
  
  if (normalized === 'plaintext') {
    return { html: escapeHtml(code), language: 'plaintext', isHighlighted: true };
  }
  
  // Check cache
  const cacheKey = `${normalized}:${code}`;
  const cached = cacheManager.highlightCache.get(cacheKey);
  if (cached !== undefined) {
    return { html: cached, language: normalized, isHighlighted: true };
  }
  
  // Check if language is registered
  if (!registeredLanguages.has(normalized)) {
    // Trigger async load (non-blocking)
    if (LANGUAGE_LOADERS[normalized] && !failedLanguages.has(normalized)) {
      loadLanguage(normalized); // Fire and forget
    } else if (!failedLanguages.has(normalized)) {
      // Unknown language - log warning and mark as failed
      devWarn(`✗ "${normalized}" not supported (no loader available)`);
      failedLanguages.add(normalized);
    }
    return { html: escapeHtml(code), language: normalized, isHighlighted: false };
  }
  
  // Highlight synchronously
  try {
    const result = hljs.highlight(code, {
      language: normalized,
      ignoreIllegals: true,
    });
    
    cacheManager.highlightCache.set(cacheKey, result.value);
    return { html: result.value, language: normalized, isHighlighted: true };
  } catch {
    return { html: escapeHtml(code), language: normalized, isHighlighted: false };
  }
}

/**
 * Simple highlight that returns just the HTML string
 * For use in parser where we don't need status info
 */
export function highlight(code: string, language?: string): string {
  return highlightCode(code, language).html;
}

// --------------------------------------------------------------------------
// Event System
// --------------------------------------------------------------------------

/**
 * Subscribe to language load events
 */
export function onLanguageLoaded(listener: LanguageLoadListener): void {
  languageLoadListeners.add(listener);
}

/**
 * Unsubscribe from language load events
 */
export function offLanguageLoaded(listener: LanguageLoadListener): void {
  languageLoadListeners.delete(listener);
}

// Track the last notification generation so late subscribers can detect missed notifications
let notificationGeneration = 0;

function notifyLanguageLoaded(language: string): void {
  // Collect language and its aliases for notification
  pendingNotifications.add(language);
  for (const [alias, target] of Object.entries(LANGUAGE_ALIASES)) {
    if (target === language) {
      pendingNotifications.add(alias);
    }
  }

  // Batch notifications using microtask to avoid multiple re-renders
  // when several languages load in parallel
  if (!notificationScheduled) {
    notificationScheduled = true;
    queueMicrotask(() => {
      const languages = [...pendingNotifications];
      pendingNotifications.clear();
      notificationScheduled = false;
      notificationGeneration++;

      const listenerCount = languageLoadListeners.size;
      if (listenerCount > 0) {
        devLog(`📢 Notifying ${listenerCount} listener(s) for [${languages.join(', ')}]`);
      }

      // Notify once per listener (not per language)
      // Listener receives first language but all are now available
      languageLoadListeners.forEach(listener => {
        try {
          listener(languages[0]);
        } catch (error) {
          console.error('[hljs] Error in language load listener:', error);
        }
      });
    });
  }
}

/**
 * Get the current notification generation.
 * Used by late subscribers to detect if they missed a notification
 * (e.g., useEffect subscribes after paint, but languages loaded before paint).
 */
export function getNotificationGeneration(): number {
  return notificationGeneration;
}

// --------------------------------------------------------------------------
// Registration API
// --------------------------------------------------------------------------

/**
 * Register a custom language not in the dynamic loader map
 */
export function registerLanguage(name: string, languageFn: LanguageFn): void {
  const normalized = normalizeLanguage(name);
  
  if (registeredLanguages.has(normalized)) {
    devLog(`✓ "${normalized}" already registered`);
    return;
  }
  
  hljs.registerLanguage(normalized, languageFn);
  registeredLanguages.add(normalized);
  failedLanguages.delete(normalized);
  devLog(`✓ "${normalized}" registered (custom)`);
  notifyLanguageLoaded(normalized);
}

// --------------------------------------------------------------------------
// Utilities
// --------------------------------------------------------------------------

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const HTML_ESCAPE_RE = /[&<>"']/g;

function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, char => HTML_ESCAPE_MAP[char]);
}

/**
 * Check if a language is available (registered)
 */
export function isLanguageReady(language: string): boolean {
  return registeredLanguages.has(normalizeLanguage(language));
}

/**
 * Check if a language can be loaded dynamically
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return registeredLanguages.has(normalized) || normalized in LANGUAGE_LOADERS;
}

/**
 * Get all registered languages
 */
export function getRegisteredLanguages(): string[] {
  return Array.from(registeredLanguages);
}

/**
 * Get all supported languages (registered + loadable)
 */
export function getSupportedLanguages(): string[] {
  return [...new Set([...registeredLanguages, ...Object.keys(LANGUAGE_LOADERS)])];
}

/**
 * Clear highlight cache
 */
export function clearHighlightCache(): void {
  cacheManager.highlightCache.clear();
}

// --------------------------------------------------------------------------
// Dev / Test Utilities
// --------------------------------------------------------------------------

let _loadDelayMs = 0;

/**
 * Set an artificial delay (in ms) applied before every dynamic language load.
 * Useful for testing deferred-rendering behaviour in the playground.
 * A value of 0 (default) disables the delay.
 */
export function _setHighlighterLoadDelay(ms: number): void {
  _loadDelayMs = Math.max(0, ms);
}

/**
 * Reset the highlighter to its initial state:
 * unregister all languages (except plaintext), clear caches,
 * and clear the failed/loading sets.
 * Intended for dev/test only.
 */
export function _resetHighlighter(): void {
  for (const lang of registeredLanguages) {
    if (lang !== 'plaintext') registeredLanguages.delete(lang);
  }
  loadingLanguages.clear();
  failedLanguages.clear();
  cacheManager.highlightCache.clear();
  cacheManager.renderCacheSync.clear();
  cacheManager.renderCacheAsync.clear();
}
