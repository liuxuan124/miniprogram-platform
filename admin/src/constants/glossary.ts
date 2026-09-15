/**
 * 术语表：默认常量 + system_config.glossary 运行时覆盖
 * 代码标识保持 content / product / file / knowledge，不随文案改动。
 */
import { resolveIndustryProfile } from './industry-profiles'

export const GLOSSARY = {
  content: { key: 'content', label: '内容', aliases: ['内容列表'], deprecated: ['知识库'] },
  product: { key: 'product', label: '商品', aliases: ['商城', '商品管理'], deprecated: ['知识库'] },
  file: { key: 'file', label: '资料文件', aliases: ['资料库'], deprecated: ['文件库'] },
  knowledge: { key: 'knowledge', label: 'AI 语料库', aliases: ['语料库', '语料源'], deprecated: ['知识库'] },
  planet: { key: 'planet', label: '星球', aliases: ['知识星球'], deprecated: ['出海星球'] },
  member: { key: 'member', label: '会员', aliases: ['会员中心'], deprecated: [] },
  citePolicy: { key: 'citePolicy', label: '引用策略', aliases: ['cite_policy'], deprecated: [] },
  authorRole: { key: 'authorRole', label: '作者身份', aliases: ['author_role'], deprecated: [] },
  visibility: { key: 'visibility', label: '可见范围', aliases: [], deprecated: [] },
  auditStatus: { key: 'auditStatus', label: '审核状态', aliases: ['audit_status'], deprecated: [] },
  contentAudit: { key: 'contentAudit', label: '内容审核', aliases: ['审核队列'], deprecated: [] },
  creatorApply: { key: 'creatorApply', label: '创作者申请', aliases: ['创作者审核'], deprecated: [] },
  agentDrafts: { key: 'agentDrafts', label: '草稿箱', aliases: ['AI 草稿箱', '待确认草稿'], deprecated: [] },
} as const

export type GlossaryKey = keyof typeof GLOSSARY

/** 运行时覆盖（来自 system_config.glossary / industry_profile） */
let runtimeLabels: Record<string, string> = {}

export function setRuntimeGlossary(map: Record<string, string> | null | undefined) {
  runtimeLabels = map && typeof map === 'object' ? { ...map } : {}
}

export function applyGlossaryFromProfile(code?: string | null) {
  const profile = resolveIndustryProfile(code)
  setRuntimeGlossary({ ...profile.glossary })
}

export function getLabel(key: GlossaryKey | string): string {
  if (runtimeLabels[key]) return runtimeLabels[key]
  const item = GLOSSARY[key as GlossaryKey]
  return item?.label ?? String(key)
}

export function getDisplayName(kind: 'planet' | 'member' | 'shop', industryCode?: string | null): string {
  if (kind === 'planet' && runtimeLabels.planet) return runtimeLabels.planet
  if (kind === 'member' && runtimeLabels.member) return runtimeLabels.member
  if (kind === 'shop' && runtimeLabels.product) return runtimeLabels.product
  const profile = resolveIndustryProfile(industryCode)
  return profile.displayNames[kind]
}
