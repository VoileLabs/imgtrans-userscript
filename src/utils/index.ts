const mimeMap: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
}
export function suffixToMime(suffix: string) {
  return mimeMap[suffix]
}
