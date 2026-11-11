import { searchCountries } from './searchCountries'
import type { CountryCard } from './types'

type Flight = {
  owner: AbortController
  promise: Promise<CountryCard[]>
}

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
    let resolveFlight!: (data: CountryCard[]) => void
    let rejectFlight!: (err: unknown) => void

    const flightPromise = new Promise<CountryCard[]>((resolve, reject) => {
      resolveFlight = resolve
      rejectFlight = reject
    })

    searchCountries(query, owner.signal).then(
      (data) => {
        this.data.set(query, data)
        this.flights.delete(query)
        resolveFlight(data)
      },
      (err) => {
        this.flights.delete(query)
        rejectFlight(err)
      }
    )

    const newFlight: Flight = { owner, promise: flightPromise }
    this.flights.set(query, newFlight)
    return flightPromise
  }

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
        }
      )
    })
  }
}
