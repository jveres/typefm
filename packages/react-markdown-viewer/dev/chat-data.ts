export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const USER_MESSAGES = [
  "What is TypeScript and why should I use it?",
  "Can you show me an example of TypeScript interfaces?",
  "How do generics work in TypeScript?",
  "What's the difference between `type` and `interface`?",
  "Explain the quadratic formula",
  "What is Euler's identity?",
  "How does matrix multiplication work?",
  "What are mapped types in TypeScript?",
];

const ASSISTANT_RESPONSES = [
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
\`\`\``,

  `## \`type\` vs \`interface\`

| Feature | \`interface\` | \`type\` |
|---------|-------------|---------|
| Extend/Inherit | ✅ \`extends\` | ✅ \`&\` intersection |
| Declaration merging | ✅ Yes | ❌ No |
| Computed properties | ❌ No | ✅ Yes |
| Union types | ❌ No | ✅ Yes |

\`\`\`typescript
// Interface - can be extended and merged
interface Animal {
  name: string;
}

// Type - more flexible
type ID = string | number; // Union
type Point = { x: number; y: number };
type Coordinate = Point & { z: number }; // Intersection
\`\`\`

**Rule of thumb:** Use \`interface\` for object shapes, \`type\` for everything else.`,

  `## The Quadratic Formula

The **quadratic formula** solves any equation of the form $ax^2 + bx + c = 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

### Components

| Part | Meaning |
|------|---------|
| $a, b, c$ | Coefficients of the quadratic |
| $b^2 - 4ac$ | **Discriminant** - determines number of solutions |
| $\\pm$ | Gives two solutions (roots) |

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
- $c_{22} = 3 \\cdot 6 + 4 \\cdot 8 = 50$`,

  `## Mapped Types

Mapped types transform existing types:

\`\`\`typescript
// Built-in mapped types
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// Custom mapped type
type Nullable<T> = { [P in keyof T]: T[P] | null };

interface User {
  name: string;
  age: number;
}

type NullableUser = Nullable<User>;
// { name: string | null; age: number | null }

// Key remapping (TS 4.1+)
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K]
};
\`\`\``,
];

export function generateChatMessages(count: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const pairs = Math.min(Math.floor(count / 2), USER_MESSAGES.length);
  
  for (let i = 0; i < pairs; i++) {
    messages.push({
      id: i * 2,
      role: 'user',
      content: USER_MESSAGES[i],
    });
    messages.push({
      id: i * 2 + 1,
      role: 'assistant',
      content: ASSISTANT_RESPONSES[i],
    });
  }
  
  return messages;
}
