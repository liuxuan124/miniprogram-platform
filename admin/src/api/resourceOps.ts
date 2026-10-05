import { get, put } from './request'

/** 资源位类型（与后端 AdminResourceOpsController.ALLOWED_TYPES 一致） */
export const SLOT_TYPES = ['popup', 'bar', 'float', 'bulletin'] as const
export type SlotType = (typeof SLOT_TYPES)[number]

export interface ResourceSlot {
  /** 稳定 id：后台生成，用于「关掉 A 但B 该展示」这类判断 */
  id?: string
  type: SlotType
  title: string
  body?: string
  link?: string
  image?: string
  enabled?: boolean
  priority?: number
  startAt?: string
  endAt?: string
  /** 同用户每天最多自动弹 N 次，0 = 不限 */
  dailyLimit?: number
}

export interface SlotMeta {
  types: string[]
  maxSlots: number
  maxTitle: number
  maxBody: number
  typeDesc: { type: string; label: string; note: string }[]
}

/** 读取资源位列表 */
export function listSlots() {
  return get('/api/v1/admin/ops/resource/slots')
}

/** 读取类型枚举与约束 */
export function slotMeta() {
  return get('/api/v1/admin/ops/resource/meta')
}

/** 整表保存（后端会归一化：过滤非法类型 / 截断超长 / 按 priority 排序） */
export function saveSlots(slots: ResourceSlot[]) {
  // request.ts 的 put 签名是 `data?: Record<string, any>`，这里传的是数组 → 需断言
  return put('/api/v1/admin/ops/resource/slots', slots as unknown as Record<string, any>)
}

/** 本地生成一个稳定 id（优先用时间戳 + 随机，便于「关掉某条」的精确匹配） */
export function genSlotId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** 空的默认表单值 */
export function emptySlot(type: SlotType = 'bar'): ResourceSlot {
  return {
    id: genSlotId(),
    type,
    title: '',
    body: '',
    link: '',
    image: '',
    enabled: false,
    priority: 0,
    startAt: '',
    endAt: '',
    dailyLimit: 1,
  }
}