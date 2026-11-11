export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): {
  (...args: Args): void
  cancel(): void
} {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Args): void => {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}
