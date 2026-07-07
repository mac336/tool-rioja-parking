import { useEffect, useState, useCallback } from 'react'
import type { LoadState } from '@/types'

/** Hook simple de carga async con estados loading/empty/error/ready y refetch. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  const run = useCallback(() => {
    let alive = true
    setState('loading')
    fn()
      .then((d) => {
        if (!alive) return
        setData(d)
        const empty = Array.isArray(d) && d.length === 0
        setState(empty ? 'empty' : 'ready')
      })
      .catch(() => alive && setState('error'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])

  return { data, state, refetch: run, setData }
}
