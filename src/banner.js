// ==UserScript==
// @name              Touhou.AI | Manga Translator
// @name:zh-CN        Touhou.AI | 图片翻译器
// @namespace         https://github.com/VoileLabs/imgtrans-userscript
// @version           {{version}}
// @description       (WIP) Translate images on Pixiv, Twitter. Userscript version of https://touhou.ai/imgtrans/
// @description:zh-CN (WIP) 一键翻译 Pixiv、Twitter 的图片，https://touhou.ai/imgtrans/ 的用户脚本版本。
// @author            QiroNT
// @license           MIT
// @contributionURL   https://ko-fi.com/voilelabs
// @supportURL        https://github.com/VoileLabs/imgtrans-userscript/issues
// @source            https://github.com/VoileLabs/imgtrans-userscript
// @require https://cdn.jsdelivr.net/combine/npm/vue@{{versionVue}}/dist/vue.runtime.global.prod.js,npm/@vueuse/shared@{{versionVueuseShared}}/index.iife.min.js,npm/@vueuse/core@{{versionVueuseCore}}/index.iife.min.js
// @require https://cdn.jsdelivr.net/gh/VoileLabs/imgtrans-userscript@{{wasmCommit}}/wasm_bg.js
// @resource wasm https://cdn.jsdelivr.net/gh/VoileLabs/imgtrans-userscript@{{wasmCommit}}/wasm_bg.wasm
// @include http*://www.pixiv.net/*
// @match http://www.pixiv.net/
// @include http*://twitter.com/*
// @match http://twitter.com/
// @connect i.pximg.net
// @connect i-f.pximg.net
// @connect i-cf.pximg.net
// @connect pbs.twimg.com
// @connect touhou.ai
// @grant GM.xmlHttpRequest
// @grant GM_xmlhttpRequest
// @grant GM.setValue
// @grant GM_setValue
// @grant GM.getValue
// @grant GM_getValue
// @grant GM.deleteValue
// @grant GM_deleteValue
// @grant GM.addValueChangeListener
// @grant GM_addValueChangeListener
// @grant GM.removeValueChangeListener
// @grant GM_removeValueChangeListener
// @grant GM.getResourceUrl
// @grant GM_getResourceURL
// @grant window.onurlchange
// @run-at document-end
// ==/UserScript==

// {{license}}

/* eslint-disable no-undef */
var GMP
{
  // polyfill functions
  const GMPFunctionMap = {
    xmlHttpRequest: typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : undefined,
    setValue: typeof GM_setValue !== 'undefined' ? GM_setValue : undefined,
    getValue: typeof GM_getValue !== 'undefined' ? GM_getValue : undefined,
    deleteValue: typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : undefined,
    addValueChangeListener: typeof GM_addValueChangeListener !== 'undefined' ? GM_addValueChangeListener : undefined,
    removeValueChangeListener:
      typeof GM_removeValueChangeListener !== 'undefined' ? GM_removeValueChangeListener : undefined,
    getResourceUrl: typeof GM_getResourceURL !== 'undefined' ? GM_getResourceURL : undefined,
  }
  const xmlHttpRequest = GM.xmlHttpRequest.bind(GM) || GMPFunctionMap.xmlHttpRequest
  GMP = new Proxy(GM, {
    get(target, prop) {
      if (prop === 'xmlHttpRequest') {
        return (context) => {
          return new Promise((resolve, reject) => {
            xmlHttpRequest({
              ...context,
              onload(event) {
                context.onload?.()
                resolve(event)
              },
              onerror(event) {
                context.onerror?.()
                reject(event)
              },
            })
          })
        }
      }
      if (prop in target) {
        const v = target[prop]
        return typeof v === 'function' ? v.bind(target) : v
      }
      if (prop in GMPFunctionMap && typeof GMPFunctionMap[prop] === 'function') {
        return GMPFunctionMap[prop]
      }
      console.error(
        `[Touhou.AI | Manga Translator] GM.${prop} isn't supported in your userscript engine and it's required by this script. This may lead to unexpected behavior.`
      )
    },
  })
}
