import wasmModule from '../wasm/pkg/wasm_bg.wasm'
import { effectScope, EffectScope, onScopeDispose } from 'vue'
import { checkCSS } from './style'
import { changeLangEl } from './i18n'
import pixiv from './pixiv'
import pixivSettings from './pixiv/settings'
import twitter from './twitter'
import twitterSettings from './twitter/settings'
import init from '../wasm/pkg/wasm'

export interface Translator {
  canKeep?: (url: string) => boolean | null | undefined
  stop?: () => void
}

export interface SettingsInjector {
  canKeep?: (url: string) => boolean | null | undefined
  stop?: () => void
}

interface ScopedInstance<T extends Translator | SettingsInjector> {
  scope: EffectScope
  i: T
}

function createScopedInstance<T extends Translator | SettingsInjector>(cb: () => T): ScopedInstance<T> {
  const scope = effectScope()
  const i = scope.run(cb)!
  scope.run(() => {
    onScopeDispose(() => {
      i.stop?.()
    })
  })
  return { scope, i }
}

function decodeWasm(encoded: string) {
  var binaryString = window.atob(encoded)
  var bytes = new Uint8Array(binaryString.length)
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

let currentURL: string | undefined
let translator: ScopedInstance<Translator> | undefined
let settingsInjector: ScopedInstance<SettingsInjector> | undefined
const onUpdate = () => {
  if (currentURL !== location.href) {
    currentURL = location.href

    // there is a navigation in the page

    /* ensure css is loaded */
    checkCSS()

    /* update i18n element */
    changeLangEl(document.documentElement as HTMLHtmlElement)

    /* update translator */
    // only if the translator needs to be updated
    if (!translator?.i.canKeep?.(currentURL)) {
      // unmount previous translator
      translator?.scope.stop()
      translator = undefined

      // check if the page is a image page
      const url = new URL(location.href)
      // https://www.pixiv.net/(en/)artworks/<id>
      if (url.hostname.endsWith('pixiv.net') && url.pathname.match(/\/artworks\//)) {
        translator = createScopedInstance(pixiv)
      }
      // https://twitter.com/<user>/status/<id>
      else if (url.hostname.endsWith('twitter.com') && url.pathname.match(/\/status\//)) {
        translator = createScopedInstance(twitter)
      }
    }

    /* update settings page */
    if (!settingsInjector?.i.canKeep?.(currentURL)) {
      // unmount previous settings injector
      settingsInjector?.scope.stop()
      settingsInjector = undefined

      // check if the page is a settings page
      const url = new URL(location.href)
      // https://www.pixiv.net/setting_user.php
      if (url.hostname.endsWith('pixiv.net') && url.pathname.match(/\/setting_user\.php/)) {
        settingsInjector = createScopedInstance(pixivSettings)
      }
      // https://twitter.com/settings/<tab>
      if (url.hostname.endsWith('twitter.com') && url.pathname.match(/\/settings\//)) {
        settingsInjector = createScopedInstance(twitterSettings)
      }
    }
  }
}
init(decodeWasm(wasmModule as unknown as string)).then(() => {
  const installObserver = new MutationObserver(onUpdate)
  installObserver.observe(document.body, { childList: true, subtree: true })
  onUpdate()
})
