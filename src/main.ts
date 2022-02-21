import { effectScope, EffectScope, onScopeDispose } from 'vue'
import { checkCSS } from './style'
import { changeLangEl } from './i18n'
import pixiv from './pixiv'
import pixivSettings from './pixiv/settings'
import twitter from './twitter'
import twitterSettings from './twitter/settings'
import init from '../wasm/pkg/wasm'
// @ts-ignore
import { setWasm } from '../wasm/pkg/wasm'
// @ts-ignore
import wasmJsModule from 'wasmJsModule'

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

async function initWasm() {
  const uri = await GMP.getResourceUrl('wasm')
  try {
    if (/^data:.+;base64,/.test(uri)) {
      const data = window.atob(uri.split(';base64,', 2)[1])
      const buffer = new Uint8Array(data.length)
      for (let i = 0; i < data.length; i++) {
        buffer[i] = data.charCodeAt(i)
      }
      await init(buffer)
    } else {
      await init(uri)
    }
  } catch (e) {
    setWasm(wasmJsModule)
  }
}

Promise.allSettled =
  Promise.allSettled ||
  ((promises: Promise<never>[]) =>
    Promise.all(
      promises.map((p) =>
        p
          .then((value) => ({
            status: 'fulfilled',
            value,
          }))
          .catch((reason) => ({
            status: 'rejected',
            reason,
          }))
      )
    ))

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
Promise.allSettled([initWasm()]).then((results) => {
  for (const result of results) {
    if (result.status === 'rejected') console.warn(result.reason)
  }
  const installObserver = new MutationObserver(onUpdate)
  installObserver.observe(document.body, { childList: true, subtree: true })
  onUpdate()
})
