/**
 * Global type augmentations
 */

/**
 * process.env.NODE_ENV is injected by bundlers (Vite, webpack, esbuild, etc.)
 * and statically replaced at build time, enabling dead-code elimination.
 */
declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test';
  };
};
