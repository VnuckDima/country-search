export function el(tag: string, className?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className) {
    node.className = className
  }
  return node
}