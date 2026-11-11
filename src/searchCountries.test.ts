import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
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

function abortReason(signal: AbortSignal | undefined): Error {
  return signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}

function installFetch(
  impl: (url: string, options?: { signal?: AbortSignal }) => unknown,
): ReturnType<typeof vi.fn> {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

function mockFetch(response: Response): ReturnType<typeof vi.fn> {
  return installFetch((_url, options) => {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(abortReason(signal))
    }
    if (signal) {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort)
        throw abortReason(signal)
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
    return Promise.resolve(response)
  })
}

function abortSignal(): { controller: AbortController; signal: AbortSignal } {
  const controller = new AbortController()
  return { controller, signal: controller.signal }
}

describe('searchCountries', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns mapped countries on successful response', async () => {
    mockFetch(
      new Response(JSON.stringify(spainRaw), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { signal } = abortSignal()
    const result = await searchCountries('spain', signal)

    expect(result).toEqual([
      {
        name: 'Spain',
        flag: '🇪🇸',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        languages: ['Spanish'],
      },
    ])
    expect(fetch).toHaveBeenCalledWith(
      'https://countries.dev/name/spain',
      expect.objectContaining({ signal }),
    )
  })

  it('encodes the query in the URL', async () => {
    mockFetch(new Response('[]', { status: 200 }))
    const { signal } = abortSignal()
    await searchCountries('spain ', signal)
    expect(fetch).toHaveBeenCalledWith(
      'https://countries.dev/name/spain%20',
      expect.anything(),
    )
  })

  it('404 (no matches) returns an empty array, not an error', async () => {
    mockFetch(new Response(null, { status: 404 }))
    const { signal } = abortSignal()
    const result = await searchCountries('nonexistent', signal)
    expect(result).toEqual([])
  })

  it('500 throws HttpError with status', async () => {
    mockFetch(new Response('Internal Server Error', { status: 500 }))
    const { signal } = abortSignal()
    await expect(searchCountries('x', signal)).rejects.toMatchObject({
      name: 'HttpError',
      status: 500,
    })
  })

  it('400 throws HttpError with status (response.ok is checked)', async () => {
    mockFetch(new Response('Bad Request', { status: 400 }))
    const { signal } = abortSignal()
    await expect(searchCountries('x', signal)).rejects.toMatchObject({
      name: 'HttpError',
      status: 400,
    })
  })

  it('aborted request rejects with AbortError, not HttpError', async () => {
    mockFetch(
      new Response(JSON.stringify(spainRaw), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const { controller, signal } = abortSignal()
    controller.abort()

    await expect(searchCountries('x', signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('request aborted mid-flight rejects with AbortError', async () => {
    let resolveFetch: (value: Response) => void = () => {}
    const pendingImpl = ((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve
        const onAbort = () => {
          const s = options?.signal
          s?.removeEventListener('abort', onAbort)
          reject(abortReason(s))
        }
        options?.signal?.addEventListener('abort', onAbort, { once: true })
      })
    }) as (url: string, options?: { signal?: AbortSignal }) => unknown
    installFetch(pendingImpl)

    const { controller, signal } = abortSignal()
    const promise = searchCountries('x', signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    resolveFetch(new Response('[]', { status: 200 }))
  })

  it('network error propagates as-is', async () => {
    installFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const { signal } = abortSignal()
    await expect(searchCountries('x', signal)).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Failed to fetch',
    })
  })
})

describe('searchCountries timeout', () => {
  it('rejects with TimeoutError when the response never arrives', async () => {
    const timeoutImpl = ((_url: string, options?: { signal?: AbortSignal }) => {
      const signal = options?.signal
      return new Promise<Response>((_, reject) => {
        if (signal?.aborted) {
          reject(abortReason(signal))
          return
        }
        const onAbort = () => {
          signal?.removeEventListener('abort', onAbort)
          reject(abortReason(signal))
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }) as (url: string, options?: { signal?: AbortSignal }) => unknown
    installFetch(timeoutImpl)

    const signal = AbortSignal.timeout(25)
    await expect(searchCountries('x', signal)).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  }, 5000)
})
