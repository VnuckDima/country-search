import type { CountryCard } from './types';
/**
 * Кэш ответов по строке запроса с дедупликацией одновременно полётающих
 * одинаковых запросов.
 *
 * Каждый вызывающий получает свой промист и свой сигнал отмены: отмена одним
 * вызывающимrejects только его промист и не ломает общий полёт для остальных.
 * Реальная отмена сетевого запроса (AbortController.abort) происходит, когда
 * весь запрос認елен как устаревший (abort(query)).
 */
export declare class CountryCache {
    private data;
    private flights;
    search(query: string, signal: AbortSignal): Promise<CountryCard[]>;
    /** Реальная отмена сетевого запроса для запроса query (если он в полёте). */
    abort(query: string): void;
    abortAll(): void;
    size(): number;
    private join;
}
//# sourceMappingURL=cache.d.ts.map