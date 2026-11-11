import { debounce } from './debounce.js'
import { CountryCache } from './cache.js'
import { History } from './history.js'
import { HttpError } from './types.js'
import type { CountryCard, CountryDetail } from './types.js'

const DEBOUNCE_MS = 300
const TIMEOUT_MS = 10_000

export function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  let settled = false

  const onSourceAbort = (source: AbortSignal): void => {
    if (settled) {
      return
    }
    settled = true
    controller.abort(source.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
  }

  for (const signal of signals) {
    if (signal.aborted) {
      onSourceAbort(signal)
      return controller.signal
    }
    signal.addEventListener('abort', () => onSourceAbort(signal), { once: true })
  }

  return controller.signal
}

const el = (tag: string, className?: string): HTMLElement => {
  const node = document.createElement(tag)
  if (className) {
    node.className = className
  }
  return node
}

export class App {
  private readonly container = el('div', 'wrap')
  private readonly input = el('input') as HTMLInputElement
  private readonly loader = el('div', 'loader')
  private readonly results = el('ul', 'results')
  private readonly emptyBox = el('div', 'empty hidden')
  private readonly errorBox = el('div', 'error hidden')
  private readonly errorMessage = el('div')
  private readonly retryBtn = el('button', 'primary') as HTMLButtonElement
  private readonly detail = el('section', 'detail hidden')
  private readonly detailBack = el('button') as HTMLButtonElement
  private readonly detailContent = el('div')
  private readonly historyBox = el('div')
  private readonly historyLabel = el('p', 'muted')
  private readonly historyList = el('div')

  private readonly cache = new CountryCache()
  private readonly history = new History()
  private readonly detailByName = new Map<string, CountryDetail>()

  private currentQuery = ''
  private readonly debouncedSearch = debounce((query: string) =>
    this.doSearch(query),
  DEBOUNCE_MS)

  constructor() {
    this.input.id = 'query'
    this.input.type = 'search'
    this.input.placeholder = 'Название страны (например, spain)'
    this.input.autocomplete = 'off'
    this.loader.id = 'loader'
    this.results.id = 'results'
    this.emptyBox.id = 'empty'
    this.errorBox.id = 'error'
    this.detail.id = 'detail'
    this.historyList.id = 'history-list'
    this.retryBtn.type = 'button'
    this.retryBtn.id = 'retry'
    this.retryBtn.textContent = 'Повторить'
    this.detailBack.type = 'button'
    this.detailBack.id = 'detail-back'
    this.detailBack.textContent = '← Назад к результатам'
    this.historyLabel.textContent = 'Недавно:'
    this.emptyBox.textContent = 'Ничего не найдено'

    this.errorBox.appendChild(this.errorMessage)
    this.errorBox.appendChild(this.retryBtn)
    this.detail.appendChild(this.detailBack)
    this.detail.appendChild(this.detailContent)
    this.historyBox.appendChild(this.historyLabel)
    this.historyBox.appendChild(this.historyList)

    this.container.append(
      this.createHeading(),
      this.input,
      this.loader,
      this.results,
      this.emptyBox,
      this.errorBox,
      this.detail,
      this.historyBox,
    )
    document.body.appendChild(this.container)

    this.input.addEventListener('input', () => this.onInput())
    this.retryBtn.addEventListener('click', () => this.onRetry())
    this.detailBack.addEventListener('click', () => this.showList())

    this.renderHistory()
    this.input.focus()
  }

  private createHeading(): HTMLElement {
    const h1 = el('h1')
    h1.textContent = 'Поиск стран'
    return h1
  }

  private onInput(): void {
    const query = this.input.value.trim()

    this.cache.abort(this.currentQuery)
    this.debouncedSearch.cancel()
    this.currentQuery = query

    this.detailByName.clear()
    this.hideDetail()

    if (!query) {
      this.results.replaceChildren()
      this.showList()
      return
    }

    this.showLoading()
    this.debouncedSearch(query)
  }

