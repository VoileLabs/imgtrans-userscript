const mimeMap: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
}
export function suffixToMime(suffix: string) {
  return mimeMap[suffix]
}

function formatSize(bytes: number) {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0B'
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)}${sizes[i]}`
}
export function formatProgress(loaded: number, total: number) {
  return `${formatSize(loaded)}/${formatSize(total)}`
}

import { phash as phashInner } from '../../wasm/pkg'
export function phash(image: ImageData) {
  return phashInner(new Uint8Array(image.data), image.width, image.height)
}
