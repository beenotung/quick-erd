export function querySelector<T extends HTMLElement>(
  parent: HTMLElement,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error('Element not found, selector: ' + selector)
  }
  return element
}
