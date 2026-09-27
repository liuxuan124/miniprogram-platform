/** 编辑态（当前浏览器会话） */
export type EditUiState = 'unchanged' | 'unsaved' | 'saving' | 'save_failed'

export const EDIT_UI_LABELS: Record<EditUiState, string> = {
  unchanged: '未修改',
  unsaved: '未保存',
  saving: '保存中',
  save_failed: '保存失败',
}

/** 配置相对线上可读接口的同步态（仅表示服务端结果，不含用户端已刷新） */
export type ConfigSyncState = 'synced' | 'pending_sync' | 'syncing' | 'sync_failed'

export const CONFIG_SYNC_LABELS: Record<ConfigSyncState, string> = {
  synced: '已同步到线上配置',
  pending_sync: '待同步',
  syncing: '同步中',
  sync_failed: '同步失败',
}

/** 页面生命周期（与 resolvePageStatus 对齐） */
export { MINI_PAGE_STATUS_LABELS } from '@/utils/pageStatus'

export const CONFIG_VS_CODE_HINT =
  '内容配置版本由后台「保存并同步」写入服务端；微信代码包版本请在开发者工具本地上传，二者分开管理。'
