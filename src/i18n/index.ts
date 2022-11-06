import { computed, ref } from 'vue'
import { scriptLang } from '../composables/storage'

import zhCN from './zh-CN.yml'
import enUS from './en-US.yml'

const messages: Record<string, any> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

function tryMatchLang(lang: string): string {
  if (lang.startsWith('zh'))
    return 'zh-CN'
  if (lang.startsWith('en'))
    return 'en-US'
  return 'en-US'
}

export interface TranslateState {
  key: string
  props: Record<string, unknown>
}

export const realLang = ref(navigator.language)
export const lang = computed(() => scriptLang.value || tryMatchLang(realLang.value))
// watch(lang, (o, n) => {
//   if (o === n)
//     return
//   console.log(`lang changed: ${lang.value}`, `real: ${realLang.value}`)
// })

export const t = (key: string, props: Record<string, unknown> = {}): TranslateState => {
  return { key, props }
}

export const tt = ({ key, props }: TranslateState) => {
  const msg: string = key.split('.').reduce((obj, k) => obj[k], messages[lang.value])
    || key.split('.').reduce((obj, k) => obj[k], messages['zh-CN'])
  if (!msg)
    return key
  return msg.replace(/\{([^}]+)\}/g, (_, k) => {
    return String(props[k]) ?? ''
  })
}

export const untt = (state: string | TranslateState) => {
  if (typeof state === 'string')
    return state
  else return tt(state)
}

let langEL: HTMLHtmlElement | undefined
let langObserver: MutationObserver | undefined

export const changeLangEl = (el: HTMLHtmlElement) => {
  if (langEL === el)
    return

  if (langObserver)
    langObserver.disconnect()
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
        const target = mutation.target as HTMLHtmlElement
        if (target.lang)
          realLang.value = target.lang
        break
      }
    }
  })
  observer.observe(el, { attributes: true })
  langObserver = observer
  langEL = el

  realLang.value = el.lang
}

export function BCP47ToISO639(code: string): string {
  try {
    const lo = new Intl.Locale(code)
    switch (lo.language) {
      case 'zh': {
        switch (lo.script) {
          case 'Hans':
            return 'CHS'
          case 'Hant':
            return 'CHT'
        }
        switch (lo.region) {
          case 'CN':
            return 'CHS'
          case 'HK':
          case 'TW':
            return 'CHT'
        }
        return 'CHS'
      }
      case 'ja':
        return 'JPN'
      case 'en':
        return 'ENG'
      case 'ko':
        return 'KOR'
      case 'vi':
        return 'VIE'
      case 'cs':
        return 'CSY'
      case 'nl':
        return 'NLD'
      case 'fr':
        return 'FRA'
      case 'de':
        return 'DEU'
      case 'hu':
        return 'HUN'
      case 'it':
        return 'ITA'
      case 'pl':
        return 'PLK'
      case 'pt':
        return 'PTB'
      case 'ro':
        return 'ROM'
      case 'ru':
        return 'RUS'
      case 'es':
        return 'ESP'
      case 'tr':
        return 'TRK'
      case 'uk':
        return 'UKR'
    }
    return 'ENG'
  }
  catch (e) {
    return 'ENG'
  }
}
