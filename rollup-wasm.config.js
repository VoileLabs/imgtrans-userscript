import { defineConfig } from 'rollup'
import { minify } from 'rollup-plugin-esbuild'

export default defineConfig({
  input: 'wasm/pkg/wasm_bg.js',
  output: {
    dir: 'dist',
    entryFileNames: 'wasm_bg.js',
    format: 'iife',
    name: 'wasmJsModule',
  },
  plugins: [minify()],
})
