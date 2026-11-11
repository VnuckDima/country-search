/**
 * Ручное equivalents AbortSignal.any: объединяет несколько сигналов в один.
 * Отменяется, как только отменяется любой из источников; причина первой
 * отмены сохраняется (чтобы TimeoutError не спутать с AbortError).
 */
export declare function combineSignals(...signals: AbortSignal[]): AbortSignal;
export declare class App {
    private readonly container;
    private readonly input;
    private readonly loader;
    private readonly results;
    private readonly emptyBox;
    private readonly errorBox;
    private readonly errorMessage;
    private readonly retryBtn;
    private readonly detail;
    private readonly detailBack;
    private readonly detailContent;
    private readonly historyBox;
    private readonly historyLabel;
    private readonly historyList;
    private readonly cache;
    private readonly history;
    private readonly detailByName;
    private currentQuery;
    private readonly debouncedSearch;
    constructor();
    private createHeading;
    private onInput;
    private doSearch;
    private onRetry;
    private renderResults;
    private showDetail;
    private showList;
    private showLoading;
    private showError;
    private hideAll;
    private hideDetail;
    private renderHistory;
}
//# sourceMappingURL=app.d.ts.map