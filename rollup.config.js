import fs from 'fs'
import path from 'path'
import { sync as fgs } from 'fast-glob'
import { defineConfig } from 'rollup'
import { emptyDir } from 'rollup-plugin-empty-dir'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import icons from 'unplugin-icons/rollup'
import yaml from '@rollup/plugin-yaml'
import { version, dependencies } from './package.json'

export default defineConfig({
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    entryFileNames: 'imgtrans-userscript.user.js',
    format: 'iife',
    banner: fs
      .readFileSync('src/banner.js', 'utf8')
      .replace(/{{version}}/g, version)
      .replace(/{{versionVue}}/g, dependencies.vue.replace(/^\^/, ''))
      .replace(/{{wasmCommit}}/g, '777037c9b1f6b734d21aa4b074d79aa73e6ba352')
      .replace(
        '// {{license}}',
        fgs(['LICENSE', 'src/**/LICENSE*'], { onlyFiles: true })
          .map((file) => '/**\n' + fs.readFileSync(file, 'utf8') + '\n*/')
          .join('\n\n')
      ),
    globals: {
      vue: 'Vue',
      wasmJsModule: 'wasmJsModule',
    },
  },
  external: ['vue', 'wasmJsModule'],
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
      name: 'patch',
      transform(code, id) {
        if (id === path.resolve(__dirname, './wasm/pkg/wasm.js')) {
          return {
            code: code + '\nexport function setWasm(w){wasm=w;}\n',
          }
        }
      },
    },
  ],
})
