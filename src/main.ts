import { checkCSS } from './style'
import { changeLangEl } from './i18n'
import pixiv from './pixiv'
import twitter from './twitter'

export interface Translator {
  canKeep?: (url: string) => boolean | null | undefined
  stop?: () => void
}

let currentURL: string | undefined
let translator: Translator | undefined
const installObserver = new MutationObserver(() => {
  if (currentURL !== location.href) {
    currentURL = location.href

    // there is a navigation in the page

    /* ensure css is loaded */
    checkCSS()

    /* update i18n element */
    changeLangEl(document.documentElement as HTMLHtmlElement)

    /* update translator */
    // only if the translator needs to be updated
    if (!translator?.canKeep?.(currentURL)) {
      // unmount previous translator
      translator?.stop?.()
      translator = undefined

      // check if the page is a image page
      const url = new URL(location.href)
      // https://www.pixiv.net/(en/)artworks/<id>
      if (url.hostname.endsWith('pixiv.net') && url.pathname.match(/\/artworks\//)) {
        translator = pixiv()
      }
      // https://twitter.com/<user>/status/<id>
      else if (url.hostname.endsWith('twitter.com') && url.pathname.match(/\/status\//)) {
        translator = twitter()
      }
    }
  }
})
installObserver.observe(document.body, { childList: true, subtree: true })
