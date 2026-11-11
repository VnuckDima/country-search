import { searchCountries } from './searchCountries';
export class CountryCache {
    data = new Map();
    flights = new Map();
    search(query, signal) {
        const cached = this.data.get(query);
        if (cached !== undefined) {
            return Promise.resolve(cached);
        }
        const flight = this.flights.get(query);
        if (flight) {
            return this.join(flight, signal);
        }
        const owner = new AbortController();
        let resolveFlight;
        let rejectFlight;
        const flightPromise = new Promise((resolve, reject) => {
            resolveFlight = resolve;
            rejectFlight = reject;
        });
        searchCountries(query, owner.signal).then((data) => {
            this.data.set(query, data);
            this.flights.delete(query);
            resolveFlight(data);
        }, (err) => {
            this.flights.delete(query);
            rejectFlight(err);
        });
        const newFlight = { owner, promise: flightPromise };
        this.flights.set(query, newFlight);
        return flightPromise;
    }
    abort(query) {
        const flight = this.flights.get(query);
        if (flight) {
            flight.owner.abort();
        }
    }
    abortAll() {
        for (const flight of this.flights.values()) {
            flight.owner.abort();
        }
    }
    size() {
        return this.data.size;
    }
    join(flight, signal) {
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                signal.removeEventListener('abort', onAbort);
                reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
            };
            if (signal.aborted) {
                onAbort();
                return;
            }
            signal.addEventListener('abort', onAbort, { once: true });
            flight.promise.then((data) => {
                signal.removeEventListener('abort', onAbort);
                resolve(data);
            }, (err) => {
                signal.removeEventListener('abort', onAbort);
                reject(err);
            });
        });
    }
}
