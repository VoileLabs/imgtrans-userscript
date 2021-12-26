import fs from 'fs'
import { defineConfig } from 'rollup'
import { emptyDir } from 'rollup-plugin-empty-dir'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    entryFileNames: 'imgtrans-userscript.user.js',
    format: 'cjs',
    banner: fs.readFileSync('src/banner.js', 'utf8'),
  },
  plugins: [emptyDir(), typescript()]
})
