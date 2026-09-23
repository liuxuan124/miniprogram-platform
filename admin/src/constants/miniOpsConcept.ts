/** 小程序运营侧统一概念（与产品升级方案对齐） */

export const MINI_OPS_PAGE_STATUS_LABELS = {
  /** 从未上线过 */
  draft: '未发布',
  /** 线上与草稿一致 */
  live: '已发布',
  /** 已上线但草稿有改动 */
  pending: '有修改待发布',
  offline: '已下线',
  archived: '已归档',
  test: '测试页',
} as const

export const MINI_CONTENT_VS_PAGE_HINT =
  '长文、笔记等内容上下架即时生效；改页面结构、导航、配色需在本模块「发布与分发」后用户才看到。页面里的文章流等会自动读最新已上架内容。'

export const MINI_DRAFT_LIVE_HINT =
  '小程序只有一个线上版本：用户看到的是最近一次发布。所有改动先进入草稿，发布后才统一生效。'
