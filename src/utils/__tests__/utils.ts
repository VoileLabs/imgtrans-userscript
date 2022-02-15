import path from 'node:path'
import { createCanvas, loadImage } from 'canvas'

export async function loadImageAsImageData(dir: string) {
  const sample = await loadImage(path.join(__dirname, dir))
  const canvas = createCanvas(sample.naturalWidth, sample.naturalHeight)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(sample, 0, 0)
  const imageData = ctx.getImageData(0, 0, sample.width, sample.height)
  return imageData
}