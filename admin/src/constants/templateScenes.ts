/** 模板库场景筛选（与后端 template_scene / page_template.scene 对齐） */
export type TemplateSceneKey = 'all' | 'knowledge' | 'retail' | 'local' | 'campaign' | 'content'

export const TEMPLATE_SCENE_CHIPS: { key: TemplateSceneKey; label: string }[] = [
  { key: 'all', label: '全部场景' },
  { key: 'knowledge', label: '知识付费' },
  { key: 'retail', label: '电商零售' },
  { key: 'local', label: '本地门店' },
  { key: 'campaign', label: '活动营销' },
  { key: 'content', label: '内容社区' },
]

export const TEMPLATE_SCENE_LABEL: Record<Exclude<TemplateSceneKey, 'all'>, string> = {
  knowledge: '知识付费',
  retail: '电商零售',
  local: '本地门店',
  campaign: '活动营销',
  content: '内容社区',
}

const STORE_CODE_SCENE: Record<string, Exclude<TemplateSceneKey, 'all'>> = {
  warm: 'content',
  content: 'content',
  lite: 'content',
  retail: 'retail',
  edu: 'knowledge',
}

const SCENE_ALIASES: Record<string, Exclude<TemplateSceneKey, 'all'>> = {
  knowledge: 'knowledge',
  knowledge_pay: 'knowledge',
  edu: 'knowledge',
  education: 'knowledge',
  publish: 'knowledge',
  home: 'knowledge',
  retail: 'retail',
  sales: 'retail',
  ecommerce: 'retail',
  local: 'local',
  local_life: 'local',
  'local-life': 'local',
  campaign: 'campaign',
  activity: 'campaign',
  content: 'content',
  content_ip: 'content',
  brand: 'content',
  retention: 'content',
  warm: 'content',
  lite: 'content',
  general: 'content',
  service: 'local',
  member: 'content',
}

export function normalizeTemplateScene(raw: unknown): Exclude<TemplateSceneKey, 'all'> | null {
  const key = String(raw ?? '').trim().toLowerCase()
  if (!key) return null
  if (key in TEMPLATE_SCENE_LABEL) return key as Exclude<TemplateSceneKey, 'all'>
  if (SCENE_ALIASES[key]) return SCENE_ALIASES[key]
  if (/知识/.test(String(raw))) return 'knowledge'
  if (/电商|零售|成交|商城/.test(String(raw))) return 'retail'
  if (/本地|门店|到店/.test(String(raw))) return 'local'
  if (/活动|营销|裂变|专题/.test(String(raw))) return 'campaign'
  if (/内容|社群|IP|暖阁|轻量/.test(String(raw))) return 'content'
  return null
}

export function resolveStoreTemplateScene(item: Record<string, unknown>): Exclude<TemplateSceneKey, 'all'> {
  const fromDb = normalizeTemplateScene(item.templateScene ?? item.template_scene)
  if (fromDb) return fromDb
  const code = String(item.templateCode ?? item.template_code ?? '').toLowerCase()
  if (code && STORE_CODE_SCENE[code]) return STORE_CODE_SCENE[code]
  const seed = normalizeTemplateScene(item.seed)
  if (seed) return seed
  console.warn('[templateScenes] 整店模板缺少场景，已归为 content', item.id ?? item.templateName)
  return 'content'
}

export function resolvePageTemplateScene(tpl: Record<string, unknown>): Exclude<TemplateSceneKey, 'all'> {
  const fromScene = normalizeTemplateScene(tpl.scene)
  if (fromScene) return fromScene
  const fromIndustry = normalizeTemplateScene(tpl.industryCode ?? tpl.industry_code)
  if (fromIndustry) return fromIndustry
  const cat = String(tpl.category ?? '').toLowerCase()
  if (cat === 'activity') return 'campaign'
  console.warn('[templateScenes] 页面模板缺少场景，已归为 content', tpl.id ?? tpl.name)
  return 'content'
}

export function matchesTemplateSceneFilter(
  filter: TemplateSceneKey,
  itemScene: Exclude<TemplateSceneKey, 'all'>,
): boolean {
  if (filter === 'all') return true
  return filter === itemScene
}

export function sceneChipLabel(key: TemplateSceneKey): string {
  if (key === 'all') return '全部场景'
  return TEMPLATE_SCENE_LABEL[key]
}
