/**
 * Generate stress test content for adaptive throttling demonstration
 * Creates complex markdown that requires heavy DOM morphing
 */

// Generate a large table
function generateTable(rows: number, cols: number): string {
  const header = '| ' + Array(cols).fill(0).map((_, i) => `Col ${i + 1}`).join(' | ') + ' |';
  const separator = '| ' + Array(cols).fill('---').join(' | ') + ' |';
  const dataRows = Array(rows).fill(0).map((_, r) => 
    '| ' + Array(cols).fill(0).map((_, c) => `R${r + 1}C${c + 1}`).join(' | ') + ' |'
  ).join('\n');
  
  return `${header}\n${separator}\n${dataRows}`;
}

// Generate nested lists
function generateNestedList(depth: number, itemsPerLevel: number): string {
  function generate(level: number): string {
    if (level > depth) return '';
    const indent = '  '.repeat(level - 1);
    return Array(itemsPerLevel).fill(0).map((_, i) => 
      `${indent}- Level ${level} Item ${i + 1}\n${generate(level + 1)}`
    ).join('');
  }
  return generate(1);
}

// Generate code blocks with syntax
function generateCodeBlocks(count: number): string {
  const languages = ['javascript', 'typescript', 'python', 'rust', 'go'];
  return Array(count).fill(0).map((_, i) => {
    const lang = languages[i % languages.length];
    return `\`\`\`${lang}
// Code block ${i + 1}
function example${i}(param: string): number {
  const result = param.length * ${i + 1};
  console.log(\`Processing: \${param}\`);
  return result;
}

const data = [${Array(5).fill(0).map((_, j) => `"item${j}"`).join(', ')}];
const processed = data.map(example${i});
\`\`\``;
  }).join('\n\n');
}

// Generate math blocks
function generateMathBlocks(count: number): string {
  const formulas = [
    'E = mc^2',
    '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
    '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
    '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}',
    'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi',
  ];
  
  return Array(count).fill(0).map((_, i) => 
    `$$${formulas[i % formulas.length]}$$`
  ).join('\n\n');
}

// Generate blockquotes
function generateBlockquotes(count: number): string {
  return Array(count).fill(0).map((_, i) => 
    `> **Quote ${i + 1}**: This is a blockquote with some *emphasized* text and \`inline code\`.
> It spans multiple lines to create more complex DOM structures.
> - Nested list item 1
> - Nested list item 2`
  ).join('\n\n');
}

/**
 * Generate stress test content with configurable complexity
 */
export function generateStressContent(options: {
  tables?: number;
  tableRows?: number;
  tableCols?: number;
  nestedListDepth?: number;
  nestedListItems?: number;
  codeBlocks?: number;
  mathBlocks?: number;
  blockquotes?: number;
  paragraphs?: number;
} = {}): string {
  const {
    tables = 3,
    tableRows = 10,
    tableCols = 5,
    nestedListDepth = 4,
    nestedListItems = 3,
    codeBlocks = 5,
    mathBlocks = 5,
    blockquotes = 3,
    paragraphs = 10,
  } = options;

  const sections: string[] = [];

  // Title
  sections.push('# Adaptive Throttling Stress Test\n');
  sections.push('This content is designed to stress the DOM morphing system and trigger adaptive throttling.\n');

  // Stats section
  sections.push('## Content Statistics\n');
  sections.push(`- **Tables**: ${tables} (${tableRows}×${tableCols} each)`);
  sections.push(`- **Nested Lists**: depth ${nestedListDepth}, ${nestedListItems} items/level`);
  sections.push(`- **Code Blocks**: ${codeBlocks}`);
  sections.push(`- **Math Blocks**: ${mathBlocks}`);
  sections.push(`- **Blockquotes**: ${blockquotes}`);
  sections.push(`- **Paragraphs**: ${paragraphs}\n`);

  // Tables section
  sections.push('## Tables\n');
  for (let i = 0; i < tables; i++) {
    sections.push(`### Table ${i + 1}\n`);
    sections.push(generateTable(tableRows, tableCols));
    sections.push('');
  }

  // Nested lists
  sections.push('## Nested Lists\n');
  sections.push(generateNestedList(nestedListDepth, nestedListItems));
  sections.push('');

  // Code blocks
  sections.push('## Code Blocks\n');
  sections.push(generateCodeBlocks(codeBlocks));
  sections.push('');

  // Math blocks
  sections.push('## Mathematical Formulas\n');
  sections.push(generateMathBlocks(mathBlocks));
  sections.push('');

  // Blockquotes
  sections.push('## Blockquotes\n');
  sections.push(generateBlockquotes(blockquotes));
  sections.push('');

  // Paragraphs with various formatting
  sections.push('## Mixed Content Paragraphs\n');
  for (let i = 0; i < paragraphs; i++) {
    sections.push(`**Paragraph ${i + 1}**: This is a paragraph with *italic*, **bold**, \`code\`, and [links](https://example.com). It contains enough text to create meaningful DOM changes during streaming. The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n`);
  }

  return sections.join('\n');
}

/**
 * Preset configurations for different stress levels
 */
export const STRESS_PRESETS = {
  light: {
    tables: 1,
    tableRows: 5,
    tableCols: 3,
    nestedListDepth: 2,
    nestedListItems: 2,
    codeBlocks: 2,
    mathBlocks: 2,
    blockquotes: 1,
    paragraphs: 5,
  },
  medium: {
    tables: 2,
    tableRows: 10,
    tableCols: 5,
    nestedListDepth: 3,
    nestedListItems: 3,
    codeBlocks: 4,
    mathBlocks: 4,
    blockquotes: 2,
    paragraphs: 10,
  },
  heavy: {
    tables: 4,
    tableRows: 15,
    tableCols: 6,
    nestedListDepth: 4,
    nestedListItems: 4,
    codeBlocks: 8,
    mathBlocks: 6,
    blockquotes: 4,
    paragraphs: 20,
  },
  extreme: {
    tables: 10,
    tableRows: 25,
    tableCols: 10,
    nestedListDepth: 6,
    nestedListItems: 5,
    codeBlocks: 20,
    mathBlocks: 15,
    blockquotes: 10,
    paragraphs: 50,
  },
} as const;

export type StressPreset = keyof typeof STRESS_PRESETS;
