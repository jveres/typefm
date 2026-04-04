import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MarkdownViewer } from '../src';

// Import all .md files from samples directory
const markdownFiles = import.meta.glob('./samples/*.md', { 
  query: '?raw', 
  import: 'default',
  eager: true 
}) as Record<string, string>;

// Hoisted styles outside component (Rule 6.3 - prevents recreation on every render)
const STYLES = `
  .github-comparison {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--fg);
    --bg: #ffffff;
    --fg: #1f2328;
    --border: #d1d9e0;
    --muted: #59636e;
    --accent: #0969da;
    --surface: #f6f8fa;
  }
  .github-comparison.dark {
    --bg: #0d1117;
    --fg: #f0f6fc;
    --border: #3d444d;
    --muted: #9198a1;
    --accent: #4493f8;
    --surface: #151b23;
  }
  
  .gc-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0.5rem 1.5rem;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    flex-shrink: 0;
  }
  .gc-toolbar label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  
  .gc-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .gc-editor {
    min-width: 150px;
    max-width: 60%;
    border-right: none;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .gc-resizer {
    width: 5px;
    cursor: col-resize;
    background: var(--border);
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .gc-resizer:hover,
  .gc-resizer.dragging {
    background: var(--accent);
  }
  .gc-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .gc-editor-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gc-file-select {
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    font-size: 11px;
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
    cursor: pointer;
  }
  .gc-file-select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .gc-file-select.modified {
    font-weight: 600;
  }
  .gc-editor textarea {
    flex: 1;
    border: none;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: none;
    background: var(--bg);
    color: var(--fg);
  }
  .gc-editor textarea:focus {
    outline: none;
  }
  
  .gc-panels {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .gc-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .gc-panel:first-child {
    border-right: 1px solid var(--border);
  }
  .gc-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .gc-panel-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gc-panel-header .status {
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
  }
  .gc-panel-header .status.loading {
    color: var(--accent);
  }
  .gc-panel-header .status.error {
    color: #f85149;
  }
  .gc-refresh-btn {
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .gc-refresh-btn:hover:not(:disabled) {
    background: var(--surface);
    border-color: var(--muted);
  }
  .gc-refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .gc-panel-content {
    flex: 1;
    overflow: auto;
    padding: 24px;
    background: #ffffff;
  }
  .github-comparison.dark .gc-panel-content {
    background: #0d1117;
  }
  
  /* GitHub markdown-body styles for their HTML */
  .gc-panel-content.github-html h1,
  .gc-panel-content.github-html h2 {
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border);
  }
  .gc-panel-content.github-html h1 { font-size: 2em; margin: 0.67em 0 16px; }
  .gc-panel-content.github-html h2 { font-size: 1.5em; margin: 24px 0 16px; }
  .gc-panel-content.github-html > *:first-child { margin-top: 0 !important; }
  .gc-panel-content.github-html h3 { font-size: 1.25em; margin: 24px 0 16px; }
  .gc-panel-content.github-html h4 { font-size: 1em; margin: 24px 0 16px; }
  .gc-panel-content.github-html h5 { font-size: 0.875em; margin: 24px 0 16px; }
  .gc-panel-content.github-html h6 { font-size: 0.85em; margin: 24px 0 16px; color: var(--muted); }
  .gc-panel-content.github-html p { margin: 0 0 16px; }
  .gc-panel-content.github-html ul, .gc-panel-content.github-html ol { padding-left: 2em; margin: 0 0 16px; }
  .gc-panel-content.github-html li + li { margin-top: 0.25em; }
  .gc-panel-content.github-html blockquote {
    margin: 0 0 16px;
    padding: 0 1em;
    color: var(--muted);
    border-left: 0.25em solid var(--border);
  }
  .gc-panel-content.github-html code {
    padding: 0.2em 0.4em;
    font-size: 85%;
    background: rgba(175, 184, 193, 0.2);
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
  }
  .github-comparison.dark .gc-panel-content.github-html code {
    background: rgba(110, 118, 129, 0.4);
  }
  .gc-panel-content.github-html pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background: var(--surface);
    border-radius: 6px;
    margin: 0 0 16px;
  }
  .gc-panel-content.github-html pre code {
    padding: 0;
    background: transparent;
    border-radius: 0;
  }
  .gc-panel-content.github-html table {
    border-spacing: 0;
    border-collapse: collapse;
    margin: 0 0 16px;
    display: block;
    width: max-content;
    max-width: 100%;
    overflow: auto;
  }
  .gc-panel-content.github-html th, .gc-panel-content.github-html td {
    padding: 6px 13px;
    border: 1px solid var(--border);
  }
  .gc-panel-content.github-html th { font-weight: 600; }
  .gc-panel-content.github-html tr:nth-child(2n) { background: var(--surface); }
  .gc-panel-content.github-html hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: var(--border);
    border: 0;
  }
  .gc-panel-content.github-html a {
    color: var(--accent);
    text-decoration: underline;
  }
  .gc-panel-content.github-html img {
    max-width: 100%;
  }
  .gc-panel-content.github-html kbd {
    display: inline-block;
    padding: 3px 5px;
    font: 11px ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
    line-height: 10px;
    color: var(--fg);
    vertical-align: middle;
    background-color: var(--surface);
    border: solid 1px var(--border);
    border-radius: 6px;
    box-shadow: inset 0 -1px 0 var(--border);
  }
  /* GitHub alert styles */
  .gc-panel-content.github-html .markdown-alert {
    padding: 8px 16px;
    margin-bottom: 16px;
    border-left: 0.25em solid var(--border);
  }
  .gc-panel-content.github-html .markdown-alert-title {
    display: flex;
    font-weight: 500;
    align-items: center;
    line-height: 1;
    margin-bottom: 4px;
  }
  .gc-panel-content.github-html .markdown-alert-note { border-left-color: var(--accent); }
  .gc-panel-content.github-html .markdown-alert-tip { border-left-color: #1a7f37; }
  .gc-panel-content.github-html .markdown-alert-important { border-left-color: #8250df; }
  .gc-panel-content.github-html .markdown-alert-warning { border-left-color: #9a6700; }
  .gc-panel-content.github-html .markdown-alert-caution { border-left-color: #cf222e; }
  
  /* Task list */
  .gc-panel-content.github-html .task-list-item {
    list-style-type: none;
  }
  .gc-panel-content.github-html .task-list-item input {
    margin: 0 0.2em 0.25em -1.6em;
    vertical-align: middle;
  }
  
  .gc-panel.collapsed {
    flex: 0 0 36px;
    min-width: 36px;
  }
  .gc-panel.collapsed .gc-panel-header {
    height: 100%;
    width: 36px;
    flex-direction: column;
    padding: 10px 0;
    gap: 0;
    justify-content: flex-start;
    align-items: center;
    border-bottom: none;
  }
  .gc-panel.collapsed .gc-panel-header > span {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    white-space: nowrap;
    margin-top: 8px;
  }
  .gc-panel.collapsed .gc-panel-header-right {
    order: -1;
  }
  .gc-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .gc-collapse-btn:hover {
    background: var(--surface);
    border-color: var(--muted);
    color: var(--fg);
  }
  .gc-collapse-btn svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  
  .gc-footer {
    padding: 8px 16px;
    font-size: 12px;
    color: var(--muted);
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
  }
  .gc-footer a {
    color: var(--accent);
  }
  .gc-footer code {
    padding: 1px 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
    font-size: 11px;
  }
`;

