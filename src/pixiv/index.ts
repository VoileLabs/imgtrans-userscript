import { computed, createApp, defineComponent, h, nextTick, ref, withModifiers } from 'vue'
import { useThrottleFn } from '@vueuse/shared'
import type { Translator, TranslatorInstance } from '../main'
import type { TranslateOptionsOverwrite } from '../utils/core'
import {
  downloadResultBlob,
  getStatusText,
  pullTransStatusUntilFinish,
  resizeToSubmit,
  submitTranslate,
} from '../utils/core'
import type { TranslateState } from '../i18n'
import { t, tt, untt } from '../i18n'
import { formatProgress } from '../utils'
import {
  detectionResolution,
  renderTextOrientation,
  textDetector,
  translatorService,
} from '../composables/storage'
import {
  detectResOptions,
  detectResOptionsMap,
  renderTextDirOptions,
  renderTextDirOptionsMap,
  textDetectorOptions,
  textDetectorOptionsMap,
  translatorOptions,
  translatorOptionsMap,
} from '../settings'
import IconCarbonTranslate from '~icons/carbon/translate'
import IconCarbonReset from '~icons/carbon/reset'
import IconCarbonChevronLeft from '~icons/carbon/chevron-left'
import IconCarbonChevronRight from '~icons/carbon/chevron-right'

