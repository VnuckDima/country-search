import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { App } from './app'

type Deferred = {
  resolve: (value: Response) => void
  reject: (reason: unknown) => void
  signal: AbortSignal
}

const calls: Deferred[] = []
const rejections: unknown[] = []

const stubFetch = (): void => {
  vi.stubGlobal('fetch', vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
    const signal = options?.signal
    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => {
        signal?.removeEventListener('abort', onAbort)
        const reason = new DOMException('The operation was aborted.', 'AbortError')
        rejections.push(reason)
        reject(reason)
      }
      if (signal?.aborted) {
        onAbort()
        return
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      calls.push({ resolve, reject, signal })
    })
  }))
}

const tick = (ms = 50): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const resolveCall = async (index: number, body: unknown, status = 200): Promise<void> => {
  calls[index]!.resolve(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  await tick(50)
}

const input = (): HTMLInputElement => document.getElementById('query') as HTMLInputElement
const resultsEl = (): HTMLElement => document.getElementById('results')!
const cards = (): NodeListOf<Element> => resultsEl().querySelectorAll('.card')
const errorBox = (): HTMLElement => document.getElementById('error')!
const emptyBox = (): HTMLElement => document.getElementById('empty')!
const loader = (): HTMLElement => document.getElementById('loader')!
const detailEl = (): HTMLElement => document.getElementById('detail')!

const typeIn = (query: string): void => {
  const field = input()
  field.value = query
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('App interaction', () => {
  beforeEach(() => {
    calls.length = 0
    rejections.length = 0
    stubFetch()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('debounces the request and aborts the previous one on new input', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('sp')
    expect(loader().hidden).toBe(false)
    expect(fetch).not.toHaveBeenCalled()

    await tick(350)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('https://countries.dev/name/sp', expect.anything())

    typeIn('spain')
    expect(
      rejections.some((e) => e instanceof DOMException && e.name === 'AbortError'),
    ).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1) // старый запрос отменён, нового ещё нет

    await tick(350)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://countries.dev/name/spain',
      expect.anything(),
    )

    const spain = [
      {
        name: 'Spain',
        flag: '🇪🇸',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        languages: [{ name: 'Spanish', iso639_1: 'es' }],
        area: 505992,
        borders: [],
        currencies: [],
      },
    ]
    await resolveCall(1, spain)

    expect(loader().hidden).toBe(true)
    expect(errorBox().hidden).toBe(true)
    expect(emptyBox().hidden).toBe(true)
    expect(cards()).toHaveLength(1)
    expect(resultsEl().textContent).toContain('Spain')
    expect(resultsEl().textContent).toContain('Madrid')
  })

  it('404 shows a friendly empty state, not an error', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('atlantida')
    await tick(350)
    await resolveCall(0, null, 404)

    expect(cards()).toHaveLength(0)
    expect(emptyBox().hidden).toBe(false)
    expect(emptyBox().textContent).toContain('Ничего не найдено')
    expect(errorBox().hidden).toBe(true)
  })

  it('500 shows an error with a retry button that repeats the last query', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('germany')
    await tick(350)
    await resolveCall(0, 'Internal Server Error', 500)

    expect(errorBox().hidden).toBe(false)
    expect(errorBox().textContent).toContain('500')

    errorBox().querySelector('#retry')!.click()
    await tick(50)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://countries.dev/name/germany',
      expect.anything(),
    )
  })

  it('network failure shows an error with retry', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('france')
    await tick(350)
    calls[0]!.reject(new TypeError('Failed to fetch'))
    await tick(50)

    expect(errorBox().hidden).toBe(false)
    expect(errorBox().textContent).toContain('соединение')
  })

  it('click on a card opens the detail view, back returns to the list', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('spain')
    await tick(350)
    await resolveCall(0, [
      {
        name: 'Spain',
        flag: '🇪🇸',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        languages: [{ name: 'Spanish', iso639_1: 'es' }],
        area: 505992,
        borders: ['PORT', 'FRA'],
        currencies: [{ code: 'EUR', name: 'Euro' }],
      },
    ])

    cards()[0].click()
    expect(detailEl().hidden).toBe(false)
    expect(resultsEl().hidden).toBe(true)
    expect(detailEl().textContent).toContain('Spain')
    expect(detailEl().textContent).toContain((505992).toLocaleString('ru-RU'))
    expect(detailEl().textContent).toContain('Madrid')
    expect(detailEl().textContent).toContain('Euro')

    detailEl().querySelector('#detail-back')!.click()
    expect(detailEl().hidden).toBe(true)
    expect(resultsEl().hidden).toBe(false)
  })

  it('empty input sends no request and clears the list', async () => {
    document.body.innerHTML = ''
    new App()

    typeIn('spain')
    await tick(350)
    await resolveCall(0, [
      { name: 'Spain', flag: '🇪🇸', capital: 'Madrid', region: 'Europe', population: 1, languages: [], area: 0, borders: [], currencies: [] },
    ])
    expect(cards()).toHaveLength(1)

    typeIn('')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cards()).toHaveLength(0)
    expect(loader().hidden).toBe(true)
  })
})