  private doSearch = (query: string): void => {
    if (query !== this.currentQuery) {
      return
    }

    const signal = combineSignals(AbortSignal.timeout(TIMEOUT_MS))
    this.showLoading()

    this.cache.search(query, signal).then((data) => {
      if (query !== this.currentQuery) {
        return
      }
      this.detailByName.clear()
      for (const country of data) {
        this.detailByName.set(country.name, country as CountryDetail)
      }
      this.renderResults(data)
      this.history.add(query)
      this.renderHistory()
    }).catch((err) => {
      if (query !== this.currentQuery) {
        return
      }
      const name = err instanceof Error ? err.name : ''
      if (name === 'AbortError') {
        return
      }
      if (name === 'TimeoutError') {
        this.showError('Превышено время ожидания ответа сервера. Попробуйте ещё раз.')
        return
      }
      if (err instanceof HttpError) {
        this.showError(`Ошибка сервера (${err.status}). Попробуйте ещё раз.`)
        return
      }
      this.showError(
        'Не удалось загрузить список стран. Проверьте соединение и попробуйте ещё раз.',
      )
    })
  }

  private onRetry(): void {
    if (!this.currentQuery) {
      return
    }
    this.doSearch(this.currentQuery)
  }

  private renderResults(data: CountryCard[]): void {
    this.results.replaceChildren()
    const fragment = document.createDocumentFragment()

    for (const country of data) {
      const card = el('article', 'card')
      card.tabIndex = 0
      card.role = 'button'
      card.ariaLabel = `Подробнее о стране ${country.name}`

      const flag = el('span', 'flag')
      flag.textContent = country.flag || '🏳'

      const body = el('div', 'card-body')
      const name = el('h3')
      name.textContent = country.name
      const capital = el('p')
      capital.textContent = country.capital ? `Столица: ${country.capital}` : 'Столица: —'
      const region = el('p')
      region.textContent = `Регион: ${country.region || '—'}`
      const population = el('p')
      population.textContent = `Население: ${country.population.toLocaleString('ru-RU')}`

      card.append(flag, body)
      body.append(name, capital, region, population)

      const select = (): void => this.showDetail(country.name)
      card.addEventListener('click', select)
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          select()
        }
      })

      fragment.append(card)
    }

    this.results.append(fragment)
    this.emptyBox.hidden = data.length !== 0
    this.showList()
  }

  private showDetail(name: string): void {
    const country = this.detailByName.get(name)
    if (!country) {
      return
    }

    this.hideAll()
    this.detail.hidden = false
    this.detailContent.replaceChildren()

    const flag = el('span', 'flag')
    flag.textContent = country.flag || '🏳'

    const title = el('h2')
    title.textContent = country.name

    const header = el('div', 'detail-header')
    header.append(flag, title)

    const content = this.detailContent
    content.append(header)

    const field = (label: string, value: string): void => {
      const dt = el('dt')
      dt.textContent = label
      const dd = el('dd')
      dd.textContent = value
      content.append(dt, dd)
    }

    field('Столица', country.capital || '—')
    field('Регион', country.region || '—')
    field('Население', country.population.toLocaleString('ru-RU'))
    field('Площадь', country.area ? `${country.area.toLocaleString('ru-RU')} км²` : '—')

    const list = (label: string, items: string[]): void => {
      const dt = el('dt')
      dt.textContent = label
      const dd = el('dd')
      const ul = el('ul')
      for (const item of items) {
        const li = el('li')
        li.textContent = item
        ul.append(li)
      }
      if (items.length === 0) {
        const li = el('li')
        li.textContent = '—'
        ul.append(li)
      }
      dd.append(ul)
      content.append(dt, dd)
    }

    list('Языки', country.languageList.map((l) => l.iso639_1 ? `${l.name} (${l.iso639_1})` : l.name))
    list('Валюта', country.currencies.map((c) => `${c.code} — ${c.name}`))
    list('Границы', country.borders)
  }

  private showList(): void {
    this.loader.hidden = true
    this.errorBox.hidden = true
    this.detail.hidden = true
    this.results.hidden = false
  }

  private showLoading(): void {
    this.hideAll()
    this.loader.hidden = false
  }

  private showError(message: string): void {
    this.hideAll()
    this.errorMessage.textContent = message
    this.errorBox.hidden = false
  }

  private hideAll(): void {
    for (const node of [
      this.loader,
      this.results,
      this.emptyBox,
      this.errorBox,
      this.detail,
    ]) {
      node.hidden = true
    }
  }

  private hideDetail(): void {
    this.detail.hidden = true
  }

  private renderHistory(): void {
    this.historyList.replaceChildren()
    for (const query of this.history.list()) {
      const btn = el('button')
      btn.textContent = query
      btn.addEventListener('click', () => {
        this.input.value = query
        this.doSearch(query)
      })
      this.historyList.append(btn)
    }
  }
}

new App()
