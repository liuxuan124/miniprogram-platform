/** 小程序运营侧统一概念（与产品升级方案对齐） */

export const MINI_OPS_PAGE_STATUS_LABELS = {
  /** 从未上线过 */
  draft: '未发布',
  /** 线上与草稿一致 */
  live: '已发布',
  /** 已上线但草稿有改动 */
  pending: '有修改待同步',
  offline: '已下线',
  archived: '已归档',
  test: '测试页',
} as const

export const MINI_CONTENT_VS_PAGE_HINT =
  '长文、笔记等内容上下架即时生效；改页面结构、导航、配色需先保存草稿，再点「保存并同步」写入线上配置。页面里的文章流等会自动读最新已上架内容。'

export const MINI_DRAFT_LIVE_HINT =
  '小程序代码在本机微信开发者工具上传；导航与装修由服务端配置下发，保存草稿后需「保存并同步」才更新线上配置。扫码预览可查看草稿。'
