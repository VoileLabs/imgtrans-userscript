import fs from 'fs'
import { sync as fgs } from 'fast-glob'
import { defineConfig } from 'rollup'
import { emptyDir } from 'rollup-plugin-empty-dir'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import icons from 'unplugin-icons/rollup'
import yaml from '@rollup/plugin-yaml'
import { version } from './package.json'

export default defineConfig({
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    entryFileNames: 'imgtrans-userscript.user.js',
    format: 'iife',
    banner:
      fs.readFileSync('src/banner.js', 'utf8').replace('{{version}}', version) +
      '\n' +
      fgs(['LICENSE', 'src/**/LICENSE*'], { onlyFiles: true })
        .map((file) => '/**\n' + fs.readFileSync(file, 'utf8') + '\n*/')
        .join('\n\n') +
      '\n',
    globals: {
      vue: 'Vue',
    },
  },
  external: ['vue'],
  plugins: [
    emptyDir(),
    nodeResolve(),
    commonjs(),
    typescript(),
    icons({
      compiler: 'vue3',
    }),
    yaml(),
    {
      name: 'wasm-loader',
      load(id) {
        if (!/\.wasm$/.test(id)) {
          return null
        }
        return `// The wasm source code can be found at https://github.com/VoileLabs/imgtrans-userscript/tree/v${version}/wasm
export default '${Buffer.from(fs.readFileSync(id), 'binary').toString('base64')}'`
      },
    },
  ],
})
