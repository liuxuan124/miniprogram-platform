import type { InjectionKey } from 'vue'

export type PreviewLoginSheetApi = {
  open: () => void
  close: () => void
  setCompleteHandler: (handler: (() => void) | null) => void
}

/** 子组件唤起预览登录半屏（由机壳层渲染，避免随内容滚动） */
export const PREVIEW_LOGIN_SHEET_API: InjectionKey<PreviewLoginSheetApi> = Symbol('previewLoginSheetApi')

export const DEFAULT_PREVIEW_LOGIN_BRAND = {
  appName: '出海笔记',
  logoMark: '海',
  loginTagline: '想认识一下你，可以吗？',
} as const
