type ScrollHandler = (componentId: string) => void

const handlers = new Set<ScrollHandler>()

export function onEditorScrollToComponent(handler: ScrollHandler) {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function requestEditorScrollToComponent(componentId: string) {
  handlers.forEach((h) => h(componentId))
}
