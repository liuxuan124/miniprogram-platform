/**
 * 区块拖拽的 MIME 契约
 * =====================
 *
 * 画布 drop 管道靠 dataTransfer 传递拖拽源类型。这里给区块拖拽单独一个 MIME，
 * 与 ComponentPanel 拖原子组件用的 'componentType' 区分开：
 *   - componentType → 插入 1 个原子组件
 *   - DRAG_SOURCE_BLOCK → 解包并插入整棵组件树
 *
 * dataTransfer 只能存字符串，所以 payload 是 JSON。
 */

export const DRAG_SOURCE_BLOCK = 'application/x-pagebuilder-block'

export interface BlockDragPayload {
  /** 内置区块用 registry key；自建区块用 'my:<id>' */
  key: string
}

export const MY_BLOCK_PREFIX = 'my:'

export function parseBlockDragPayload(raw: string | null | undefined): BlockDragPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.key === 'string' && parsed.key) {
      return { key: parsed.key }
    }
  } catch {
    return null
  }
  return null
}
