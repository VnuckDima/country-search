import { HttpError } from './types';
import { mapCountryResponse } from './mapCountryResponse';
const BASE_URL = 'https://countries.dev/name';
export async function searchCountries(query, signal) {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(query)}`, {
        signal,
    });
    if (!response.ok) {
        if (response.status === 404) {
            return [];
        }
        throw new HttpError(`Country search failed with status ${response.status}`, response.status);
    }
    const raw = (await response.json());
    return raw.map(mapCountryResponse);
}
