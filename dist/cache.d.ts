import type { CountryCard } from './types';
export declare class CountryCache {
    private data;
    private flights;
    search(query: string, signal: AbortSignal): Promise<CountryCard[]>;
    abort(query: string): void;
    abortAll(): void;
    size(): number;
    private join;
}
//# sourceMappingURL=cache.d.ts.map