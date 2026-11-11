export function mapCountryResponse(raw) {
    return {
        name: raw.name,
        flag: raw.flag ?? raw.flags?.png ?? '',
        capital: raw.capital ?? '',
        region: raw.region ?? '',
        population: raw.population ?? 0,
        languages: (raw.languages ?? []).map((language) => language.name),
        area: raw.area ?? 0,
        borders: raw.borders ?? [],
        languageList: (raw.languages ?? []).map((language) => ({
            name: language.name,
            iso639_1: language.iso639_1 ?? '',
        })),
        currencies: raw.currencies ?? [],
    };
}
