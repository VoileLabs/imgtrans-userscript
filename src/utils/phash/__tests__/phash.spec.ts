import path from 'node:path'
import { createCanvas, loadImage, ImageData } from 'canvas'
import { phash } from '..'

describe('phash', async () => {
  globalThis.ImageData = ImageData

  const sample = await loadImage(path.join(__dirname, './samples/original3.jpg'))

  const canvas = createCanvas(sample.naturalWidth, sample.naturalHeight)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(sample, 0, 0)
  const imageData = ctx.getImageData(0, 0, sample.width, sample.height)
  it('hash', () => {
    const hash = phash(imageData)
    // expect(hash).toBe('e93aba512467764c')
    expect(hash).toBe('e93aba512466774c')
  })
})
