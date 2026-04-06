/**
 * Sample content that exercises async-loaded resources:
 * - Multiple syntax highlighting languages (dynamic imports)
 * - KaTeX math (inline + display)
 */
export const deferredContent = `# Deferred Loading Test

Content below depends on **dynamically loaded** resources.
Code blocks start unhighlighted and math shows as placeholders
until their respective modules finish loading.

---

## Code Blocks (syntax highlighting)

### JavaScript

\`\`\`javascript
async function fetchUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}
\`\`\`

### Python

\`\`\`python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

    def distance(self, other: "Point") -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5
\`\`\`

### CSS

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  container-type: inline-size;
}

@container (min-width: 500px) {
  .card { flex-direction: row; }
}
\`\`\`

### Rust

\`\`\`rust
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let (mut a, mut b) = (0u64, 1u64);
            for _ in 2..=n {
                (a, b) = (b, a + b);
            }
            b
        }
    }
}
\`\`\`

### TypeScript

\`\`\`typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
\`\`\`

---

## Mathematics (KaTeX)

### Inline Math

The quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ gives us the roots of $ax^2 + bx + c = 0$.

Euler's identity $e^{i\\pi} + 1 = 0$ links five fundamental constants.

### Display Math

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

$$
\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}
$$

$$
\\mathbf{A} = \\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
$$

---

## Mixed Content

| Language | Typing | GC | Use Case |
|----------|--------|----|----------|
| JavaScript | Dynamic | Yes | Web / Node |
| Rust | Static | No | Systems |
| Python | Dynamic | Yes | ML / Scripts |

> **Note:** Watch the code blocks and math above — they should transition
> from unhighlighted/placeholder state to fully rendered as modules load.
`;
