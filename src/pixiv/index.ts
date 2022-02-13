import { blobToImageData, getStatusText, pullTransStatusUntilFinish, submitTranslate } from '../utils/core'
import { blockhash } from '../utils/blockhash'
import { phash } from '../utils/phash'

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

    async function getTranslatedImage(): Promise<string> {
      if (translatedImage) return translatedImage
      buttonDisabled = true
      const text = button.innerText

      button.innerText = '正在拉取原图'
      if (!originalImage) {
        // fetch original image
        const result = await GM.xmlHttpRequest({
          method: 'GET',
          responseType: 'blob',
          url: originalSrc,
          headers: { referer: 'https://www.pixiv.net/' },
          overrideMimeType: 'text/plain; charset=x-user-defined',
        }).catch((e) => {
          button.innerText = '拉取原图出错'
          throw e
        })
        originalImage = result.response as Blob
      }
      const imageData = await blobToImageData(originalImage)
      console.log('blockhash', blockhash(imageData), 'phash', phash(imageData))
      button.innerText = '正在提交翻译'
      const id = await submitTranslate(originalImage, originalSrcSuffix).catch((e) => {
        button.innerText = '提交翻译出错'
        throw e
      })

      button.innerText = '正在等待'
      await pullTransStatusUntilFinish(id, (status) => {
        const text = getStatusText(status)
        button.innerText = text
      }).catch((e) => {
        button.innerText = String(e)
        throw e
      })

      button.innerText = '正在下载图片'
      const image = await GM.xmlHttpRequest({
        method: 'GET',
        responseType: 'blob',
        url: 'https://touhou.ai/imgtrans/result/' + id + '/final.jpg',
      }).catch((e) => {
        button.innerText = '下载图片出错'
        throw e
      })
      const imageUri = URL.createObjectURL(image.response as Blob)

      translatedImage = imageUri
      translatedMap.set(originalSrc, translatedImage)

      button.innerText = text
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
        button.innerText = '还原'
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
      button.innerText = '翻译'
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

    // create a translate botton
    parent.style.position = 'relative'

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.zIndex = '1'
    container.style.bottom = '10px'
    container.style.right = '10px'

    const button = document.createElement('button')
    button.setAttribute('type', 'button')
    button.innerText = '翻译'
    button.style.fontSize = '1rem'
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      toggle()
    })
    container.appendChild(button)

    parent.appendChild(container)

    // enable if enabled
    if (translateEnabledMap.get(originalSrc)) enable()

    return {
      imageNode,
      stop: () => {
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
      const container = bookmark.parentElement!.parentElement!
      if (container.querySelector('[data-transall]')) return

      const el = document.createElement('div')
      el.innerText = '翻译全部'
      el.setAttribute('data-transall', 'true')
      el.style.display = 'inline-block'
      el.style.marginRight = '13px'
      el.style.padding = '0'
      el.style.color = 'inherit'
      el.style.height = '32px'
      el.style.lineHeight = '32px'
      el.style.cursor = 'pointer'
      el.style.fontWeight = '700'

      const transall = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        let finished = 0
        const total = instances.size
        el.innerText = `翻译中(0/${total})`
        let erred = false
        const inc = () => {
          finished++
          if (finished === total) {
            if (erred) el.innerText = '翻译完成'
            else el.innerText = '翻译完成(有失败)'
            el.removeEventListener('click', transall)
          } else {
            el.innerText = `翻译中(${finished}/${total})`
          }
        }
        const err = () => {
          erred = true
          inc()
        }
        for (const instance of instances.values()) {
          if (instance.isEnabled()) inc()
          else instance.enable().then(inc).catch(err)
        }
      }
      el.addEventListener('click', transall)

      container.appendChild(el)

      removeTransAll = () => {
        container.removeChild(el)
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
