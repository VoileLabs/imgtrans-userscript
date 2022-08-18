import fs from 'fs'
import path from 'path'
import { sync as fgs } from 'fast-glob'
import MagicString from 'magic-string'
import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import icons from 'unplugin-icons/rollup'
import yaml from '@rollup/plugin-yaml'
import { dependencies, version } from './package.json'

function gennerateConfig(input, output, banner) {
  return defineConfig({
    input,
    output: {
      dir: 'dist',
      entryFileNames: output,
      format: 'iife',
      banner: fs
        .readFileSync(banner, 'utf8')
        .replace(/{{version}}/g, version)
        .replace(/{{versionVue}}/g, dependencies.vue.replace(/^\^/, ''))
        .replace(/{{versionVueuseShared}}/g, dependencies['@vueuse/shared'].replace(/^\^/, ''))
        .replace(/{{versionVueuseCore}}/g, dependencies['@vueuse/core'].replace(/^\^/, ''))
        .replace(/{{wasmCommit}}/g, '40fc71c9589935551ca3f98842b7531f005589e5')
        .replace('// {{license}}',
          fgs(['LICENSE', 'src/**/LICENSE*'], { onlyFiles: true })
            .map(file => `/**\n${fs.readFileSync(file, 'utf8').trim()}\n*/`)
            .join('\n\n')),
      globals: {
        'vue': 'Vue',
        '@vueuse/shared': 'VueUse',
        '@vueuse/core': 'VueUse',
      },
    },
    external: ['vue', '@vueuse/shared', '@vueuse/core'],
    plugins: [
      nodeResolve(),
      commonjs(),
      esbuild({
        charset: 'utf8',
      }),
      icons({
        compiler: 'vue3',
      }),
      yaml(),
      {
        name: 'wasm-patch',
        transform: {
          order: 'pre',
          handler(code, id) {
            if (id === path.resolve(__dirname, './wasm/pkg/wasm.js')) {
              const s = new MagicString(code)
              s.append('\nexport function setWasm(w){wasm=w;}\n')
              return {
                code: s.toString(),
                map: s.generateMap({ hires: true }),
              }
            }
          },
        },
      },
    ],
  })
}

export default [
  gennerateConfig('src/main-regular.ts', 'imgtrans-userscript.user.js', 'src/banner-regular.js'),
  gennerateConfig('src/main-nsfw.ts', 'imgtrans-userscript-nsfw.user.js', 'src/banner-nsfw.js'),
]
