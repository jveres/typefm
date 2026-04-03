export const sampleMarkdown = `# Markdown Viewer Showcase

A comprehensive demonstration of all supported markdown features, edge cases, and rendering capabilities.

---

## Typography & Text Formatting

### Basic Formatting

This is regular paragraph text. It can contain **bold text**, *italic text*, ***bold and italic***, ~~strikethrough~~, and \`inline code\`. Combined styles work too: ~~**strikethrough and bold**~~, ~~*strikethrough and italic*~~.

### Special Characters & Escaping

Escape special characters: \\*asterisks\\*, \\\`backticks\\\`, \\[brackets\\], \\#hashtags

Unicode support: café, naïve, 日本語, العربية, 中文, Ελληνικά, עברית

Emojis: 🚀 🎉 ✨ 💡 🔥 ⚡ 🎯 🌟 💻 🔧

Symbols: © ® ™ § ¶ † ‡ • ° ± × ÷ ≠ ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ ∇

---

## Headings

# Heading 1 - The Main Title
## Heading 2 - Major Section
### Heading 3 - Subsection
#### Heading 4 - Minor Section
##### Heading 5 - Detail Level
###### Heading 6 - Smallest Heading

---

## Lists

### Unordered Lists

- First level item
- Another first level item
  - Second level nested
  - Another nested item
    - Third level deep
    - Even deeper nesting
      - Fourth level
  - Back to second level
- Back to first level

### Ordered Lists

1. First item
2. Second item
3. Third item
   1. Nested ordered item
   2. Another nested item
      1. Deep nested
      2. Another deep nested
   3. Back to first nesting
4. Fourth item

### Task Lists

- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Yet another todo
  - [x] Nested completed
  - [ ] Nested incomplete

---

## Links & References

### Inline Links

Visit [Google](https://www.google.com) for search.

Link with title: [GitHub](https://github.com "The world's leading software development platform")

### Auto-links

Direct URL: https://www.example.com

Email: user@example.com

---

## Images

![Placeholder Image](https://placehold.co/400x200/3498db/ffffff?text=Sample+Image)

![Small badge](https://img.shields.io/badge/markdown-viewer-blue)

---

## Blockquotes

> Simple single-line blockquote.

> Multi-line blockquote with content.
> This continues on the next line.
> And another line here.

> **Nested blockquotes:**
>
> > This is nested inside.
> >
> > > And this is even deeper.

---

## Code

### Inline Code

Use \`console.log()\` to debug. The \`Array.prototype.map()\` method creates a new array. Paths like \`/usr/local/bin\` and commands like \`npm install\` should be monospaced.

### Fenced Code Blocks

#### JavaScript

\`\`\`javascript
// JavaScript ES6+ features showcase
class DataProcessor {
  #privateField = 'secret';
  
  constructor(options = {}) {
    this.options = { ...options };
    this.data = [];
  }

  async fetchData(url) {
    try {
      const response = await fetch(url);
      const json = await response.json();
      this.data = json.results ?? [];
      return this.data;
    } catch (error) {
      console.error('Fetch failed:', error.message);
      throw error;
    }
  }

  process = (transformer) => {
    return this.data
      .filter(Boolean)
      .map(transformer)
      .reduce((acc, val) => [...acc, val], []);
  };
}

// Usage with async/await
const processor = new DataProcessor({ debug: true });
const results = await processor.fetchData('https://api.example.com/data');
console.log(\`Processed \${results.length} items\`);
\`\`\`

#### TypeScript

\`\`\`typescript
// TypeScript with advanced types
interface User<T extends Record<string, unknown> = {}> {
  id: string;
  email: string;
  metadata: T;
  createdAt: Date;
}

type UserRole = 'admin' | 'editor' | 'viewer';

function createUser<T extends Record<string, unknown>>(
  email: string,
  metadata?: T
): User<T> {
  return {
    id: crypto.randomUUID(),
    email,
    metadata: metadata ?? ({} as T),
    createdAt: new Date(),
  };
}
\`\`\`

#### Python

\`\`\`python
#!/usr/bin/env python3
"""Advanced Python showcase with type hints."""

from dataclasses import dataclass, field
from typing import TypeVar, Generic, Callable

T = TypeVar('T')
R = TypeVar('R')

@dataclass
class Result(Generic[T]):
    """A Result type for error handling."""
    value: T | None = None
    error: str | None = None
    
    @property
    def is_ok(self) -> bool:
        return self.error is None
    
    def map(self, fn: Callable[[T], R]) -> 'Result[R]':
        if self.is_ok and self.value is not None:
            return Result(value=fn(self.value))
        return Result(error=self.error)

# Generator with walrus operator
def find_primes(limit: int):
    """Generate prime numbers up to limit."""
    sieve = [True] * (limit + 1)
    for num in range(2, int(limit ** 0.5) + 1):
        if sieve[num]:
            yield num
            for multiple in range(num * num, limit + 1, num):
                sieve[multiple] = False
\`\`\`

---

## Tables

### Simple Table

| Name    | Age | City        |
|---------|-----|-------------|
| Alice   | 28  | New York    |
| Bob     | 34  | Los Angeles |
| Charlie | 22  | Chicago     |

### Aligned Table

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Data         |      Data      |          Data |
| More data    |   More data    |     More data |

### Complex Table

| Feature | Free | Pro | Enterprise |
|:--------|:----:|:---:|:----------:|
| Users | 5 | 50 | Unlimited |
| Storage | 1 GB | 100 GB | 1 TB |
| API Calls | 1,000/day | 100,000/day | Unlimited |
| Support | Community | Email | 24/7 Phone |
| SSO | ❌ | ✅ | ✅ |

---

## Mathematics (KaTeX)

### Inline Math

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ which gives the roots of $ax^2 + bx + c = 0$.

Einstein's famous equation $E = mc^2$ relates energy and mass.

### Block Math

The Gaussian integral:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Euler's identity:

$$
e^{i\\pi} + 1 = 0
$$

Matrix notation:

$$
\\mathbf{A} = \\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
$$

---

## Alerts / Admonitions

> [!NOTE]
> This is a note callout. Use it for additional information that readers might find helpful.

> [!TIP]
> This is a tip callout. Share best practices and helpful suggestions here.

> [!IMPORTANT]
> This is an important callout. Highlight crucial information that readers shouldn't miss.

> [!WARNING]
> This is a warning callout. Alert readers about potential issues or pitfalls.

> [!CAUTION]
> This is a caution callout. Warn about dangerous or destructive actions.

---

## Colors

The parser automatically detects color codes and displays visual color previews.

### Hex Colors

Inline colors: \`#ff0000\` \`#00ff00\` \`#0000ff\` \`#ffcc00\` \`#9b59b6\`

Short hex: \`#f00\` \`#0f0\` \`#00f\` \`#fc0\`

With alpha: \`#ff000080\` \`#00ff0080\` \`#0000ff80\`

### RGB/RGBA Colors

Standard RGB: \`rgb(255, 99, 71)\` \`rgb(60, 179, 113)\` \`rgb(106, 90, 205)\`

With alpha: \`rgba(255, 99, 71, 0.5)\` \`rgba(60, 179, 113, 0.7)\` \`rgba(0, 0, 0, 0.8)\`

### HSL/HSLA Colors

HSL format: \`hsl(0, 100%, 50%)\` \`hsl(120, 100%, 50%)\` \`hsl(240, 100%, 50%)\`

With alpha: \`hsla(0, 100%, 50%, 0.5)\` \`hsla(120, 60%, 50%, 0.7)\`

### Colors in Code Blocks

\`\`\`css
:root {
  --primary: #3498db;
  --secondary: #2ecc71;
  --accent: #e74c3c;
  --background: rgb(248, 249, 250);
  --text: rgba(0, 0, 0, 0.87);
  --shadow: hsla(0, 0%, 0%, 0.1);
}

.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 1px solid #5a67d8;
  color: #ffffff;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
}

.dark-theme {
  --bg: #1a1a2e;
  --surface: #16213e;
  --primary: #0f3460;
  --accent: #e94560;
}
\`\`\`

---

## Conclusion

This showcase demonstrates the full range of markdown capabilities supported by the viewer.

**Features Tested:**
- ✅ Text formatting (bold, italic, strikethrough, code)
- ✅ All heading levels
- ✅ Ordered, unordered, and task lists
- ✅ Links (inline, reference, auto-links)
- ✅ Images
- ✅ Blockquotes with nesting
- ✅ Fenced code blocks with syntax highlighting
- ✅ Tables with alignment
- ✅ KaTeX math (inline and block)
- ✅ GitHub-style alerts
- ✅ Color previews (hex, rgb, hsl)

---

*Generated for react-markdown-viewer testing and demonstration purposes.*
`;

