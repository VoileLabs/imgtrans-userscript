import { computed, createApp, defineComponent, h, ref, withModifiers } from 'vue'
import { Translator } from '../main'
import { blobToImageData, getStatusText, pullTransStatusUntilFinish, submitTranslate } from '../utils/core'
import { t, TranslateState, tt } from '../i18n'
import IconCarbonTranslate from '~icons/carbon/translate'
import IconCarbonReset from '~icons/carbon/reset'
import { phash } from '../utils'

export default (): Translator => {
  interface Instance {
    imageNode: HTMLImageElement
    stop: () => void
    enable: () => Promise<void>
    disable: () => void
    isEnabled: () => boolean
  }

  const images = new Set<HTMLImageElement>()
  const instances = new Map<HTMLImageElement, Instance>()
  const translatedMap = new Map<string, string>()
  const translateEnabledMap = new Map<string, boolean>()

  function rescanImages() {
    const imageNodes = Array.from(document.querySelectorAll('img') as NodeListOf<HTMLImageElement>).filter(
      (node) =>
        node.hasAttribute('srcset') ||
        node.hasAttribute('data-trans') ||
        node.parentElement?.classList.contains('sc-1pkrz0g-1')
    )
    const removedImages = new Set(images)
    for (const node of imageNodes) {
      removedImages.delete(node)
      if (!images.has(node)) {
        // new image
        // console.log('new', node)
        try {
          instances.set(node, mountToNode(node))
          images.add(node)
        } catch (e) {
          // ignore
        }
      }
    }
    for (const node of removedImages) {
      // removed image
      // console.log('remove', node)
      if (instances.has(node)) {
        const instance = instances.get(node)!
        instance.stop()
        instances.delete(node)
        images.delete(node)
      }
    }
  }

  function mountToNode(imageNode: HTMLImageElement): Instance {
    // get current displayed image
    const src = imageNode.getAttribute('src')!
    const srcset = imageNode.getAttribute('srcset')

    // get original image
    const parent = imageNode.parentElement
    if (!parent) throw new Error('no parent')
    const originalSrc = parent.getAttribute('href') || src
    const originalSrcSuffix = originalSrc.split('.').pop()!

    // console.log(src, originalSrc)

    let originalImage: Blob | undefined
    let translatedImage = translatedMap.get(originalSrc)
    let translateMounted = false
    let buttonDisabled = false

    const buttonProcessing = ref(false)
    const buttonTranslated = ref(false)
    const buttonText = ref<TranslateState | undefined>()
    const buttonHint = ref('')

    // create a translate botton
    parent.style.position = 'relative'
    const container = document.createElement('div')
    parent.appendChild(container)
    const buttonApp = createApp(
      defineComponent({
        setup() {
          const content = computed(() => (buttonText.value ? tt(buttonText.value) : '') + buttonHint.value)
          return () =>
            // container
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  zIndex: '1',
                  bottom: '8px',
                  right: content.value ? '4px' : '26px',
                },
              },
              [
                h(
                  'div',
                  {
                    style: {
                      position: 'relative',
                    },
                  },
                  [
                    h(
                      'div',
                      {
                        style: {
                          fontSize: '16px',
                          lineHeight: '16px',
                          height: '16px',
                          padding: '3px',
                          paddingLeft: content.value ? '28px' : '2px',
                          border: '2px solid #D1D5DB',
                          borderRadius: '6px',
                          background: '#fff',
                        },
                      },
                      [content.value]
                    ),
                    h(
                      'div',
                      {
                        style: {
                          position: 'absolute',
                          left: '-5px',
                          top: '-2px',
                          background: '#fff',
                          borderRadius: '24px',
                        },
                      },
                      [
                        // button
                        h(buttonTranslated.value ? IconCarbonReset : IconCarbonTranslate, {
                          style: {
                            fontSize: '18px',
                            lineHeight: '18px',
                            width: '18px',
                            height: '18px',
                            padding: '6px',
                            cursor: 'pointer',
                          },
                          onClick: withModifiers(() => {
                            toggle()
                          }, ['stop', 'prevent']),
                        }),
                        h('div', {
                          style: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            border: '2px solid #D1D5DB',
                            ...(buttonProcessing.value
                              ? {
                                  borderTop: '2px solid #7DD3FC',
                                  animation: 'imgtrans-spin 1s linear infinite',
                                }
                              : {}),
                            borderRadius: '24px',
                            pointerEvents: 'none',
                          },
                        }),
                      ]
                    ),
                  ]
                ),
              ]
            )
        },
      })
    )
    buttonApp.mount(container)

    async function getTranslatedImage(): Promise<string> {
      if (translatedImage) return translatedImage
      buttonDisabled = true
      const text = buttonText.value
      buttonHint.value = ''
      buttonProcessing.value = true

      buttonText.value = t('common.source.download-image')
      if (!originalImage) {
        // fetch original image
        const result = await GMP.xmlHttpRequest({
          method: 'GET',
          responseType: 'blob',
          url: originalSrc,
          headers: { referer: 'https://www.pixiv.net/' },
          overrideMimeType: 'text/plain; charset=x-user-defined',
        }).catch((e) => {
          buttonText.value = t('common.source.download-image-error')
          throw e
        })
        originalImage = result.response as Blob
      }
      try {
        const imageData = await blobToImageData(originalImage)
        console.log('phash', phash(imageData))
      } catch (e) {
        console.warn(e)
      }
      buttonText.value = t('common.client.submit')
      const id = await submitTranslate(originalImage, originalSrcSuffix).catch((e) => {
        buttonText.value = t('common.client.submit-error')
        throw e
      })

      buttonText.value = t('common.status.pending')
      await pullTransStatusUntilFinish(id, (status) => {
        buttonText.value = getStatusText(status)
      }).catch((e) => {
        buttonText.value = e
        throw e
      })

      buttonText.value = t('common.client.download-image')
      const image = await GMP.xmlHttpRequest({
        method: 'GET',
        responseType: 'blob',
        url: 'https://touhou.ai/imgtrans/result/' + id + '/final.png',
      }).catch((e) => {
        buttonText.value = t('common.client.download-image-error')
        throw e
      })
      const imageUri = URL.createObjectURL(image.response as Blob)

      translatedImage = imageUri
      translatedMap.set(originalSrc, translatedImage)

      buttonText.value = text
      buttonProcessing.value = false
      buttonDisabled = false
      return imageUri
    }

    async function enable() {
      translateMounted = true
      try {
        const translated = await getTranslatedImage()
        imageNode.setAttribute('data-trans', src)
        imageNode.setAttribute('src', translated)
        imageNode.removeAttribute('srcset')

        buttonTranslated.value = true
      } catch (e) {
        buttonDisabled = false
        translateMounted = false
        throw e
      }
    }
    function disable() {
      translateMounted = false
      imageNode.setAttribute('src', src)
      if (srcset) imageNode.setAttribute('srcset', srcset)
      imageNode.removeAttribute('data-trans')
      buttonTranslated.value = false
    }

    // called on click
    function toggle() {
      if (buttonDisabled) return
      if (!translateMounted) {
        translateEnabledMap.set(originalSrc, true)
        enable()
      } else {
        translateEnabledMap.delete(originalSrc)
        disable()
      }
    }

    // enable if enabled
    if (translateEnabledMap.get(originalSrc)) enable()

    return {
      imageNode,
      stop: () => {
        buttonApp.unmount()
        parent.removeChild(container)
        if (translateMounted) disable()
      },
      async enable() {
        translateEnabledMap.set(originalSrc, true)
        return await enable()
      },
      disable() {
        translateEnabledMap.delete(originalSrc)
        return disable()
      },
      isEnabled() {
        return translateMounted
      },
    }
  }

  // translate all
  let removeTransAll: () => void | undefined
  function refreshTransAll() {
    if (document.querySelector('.sc-emr523-2')) return
    const bookmark = document.querySelector('.gtm-main-bookmark')
    if (bookmark) {
      const parent = bookmark.parentElement!.parentElement!
      if (parent.querySelector('[data-transall]')) return

      const container = document.createElement('div')
      parent.appendChild(container)

      const buttonApp = createApp(
        defineComponent({
          setup() {
            const started = ref(false)
            const total = ref(0)
            const finished = ref(0)
            const erred = ref(false)

            return () =>
              h(
                'div',
                {
                  'data-transall': 'true',
                  style: {
                    display: 'inline-block',
                    marginRight: '13px',
                    padding: '0',
                    color: 'inherit',
                    height: '32px',
                    lineHeight: '32px',
                    cursor: 'pointer',
                    fontWeight: '700',
                  },
                  onClick: withModifiers(() => {
                    if (started.value) return
                    started.value = true
                    total.value = instances.size
                    const inc = () => {
                      finished.value++
                    }
                    const err = () => {
                      erred.value = true
                      finished.value++
                    }
                    for (const instance of instances.values()) {
                      if (instance.isEnabled()) inc()
                      else instance.enable().then(inc).catch(err)
                    }
                  }, ['stop', 'prevent']),
                },
                [
                  tt(
                    started.value
                      ? finished.value === total.value
                        ? erred.value
                          ? t('common.batch.error')
                          : t('common.batch.finish')
                        : t('common.batch.progress', {
                            count: finished.value,
                            total: total.value,
                          })
                      : t('common.control.batch')
                  ),
                ]
              )
          },
        })
      )
      buttonApp.mount(container)

      removeTransAll = () => {
        buttonApp.unmount()
        parent.removeChild(container)
      }
    }
  }

  const imageObserver = new MutationObserver((mutations) => {
    rescanImages()
    refreshTransAll()
  })
  imageObserver.observe(document.body, { childList: true, subtree: true })

  return {
    stop() {
      instances.forEach((instance) => instance.stop())
      removeTransAll?.()
    },
  }
}
