import { createApp, defineComponent, h } from 'vue'
import { t, tt } from '../i18n'
import { SettingsInjector } from '../main'
import { renderSettings } from '../settings'

export default (): SettingsInjector => {
  const wrapper = document.getElementById('wrapper')
  if (!wrapper) return {}

  const adFooter = wrapper.querySelector('.ad-footer')
  if (!adFooter) return {}

  const settingsContainer = document.createElement('div')
  const settingsApp = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            'div',
            {
              style: {
                paddingTop: '10px',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingBottom: '15px',
                marginBottom: '10px',
                background: '#fff',
                border: '1px solid #d6dee5',
              },
            },
            [
              h(
                'h2',
                {
                  style: {
                    fontSize: '18px',
                    fontWeight: 'bold',
                  },
                },
                tt(t('settings.title'))
              ),
              h(
                'div',
                {
                  style: {
                    width: '665px',
                    margin: '10px auto',
                  },
                },
                renderSettings({
                  itemOrientation: 'horizontal',
                  textStyle: {
                    width: '185px',
                    fontWeight: 'bold',
                  },
                })
              ),
            ]
          )
      },
    })
  )
  settingsApp.mount(settingsContainer)

  wrapper.insertBefore(settingsContainer, adFooter)

  return {
    stop() {
      settingsApp.unmount()
      settingsContainer.remove()
    },
  }
}
