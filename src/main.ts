import type { EffectScope } from 'vue'
import { effectScope, onScopeDispose } from 'vue'
import { useThrottleFn } from '@vueuse/shared'
import { checkCSS } from './style'
import { changeLangEl } from './i18n'
import { storageReady } from './composables/storage'

export interface TranslatorInstance {
  canKeep?: (url: string) => unknown
  stop?: () => void
}
export interface Translator {
  match: (url: URL) => unknown
  mount: () => TranslatorInstance
}

export interface SettingsInjectorInstance {
  canKeep?: (url: string) => unknown
  stop?: () => void
}
export interface SettingsInjector {
  match: (url: URL) => unknown
  mount: () => SettingsInjectorInstance
}

interface ScopedInstance<T extends TranslatorInstance | SettingsInjectorInstance> {
  scope: EffectScope
  i: T
}

function createScopedInstance<T extends TranslatorInstance | SettingsInjectorInstance>(cb: () => T): ScopedInstance<T> {
  const scope = effectScope()
  const i = scope.run(cb)!
  scope.run(() => {
    onScopeDispose(() => {
      i.stop?.()
    })
  })
  return { scope, i }
}

let currentURL: string | undefined
let translator: ScopedInstance<TranslatorInstance> | undefined
let settingsInjector: ScopedInstance<SettingsInjectorInstance> | undefined

export async function start(translators: Translator[], settingsInjectors: SettingsInjector[]) {
  await storageReady

  function onUpdate() {
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

        // find the first translator that matches the url
        const matched = translators.find(t => t.match(url))
        if (matched)
          translator = createScopedInstance(matched.mount)
      }

      /* update settings page */
      if (!settingsInjector?.i.canKeep?.(currentURL)) {
        // unmount previous settings injector
        settingsInjector?.scope.stop()
        settingsInjector = undefined

        // check if the page is a settings page
        const url = new URL(location.href)

        // find the first settings injector that matches the url
        const matched = settingsInjectors.find(t => t.match(url))
        if (matched)
          settingsInjector = createScopedInstance(matched.mount)
      }
    }
  }

  // @ts-expect-error Tampermonkey specific
  if (window.onurlchange === null) {
    window.addEventListener('urlchange', onUpdate)
  }
  else {
    const installObserver = new MutationObserver(useThrottleFn(onUpdate, 200, true, false))
    installObserver.observe(document.body, { childList: true, subtree: true })
  }
  onUpdate()
}
