import type { Translator, TranslatorInstance } from '../main'

function mount(): TranslatorInstance {
  const galleryId = window.location.pathname.match(/\/g\/(\d+)/)?.[1]
  if (!galleryId)
    return {}

  return {}
}

const translator: Translator = {
  match(url) {
    // https://e-hentai.org/g/<id>/<token>
    // https://exhentai.org/g/<id>/<token>
    if (!url.hostname.endsWith('e-hentai.org') && !url.hostname.endsWith('exhentai.org'))
      return false
    if (!url.pathname.startsWith('/g/'))
      return false
    return true
  },
  mount,
}

export default translator
