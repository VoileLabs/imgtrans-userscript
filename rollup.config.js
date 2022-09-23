import fs from 'fs'
import { sync as fgs } from 'fast-glob'
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
      yaml(),
      icons({
        compiler: 'vue3',
      }),
      esbuild({
        charset: 'utf8',
      }),
    ],
  })
}

export default [
  gennerateConfig('src/main-regular.ts', 'imgtrans-userscript.user.js', 'src/banner-regular.js'),
  gennerateConfig('src/main-nsfw.ts', 'imgtrans-userscript-nsfw.user.js', 'src/banner-nsfw.js'),
]
