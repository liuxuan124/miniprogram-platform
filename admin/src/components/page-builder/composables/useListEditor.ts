import { type Ref } from 'vue'

export function useListEditor<T>(
  items: Readonly<Ref<T[]>>,
  options?: {
    createDefault: () => T
    maxItems?: number
  }
) {
  const createDefault = options?.createDefault || (() => ({} as T))
  const maxItems = options?.maxItems || 20

  function addItem(): T[] {
    if (items.value.length >= maxItems) return [...items.value]
    return [...items.value, createDefault()]
  }

  function removeItem(index: number): T[] {
    const newItems = [...items.value]
    newItems.splice(index, 1)
    return newItems
  }

  function updateItem(index: number, updater: (item: T) => T): T[] {
    const newItems = [...items.value]
    if (newItems[index] !== undefined) {
      newItems[index] = updater(newItems[index])
    }
    return newItems
  }

  function moveItem(fromIndex: number, toIndex: number): T[] {
    if (toIndex < 0 || toIndex >= items.value.length) return [...items.value]
    const newItems = [...items.value]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    return newItems
  }

  return { addItem, removeItem, updateItem, moveItem }
}
