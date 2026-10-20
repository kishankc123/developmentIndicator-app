import { useEffect, useState } from 'react'

/** Result of an async load: still loading, failed, or done. */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T }

/** The latest settled result, tagged with the key it answers. */
type Settled<T> = { key: string; error?: Error; data?: T }

/**
 * Runs `load` whenever `key` changes and returns its state.
 * The previous request is aborted on change/unmount, and a result is only used
 * if its key matches the current one, so a slow old response can never overwrite
 * a newer one. Loading is derived (key mismatch) rather than set in the effect.
 *
 * `key` must uniquely describe everything `load` depends on.
 */
export function useAsyncData<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): AsyncState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => setSettled({ key, data }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ key, error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => controller.abort()
    // `load` is a closure over exactly what `key` encodes, so keying on `key` alone is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!settled || settled.key !== key) return { status: 'loading' }
  if (settled.error) return { status: 'error', error: settled.error }
  return { status: 'success', data: settled.data as T }
}
