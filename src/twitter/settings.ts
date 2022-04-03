import { useThrottleFn } from '@vueuse/shared'
import type { App } from 'vue'
import { createApp, defineComponent, h, onUnmounted } from 'vue'
import { t, tt } from '../i18n'
import type { SettingsInjector, SettingsInjectorInstance } from '../main'
import { renderSettings } from '../settings'

function mount(): SettingsInjectorInstance {
  let settingsTab: HTMLElement | undefined
  let textApp: App | undefined
  const checkTab = () => {
    const tablist =
      document.querySelector('[role="tablist"]') || document.querySelector('[data-testid="loggedOutPrivacySection"]')
    if (!tablist) {
      if (textApp) {
        textApp.unmount()
        textApp = undefined
      }
      return
    }

    if (tablist.querySelector('div[data-imgtrans-settings]')) return
    const inactiveRefrenceEl = Array.from(tablist.children).find(
      (el) => el.children.length < 2 && el.querySelector('a')
    )
    if (!inactiveRefrenceEl) return
    settingsTab = inactiveRefrenceEl.cloneNode(true) as HTMLElement
    settingsTab.setAttribute('data-imgtrans-settings', 'true')

    const textEl = settingsTab.querySelector('span')
    if (textEl) {
      textApp = createApp(
        defineComponent({
          render() {
            return tt(t('settings.title'))
          },
        })
      )
      textApp.mount(textEl)
    }
    const linkEl = settingsTab.querySelector('a')
    if (linkEl) linkEl.href = '/settings/__imgtrans'

    tablist.appendChild(settingsTab)
  }

  let settingsApp: App | undefined
  const checkSettings = () => {
    const section = document.querySelector('[data-testid="error-detail"]')?.parentElement
      ?.parentElement as HTMLElement | null
    if (!section?.querySelector('[data-imgtrans-settings-section]')) {
      if (settingsApp) {
        settingsApp.unmount()
        settingsApp = undefined
      }
      if (!section) return
    }

    const title = tt(t('settings.title')) + ' / Twitter'
    if (document.title !== title) document.title = title

    if (settingsApp) return

    const errorPage = section.firstChild! as HTMLElement
    errorPage.style.display = 'none'

    const settingsContainer = document.createElement('div')
    settingsContainer.setAttribute('data-imgtrans-settings-section', 'true')
    section.appendChild(settingsContainer)
    settingsApp = createApp(
      defineComponent({
        setup() {
          onUnmounted(() => {
            errorPage.style.display = ''
          })

          return () =>
            // container
            h(
              'div',
              {
                style: {
                  paddingLeft: '16px',
                  paddingRight: '16px',
                },
              },
              [
                // title
                h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      height: '53px',
                      alignItems: 'center',
                    },
                  },
                  h(
                    'h2',
                    {
                      style: {
                        fontSize: '20px',
                        lineHeight: '24px',
                      },
                    },
                    tt(t('settings.title'))
                  )
                ),
                renderSettings(),
              ]
            )
        },
      })
    )
    settingsApp.mount(settingsContainer)
  }

  const listObserver = new MutationObserver(
    useThrottleFn(
      () => {
        checkTab()
        if (location.pathname.match(/\/settings\/__imgtrans/)) {
          if (settingsTab && settingsTab.children.length < 2) {
            settingsTab.style.backgroundColor = '#F7F9F9'
            const activeIndicator = document.createElement('div')
            activeIndicator.style.position = 'absolute'
            activeIndicator.style.zIndex = '1'
            activeIndicator.style.top = '0'
            activeIndicator.style.left = '0'
            activeIndicator.style.bottom = '0'
            activeIndicator.style.right = '0'
            activeIndicator.style.borderRight = '2px solid #1D9Bf0'
            activeIndicator.style.pointerEvents = 'none'
            settingsTab.appendChild(activeIndicator)
          }
          checkSettings()
        } else {
          if (settingsTab && settingsTab.children.length > 1) {
            settingsTab.style.backgroundColor = ''
            settingsTab.removeChild(settingsTab.lastChild!)
          }
          if (settingsApp) {
            settingsApp.unmount()
            settingsApp = undefined
          }
        }
      },
      200,
      true,
      false
    )
  )
  listObserver.observe(document.body, { childList: true, subtree: true })

  return {
    canKeep(url) {
      return url.includes('twitter.com') && url.includes('settings/')
    },
    stop() {
      settingsApp?.unmount()
      listObserver.disconnect()
    },
  }
}

const settingsInjector: SettingsInjector = {
  match(url) {
    // https://twitter.com/settings/<tab>
    return url.hostname.endsWith('twitter.com') && url.pathname.match(/\/settings\//)
  },
  mount,
}

export default settingsInjector
