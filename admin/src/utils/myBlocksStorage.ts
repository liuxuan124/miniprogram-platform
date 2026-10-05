/**
 * 「我的区块」本地存储
 * =====================
 *
 * 运营在画布里把容器/组合「另存为区块」后落在这里，供其他页面拖拽复用。
 * 存储介质沿用装修器原有的 localStorage 方案（沿用 v1 key），
 * 与页面草稿本地缓存同口径：零后端改动、离线可用、跨会话保留。
 *
 * v1 → v2 结构升级（2026-10-05）：
 *   旧 { id, label, desc?, components: ComponentInstance[], savedAt }
 *   新 { id, name, category, description?, thumbnail?, nodes, createdAt, updatedAt }
 *   读取时自动迁移：components→nodes、label→name、savedAt→createdAt，旧数据不丢。
 */

import type { ComponentInstance } from '@/types/page'
import type { BlockCategory } from '@/components/page-builder/blockTemplates'

const STORAGE_KEY = 'pagebuilder_my_blocks_v1'
const MAX_BLOCKS = 30

export type SavedBlock = {
  id: string
  name: string
  category: BlockCategory
  description?: string
  /** 封面图：SVG 骨架快照 dataURL 或运营手动替换的图片地址 */
  thumbnail?: string
  /** 完整组件树（含 id，插入时由 remapIds 统一刷新） */
  nodes: ComponentInstance[]
  createdAt: number
  updatedAt: number
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** 兼容 v1 记录：components/label/savedAt → nodes/name/createdAt */
function migrate(raw: any): SavedBlock | null {
  if (!isPlainObject(raw)) return null
  const nodes: ComponentInstance[] = Array.isArray(raw.nodes)
    ? raw.nodes
    : Array.isArray(raw.components)
      ? raw.components
      : []
  if (!nodes.length) return null

  const name = String(raw.name ?? raw.label ?? '未命名区块').trim() || '未命名区块'
  const created = Number(raw.createdAt) || (raw.savedAt ? Date.parse(raw.savedAt) : 0) || Date.now()

  return {
    id: String(raw.id ?? `blk_${created}`),
    name,
    // v1 无分类概念，一律归 custom；未知分类值同样兜底
    category: (typeof raw.category === 'string' ? raw.category : 'custom') as BlockCategory,
    description: raw.description ?? raw.desc ?? undefined,
    thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : undefined,
    nodes,
    createdAt: created,
    updatedAt: Number(raw.updatedAt) || created,
  }
}

export function loadMyBlocks(): SavedBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(migrate).filter((b): b is SavedBlock => !!b)
  } catch {
    return []
  }
}

function persist(list: SavedBlock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_BLOCKS)))
  } catch {
    // 配额超限等：由调用方提示，这里不阻断画布主流程
  }
}

export type SaveBlockInput = {
  name: string
  category: BlockCategory
  description?: string
  thumbnail?: string
  nodes: ComponentInstance[]
  id?: string
}

/** 新建或按 id 覆盖保存；返回落库后的记录 */
export function saveMyBlock(input: SaveBlockInput): SavedBlock {
  const list = loadMyBlocks()
  const now = Date.now()
  const id = input.id ?? `blk_${now}_${Math.random().toString(36).slice(2, 6)}`
  const idx = list.findIndex((b) => b.id === id)
  const prev = idx >= 0 ? list[idx] : null

  const row: SavedBlock = {
    id,
    name: input.name,
    category: input.category,
    description: input.description,
    thumbnail: input.thumbnail,
    // 存快照：之后画布上怎么改都不影响已保存的区块
    nodes: JSON.parse(JSON.stringify(input.nodes)),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  }

  if (idx >= 0) list[idx] = row
  else list.unshift(row)
  persist(list)
  return row
}

export function removeMyBlock(id: string) {
  persist(loadMyBlocks().filter((b) => b.id !== id))
}
