/**
 * 暖阁本地源开关
 * - FORCE_LOCAL_DEMO=true：仅本地无库演示（开发者手动打开）
 * - 生产 / 体验 / 正式联调必须为 false：后台主题与 API 为唯一真源
 */
const FORCE_LOCAL_DEMO = false
const USE_LOCAL_SOURCE = FORCE_LOCAL_DEMO

const WARM_PRIMARY = '#C2410C'
const WARM_PAGE_BG = '#FDF6EC'

const WARM_PAGE_STYLE = [
  `--brand:${WARM_PRIMARY}`,
  '--brand-2:#EA580C',
  '--gold:#B45309',
  '--ink:#2A1C12',
  '--ink-2:#6B5443',
  '--mute:#A1897A',
  `--bg:${WARM_PAGE_BG}`,
  '--sheet:#FFFAF3',
  '--sheet-2:#F8ECDD',
  `--page-bg:${WARM_PAGE_BG}`,
  `background:${WARM_PAGE_BG}`,
].join(';')

const WARM_THEME_CONFIG = {
  primaryColor: WARM_PRIMARY,
  tabBarActiveColor: WARM_PRIMARY,
  pageBgColor: WARM_PAGE_BG,
}

/** 搜索热词兜底（后台未配置时） */
const SEARCH_HOT = [
  '内容生意',
  '日更是伪命题',
  '社群运营 SOP',
  '选题库',
  '私域搭建',
  '年度会员',
]

module.exports = {
  FORCE_LOCAL_DEMO,
  USE_LOCAL_SOURCE,
  WARM_PRIMARY,
  WARM_PAGE_BG,
  WARM_PAGE_STYLE,
  WARM_THEME_CONFIG,
  SEARCH_HOT,
}
