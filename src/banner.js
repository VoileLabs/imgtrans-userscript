// ==UserScript==
// @name         Touhou.AI | Manga Translator
// @name:zh-CN   Touhou.AI | 图片翻译器
// @namespace    https://github.com/VoileLabs/imgtrans-userscript
// @version      {{version}}
// @description  (WIP) Userscript for https://touhou.ai/imgtrans/, translate images on Pixiv, Twitter.
// @description:zh-CN (WIP) https://touhou.ai/imgtrans/ 的用户脚本版本，一键翻译 Pixiv、Twitter 的图片
// @author       QiroNT
// @license      MIT
// @supportURL   https://github.com/VoileLabs/imgtrans-userscript/issues
// @require      https://unpkg.com/vue@3.2.31/dist/vue.runtime.global.prod.js
// @include      http*://www.pixiv.net/*
// @match        http://www.pixiv.net/
// @include      http*://twitter.com/*
// @match        http://twitter.com/
// @connect      i.pximg.net
// @connect      i-f.pximg.net
// @connect      i-cf.pximg.net
// @connect      pbs.twimg.com
// @connect      touhou.ai
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlHttpRequest
// @grant        GM.setValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM_getValue
// @grant        GM.deleteValue
// @grant        GM_deleteValue
// @grant        GM.addValueChangeListener
// @grant        GM_addValueChangeListener
// @grant        GM.removeValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-end
// ==/UserScript==
