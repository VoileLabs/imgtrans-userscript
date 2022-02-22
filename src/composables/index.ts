import { onScopeDispose, ref, Ref, UnwrapRef, watch } from 'vue'

export type RemovableRef<T> = Omit<Ref<T>, 'value'> & {
  get value(): T
  set value(value: T | null | undefined)
}

export function useGMStorage<T = string>(key: string): RemovableRef<T | undefined>
export function useGMStorage<T = string>(key: string, initialValue: T): RemovableRef<T>
export function useGMStorage<T>(key: string, initialValue?: T) {
  const data = ref<T | undefined>(initialValue)

  async function read(newValue?: string) {
    const rawValue = newValue ?? (await GMP.getValue(key))
    if (rawValue == null) {
      data.value = initialValue as UnwrapRef<T>
    } else {
      data.value = rawValue as UnwrapRef<T>
    }
  }

  read()

  let listener: number | undefined
  if (GMP.addValueChangeListener)
    (async () => {
      listener = await GMP.addValueChangeListener(key, (name, oldValue, newValue, remote) => {
        if (name === key) read(newValue)
      })
    })()

  const stopWatch = watch(data, async () => {
    if (data.value == null) {
      await GMP.deleteValue(key)
    } else {
      await GMP.setValue(key, data.value)
    }
  })

  onScopeDispose(() => {
    stopWatch()
    if (GMP.removeValueChangeListener && listener) GMP.removeValueChangeListener(listener)
  })

  return data as RemovableRef<T>
}

export const detectionResolution = useGMStorage('detectionResolution', 'M')
export const textDetector = useGMStorage('textDetector', 'auto')
export const translator = useGMStorage('translator', 'baidu')
export const renderTextDirection = useGMStorage('renderTextDirection', 'auto')
export const targetLang = useGMStorage('targetLang')
export const scriptLang = useGMStorage('scriptLanguage')
