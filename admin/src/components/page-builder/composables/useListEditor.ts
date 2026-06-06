import { type Ref } from 'vue'

export function useListEditor<T extends Record<string, any>>(
  items: Ref<T[]>,
  options?: {
    createDefault: () => T
    maxItems?: number
  }
) {
  const createDefault = options?.createDefault || (() => ({} as T))
  const maxItems = options?.maxItems || 20

  function addItem() {
    if (items.value.length >= maxItems) return
    items.value = [...items.value, createDefault()]
  }

  function removeItem(index: number) {
    const newItems = [...items.value]
    newItems.splice(index, 1)
    items.value = newItems
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items.value]
    newItems[index] = { ...newItems[index], [field]: value }
    items.value = newItems
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= items.value.length) return
    const newItems = [...items.value]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    items.value = newItems
  }

  return { addItem, removeItem, updateItem, moveItem }
}
