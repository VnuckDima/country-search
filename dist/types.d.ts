export interface RawCountry {
    name: string;
    flag?: string;
    flags?: {
        png?: string;
        svg?: string;
    };
    capital?: string;
    region?: string;
    population?: number;
    languages?: Array<{
        name: string;
        iso639_1?: string;
        iso639_2?: string;
    }>;
    currencies?: Array<{
        code: string;
        name: string;
        symbol?: string;
    }>;
    borders?: string[];
    area?: number;
    subregion?: string;
}
export interface CountryCard {
    name: string;
    flag: string;
    capital: string;
    region: string;
    population: number;
    languages: string[];
}
export interface CountryDetail extends CountryCard {
    area: number;
    borders: string[];
    languageList: Array<{
        name: string;
        iso639_1: string;
    }>;
    currencies: Array<{
        code: string;
        name: string;
    }>;
}
export declare class HttpError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
//# sourceMappingURL=types.d.ts.map