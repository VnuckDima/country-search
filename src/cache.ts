import { searchCountries } from './searchCountries'
import type { CountryCard } from './types'

type Flight = {
  owner: AbortController
  promise: Promise<CountryCard[]>
}

/**
 * Кэш ответов по строке запроса с дедупликацией одновременно полётающих
 * одинаковых запросов.
 *
 * Каждый вызывающий получает свой промист и свой сигнал отмены: отмена одним
 * вызывающимrejects только его промист и не ломает общий полёт для остальных.
 * Реальная отмена сетевого запроса (AbortController.abort) происходит, когда
 * весь запрос認елен как устаревший (abort(query)).
 */
export class CountryCache {
  private data = new Map<string, CountryCard[]>()
  private flights = new Map<string, Flight>()

  search(query: string, signal: AbortSignal): Promise<CountryCard[]> {
    const cached = this.data.get(query)
    if (cached !== undefined) {
      return Promise.resolve(cached)
    }

    const flight = this.flights.get(query)
    if (flight) {
      return this.join(flight, signal)
    }

    const owner = new AbortController()
    const promise = searchCountries(query, owner.signal).then((data) => {
      this.data.set(query, data)
      return data
    })

    const newFlight: Flight = { owner, promise }
    this.flights.set(query, newFlight)
    return promise.then(
      (data) => {
        this.flights.delete(query)
        return data
      },
      (err) => {
        this.flights.delete(query)
        throw err
      },
    )
  }

  /** Реальная отмена сетевого запроса для запроса query (если он в полёте). */
  abort(query: string): void {
    const flight = this.flights.get(query)
    if (flight) {
      flight.owner.abort()
    }
  }

  abortAll(): void {
    for (const flight of this.flights.values()) {
      flight.owner.abort()
    }
  }

  size(): number {
    return this.data.size
  }

  private join(flight: Flight, signal: AbortSignal): Promise<CountryCard[]> {
    return new Promise<CountryCard[]>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort)
        reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
      }
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
      flight.promise.then(
        (data) => {
          signal.removeEventListener('abort', onAbort)
          resolve(data)
        },
        (err) => {
          signal.removeEventListener('abort', onAbort)
          reject(err)
        },
      )
    })
  }
}
