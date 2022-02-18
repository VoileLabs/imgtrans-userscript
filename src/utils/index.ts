const mimeMap: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
}
export function suffixToMime(suffix: string) {
  return mimeMap[suffix]
}

import { phash as phashInner } from '../../wasm/pkg'
export function phash(image: ImageData) {
  return phashInner(new Uint8Array(image.data), image.width, image.height)
}
