import { formatProgress, formatSize, resize } from '.'
import {
  detectionResolution,
  renderTextOrientation,
  targetLang,
  textDetector,
  translatorService,
} from '../composables/storage'
import type { TranslateState } from '../i18n'
import { BCP47ToISO639, realLang, t } from '../i18n'

export async function resizeToSubmit(blob: Blob, suffix: string): Promise<{ blob: Blob; suffix: string }> {
  const imageData = await blobToImageData(blob)
  if (imageData.width <= 4000 && imageData.height <= 4000) return { blob, suffix }
  // resize to less than 4k
  const scale = Math.min(4000 / imageData.width, 4000 / imageData.height)
  const width = Math.floor(imageData.width * scale)
  const height = Math.floor(imageData.height * scale)
  const newImageData = resize(imageData, width, height)
  const newBlob = await imageDataToBlob(newImageData)
  console.log(
    `resized from ${imageData.width}x${imageData.height}(${formatSize(
      blob.size
    )},${suffix}) to ${width}x${height}(${formatSize(newBlob.size)},png)`
  )
  return {
    blob: newBlob,
    suffix: 'png',
  }
}

export interface TranslateOptionsOverwrite {
  detectionResolution?: string
  renderTextOrientation?: string
  textDetector?: string
  translator?: string
}
export async function submitTranslate(
  blob: Blob,
  suffix: string,
  listeners: {
    onProgress?: (progress: string) => void
  } = {},
  optionsOverwrite?: TranslateOptionsOverwrite
) {
  const { onProgress } = listeners

  const formData = new FormData()
  formData.append('file', blob, 'image.' + suffix)
  formData.append('size', optionsOverwrite?.detectionResolution ?? detectionResolution.value)
  formData.append('translator', optionsOverwrite?.translator ?? translatorService.value)
  formData.append('tgt_lang', targetLang.value || BCP47ToISO639(realLang.value))
  formData.append('dir', optionsOverwrite?.renderTextOrientation ?? renderTextOrientation.value)
  formData.append('detector', optionsOverwrite?.textDetector ?? textDetector.value)

  const result = await GMP.xmlHttpRequest({
    method: 'POST',
    url: 'https://touhou.ai/imgtrans/submit',
    // @ts-expect-error FormData is supported
    data: formData,
    // supported in GM
    upload: {
      onprogress: onProgress
        ? (e: ProgressEvent) => {
            if (e.lengthComputable) {
              const p = formatProgress(e.loaded, e.total)
              onProgress(p)
            }
          }
        : undefined,
    },
  })

  console.log(result.responseText)
  const json = JSON.parse(result.responseText)
  const id = json.task_id as string
  return id
}

interface Status {
  state: string
  waiting: number
}

export async function getTranslateStatus(id: string): Promise<Status> {
  const result = await GMP.xmlHttpRequest({
    method: 'GET',
    url: `https://touhou.ai/imgtrans/task-state?taskid=${id}`,
  })
  const data = JSON.parse(result.responseText)
  return {
    state: data.state as string,
    waiting: (data.waiting || 0) as number,
  }
}

export function getStatusText(status: Status): TranslateState {
  switch (status.state) {
    case 'pending':
      if (status.waiting > 0) {
        return t('common.status.pending_pos', { pos: status.waiting })
      } else {
        return t('common.status.pending')
      }
    case 'detection':
      return t('common.status.detection')
    case 'ocr':
      return t('common.status.ocr')
    case 'mask_generation':
      return t('common.status.mask_generation')
    case 'inpainting':
      return t('common.status.inpainting')
    case 'translating':
      return t('common.status.translating')
    case 'render':
      return t('common.status.render')
    case 'error':
      return t('common.status.error')
    case 'error-lang':
      return t('common.status.error-lang')
    default:
      return t('common.status.default')
  }
}

export async function pullTransStatusUntilFinish(id: string, cb: (status: Status) => void) {
  for (;;) {
    const timer = new Promise((resolve) => setTimeout(resolve, 500))

    const status = await getTranslateStatus(id)
    if (status.state === 'finished') {
      return
    } else if (status.state === 'error') {
      throw t('common.status.error')
    } else if (status.state === 'error-lang') {
      throw t('common.status.error-lang')
    } else {
      cb(status)
    }

    await timer
  }
}

export async function downloadResultBlob(
  id: string,
  listeners: {
    onProgress?: (progress: string) => void
  } = {}
): Promise<Blob> {
  const { onProgress } = listeners

  const res = await GMP.xmlHttpRequest({
    method: 'GET',
    responseType: 'blob',
    url: `https://touhou.ai/imgtrans/result/${id}/final.png`,
    onprogress: onProgress
      ? (e) => {
          if (e.lengthComputable) {
            const p = formatProgress(e.loaded, e.total)
            onProgress(p)
          }
        }
      : undefined,
  })

  return res.response as Blob
}

export function blobToImageData(blob: Blob): Promise<ImageData> {
  const blobUrl = URL.createObjectURL(blob)

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = blobUrl
  }).then((img) => {
    URL.revokeObjectURL(blobUrl)

    const w = img.width
    const h = img.height

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    return ctx.getImageData(0, 0, w, h)
  })
}

export async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas toBlob failed'))
      }
    }, 'image/png')
  })

  return blob
}
