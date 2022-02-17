import { ImageData } from 'canvas'
import { blockhash, hammingDistance } from '../blockhash'
import { loadImageAsImageData } from './utils'

describe('blockhash', async () => {
  globalThis.ImageData = ImageData
  afterAll(() => {
    // @ts-expect-error
    delete globalThis.ImageData
  })

  const imageDataOriginalGrayscale = await loadImageAsImageData('./samples/original3.jpg')
  const imageDataCompressedGrayscale = await loadImageAsImageData('./samples/compressed3.jpg')
  const imageDataOriginalColor = await loadImageAsImageData('./samples/original2.jpg')
  const imageDataCompressedColor = await loadImageAsImageData('./samples/compressed2.jpg')

  it('hash grayscale', () => {
    const hash = blockhash(imageDataOriginalGrayscale)
    expect(hash).toBe('d003f955e0f3e0b3e08be80df805bea73f003fc0f5e889f8ecc03f05a4c5ecb3')
  })
  it('can keep grayscale near hash when compressed', () => {
    const hash = blockhash(imageDataOriginalGrayscale)
    const hash2 = blockhash(imageDataCompressedGrayscale)
    expect(hammingDistance(hash, hash2)).toBeLessThan(8)
  })

  it('hash color', () => {
    const hash = blockhash(imageDataOriginalColor)
    expect(hash).toBe('f01fc01f801f8f1fc46f80e384e3ce79fe65e066e161e530ec30ec1c8a1eaf1e')
  })
  it('can keep near color hash when compressed', () => {
    const hash = blockhash(imageDataOriginalColor)
    const hash2 = blockhash(imageDataCompressedColor)
    expect(hammingDistance(hash, hash2)).toBeLessThan(8)
  })
})
