import type { ComponentInstance } from '@/types/page'

export type SavedMyBlock = {
  id: string
  label: string
  desc?: string
  components: ComponentInstance[]
  savedAt: string
}

const STORAGE_KEY = 'pagebuilder_my_blocks_v1'

export function loadMyBlocks(): SavedMyBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveMyBlock(entry: Omit<SavedMyBlock, 'id' | 'savedAt'> & { id?: string }): SavedMyBlock {
  const list = loadMyBlocks()
  const row: SavedMyBlock = {
    id: entry.id || `blk_${Date.now()}`,
    label: entry.label,
    desc: entry.desc,
    components: JSON.parse(JSON.stringify(entry.components)),
    savedAt: new Date().toISOString(),
  }
  const idx = list.findIndex((b) => b.id === row.id)
  if (idx >= 0) list[idx] = row
  else list.unshift(row)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)))
  return row
}

export function removeMyBlock(id: string) {
  const next = loadMyBlocks().filter((b) => b.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
