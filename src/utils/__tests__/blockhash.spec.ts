import { ImageData } from 'canvas'
import { blockhash, hammingDistance } from '../blockhash'
import { loadImageAsImageData } from './utils'

describe.skip('blockhash', async () => {
  globalThis.ImageData = ImageData
  afterAll(() => {
    // @ts-expect-error
    delete globalThis.ImageData
  })

  const imageDataOriginal = await loadImageAsImageData('./samples/original3.jpg')
  const imageDataCompressed = await loadImageAsImageData('./samples/compressed3.jpg')

  it('hash', () => {
    const hash = blockhash(imageDataOriginal)
    expect(hash).toBe('d003d955e0f3e1b3e08bec0df805be873f003fc0f5e889f8ecc03f05a4c5ecb3')
  })
  it('can keep near hash when compressed', () => {
    const hash = blockhash(imageDataOriginal)
    const hash2 = blockhash(imageDataCompressed)
    expect(hammingDistance(hash, hash2)).toBeLessThan(8)
  })
})