// Comprehensive test markdown covering all GitHub-supported features
const DEFAULT_TEST_MARKDOWN = `# GitHub Markdown Comparison

This document tests visual parity between our markdown viewer and GitHub's rendering.

## Typography

Regular text with **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and \`inline code\`.

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

## Lists

### Unordered

- Item 1
- Item 2
  - Nested item
  - Another nested
    - Deep nested
- Item 3

### Ordered

1. First
2. Second
   1. Nested ordered
   2. Another nested
3. Third

### Task List

- [x] Completed
- [ ] Incomplete
- [x] Another done

## Links

[Regular link](https://example.com)

[Link with title](https://example.com "Title text")

https://auto-linked-url.com

## Blockquotes

> Single line quote

> Multi-line quote
> continues here
>
> > Nested quote

## Code

Inline \`code\` in text.

\`\`\`javascript
// JavaScript code block
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}
\`\`\`

\`\`\`python
# Python code block
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

## Tables

| Left | Center | Right |
|:-----|:------:|------:|
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
| L3   |   C3   |    R3 |

## Horizontal Rule

---

## Images

![Alt text](https://placehold.co/200x100/3498db/ffffff?text=Test+Image)

## Alerts

> [!NOTE]
> This is a note.

> [!TIP]
> This is a tip.

> [!IMPORTANT]
> This is important.

> [!WARNING]
> This is a warning.

> [!CAUTION]
> This is a caution.

## HTML Elements

Text with <sub>subscript</sub> and <sup>superscript</sup>.

<details>
<summary>Click to expand</summary>

Hidden content here.

</details>

## Keyboard

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

## Footnotes

Here is a footnote reference[^1].

[^1]: This is the footnote content.

## Definition List

Term 1
: Definition 1

Term 2
: Definition 2

---

*End of comparison document*
`;

