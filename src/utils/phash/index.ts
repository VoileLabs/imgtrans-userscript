import { lanczos } from '@rgba-image/lanczos'

const cosMap = new Map<number, number[]>()

function memoizeCosines(n: number) {
  const cos: number[] = new Array(n ** 2)
  const piN = Math.PI / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cos[j + i * n] = Math.cos(piN * (j + 0.5) * i)
    }
  }
  cosMap.set(n, cos)
}

// https://github.com/vail-systems/node-dct/blob/master/src/dct.js
function dct(signal: number[], scale = 2) {
  const l = signal.length

  if (!cosMap.has(l)) memoizeCosines(l)
  const cos = cosMap.get(l)!

  return signal.map((_, ix) => scale * signal.reduce((pv, cv, i) => pv + cv * cos[i + ix * l], 0))
}

function flipAxis<T>(arr: T[][]): T[][] {
  const len = arr.length
  const na: T[][] = new Array(len).fill(0).map(() => new Array(len))
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      na[i][j] = arr[j][i]
    }
  }
  return na
}

function median(arr: number[]): number {
  const na = arr.slice()
  const len = na.length
  const mid = Math.floor(len / 2)
  na.sort((a, b) => a - b)
  return len % 2 ? na[mid] : (na[mid] + na[mid - 1]) / 2
}

/**
 * Perceptual Hash computation.
 * Implementation follows http://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html
 * Converted to TypeScript from https://github.com/JohannesBuchner/imagehash/blob/0abd4878bdb3c2b7bd0a5ec58d1ffca530e70cec/imagehash.py#L197
 */
export function phash(image: ImageData, hashSize = 8, highfreqFactor = 4) {
  const imageSize = hashSize * highfreqFactor
  // convert image to grayscale
  const data = image.data
  const dataLength = data.length
  for (let i = 0; i < dataLength; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    data[i] = data[i + 1] = data[i + 2] = gray
  }
  // resize image to imageSize x imageSize
  const resizedImage = new ImageData(imageSize, imageSize)
  lanczos(image, resizedImage)
  // convert resizedImage to array of pixels
  // since we are using a grayscale image, we'll just read the red channel
  const resizedImageData = resizedImage.data
  const resizedImageDataLength = resizedImageData.length
  const pixels: number[] = new Array(resizedImageDataLength / 4)
  for (let i = 0; i < resizedImageDataLength; i += 4) {
    pixels[i / 4] = resizedImageData[i]
  }
  // format pixels into a 2d array
  const pixels2d = []
  for (let i = 0; i < pixels.length; i += imageSize) {
    pixels2d.push(pixels.slice(i, i + imageSize))
  }
  // apply dct by column
  const dctCol = flipAxis(flipAxis(pixels2d).map((col) => dct(col)))
  // apply dct by row
  const dctRow = dctCol.map((row) => dct(row))
  // slice and join
  const dctLowFreq = dctRow.slice(0, hashSize).reduce((pv, cv) => pv.concat(cv.slice(0, hashSize)), [])
  const med = median(dctLowFreq)
  const hash = dctLowFreq.map((v) => (v > med ? 1 : 0))
  // convert binary array hash to hex string
  let hashHex = ''
  for (let i = 0; i < hash.length; i += 4) {
    const h: number = (hash[i] << 3) | (hash[i + 1] << 2) | (hash[i + 2] << 1) | hash[i + 3]
    hashHex += h.toString(16)
  }
  return hashHex
}
