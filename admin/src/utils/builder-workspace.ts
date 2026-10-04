import type { PublishPreflight } from '@/api/version'
import { TABBAR_MAX, TAB_SHELL_ROUTES } from '@/utils/tabbar'

type TabInput = { text?: string; icon?: string; pageId?: string | number; pageName?: string; pagePath?: string }
export type WorkspaceTab = {
  key: string; text: string; icon: string; pageId: string; pageName: string; path: string; isMine: boolean
  statusKey: 'live' | 'dirty' | 'draft' | 'empty' | 'builtin' | 'unknown'; statusLabel: string
}
const normalizePath = (path?: string) => '/' + String(path || '').replace(/^\/+|\/+$/g, '')

export function buildWorkspaceTabs(tabs: TabInput[], preflight: PublishPreflight | null): WorkspaceTab[] {
  const pages = preflight?.pages || []
  const byId = new Map(pages.map(p => [String(p.id), p]))
  const byPath = new Map(pages.map(p => [normalizePath(p.path), p]))
  return tabs.slice(0, TABBAR_MAX).map((tab, index) => {
    const path = normalizePath(tab.pagePath)
    const pageId = String(tab.pageId || '')
    const isMine = path === '/pages/mine/mine' || pageId === '__mine__'
    const bound = (pageId ? byId.get(pageId) : undefined) || (!pageId ? byPath.get(path) : undefined)
    const builtin = !/^\d+$/.test(pageId) && (TAB_SHELL_ROUTES as readonly string[]).includes(path)
    let statusKey: WorkspaceTab['statusKey'] = 'empty'
    let statusLabel = '未绑定'
    if (builtin) { statusKey = 'builtin'; statusLabel = '系统页面' }
    else if (!preflight) { statusKey = 'unknown'; statusLabel = '状态未读取' }
    else if (bound) {
      if (bound.action === 'empty') { statusLabel = '暂无内容' }
      else if (bound.action === 'publish') { statusKey = 'dirty'; statusLabel = '待更新' }
      else if (bound.action === 'builtin') { statusKey = 'builtin'; statusLabel = '系统页面' }
      else if (bound.action === 'already_live' || bound.status === 1) { statusKey = 'live'; statusLabel = '已上线' }
      else { statusKey = 'draft'; statusLabel = '草稿' }
    } else if (pageId) { statusLabel = '绑定页不存在' }
    return { key: `tab-${index}`, text: tab.text || `导航${index + 1}`, icon: tab.icon || '', pageId, path, isMine,
      pageName: bound?.name || tab.pageName || (builtin ? '系统内置页面' : '尚未选择页面'), statusKey, statusLabel }
  })
}

export function buildWorkspaceTodos(tabs: TabInput[], preflight: PublishPreflight | null) {
  const items = [
    ...(preflight?.blocking || []).map(text => ({ text, path: /首页|导航|外观/.test(text) ? '/page-builder/start' : '/page-builder/list' })),
    ...(preflight?.warnings || []).map(text => ({ text, path: '/page-builder/list' })),
    ...buildWorkspaceTabs(tabs, preflight).filter(t => t.statusKey === 'empty').map(t => ({
      text: `导航「${t.text}」：${t.statusLabel}`, path: '/page-builder/start?group=tabbar',
    })),
  ]
  return items.filter((item, index) => items.findIndex(x => x.text === item.text) === index)
}