interface ComparisonState {
  githubHtml: string;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  lastFetchedMarkdown: string | null;
}

const STORAGE_KEY = 'gc-markdown-input';
const STORAGE_KEY_FILE = 'gc-selected-file';

export function GitHubComparison({ dark }: { dark: boolean }) {
  // Prepare file list from imported markdown files
  const fileList = useMemo(() => {
    return Object.entries(markdownFiles).map(([path, content]) => ({
      // Extract filename from path like './samples/edge-cases-test.md'
      name: path.split('/').pop() || path,
      content: content as string,
    }));
  }, []);

  const [selectedFile, setSelectedFile] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_FILE) || '';
  });

  const [markdown, setMarkdown] = useState(() => {
    const savedFile = localStorage.getItem(STORAGE_KEY_FILE);
    if (savedFile) {
      const file = Object.entries(markdownFiles).find(([path]) => path.includes(savedFile));
      if (file) return file[1] as string;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ?? DEFAULT_TEST_MARKDOWN;
  });

  // Track original content to detect modifications
  const [originalContent, setOriginalContent] = useState(() => {
    const savedFile = localStorage.getItem(STORAGE_KEY_FILE);
    if (savedFile) {
      const file = Object.entries(markdownFiles).find(([path]) => path.includes(savedFile));
      if (file) return file[1] as string;
    }
    return DEFAULT_TEST_MARKDOWN;
  });

  const isModified = markdown !== originalContent;

  // Handle file selection
  const handleFileSelect = useCallback((filename: string) => {
    setSelectedFile(filename);
    localStorage.setItem(STORAGE_KEY_FILE, filename);
    if (filename === '') {
      // Default - load built-in test markdown
      setMarkdown(DEFAULT_TEST_MARKDOWN);
      setOriginalContent(DEFAULT_TEST_MARKDOWN);
    } else {
      const file = fileList.find(f => f.name === filename);
      if (file) {
        setMarkdown(file.content);
        setOriginalContent(file.content);
      }
    }
  }, [fileList]);
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown);
  const [state, setState] = useState<ComparisonState>({
    githubHtml: '',
    loading: false,
    error: null,
    lastFetched: null,
    lastFetchedMarkdown: null,
  });
  const [syncScroll, setSyncScroll] = useState(true);
  const [editorWidth, setEditorWidth] = useState(() => {
    const saved = localStorage.getItem('gc-editor-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isDragging, setIsDragging] = useState(false);

  const ourViewerRef = useRef<HTMLDivElement>(null);
  const githubViewerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const scrollSource = useRef<'ours' | 'github' | null>(null);
  const rafId = useRef<number>(0);
  const scrollOffset = useRef<number>(0); // Offset between panels when sync enabled
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiRequestCount, setApiRequestCount] = useState(0);
  const [githubPanelCollapsed, setGithubPanelCollapsed] = useState(false);

  // Save markdown to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, markdown);
  }, [markdown]);

  // Reset to default markdown
  const handleReset = useCallback(() => {
    setSelectedFile('');
    localStorage.setItem(STORAGE_KEY_FILE, '');
    setMarkdown(DEFAULT_TEST_MARKDOWN);
    setOriginalContent(DEFAULT_TEST_MARKDOWN);
  }, []);

  // Debounce markdown input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMarkdown(markdown);
    }, 500);
    return () => clearTimeout(timer);
  }, [markdown]);

  // Fetch GitHub rendered HTML
  const fetchGitHubHtml = useCallback(async (text: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    setApiRequestCount(prev => prev + 1);
    
    try {
      // GitHub Markdown API - renders markdown to HTML
      // Note: Rate limited to 60 requests/hour without auth, 5000/hour with token
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      };
      
      // Token from Vite env (create .env.local with VITE_GITHUB_TOKEN=ghp_xxxx)
      const token = import.meta.env.VITE_GITHUB_TOKEN;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[GitHub API] Using authenticated request');
      } else {
        console.log('[GitHub API] No token - using unauthenticated request (60 req/hr)');
      }
      
      const response = await fetch('https://api.github.com/markdown', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          mode: 'gfm', // GitHub Flavored Markdown
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Wait an hour or add a GitHub token.');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      setState({
        githubHtml: html,
        loading: false,
        error: null,
        lastFetched: new Date(),
        lastFetchedMarkdown: text,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Fetch on debounced markdown change (only if content actually changed and panel is visible)
  useEffect(() => {
    if (githubPanelCollapsed) {
      console.log('[GitHub API] Panel collapsed, skipping fetch');
      return;
    }
    const trimmed = debouncedMarkdown.trim();
    if (trimmed && trimmed !== state.lastFetchedMarkdown) {
      console.log('[GitHub API] Content changed, fetching...');
      fetchGitHubHtml(debouncedMarkdown);
    } else if (trimmed && trimmed === state.lastFetchedMarkdown) {
      console.log('[GitHub API] Content unchanged, using cached result');
    }
  }, [debouncedMarkdown, state.lastFetchedMarkdown, fetchGitHubHtml, githubPanelCollapsed]);

  // Capture scroll offset when sync is enabled
  const handleSyncToggle = useCallback((enabled: boolean) => {
    if (enabled && ourViewerRef.current && githubViewerRef.current) {
      // Calculate ratio offset between the two panels
      const ourMax = ourViewerRef.current.scrollHeight - ourViewerRef.current.clientHeight;
      const githubMax = githubViewerRef.current.scrollHeight - githubViewerRef.current.clientHeight;
      const ourRatio = ourMax > 0 ? ourViewerRef.current.scrollTop / ourMax : 0;
      const githubRatio = githubMax > 0 ? githubViewerRef.current.scrollTop / githubMax : 0;
      scrollOffset.current = ourRatio - githubRatio;
    }
    setSyncScroll(enabled);
  }, []);

  // Sync scroll between panels
  const handleScroll = useCallback((source: 'ours' | 'github') => {
    if (!syncScroll) return;
    
    // Prevent feedback loop - only sync if this is the initiating source
    if (scrollSource.current && scrollSource.current !== source) return;
    
    scrollSource.current = source;
    cancelAnimationFrame(rafId.current);
    
    // Clear previous reset timer
    if (scrollResetTimer.current) {
      clearTimeout(scrollResetTimer.current);
    }
    
    rafId.current = requestAnimationFrame(() => {
      const sourceEl = source === 'ours' ? ourViewerRef.current : githubViewerRef.current;
      const targetEl = source === 'ours' ? githubViewerRef.current : ourViewerRef.current;
      
      if (sourceEl && targetEl) {
        const sourceMax = sourceEl.scrollHeight - sourceEl.clientHeight;
        const targetMax = targetEl.scrollHeight - targetEl.clientHeight;
        
        if (sourceMax > 0 && targetMax > 0) {
          const sourceRatio = sourceEl.scrollTop / sourceMax;
          // Apply offset based on scroll direction
          const offset = source === 'ours' ? -scrollOffset.current : scrollOffset.current;
          const targetRatio = Math.max(0, Math.min(1, sourceRatio + offset));
          targetEl.scrollTop = targetRatio * targetMax;
        }
      }
      
      // Reset source after a short delay to allow for scroll end
      scrollResetTimer.current = setTimeout(() => { scrollSource.current = null; }, 100);
    });
  }, [syncScroll]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
      if (scrollResetTimer.current) {
        clearTimeout(scrollResetTimer.current);
      }
    };
  }, []);


  // Resizer drag handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      const minWidth = 150;
      const maxWidth = window.innerWidth * 0.6;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setEditorWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('gc-editor-width', editorWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, editorWidth]);

  return (
    <div className={`github-comparison ${dark ? 'dark' : ''}`}>
      <style>{STYLES}</style>
      <div className="gc-toolbar">
        <label>
          <input
            type="checkbox"
            checked={syncScroll}
            onChange={(e) => handleSyncToggle(e.target.checked)}
          />
          Sync Scroll
        </label>
      </div>
      
      <main className="gc-main">
        <aside 
          ref={editorRef}
          className="gc-editor"
          style={{ width: editorWidth }}
        >
          <div className="gc-editor-header">
            <div className="gc-editor-header-left">
              <span>Markdown Input</span>
              <select 
                className={`gc-file-select${isModified ? ' modified' : ''}`}
                value={selectedFile}
                onChange={(e) => handleFileSelect(e.target.value)}
                title="Select a markdown file"
              >
                <option value="">Default{selectedFile === '' && isModified ? '*' : ''}</option>
                {fileList.map(file => (
                  <option key={file.name} value={file.name}>
                    {file.name}{selectedFile === file.name && isModified ? '*' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className="gc-refresh-btn"
              onClick={handleReset}
              title="Reset to default markdown"
            >
              Reset
            </button>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Enter markdown here..."
            spellCheck={false}
          />
        </aside>
        <div 
          className={`gc-resizer ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleResizeStart}
        />
        <div className="gc-panels">
          <div className="gc-panel">
            <div className="gc-panel-header">
              <span>Our Viewer</span>
              <span className="status">@typefm/react-markdown-viewer</span>
            </div>
            <div 
              ref={ourViewerRef}
              className="gc-panel-content"
              onScroll={() => handleScroll('ours')}
            >
              <MarkdownViewer text={debouncedMarkdown} isStreaming={false} />
            </div>
          </div>
          
          <div className={`gc-panel${githubPanelCollapsed ? ' collapsed' : ''}`}>
            <div className="gc-panel-header">
              <span>GitHub API</span>
              <div className="gc-panel-header-right">
                {!githubPanelCollapsed && (
                  <>
                    <span className={`status ${state.loading ? 'loading' : state.error ? 'error' : ''}`}>
                      {state.loading ? '⏳ Loading...' : state.error ? `⚠️ ${state.error}` : 
                        state.lastFetched ? `✓ ${state.lastFetched.toLocaleTimeString()}` : ''}
                    </span>
                    <button 
                      className="gc-refresh-btn"
                      onClick={() => fetchGitHubHtml(debouncedMarkdown)}
                      disabled={state.loading}
                      title="Refresh GitHub rendering"
                    >
                      Refresh
                    </button>
                  </>
                )}
                <button
                  className="gc-collapse-btn"
                  onClick={() => setGithubPanelCollapsed(prev => !prev)}
                  title={githubPanelCollapsed ? 'Expand GitHub panel' : 'Collapse GitHub panel'}
                >
                  <svg viewBox="0 0 24 24">
                    {githubPanelCollapsed 
                      ? <polyline points="15 18 9 12 15 6" />
                      : <polyline points="9 18 15 12 9 6" />
                    }
                  </svg>
                </button>
              </div>
            </div>
            {!githubPanelCollapsed && (
              <div 
                ref={githubViewerRef}
                className="gc-panel-content github-html"
                onScroll={() => handleScroll('github')}
                dangerouslySetInnerHTML={{ __html: state.githubHtml }}
              />
            )}
          </div>
        </div>
      </main>
      
      <footer className="gc-footer">
        <span>
          {import.meta.env.VITE_GITHUB_TOKEN 
            ? '🔑 GitHub token loaded (5000 req/hr)' 
            : '💡 Create .env.local with VITE_GITHUB_TOKEN=ghp_xxxx for higher rate limits (60/hr → 5000/hr)'}
          {' · '}
          <strong>API requests this session: {apiRequestCount}</strong>
        </span>
        <span>
          <a href="https://docs.github.com/en/rest/markdown" target="_blank" rel="noopener">
            GitHub Markdown API Docs ↗
          </a>
        </span>
      </footer>
    </div>
  );
}
