import fs from 'fs'
import { sync as fgs } from 'fast-glob'
import { defineConfig } from 'rollup'
import { emptyDir } from 'rollup-plugin-empty-dir'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    entryFileNames: 'imgtrans-userscript.user.js',
    format: 'cjs',
    banner:
      fs.readFileSync('src/banner.js', 'utf8') +
      '\n' +
      fgs(['LICENSE', 'src/**/LICENSE*', 'node_modules/@rgba-image/lanczos/**/LICENSE'], { onlyFiles: true })
        .map((file) => '/**\n' + fs.readFileSync(file, 'utf8') + '\n*/')
        .join('\n\n') +
      '\n',
  },
  plugins: [emptyDir(), nodeResolve(), commonjs(), typescript()],
})
