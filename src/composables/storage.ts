import { pausableWatch } from '@vueuse/shared'
import type { Ref, UnwrapRef } from 'vue'
import { onScopeDispose, ref } from 'vue'

export type GMStorageRef<T> = Omit<Ref<T>, 'value'> & {
  get value(): T
  set value(value: T | null | undefined)
  ready: Promise<void>
  isReady: boolean
}

export function useGMStorage<T = string>(key: string): GMStorageRef<UnwrapRef<T> | undefined>
export function useGMStorage<T = string>(key: string, initialValue: T): GMStorageRef<UnwrapRef<T>>
export function useGMStorage<T>(key: string, initialValue?: T) {
  const data = ref<T | undefined>(initialValue) as unknown as GMStorageRef<UnwrapRef<T>>

  let listener: number | undefined
  if (GMP.addValueChangeListener)
    (async () => {
      listener = await GMP.addValueChangeListener(key, (name, oldValue, newValue, remote) => {
        if (name === key && (remote === undefined || remote === true)) {
          read(newValue)
        }
      })
    })()

  const {
    pause: pauseWatch,
    resume: resumeWatch,
    stop: stopWatch,
  } = pausableWatch(
    data,
    async (newValue, oldValue) => {
      if (newValue == null) {
        await GMP.deleteValue(key)
        pauseWatch()
        data.value = initialValue as UnwrapRef<T>
        resumeWatch()
      } else {
        await GMP.setValue(key, newValue)
      }
    },
    {
      flush: 'sync',
    }
  )

  async function read(newValue?: string) {
    pauseWatch()
    const rawValue = newValue ?? (await GMP.getValue(key))
    if (rawValue == null) {
      data.value = initialValue as UnwrapRef<T>
    } else {
      data.value = rawValue as UnwrapRef<T>
    }
    resumeWatch()
  }

  data.ready = read().then(() => {
    data.isReady = true
  })

  onScopeDispose(() => {
    stopWatch()
    if (GMP.removeValueChangeListener && listener) GMP.removeValueChangeListener(listener)
  })

  return data
}

export const detectionResolution = useGMStorage('detectionResolution', 'M')
export const textDetector = useGMStorage('textDetector', 'auto')
export const translatorService = useGMStorage('translator', 'youdao')
export const renderTextOrientation = useGMStorage('renderTextOrientation', 'auto')
export const targetLang = useGMStorage('targetLang')
export const scriptLang = useGMStorage('scriptLanguage')

export const storageReady = Promise.all([
  detectionResolution.ready,
  textDetector.ready,
  translatorService.ready,
  renderTextOrientation.ready,
  targetLang.ready,
  scriptLang.ready,
])
