import {
  computed,
  ComputedRef,
  createApp,
  defineComponent,
  h,
  reactive,
  ref,
  Ref,
  shallowReactive,
  triggerRef,
  watch,
  watchEffect,
  withModifiers,
} from 'vue'
import { Translator } from '../main'
import { t, tt } from '../i18n'
import { blobToImageData, getStatusText, pullTransStatusUntilFinish, submitTranslate } from '../utils/core'
import IconCarbonTranslate from '~icons/carbon/translate'
import IconCarbonReset from '~icons/carbon/reset'
import { phash } from '../utils'

export default (): Translator => {
  const statusId = location.pathname.match(/\/status\/(\d+)/)?.[1]

  const translatedMap: Record<string, string | undefined> = reactive({})
  const translateStatusMap: Record<string, ComputedRef<string | undefined>> = shallowReactive({})
  const translateEnabledMap: Record<string, boolean> = reactive({})
  const originalImageMap: Record<string, Blob> = {}

  let initObserver: MutationObserver | undefined
  let layersObserver: MutationObserver | undefined

  let layers: HTMLElement | null = document.getElementById('layers')

  let dialog: HTMLElement | undefined
  interface DialogInstance {
    active: Ref<number>
    update: () => void
    stop: () => void
  }
  const createDialogInstance = (): DialogInstance => {
    const active = ref(0)
    const updateRef = ref()
    const buttonParent = dialog!.querySelector('[aria-labelledby="modal-header"][role="dialog"]')!.firstChild!
      .firstChild as HTMLElement

    const images = computed(() => {
      updateRef.value
      return Array.from((buttonParent.firstChild! as HTMLElement).querySelectorAll('img'))
    })
    const currentImg = computed(() => {
      const img = images.value[active.value]
      if (!img) return undefined
      return img.getAttribute('data-transurl') || img.src
    })
    const stopImageWatch = watch([images, translateEnabledMap, translatedMap], () => {
      for (const img of images.value) {
        const div = img.previousSibling as HTMLElement
        if (img.hasAttribute('data-transurl')) {
          const transurl = img.getAttribute('data-transurl')!
          if (!translateEnabledMap[transurl]) {
            if (div) div.style.backgroundImage = `url("${transurl}")`
            img.src = transurl
            img.removeAttribute('data-transurl')
          }
        } else if (translateEnabledMap[img.src] && translatedMap[img.src]) {
          const ori = img.src
          img.setAttribute('data-transurl', ori)
          img.src = translatedMap[ori]!
          if (div) div.style.backgroundImage = `url("${translatedMap[ori]!}")`
        }
      }
    })

    const getTranslatedImage = async (url: string): Promise<string> => {
      if (translatedMap[url]) return translatedMap[url]!

      translateStatusMap[url] = computed(() => tt(t('common.source.download-image')))
      if (!originalImageMap[url]) {
        // fetch original image
        const result = await GMP.xmlHttpRequest({
          method: 'GET',
          responseType: 'blob',
          url,
          headers: { referer: 'https://twitter.com/' },
          overrideMimeType: 'text/plain; charset=x-user-defined',
        }).catch((e) => {
          translateStatusMap[url] = computed(() => tt(t('common.source.download-image-error')))
          throw e
        })
        originalImageMap[url] = result.response as Blob
      }
      const originalImage = originalImageMap[url]

      try {
        const imageData = await blobToImageData(originalImage)
        console.log('phash', phash(imageData))
      } catch (e) {
        console.warn(e)
      }
      translateStatusMap[url] = computed(() => tt(t('common.client.submit')))
      const originalSrcSuffix = url.split('.').pop()!
      const id = await submitTranslate(originalImage, originalSrcSuffix).catch((e) => {
        translateStatusMap[url] = computed(() => tt(t('common.client.submit-error')))
        throw e
      })

      translateStatusMap[url] = computed(() => tt(t('common.status.pending')))
      await pullTransStatusUntilFinish(id, (status) => {
        translateStatusMap[url] = computed(() => tt(getStatusText(status)))
      }).catch((e) => {
        translateStatusMap[url] = computed(() => tt(e))
        throw e
      })

      translateStatusMap[url] = computed(() => tt(t('common.client.download-image')))
      const image = await GMP.xmlHttpRequest({
        method: 'GET',
        responseType: 'blob',
        url: 'https://touhou.ai/imgtrans/result/' + id + '/final.png',
      }).catch((e) => {
        translateStatusMap[url] = computed(() => tt(t('common.client.download-image-error')))
        throw e
      })
      const imageUri = URL.createObjectURL(image.response as Blob)

      translatedMap[url] = imageUri

      // https://github.com/vuejs/core/blob/1574edd490bd5cc0a213bc9f48ff41a1dc43ab22/packages/reactivity/src/baseHandlers.ts#L153
      translateStatusMap[url] = computed(() => undefined)

      return imageUri
    }

    const enable = async (url: string) => {
      await getTranslatedImage(url)
      translateEnabledMap[url] = true
    }
    const disable = (url: string) => {
      translateEnabledMap[url] = false
    }

    const referenceEl = buttonParent.children[2] as HTMLElement
    const container = referenceEl.cloneNode(true) as HTMLElement
    container.style.top = '48px'
    // container.style.display = 'flex'
    const stopDisplayWatch = watchEffect(() => {
      container.style.display = currentImg.value ? 'flex' : 'none'
    })
    container.style.flexDirection = 'row'
    container.style.flexWrap = 'nowrap'
    const child = container.firstChild as HTMLElement
    const referenceChild = referenceEl.firstChild as HTMLElement
    const backgroundColor = ref(referenceChild.style.backgroundColor)
    buttonParent.appendChild(container)

    const buttonProcessing = computed(() => currentImg.value && !!translateStatusMap[currentImg.value]?.value)
    const buttonTranslated = computed(() => currentImg.value && !!translateEnabledMap[currentImg.value])
    const buttonContent = computed(() => (currentImg.value ? translateStatusMap[currentImg.value]?.value : ''))

    container.onclick = withModifiers(() => {
      if (!currentImg.value) return
      if (translateStatusMap[currentImg.value]?.value) return
      if (translateEnabledMap[currentImg.value]) {
        disable(currentImg.value)
      } else {
        enable(currentImg.value)
      }
    }, ['stop', 'prevent'])

    const spinnerContainer = container.firstChild!
    const processingSpinner = document.createElement('div')
    processingSpinner.style.position = 'absolute'
    processingSpinner.style.top = '0'
    processingSpinner.style.left = '0'
    processingSpinner.style.bottom = '0'
    processingSpinner.style.right = '0'
    processingSpinner.style.borderTop = '1px solid #A1A1AA'
    processingSpinner.style.animation = 'imgtrans-spin 1s linear infinite'
    processingSpinner.style.borderRadius = '9999px'
    const stopSpinnerWatch = watch(
      buttonProcessing,
      (p, o) => {
        if (p === o) return
        if (p && !spinnerContainer.contains(processingSpinner)) spinnerContainer.appendChild(processingSpinner)
        else if (spinnerContainer.contains(processingSpinner)) spinnerContainer.removeChild(processingSpinner)
      },
      { immediate: true }
    )

    const svg = container.querySelector('svg')!
    const svgParent = svg.parentElement!
    const buttonIconContainer = document.createElement('div')
    svgParent.insertBefore(buttonIconContainer, svg)
    svgParent.removeChild(svg)
    const buttonIconApp = createApp(
      defineComponent({
        setup() {
          return () =>
            h(buttonTranslated.value ? IconCarbonReset : IconCarbonTranslate, {
              style: {
                width: '20px',
                height: '20px',
                marginTop: '4px',
              },
            })
        },
      })
    )
    buttonIconApp.mount(buttonIconContainer)

    const buttonStatusContainer = document.createElement('div')
    container.insertBefore(buttonStatusContainer, container.firstChild)
    const buttonStatusApp = createApp(
      defineComponent({
        setup() {
          return () =>
            h(
              'div',
              {
                style: {
                  display: buttonContent.value ? '' : 'none',
                  marginRight: '-12px',
                  padding: '2px',
                  paddingLeft: '4px',
                  paddingRight: '16px',
                  color: '#fff',
                  backgroundColor: backgroundColor.value,
                  borderRadius: '4px',
                },
              },
              [buttonContent.value]
            )
        },
      })
    )
    buttonStatusApp.mount(buttonStatusContainer)

    return {
      active,
      update() {
        triggerRef(updateRef)
        if (referenceChild.style.backgroundColor)
          child.style.backgroundColor = backgroundColor.value = referenceChild.style.backgroundColor
      },
      stop() {
        stopDisplayWatch()
        stopSpinnerWatch()
        stopImageWatch()
        buttonIconApp.unmount()
        buttonStatusApp.unmount()
        buttonParent.removeChild(container)
        for (const img of images.value) {
          if (img.hasAttribute('data-transurl')) {
            const transurl = img.getAttribute('data-transurl')!
            img.src = transurl
            img.removeAttribute('data-transurl')
          }
        }
      },
    }
  }

  let dialogInstance: DialogInstance | undefined
  const rescanLayers = () => {
    const [newDialog] = Array.from(layers!.children).filter(
      (el) => el.querySelector('[aria-labelledby="modal-header"][role="dialog"]')?.firstChild?.firstChild?.childNodes[2]
    ) as HTMLElement[]
    if (newDialog !== dialog || !newDialog) {
      dialogInstance?.stop()
      dialogInstance = undefined
      dialog = newDialog
      if (!dialog) return
      dialogInstance = createDialogInstance()
    }

    const newIndex = Number(location.pathname.match(/\/status\/\d+\/photo\/(\d+)/)?.[1]) - 1
    if (newIndex !== dialogInstance!.active.value) {
      dialogInstance!.active.value = newIndex
    }

    dialogInstance!.update()
  }

  const onLayersUpdate = () => {
    rescanLayers()
    layersObserver = new MutationObserver((mutations) => {
      rescanLayers()
    })
    layersObserver.observe(layers!, { childList: true, subtree: true })
  }

  if (layers) onLayersUpdate()
  else {
    initObserver = new MutationObserver((mutations) => {
      layers = document.getElementById('layers')
      if (layers) {
        onLayersUpdate()
        initObserver?.disconnect()
      }
    })
    initObserver.observe(document.body, { childList: true, subtree: true })
  }

  return {
    canKeep(url: string) {
      const urlStatusId = url.match(/\/status\/(\d+)/)?.[1]
      return urlStatusId === statusId
    },
    stop() {
      layersObserver?.disconnect()
      initObserver?.disconnect()
    },
  }
}
