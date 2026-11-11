import { describe, expect, it, vi, afterEach } from 'vitest'
import { searchCountries } from './searchCountries'
import type { RawCountry } from './types'

const spainRaw: RawCountry[] = [
  {
    name: 'Spain',
    flag: '🇪🇸',
    capital: 'Madrid',
    region: 'Europe',
    population: 47351567,
    languages: [{ name: 'Spanish', iso639_1: 'es' }],
  },
]

type PendingCall = {
  url: string
  signal: AbortSignal
  resolve: (value: Response) => void
  reject: (reason: unknown) => void
}

function installDeferredFetch(): { calls: PendingCall[] } {
  const calls: PendingCall[] = []
  const mock = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
    const signal = options?.signal
    return new Promise<Response>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
        return
      }
      const entry: PendingCall = { url: _url, signal: signal as AbortSignal, resolve, reject }
      calls.push(entry)
      const onAbort = () => {
        signal?.removeEventListener('abort', onAbort)
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  })
  vi.stubGlobal('fetch', mock)
  return { calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('race condition (stale responses must not win)', () => {
  it('earlier request aborted on new input; late resolve of stale request is ignored', async () => {
    const { calls } = installDeferredFetch()

    const controller1 = new AbortController()
    const controller2 = new AbortController()

    const promise1 = searchCountries('sp', controller1.signal)
    const promise2 = searchCountries('spain', controller2.signal)

    expect(calls).toHaveLength(2)
    expect(calls[0]!.url).toBe('https://countries.dev/name/sp')
    expect(calls[1]!.url).toBe('https://countries.dev/name/spain')

    // New input arrives: the app aborts the previous request for real.
    controller1.abort()

    await expect(promise1).rejects.toMatchObject({ name: 'AbortError' })

    // The later request resolves first.
    const spainResponse = new Response(JSON.stringify(spainRaw), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    calls[1]!.resolve(spainResponse)

    const result2 = await promise2
    expect(result2).toHaveLength(1)
    expect(result2[0]).toMatchObject({
      name: 'Spain',
      flag: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
    })

    // The stale earlier response arrives after the newer one — it must not surface.
    calls[0]!.resolve(new Response('[]', { status: 200 }))

    const result1 = await expect(promise1).rejects.toMatchObject({ name: 'AbortError' })
    expect(result1).toBeDefined()
  })

  it('each caller keeps its own signal: aborting one does not reject another caller promise', async () => {
    const { calls } = installDeferredFetch()

    const controller1 = new AbortController()
    const controller2 = new AbortController()

    const promise1 = searchCountries('spain', controller1.signal)
    const promise2 = searchCountries('spain', controller2.signal)

    expect(calls).toHaveLength(2)
    controller1.abort()

    await expect(promise1).rejects.toMatchObject({ name: 'AbortError' })

    // Only the aborted caller's fetch is rejected; the other caller keeps waiting.
    calls[1]!.resolve(new Response('[]', { status: 200 }))
    await expect(promise2).resolves.toEqual([])
  })
})
