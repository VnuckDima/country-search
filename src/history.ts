const STORAGE_KEY = 'country-search-history'
const MAX_ITEMS = 10

export class History {
  private items: string[]

  constructor() {
    this.items = this.read()
  }

  list(): string[] {
    return [...this.items]
  }

  add(query: string): void {
    if (!query) {
      return
    }
    this.items = this.items.filter((item) => item !== query)
    this.items.unshift(query)
    if (this.items.length > MAX_ITEMS) {
      this.items.pop()
    }
    this.persist()
  }

  private read(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return []
      }
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch {
      return []
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
  }
}