// AI Chat responses - simulates assistant messages
export const chatResponses = [
  `**TypeScript** is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.

## Key Benefits

1. **Type Safety** - Catch errors at compile time rather than runtime
2. **Better IDE Support** - Autocompletion, refactoring, and inline documentation
3. **Self-Documenting Code** - Types serve as documentation
4. **Easier Refactoring** - The compiler catches breaking changes

\`\`\`typescript
// Example: Type safety in action
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

greet("World"); // ✅ OK
greet(42);      // ❌ Error: Argument of type 'number' is not assignable
\`\`\``,

  `Here's an example of TypeScript interfaces:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
  readonly createdAt: Date; // Read-only property
}

interface Admin extends User {
  permissions: string[];
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  createdAt: new Date()
};
\`\`\`

Interfaces can also describe function types:

\`\`\`typescript
interface SearchFunc {
  (source: string, subString: string): boolean;
}

const mySearch: SearchFunc = (src, sub) => src.includes(sub);
\`\`\``,

  `## Generics in TypeScript

Generics allow you to write reusable, type-safe code:

\`\`\`typescript
// Generic function
function identity<T>(arg: T): T {
  return arg;
}

// Usage - type is inferred
const num = identity(42);      // num: number
const str = identity("hello"); // str: string

// Generic interface
interface Box<T> {
  value: T;
  getValue(): T;
}

// Generic class
class Container<T> {
  private items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
  
  get(index: number): T {
    return this.items[index];
  }
}

// Generic constraints
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
\`\`\``,

  `## The Quadratic Formula

The **quadratic formula** solves any equation of the form $ax^2 + bx + c = 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

### Components

| Part | Meaning |
|------|---------|
| $a, b, c$ | Coefficients of the quadratic |
| $b^2 - 4ac$ | **Discriminant** - determines number of solutions |
| $\\pm$ | Gives two solutions (roots) |

### Discriminant Cases

- If $b^2 - 4ac > 0$: Two distinct real roots
- If $b^2 - 4ac = 0$: One repeated real root  
- If $b^2 - 4ac < 0$: Two complex conjugate roots

### Example

For $2x^2 + 5x - 3 = 0$:

$$x = \\frac{-5 \\pm \\sqrt{25 + 24}}{4} = \\frac{-5 \\pm 7}{4}$$

So $x = \\frac{1}{2}$ or $x = -3$`,

  `## Euler's Identity

Often called the "most beautiful equation in mathematics":

$$e^{i\\pi} + 1 = 0$$

This elegant formula connects **five fundamental constants**:

| Constant | Meaning |
|----------|---------|
| $e$ | Euler's number ($\\approx 2.71828$) |
| $i$ | Imaginary unit ($\\sqrt{-1}$) |
| $\\pi$ | Pi ($\\approx 3.14159$) |
| $1$ | Multiplicative identity |
| $0$ | Additive identity |

### Derivation from Euler's Formula

Euler's formula states:

$$e^{ix} = \\cos(x) + i\\sin(x)$$

When $x = \\pi$:

$$e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi) = -1 + 0i = -1$$

Therefore: $e^{i\\pi} + 1 = 0$ ✨`,

  `## Matrix Multiplication

For matrices $A$ (size $m \\times n$) and $B$ (size $n \\times p$), the product $C = AB$ has size $m \\times p$.

Each element $c_{ij}$ is computed as:

$$c_{ij} = \\sum_{k=1}^{n} a_{ik} \\cdot b_{kj}$$

### Example

$$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\times \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\\\ 43 & 50 \\end{pmatrix}$$

**Calculation:**
- $c_{11} = 1 \\cdot 5 + 2 \\cdot 7 = 19$
- $c_{12} = 1 \\cdot 6 + 2 \\cdot 8 = 22$
- $c_{21} = 3 \\cdot 5 + 4 \\cdot 7 = 43$
- $c_{22} = 3 \\cdot 6 + 4 \\cdot 8 = 50$

### Key Properties

- **Not commutative**: $AB \\neq BA$ in general
- **Associative**: $(AB)C = A(BC)$
- **Distributive**: $A(B + C) = AB + AC$`,

  `## \`type\` vs \`interface\`

| Feature | \`interface\` | \`type\` |
|---------|-------------|---------|
| Extend/Inherit | ✅ \`extends\` | ✅ \`&\` intersection |
| Declaration merging | ✅ Yes | ❌ No |
| Computed properties | ❌ No | ✅ Yes |
| Union types | ❌ No | ✅ Yes |
| Mapped types | ❌ No | ✅ Yes |

\`\`\`typescript
// Interface - can be extended and merged
interface Animal {
  name: string;
}
interface Animal {
  age: number; // Declaration merging
}

// Type - more flexible
type ID = string | number; // Union
type Point = { x: number; y: number };
type Coordinate = Point & { z: number }; // Intersection
\`\`\`

**Rule of thumb:** Use \`interface\` for object shapes, \`type\` for everything else.`,

  `## Handling \`null\` and \`undefined\`

TypeScript provides several ways to handle nullable values:

\`\`\`typescript
// Strict null checks (enable in tsconfig)
let name: string | null = null;

// Optional chaining
const length = name?.length; // number | undefined

// Nullish coalescing
const displayName = name ?? "Anonymous";

// Non-null assertion (use carefully!)
const definitelyName = name!; // Asserts non-null

// Type guard
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

if (isNotNull(name)) {
  console.log(name.toUpperCase()); // name is string here
}
\`\`\``,
];

// Get a random chat response
export function getRandomChatResponse(): string {
  return chatResponses[Math.floor(Math.random() * chatResponses.length)];
}

// Get chat response by index (cycles through)
export function getChatResponse(index: number): string {
  return chatResponses[index % chatResponses.length];
}
