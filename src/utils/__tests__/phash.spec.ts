import { ImageData } from 'canvas'
import { phash } from '../phash'
import { hammingDistance } from '../blockhash'
import { loadImageAsImageData } from './utils'

describe('phash', async () => {
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
    const hash = phash(imageDataOriginalGrayscale)
    expect(hash).toBe('e98a3ac1bad25162263167b7773c4c349a5b9b586953648eaed6982c51afb619')
  })
  it('can keep grayscale near hash when compressed', () => {
    const hash = phash(imageDataOriginalGrayscale)
    const hash2 = phash(imageDataCompressedGrayscale)
    expect(hammingDistance(hash, hash2)).toBeLessThan(8)
  })

  it('hash color', () => {
    const hash = phash(imageDataOriginalColor)
    expect(hash).toBe('f75c2f90e4d6e0aba1775ba838bce162c6ab8ec4055f47a8a2dd15e80e293f50')
  })
  it('can keep near color hash when compressed', () => {
    const hash = phash(imageDataOriginalColor)
    const hash2 = phash(imageDataCompressedColor)
    expect(hammingDistance(hash, hash2)).toBeLessThan(8)
  })
})
