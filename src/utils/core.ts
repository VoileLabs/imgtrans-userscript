import { detectionResolution, renderTextDirection, targetLang, textDetector, translator } from '../composables'
import { BCP47ToISO639, realLang, t, TranslateState } from '../i18n'

export async function submitTranslate(blob: Blob, suffix: string) {
  const formData = new FormData()
  formData.append('file', blob, 'image.' + suffix)
  formData.append('size', detectionResolution.value)
  formData.append('translator', translator.value)
  formData.append('tgt_lang', targetLang.value || BCP47ToISO639(realLang.value))
  formData.append('dir', renderTextDirection.value)
  formData.append('detector', textDetector.value)

  const result = await GMP.xmlHttpRequest({
    method: 'POST',
    url: 'https://touhou.ai/imgtrans/submit',
    // @ts-expect-error FormData is supported
    data: formData,
  })

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
    url: 'https://touhou.ai/imgtrans/task-state?taskid=' + id,
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
