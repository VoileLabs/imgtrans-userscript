export async function submitTranslate(blob: Blob, suffix: string) {
  const formData = new FormData()
  formData.append('file', blob, 'image.' + suffix)

  const result = await GM.xmlHttpRequest({
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
  const result = await GM.xmlHttpRequest({
    method: 'GET',
    url: 'https://touhou.ai/imgtrans/task-state?taskid=' + id,
  })
  const data = JSON.parse(result.responseText)
  return {
    state: data.state as string,
    waiting: (data.waiting || 0) as number,
  }
}

export function getStatusText(status: Status): string {
  switch (status.state) {
    case 'pending':
      if (status.waiting > 0) {
        return `正在等待，你的队列位置${status.waiting}`
      } else {
        return `正在处理`
      }
    case 'detection':
      return '正在检测文本'
    case 'ocr':
      return '正在识别文本'
    case 'mask_generation':
      return '正在生成文本掩码'
    case 'inpainting':
      return '正在修补图片'
    case 'translating':
      return '正在翻译'
    case 'render':
      return '正在渲染'
    case 'error':
      return '翻译出错'
    case 'error-lang':
      return '不支持的语言'
    default:
      return '未知状态'
  }
}

export async function pullTransStatusUntilFinish(id: string, cb: (status: Status) => void) {
  for (;;) {
    const timer = new Promise((resolve) => setTimeout(resolve, 500))

    const status = await getTranslateStatus(id)
    if (status.state === 'finished') {
      return
    } else if (status.state === 'error') {
      throw new Error('翻译出错')
    } else if (status.state === 'error-lang') {
      throw new Error('不支持的语言')
    } else {
      cb(status)
    }

    await timer
  }
}

export { blockhashData, hammingDistance } from './blockhash'
import { blockhashData } from './blockhash'

export function blobToImageData(blob: Blob): Promise<ImageData> {
  const blobUrl = URL.createObjectURL(blob)

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = blobUrl
  }).then((img) => {
    URL.revokeObjectURL(blobUrl)

    let w = img.width
    let h = img.height
    const factor = Math.max(w, h) / 256
    w = w / factor
    h = h / factor

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    return ctx.getImageData(0, 0, w, h)
  })
}

export async function blockhashBlob(blob: Blob, bits?: number, method?: 1 | 2): Promise<string> {
  const imgData = await blobToImageData(blob)
  return blockhashData(imgData, bits, method)
}
