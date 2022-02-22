import { h, withModifiers } from 'vue'
import {
  detectionResolution,
  renderTextDirection,
  scriptLang,
  targetLang,
  textDetector,
  translator,
} from '../composables'
import { t, TranslateState, tt } from '../i18n'

export const detectResOptionsMap: Record<string, string> = {
  S: '1024px',
  M: '1536px',
  L: '2048px',
  X: '2560px',
}
export const detectResOptions = Object.keys(detectResOptionsMap)
export const renderTextDirOptionsMap: Record<string, TranslateState> = {
  auto: t('settings.render-text-direction-options.auto'),
  horizontal: t('settings.render-text-direction-options.horizontal'),
}
export const renderTextDirOptions = Object.keys(renderTextDirOptionsMap)

export function renderSettings(options?: {
  itemOrientation?: 'vertical' | 'horizontal'
  textStyle?: Record<string, any>
}) {
  const { itemOrientation = 'vertical', textStyle = {} } = options ?? {}

  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      },
    },
    [
      // Sponsor
      h(
        'a',
        {
          href: 'https://ko-fi.com/voilelabs',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            color: '#2563EB',
            textDecoration: 'none',
          },
        },
        tt(t('sponsor.text'))
      ),
      // Detection resolution
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.detection-resolution'))
          ),
          h(
            'select',
            {
              value: detectionResolution.value,
              onChange(e: Event) {
                detectionResolution.value = (e.target as HTMLSelectElement).value
              },
            },
            Object.entries(detectResOptionsMap).map(([key, value]) => h('option', { value: key }, value))
          ),
        ]
      ),
      // Text detector
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.text-detector'))
          ),
          h(
            'select',
            {
              value: textDetector.value,
              onChange(e: Event) {
                textDetector.value = (e.target as HTMLSelectElement).value
              },
            },
            [
              h('option', { value: 'auto' }, tt(t('settings.text-detector-options.auto'))),
              h('option', { value: 'ctd' }, 'CTD'),
            ]
          ),
        ]
      ),
      // Translator
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.translator'))
          ),
          h(
            'select',
            {
              value: translator.value,
              onChange(e: Event) {
                translator.value = (e.target as HTMLSelectElement).value
              },
            },
            [
              h('option', { value: 'baidu' }, 'Baidu'),
              h('option', { value: 'google' }, 'Google'),
              h('option', { value: 'deepl' }, 'DeepL'),
            ]
          ),
        ]
      ),
      // Render text direction
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.render-text-direction'))
          ),
          h(
            'select',
            {
              value: renderTextDirection.value,
              onChange(e: Event) {
                renderTextDirection.value = (e.target as HTMLSelectElement).value
              },
            },
            [
              h('option', { value: 'auto' }, tt(t('settings.render-text-direction-options.auto'))),
              h('option', { value: 'horizontal' }, tt(t('settings.render-text-direction-options.horizontal'))),
            ]
          ),
        ]
      ),
      // Target language
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.target-language'))
          ),
          h(
            'select',
            {
              value: targetLang.value,
              onChange(e: Event) {
                targetLang.value = (e.target as HTMLSelectElement).value
              },
            },
            [
              h('option', { value: '' }, tt(t('settings.target-language-options.auto'))),
              ...[
                ['CHS', '简体中文'],
                ['CHT', '繁體中文'],
                ['JPN', '日本語'],
                ['ENG', 'English'],
                ['KOR', '한국어'],
                ['VIN', 'Tiếng Việt'],
                ['CSY', 'čeština'],
                ['NLD', 'Nederlands'],
                ['FRA', 'français'],
                ['DEU', 'Deutsch'],
                ['HUN', 'magyar nyelv'],
                ['ITA', 'italiano'],
                ['PLK', 'polski'],
                ['PTB', 'português'],
                ['ROM', 'limba română'],
                ['RUS', 'русский язык'],
                ['ESP', 'español'],
                ['TRK', 'Türk dili'],
              ].map(([value, text]) => h('option', { value }, text)),
            ]
          ),
        ]
      ),
      // Script language
      h(
        'div',
        {
          style: {
            ...(itemOrientation === 'horizontal'
              ? {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              : {}),
          },
        },
        [
          h(
            'div',
            {
              style: {
                ...textStyle,
              },
            },
            tt(t('settings.script-language'))
          ),
          h(
            'select',
            {
              value: scriptLang.value,
              onChange(e: Event) {
                scriptLang.value = (e.target as HTMLSelectElement).value
              },
            },
            [
              h('option', { value: '' }, tt(t('settings.script-language-options.auto'))),
              h('option', { value: 'zh-CN' }, '简体中文'),
              h('option', { value: 'en-US' }, 'English'),
            ]
          ),
        ]
      ),
      // Reset
      h('div', [
        h(
          'button',
          {
            onClick: withModifiers(() => {
              detectionResolution.value = null
              textDetector.value = null
              translator.value = null
              renderTextDirection.value = null
              targetLang.value = null
              scriptLang.value = null
            }, ['stop', 'prevent']),
          },
          tt(t('settings.reset'))
        ),
      ]),
    ]
  )
}
