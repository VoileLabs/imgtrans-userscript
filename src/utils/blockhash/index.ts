// Copyright 2014 Commons Machinery http://commonsmachinery.se/. Distributed under an MIT license, please see LICENSE.

import { lanczos } from '@rgba-image/lanczos'

const one_bits = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]

export function hammingDistance(hash1: string, hash2: string) {
  if (hash1.length !== hash2.length) throw new Error("Can't compare hashes with different length")

  let distance = 0

  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16)
    const n2 = parseInt(hash2[i], 16)
    distance += one_bits[n1 ^ n2]
  }

  return distance
}

function median(data: number[]) {
  const mdarr = data.slice(0)
  mdarr.sort((a, b) => a - b)
  if (mdarr.length % 2 === 0) {
    const middle = mdarr.length / 2
    return (mdarr[middle - 1] + mdarr[middle]) / 2
  }
  return mdarr[Math.floor(mdarr.length / 2)]
}

function translateBlocksToBits(blocks: number[], pixels_per_block: number) {
  const halfBlockValue = (pixels_per_block * 256 * 3) / 2
  const bandsize = blocks.length / 4

  // Compare medians across four horizontal bands
  for (let i = 0; i < 4; i++) {
    const m = median(blocks.slice(i * bandsize, (i + 1) * bandsize))
    for (let j = i * bandsize; j < (i + 1) * bandsize; j++) {
      const v = blocks[j]

      // Output a 1 if the block is brighter than the median.
      // With images dominated by black or white, the median may
      // end up being 0 or the max value, and thus having a lot
      // of blocks of value equal to the median.  To avoid
      // generating hashes of all zeros or ones, in that case output
      // 0 if the median is in the lower value space, 1 otherwise
      blocks[j] = Number(v > m || (Math.abs(v - m) < 1 && m > halfBlockValue))
    }
  }
}

function bitsToHexhash(bitsArray: number[]) {
  const hex = []
  for (let i = 0; i < bitsArray.length; i += 4) {
    const nibble = bitsArray.slice(i, i + 4)
    hex.push(parseInt(nibble.join(''), 2).toString(16))
  }
  return hex.join('')
}

function bmvbhashEven(data: ImageData, bits: number) {
  const blocksizeX = Math.floor(data.width / bits)
  const blocksizeY = Math.floor(data.height / bits)

  const result = []

  for (let y = 0; y < bits; y++) {
    for (let x = 0; x < bits; x++) {
      let total = 0

      for (let iy = 0; iy < blocksizeY; iy++) {
        for (let ix = 0; ix < blocksizeX; ix++) {
          const cx = x * blocksizeX + ix
          const cy = y * blocksizeY + iy
          const ii = (cy * data.width + cx) * 4

          const alpha = data.data[ii + 3]
          if (alpha === 0) {
            total += 765
          } else {
            total += data.data[ii] + data.data[ii + 1] + data.data[ii + 2]
          }
        }
      }

      result.push(total)
    }
  }

  translateBlocksToBits(result, blocksizeX * blocksizeY)
  return bitsToHexhash(result)
}

function bmvbhash(data: ImageData, bits: number) {
  const evenX = data.width % bits === 0
  const evenY = data.height % bits === 0
  if (evenX && evenY) {
    return bmvbhashEven(data, bits)
  }

  // initialize blocks array with 0s
  const blocks: number[][] = new Array(bits).fill(0).map(() => new Array(bits).fill(0))

  const blockWidth = data.width / bits
  const blockWeight = data.height / bits

  for (let y = 0; y < data.height; y++) {
    let blockTop, blockBottom, blockLeft, blockRight, weightTop, weightBottom, weightLeft, weightRight
    if (evenY) {
      // don't bother dividing y, if the size evenly divides by bits
      blockTop = blockBottom = Math.floor(y / blockWeight)
      weightTop = 1
      weightBottom = 0
    } else {
      const yMod = (y + 1) % blockWeight
      const yFrac = yMod - Math.floor(yMod)
      const yInt = yMod - yFrac

      weightTop = 1 - yFrac
      weightBottom = yFrac

      // yInt will be 0 on bottom/right borders and on block boundaries
      if (yInt > 0 || y + 1 === data.height) {
        blockTop = blockBottom = Math.floor(y / blockWeight)
      } else {
        blockTop = Math.floor(y / blockWeight)
        blockBottom = Math.ceil(y / blockWeight)
      }
    }

    for (let x = 0; x < data.width; x++) {
      const ii = (y * data.width + x) * 4

      const alpha = data.data[ii + 3]
      let avgvalue
      if (alpha === 0) {
        avgvalue = 765
      } else {
        avgvalue = data.data[ii] + data.data[ii + 1] + data.data[ii + 2]
      }

      if (evenX) {
        blockLeft = blockRight = Math.floor(x / blockWidth)
        weightLeft = 1
        weightRight = 0
      } else {
        const xMod = (x + 1) % blockWidth
        const xFrac = xMod - Math.floor(xMod)
        const xInt = xMod - xFrac

        weightLeft = 1 - xFrac
        weightRight = xFrac

        // xInt will be 0 on bottom/right borders and on block boundaries
        if (xInt > 0 || x + 1 === data.width) {
          blockLeft = blockRight = Math.floor(x / blockWidth)
        } else {
          blockLeft = Math.floor(x / blockWidth)
          blockRight = Math.ceil(x / blockWidth)
        }
      }

      // add weighted pixel value to relevant blocks
      blocks[blockTop][blockLeft] += avgvalue * weightTop * weightLeft
      blocks[blockTop][blockRight] += avgvalue * weightTop * weightRight
      blocks[blockBottom][blockLeft] += avgvalue * weightBottom * weightLeft
      blocks[blockBottom][blockRight] += avgvalue * weightBottom * weightRight
    }
  }

  const result = blocks.flat()

  translateBlocksToBits(result, blockWidth * blockWeight)
  return bitsToHexhash(result)
}

export function blockhash(imgData: ImageData, bits = 16, method: 1 | 2 = 2) {
  const resizedData = new ImageData(256, 256)
  lanczos(imgData, resizedData)

  if (method === 1) {
    return bmvbhashEven(resizedData, bits)
  } else if (method === 2) {
    return bmvbhash(resizedData, bits)
  } else {
    throw new Error('Bad hashing method')
  }
}
