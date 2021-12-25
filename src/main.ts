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
    // https://www.pixiv.net/artworks/<id>
    if (new URL(location.href).pathname.match(/^\/artworks\/(\d+)/)) {
      stopTranslator = pixiv()
    }
  }
})
installObserver.observe(document.body, { childList: true, subtree: true })
