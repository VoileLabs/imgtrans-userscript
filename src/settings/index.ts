import { h, withModifiers } from 'vue'
import {
  detectionResolution,
  renderTextOrientation,
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
  auto: t('settings.render-text-orientation-options.auto'),
  horizontal: t('settings.render-text-orientation-options.horizontal'),
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
      // Settings
      ...[
        [
          t('settings.detection-resolution'),
          detectionResolution,
          detectResOptionsMap,
          t('settings.detection-resolution-desc'),
        ] as const,
        [
          t('settings.text-detector'),
          textDetector,
          {
            auto: tt(t('settings.text-detector-options.auto')),
            ctd: 'CTD',
          },
          t('settings.text-detector-desc'),
        ] as const,
        [
          t('settings.translator'),
          translator,
          {
            youdao: 'Youdao',
            baidu: 'Baidu',
            google: 'Google',
            deepl: 'DeepL',
          },
          t('settings.translator-desc'),
        ] as const,
        [
          t('settings.render-text-orientation'),
          renderTextOrientation,
          {
            auto: tt(t('settings.render-text-orientation-options.auto')),
            horizontal: tt(t('settings.render-text-orientation-options.horizontal')),
          },
          t('settings.render-text-orientation-desc'),
        ] as const,
        [
          t('settings.target-language'),
          targetLang,
          {
            '': tt(t('settings.target-language-options.auto')),
            CHS: '简体中文',
            CHT: '繁體中文',
            JPN: '日本語',
            ENG: 'English',
            KOR: '한국어',
            VIN: 'Tiếng Việt',
            CSY: 'čeština',
            NLD: 'Nederlands',
            FRA: 'français',
            DEU: 'Deutsch',
            HUN: 'magyar nyelv',
            ITA: 'italiano',
            PLK: 'polski',
            PTB: 'português',
            ROM: 'limba română',
            RUS: 'русский язык',
            ESP: 'español',
            TRK: 'Türk dili',
          },
          t('settings.target-language-desc'),
        ] as const,
        [
          t('settings.script-language'),
          scriptLang,
          {
            '': tt(t('settings.script-language-options.auto')),
            'zh-CN': '简体中文',
            'en-US': 'English',
          },
          t('settings.script-language-desc'),
        ] as const,
      ].map(([title, opt, optMap, desc]) =>
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
              tt(title)
            ),
            h('div', {}, [
              h(
                'select',
                {
                  value: opt.value,
                  onChange(e: Event) {
                    opt.value = (e.target as HTMLSelectElement).value
                  },
                },
                Object.entries(optMap).map(([key, value]) => h('option', { value: key }, value))
              ),
              desc
                ? h(
                    'div',
                    {
                      style: {
                        fontSize: '13px',
                      },
                    },
                    tt(desc)
                  )
                : undefined,
            ]),
          ]
        )
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
              renderTextOrientation.value = null
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
