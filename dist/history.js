const STORAGE_KEY = 'country-search-history';
const MAX_ITEMS = 10;
export class History {
    items;
    constructor() {
        this.items = this.read();
    }
    list() {
        return [...this.items];
    }
    add(query) {
        if (!query) {
            return;
        }
        this.items = this.items.filter((item) => item !== query);
        this.items.unshift(query);
        if (this.items.length > MAX_ITEMS) {
            this.items.pop();
        }
        this.persist();
    }
    read() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
        }
        catch {
            return [];
        }
    }
    persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    }
}
