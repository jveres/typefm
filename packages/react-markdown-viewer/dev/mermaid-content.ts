/**
 * Sample markdown content with Mermaid diagrams.
 * Demonstrates post-render diagram rendering with theme support.
 */

export const mermaidContent = `# Mermaid Diagrams

Mermaid code blocks are rendered as diagrams after the markdown is parsed.
They respond to **light/dark theme** changes automatically.

---

## Flowchart

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant Hook
    participant Mermaid

    User->>App: Renders markdown
    App->>Hook: onCodeBlock({ code, language })
    Hook->>Hook: Check if language === 'mermaid'
    Hook->>Mermaid: Render diagram
    Mermaid-->>App: SVG output
    App-->>User: Display diagram
\`\`\`

## State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Streaming: Start
    Streaming --> Streaming: Chunk received
    Streaming --> Complete: End stream
    Complete --> Idle: Reset
    Complete --> [*]
\`\`\`

## Class Diagram

\`\`\`mermaid
classDiagram
    class MarkdownViewer {
        +text: string
        +isStreaming: boolean
        +hooks?: RenderHooks
        +render()
    }
    class RenderHooks {
        +onCodeBlock()
        +onMath()
        +onLink()
        +onRender()
    }
    MarkdownViewer --> RenderHooks: uses
\`\`\`

## Pie Chart

\`\`\`mermaid
pie title Hook Return Types
    "String (fast)" : 70
    "JSX (convenient)" : 20
    "null (default)" : 10
\`\`\`

---

## Mixed Content

Regular code blocks still use **syntax highlighting**:

\`\`\`javascript
function renderMarkdown(source, hooks) {
  if (hooks?.onCodeBlock) {
    const result = hooks.onCodeBlock({ code, language });
    if (result !== null) return result;
  }
  return defaultRenderer(code);
}
\`\`\`

While Mermaid blocks get **diagram rendering**:

\`\`\`mermaid
graph LR
    A[Markdown] --> B[Parser]
    B --> C{Hook?}
    C -->|Yes| D[Custom Render]
    C -->|No| E[Default Render]
\`\`\`
`;
