import pixiv from './pixiv'

let currentURL: string | undefined
let stopTranslator: () => void | undefined
const installObserver = new MutationObserver(() => {
  if (currentURL !== location.href) {
    currentURL = location.href

    // there is a navigation in the page

    /* unmount previous translator */
    if (stopTranslator) stopTranslator()

    /* mount new translator */

    // check if the page is a image page
    const url = new URL(location.href)

    // https://www.pixiv.net/(en/)artworks/<id>
    if (url.hostname.endsWith('pixiv.net') && url.pathname.match(/\/artworks\//)) {
      stopTranslator = pixiv()
    }
  }
})
installObserver.observe(document.body, { childList: true, subtree: true })