function mount(): TranslatorInstance {
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

  function findImageNodes(node: HTMLElement) {
    return Array.from(node.querySelectorAll('img') as NodeListOf<HTMLImageElement>)
      .filter(node =>
        node.hasAttribute('srcset')
          || node.hasAttribute('data-trans')
          || node.parentElement?.classList.contains('sc-1pkrz0g-1')
          || node.parentElement?.classList.contains('gtm-expand-full-size-illust'),
      )
  }

  function rescanImages() {
    const imageNodes = findImageNodes(document.body)
    const removedImages = new Set(images)
    for (const node of imageNodes) {
      removedImages.delete(node)
      if (images.has(node))
        continue
      // new image
      // console.log('new', node)
      try {
        instances.set(node, mountToNode(node))
        images.add(node)
      }
      catch (e) {
        // ignore
      }
    }
    for (const node of removedImages) {
      // removed image
      // console.log('remove', node)
      if (!instances.has(node))
        continue
      const instance = instances.get(node)!
      instance.stop()
      instances.delete(node)
      images.delete(node)
    }
  }

  function mountToNode(imageNode: HTMLImageElement): Instance {
    // get current displayed image
    const src = imageNode.getAttribute('src')!
    const srcset = imageNode.getAttribute('srcset')

    // get original image
    const parent = imageNode.parentElement
    if (!parent)
      throw new Error('no parent')
    const originalSrc = parent.getAttribute('href') || src
    const originalSrcSuffix = originalSrc.split('.').pop()!

    // console.log(src, originalSrc)

    let originalImage: Blob | undefined
    let translatedImage = translatedMap.get(originalSrc)
    const translateMounted = ref(false)
    let buttonDisabled = false

    const buttonProcessing = ref(false)
    const buttonTranslated = ref(false)
    const buttonText = ref<TranslateState | undefined>()
    const buttonHint = ref('')

    // create a translate botton
    parent.style.position = 'relative'
    const container = document.createElement('div')
    parent.appendChild(container)
    const buttonApp = createApp(defineComponent(() => {
      const content = computed(() => (buttonText.value ? tt(buttonText.value) : '') + buttonHint.value)

      const advancedMenuOpen = ref(false)

      const advDetectRes = ref(detectionResolution.value)
      const advDetectResIndex = computed(() => detectResOptions.indexOf(advDetectRes.value))
      const advRenderTextDir = ref(renderTextOrientation.value)
      const advRenderTextDirIndex = computed(() => renderTextDirOptions.indexOf(advRenderTextDir.value))
      const advTextDetector = ref(textDetector.value)
      const advTextDetectorIndex = computed(() => textDetectorOptions.indexOf(advTextDetector.value))
      const advTranslator = ref(translatorService.value)
      const advTranslatorIndex = computed(() => translatorOptions.indexOf(advTranslator.value))

      return () =>
      // container
        h('div', {
          style: {
            position: 'absolute',
            zIndex: '1',
            bottom: '4px',
            left: '8px',
          },
        },
        [
          h('div', {
            style: {
              position: 'relative',
            },
          },
          [
            h('div', {
              style: {
                fontSize: '16px',
                lineHeight: '16px',
                padding: '2px',
                paddingLeft: translateMounted.value ? '2px' : '24px',
                border: '2px solid #D1D5DB',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'default',
              },
            },
            content.value
              ? content.value
              : !translateMounted.value
                  ? advancedMenuOpen.value
                    ? [
                        h('div', {
                          style: {
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '2px',
                          },
                          onClick: withModifiers(() => {
                            advancedMenuOpen.value = false
                          }, ['stop', 'prevent']),
                        },
                        [
                          h('div', {}, tt(t('settings.inline-options-title'))),
                          h(IconCarbonChevronLeft, {
                            style: {
                              verticalAlign: 'middle',
                              cursor: 'pointer',
                            },
                          }),
                        ]),
                        h('div', {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          },
                        }, [
                          [
                            [t('settings.detection-resolution'),
                              advDetectRes, advDetectResIndex,
                              detectResOptions, detectResOptionsMap,
                            ] as const,
                            [t('settings.text-detector'),
                              advTextDetector, advTextDetectorIndex,
                              textDetectorOptions, textDetectorOptionsMap,
                            ] as const,
                            [t('settings.translator'),
                              advTranslator, advTranslatorIndex,
                              translatorOptions, translatorOptionsMap,
                            ] as const,
                            [t('settings.render-text-orientation'),
                              advRenderTextDir, advRenderTextDirIndex,
                              renderTextDirOptions, Object.fromEntries(
                                Object.entries(renderTextDirOptionsMap).map(([k, v]) => [k, tt(v)])),
                            ] as const,
                          ].map(([title, opt, optIndex, opts, optMap]) =>
                            h('div', {}, [
                              h('div', {
                                style: {
                                  fontSize: '12px',
                                },
                              },
                              tt(title)),
                              h('div', {
                                style: {
                                  display: 'flex',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  userSelect: 'none',
                                },
                              },
                              [
                                h(optIndex.value <= 0 ? 'div' : IconCarbonChevronLeft, {
                                  style: {
                                    width: '1.2em',
                                    cursor: 'pointer',
                                  },
                                  onClick: withModifiers(() => {
                                    if (optIndex.value <= 0)
                                      return
                                    opt.value = opts[optIndex.value - 1]
                                  }, ['stop', 'prevent']),
                                }),
                                h('div', {}, untt(optMap[opt.value])),
                                h(optIndex.value >= opts.length - 1 ? 'div' : IconCarbonChevronRight, {
                                  style: {
                                    width: '1.2em',
                                    cursor: 'pointer',
                                  },
                                  onClick: withModifiers(() => {
                                    if (optIndex.value >= opts.length - 1)
                                      return
                                    opt.value = opts[optIndex.value + 1]
                                  }, ['stop', 'prevent']),
                                }),
                              ]),
                            ]),
                          ),
                          h('div', {
                            style: {
                              padding: '2px 0px 1px 0px',
                              border: '1px solid #A1A1AA',
                              borderRadius: '4px',
                              textAlign: 'center',
                              cursor: 'pointer',
                            },
                            onClick: withModifiers(() => {
                              if (buttonDisabled)
                                return
                              if (translateMounted.value)
                                return
                              enable({
                                detectionResolution: advDetectRes.value,
                                renderTextOrientation: advRenderTextDir.value,
                                textDetector: advTextDetector.value,
                                translator: advTranslator.value,
                              })
                              advancedMenuOpen.value = false
                            }, ['stop', 'prevent']),
                          }, tt(t('common.control.translate'))),
                        ]),
                      ]
                    : h(IconCarbonChevronRight, {
                      style: {
                        cursor: 'pointer',
                      },
                      onClick: withModifiers(() => {
                        advancedMenuOpen.value = true
                      }, ['stop', 'prevent']),
                    })
                  : h('div', {
                    style: {
                      width: '1px',
                      height: '16px',
                    },
                  }),
            ),
            h('div', {
              style: {
                position: 'absolute',
                left: '-5px',
                top: '-2px',
                background: '#fff',
                borderRadius: '24px',
              },
            }, [
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
                  if (advancedMenuOpen.value)
                    return
                  toggle()
                }, ['stop', 'prevent']),
                onContextmenu: withModifiers(() => {
                  if (translateMounted.value)
                    advancedMenuOpen.value = false
                  else advancedMenuOpen.value = !advancedMenuOpen.value
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
            ]),
          ]),
        ])
    }))
    buttonApp.mount(container)

    async function getTranslatedImage(optionsOverwrite?: TranslateOptionsOverwrite): Promise<string> {
      if (!optionsOverwrite && translatedImage)
        return translatedImage
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
          onprogress(e) {
            if (e.lengthComputable) {
              buttonText.value = t('common.source.download-image-progress', {
                progress: formatProgress(e.loaded, e.total),
              })
            }
          },
        }).catch((e) => {
          buttonText.value = t('common.source.download-image-error')
          throw e
        })
        originalImage = result.response as Blob
      }

      buttonText.value = t('common.client.resize')
      await nextTick()
      const { blob: resizedImage, suffix: resizedSuffix } = await resizeToSubmit(originalImage, originalSrcSuffix)

      buttonText.value = t('common.client.submit')
      const id = await submitTranslate(
        resizedImage,
        resizedSuffix,
        {
          onProgress(progress) {
            buttonText.value = t('common.client.submit-progress', { progress })
          },
        },
        optionsOverwrite,
      ).catch((e) => {
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
      const image = await downloadResultBlob(id, {
        onProgress(progress) {
          buttonText.value = t('common.client.download-image-progress', { progress })
        },
      }).catch((e) => {
        buttonText.value = t('common.client.download-image-error')
        throw e
      })
      const imageUri = URL.createObjectURL(image)

      translatedImage = imageUri
      translatedMap.set(originalSrc, translatedImage)

      buttonText.value = text
      buttonProcessing.value = false
      buttonDisabled = false
      return imageUri
    }

    async function enable(optionsOverwrite?: TranslateOptionsOverwrite) {
      try {
        const translated = await getTranslatedImage(optionsOverwrite)
        imageNode.setAttribute('data-trans', src)
        imageNode.setAttribute('src', translated)
        imageNode.removeAttribute('srcset')

        translateMounted.value = true
        buttonTranslated.value = true
      }
      catch (e) {
        buttonDisabled = false
        translateMounted.value = false
        throw e
      }
    }
    function disable() {
      imageNode.setAttribute('src', src)
      if (srcset)
        imageNode.setAttribute('srcset', srcset)
      imageNode.removeAttribute('data-trans')
      translateMounted.value = false
      buttonTranslated.value = false
    }

    // called on click
    function toggle() {
      if (buttonDisabled)
        return
      if (!translateMounted.value) {
        translateEnabledMap.set(originalSrc, true)
        enable()
      }
      else {
        translateEnabledMap.delete(originalSrc)
        disable()
      }
    }

    // enable if enabled
    if (translateEnabledMap.get(originalSrc))
      enable()

    return {
      imageNode,
      stop: () => {
        buttonApp.unmount()
        parent.removeChild(container)
        if (translateMounted.value)
          disable()
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
        return translateMounted.value
      },
    }
  }

  // translate all
  const transAllComp = defineComponent(() => {
    const started = ref(false)
    const total = ref(0)
    const finished = ref(0)
    const erred = ref(false)

    return () =>
      h('div', {
        'data-transall': 'true',
        'style': {
          display: 'inline-block',
          marginRight: '13px',
          padding: '0',
          color: 'inherit',
          height: '32px',
          lineHeight: '32px',
          cursor: 'pointer',
          fontWeight: '700',
        },
        'onClick': withModifiers(() => {
          if (started.value)
            return
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
            if (instance.isEnabled())
              inc()
            else instance.enable().then(inc).catch(err)
          }
        }, ['stop', 'prevent']),
      }, [
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
            : t('common.control.batch'),
        ),
      ])
  })
  let removeTransAll: (() => void) | undefined
  function refreshTransAll() {
    if (document.querySelector('.sc-emr523-2'))
      return
    const section = document.querySelector('.sc-181ts2x-0')
    if (section) {
      if (section.querySelector('[data-transall]'))
        return

      const container = document.createElement('div')
      section.appendChild(container)
      const transAllApp = createApp(transAllComp)
      transAllApp.mount(container)

      removeTransAll = () => {
        transAllApp.unmount()
        section.removeChild(container)
      }
    }
  }
  let removeMangaViewerTransAll: (() => void) | undefined
  function refreshManagaViewerTransAll() {
    const mangaViewer = document.querySelector('.gtm-manga-viewer-change-direction')?.parentElement?.parentElement
    if (mangaViewer) {
      if (removeMangaViewerTransAll)
        return

      const container = document.createElement('div')
      mangaViewer.prepend(container)
      const transAllApp = createApp(transAllComp)
      transAllApp.mount(container)

      removeMangaViewerTransAll = () => {
        transAllApp.unmount()
        mangaViewer.removeChild(container)
      }
    }
    else {
      if (removeMangaViewerTransAll) {
        removeMangaViewerTransAll()
        removeMangaViewerTransAll = undefined
      }
    }
  }

  const imageObserver = new MutationObserver(
    useThrottleFn(() => {
      rescanImages()
      refreshTransAll()
      refreshManagaViewerTransAll()
    }, 200, true, false),
  )
  imageObserver.observe(document.body, { childList: true, subtree: true })
  rescanImages()
  refreshTransAll()

  return {
    stop() {
      imageObserver.disconnect()
      instances.forEach(instance => instance.stop())
      removeTransAll?.()
      removeMangaViewerTransAll?.()
    },
  }
}

const translator: Translator = {
  match(url) {
    // https://www.pixiv.net/(en/)artworks/<id>
    return url.hostname.endsWith('pixiv.net') && url.pathname.match(/\/artworks\//)
  },
  mount,
}

export default translator
