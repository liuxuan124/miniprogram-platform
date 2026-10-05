/**
 * 运营中心 › 审核中心 API
 *
 * 走 `/api/v1/admin/ops/moderation/**` 而不是 `/api/v1/admin/compliance`：
 * 后者的权限注解是 `hasAuthority('content:audit')`，而该权限码在 mp_permission 里
 * 根本不存在（content 模块只有 list/create/update/delete/publish/agent），
 * 导致该分支恒 false，运营角色调现有合规接口直接 403。
 * `/api/v1/admin/ops/**` 不在 SecurityConfig 的 super_admin 专属前缀里，只需登录。
 */
import { get, post, put } from './request'

/** 举报对象类型（与后端 ModerationService.TARGET_TYPES 一致） */
export const REPORT_TARGET_TYPES = [
  { value: 'content', label: '内容' },
  { value: 'moment', label: '动态' },
  { value: 'comment', label: '评论' },
  { value: 'planet_post', label: '星球动态' },
  { value: 'product', label: '商品' },
  { value: 'author', label: '作者' },
]

/** 处理状态 */
export const REPORT_STATUS = [
  { value: 'pending', label: '待处理' },
  { value: 'accepted', label: '已受理' },
  { value: 'rejected', label: '已驳回' },
]

/** 举报记录 */
export interface ComplaintRecord {
  id: number
  targetType: string
  /** 后端拼好的可读描述，如「内容 #123」 */
  targetLabel?: string
  targetId: number
  reporterUserId?: number
  contact?: string
  reason?: string
  status?: string
  adminNote?: string
  handlerId?: number
  handledAt?: string
  evidenceUrls?: string[]
  createdAt?: string
}

/** 举报列表（分页） */
export function listComplaints(params: {
  status?: string
  current?: number
  size?: number
}) {
  return get('/api/v1/admin/ops/moderation/complaints', params)
}

/** 待处理举报数（角标） */
export function getPendingComplaintCount() {
  return get<number>('/api/v1/admin/ops/moderation/pending-count')
}

/**
 * 处理举报：受理 / 驳回。banTarget=true 会连带封禁被举报作者
 *
 * 走 query 而非 body：后端是 `@RequestParam` 绑定，用 `params` 传最直接
 * （若改用 body 需把后端改成 @RequestBody，两边会不一致）。
 */
export function handleComplaint(
  id: number,
  params: { status: 'accepted' | 'rejected'; note?: string; banTarget?: boolean }
) {
  return put(`/api/v1/admin/ops/moderation/complaints/${id}/handle`, undefined, {
    params,
  })
}

/** 封禁 C 端用户 */
export function banUser(id: number, reason?: string) {
  return post(`/api/v1/admin/ops/moderation/users/${id}/ban`, undefined, { params: { reason } })
}

/** 解封 */
export function unbanUser(id: number) {
  return post(`/api/v1/admin/ops/moderation/users/${id}/unban`)
}

/** 查用户封禁状态 */
export function getUserBanStatus(id: number) {
  return get<{ banned: boolean; reason?: string }>(
    `/api/v1/admin/ops/moderation/users/${id}/ban-status`
  )
}
