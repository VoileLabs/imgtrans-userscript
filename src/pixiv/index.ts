import { createApp, defineComponent, h, ref, withModifiers } from 'vue'
import { blobToImageData, getStatusText, pullTransStatusUntilFinish, submitTranslate } from '../utils/core'
import { blockhash } from '../utils/blockhash'
import { phash } from '../utils/phash'
import { t, tt } from '../i18n'

export default () => {
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
        console.log('new', node)
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
      console.log('remove', node)
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

    const buttonText = ref(t('common.control.translate'))
    const buttonHint = ref('')

    // create a translate botton
    parent.style.position = 'relative'
    const container = document.createElement('div')
    parent.appendChild(container)
    const buttonApp = createApp(
      defineComponent({
        setup() {
          return () =>
            // container
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  zIndex: '1',
                  bottom: '10px',
                  right: '10px',
                },
              },
              [
                // button
                h(
                  'button',
                  {
                    type: 'button',
                    style: {
                      fontSize: '1rem',
                    },
                    onClick: withModifiers(() => {
                      toggle()
                    }, ['stop', 'prevent']),
                  },
                  [tt(buttonText.value), buttonHint.value]
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

      buttonText.value = t('common.source.download-image')
      if (!originalImage) {
        // fetch original image
        const result = await GM.xmlHttpRequest({
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
      const imageData = await blobToImageData(originalImage)
      console.log('blockhash', blockhash(imageData), 'phash', phash(imageData))
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
      const image = await GM.xmlHttpRequest({
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
        buttonText.value = t('common.control.reset')
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
      buttonText.value = t('common.control.translate')
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

  // unmount
  return () => {
    instances.forEach((instance) => instance.stop())
    removeTransAll?.()
  }
}
