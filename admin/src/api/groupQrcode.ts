/**
 * 群活码轮换 API（/api/v1/admin/group-qrcode）
 *
 * 口径说明：
 * - 一个「群」由 groupKey 标识，可挂多张二维码，按 sortOrder 升序轮换；
 * - 取码规则（后端 getCurrentQrcode）：status=1 且（validUntil 为空 或 未过期）的第一张；
 * - 每小时有定时任务把已过期但仍启用的码置为停用，取码时自动落到下一张备用码；
 * - ⚠️ 后端 save 已按 id 是否为 null 自动 upsert（有 id = 更新），因此**没有单独的 PUT 接口**。
 */
import { get, post, del } from './request'

const BASE = '/api/v1/admin/group-qrcode'

export interface GroupQrcode {
  id?: number
  /** 群标识：与装修器「加入群聊」组件中每个群的「活码标识」一一对应 */
  groupKey: string
  groupName?: string
  qrcodeUrl: string
  /** 有效期截止；空 = 长期有效。后端 LocalDateTime，可能是 ISO 也可能是空格格式 */
  validUntil?: string | null
  /** 1=启用 0=停用 */
  status?: number
  /** 轮换顺序，升序取第一个有效码 */
  sortOrder?: number
  createTime?: string
  updateTime?: string
}

/** 列活码（不传 groupKey 则返回全部） */
export function listGroupQrcodes(groupKey?: string) {
  return get<GroupQrcode[]>(BASE, groupKey ? { groupKey } : undefined)
}

/** 新增或更新（带 id 即更新） */
export function saveGroupQrcode(data: Partial<GroupQrcode>) {
  return post<GroupQrcode>(BASE, data as Record<string, unknown>)
}

/** 删除 */
export function deleteGroupQrcode(id: number) {
  return del<void>(`${BASE}/${id}`)
}
