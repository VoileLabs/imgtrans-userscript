import type { Translator, TranslatorInstance } from '../main'

function mount(): TranslatorInstance {
  return {}
}

const translator: Translator = {
  match(url) {
    // https://e-hentai.org/s/<token>/<id>-<num>
    // https://exhentai.org/s/<token>/<id>-<num>
    return false
  },
  mount,
}

export default translator
