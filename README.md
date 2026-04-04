# typefm

Monorepo for [type.fm](https://type.fm)

## Packages

- **[@typefm/comrak-wasm](packages/comrak-wasm)** — WebAssembly bindings for comrak (CommonMark + GFM markdown parser)
- **[@typefm/react-markdown-viewer](packages/react-markdown-viewer)** — High-performance React component for rendering markdown with streaming support

## Setup

```bash
pnpm install
```

## Development

```bash
# Build WASM
cd packages/comrak-wasm && npm run build

# Run all tests
pnpm -r test
cargo test

# Playground (react-markdown-viewer)
cd packages/react-markdown-viewer && pnpm dev
```

## License

MIT
