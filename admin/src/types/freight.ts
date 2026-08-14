export type FreightBillingMethod = 'piece' | 'weight' | 'free'
export type FreightCalcMode = 'sum' | 'combo'
export type FreightTemplateStatus = 'active' | 'inactive'
export type FreightFreeRuleType = 'amount' | 'piece'

export interface FreightRegionRule {
  id: string
  regionLabel: string
  regions: string[]
  firstUnit: number
  firstFee: number
  extraUnit: number
  extraFee: number
}

export interface FreightFreeRule {
  enabled: boolean
  type: FreightFreeRuleType
  threshold: number
}

export interface FreightTemplate {
  id: string
  name: string
  /** 兼容旧版字段 */
  type?: 'default' | 'free' | 'weight'
  billingMethod: FreightBillingMethod
  status: FreightTemplateStatus
  isDefault: boolean
  calcMode: FreightCalcMode
  regionRules: FreightRegionRule[]
  freeRule: FreightFreeRule
  remark?: string
}

export function createDefaultRegionRule(overrides?: Partial<FreightRegionRule>): FreightRegionRule {
  return {
    id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    regionLabel: '全国（默认）',
    regions: ['全国'],
    firstUnit: 1,
    firstFee: 0,
    extraUnit: 1,
    extraFee: 0,
    ...overrides,
  }
}

export function createEmptyFreightTemplate(partial?: Partial<FreightTemplate>): FreightTemplate {
  return {
    id: `ft_${Date.now()}`,
    name: '',
    billingMethod: 'piece',
    status: 'active',
    isDefault: false,
    calcMode: 'sum',
    regionRules: [createDefaultRegionRule()],
    freeRule: { enabled: false, type: 'amount', threshold: 99 },
    ...partial,
  }
}

export function normalizeFreightTemplate(raw: Partial<FreightTemplate> & { id?: string; name?: string }, index = 0): FreightTemplate {
  const legacyType = raw.type
  let billingMethod: FreightBillingMethod = raw.billingMethod || 'piece'
  if (!raw.billingMethod && legacyType) {
    if (legacyType === 'free') billingMethod = 'free'
    else if (legacyType === 'weight') billingMethod = 'weight'
    else billingMethod = 'piece'
  }

  const regionRules = Array.isArray(raw.regionRules) && raw.regionRules.length
    ? raw.regionRules.map((rule, i) => ({
        id: rule.id || `rr_${index}_${i}`,
        regionLabel: rule.regionLabel || '配送区域',
        regions: rule.regions?.length ? [...rule.regions] : ['全国'],
        firstUnit: Number(rule.firstUnit ?? 1),
        firstFee: Number(rule.firstFee ?? 0),
        extraUnit: Number(rule.extraUnit ?? 1),
        extraFee: Number(rule.extraFee ?? 0),
      }))
    : billingMethod === 'free'
      ? []
      : [createDefaultRegionRule(
          billingMethod === 'weight'
            ? { regionLabel: '全国（默认）', firstUnit: 1, firstFee: 10, extraUnit: 1, extraFee: 5 }
            : { regionLabel: '全国（默认）', firstUnit: 1, firstFee: 10, extraUnit: 1, extraFee: 5 },
        )]

  const freeRule = raw.freeRule
    ? {
        enabled: !!raw.freeRule.enabled,
        type: raw.freeRule.type || 'amount',
        threshold: Number(raw.freeRule.threshold ?? 99),
      }
    : { enabled: false, type: 'amount' as FreightFreeRuleType, threshold: 99 }

  return {
    id: raw.id || `ft_${index}`,
    name: raw.name || '未命名模板',
    type: legacyType,
    billingMethod,
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    isDefault: !!raw.isDefault,
    calcMode: raw.calcMode === 'combo' ? 'combo' : 'sum',
    regionRules,
    freeRule,
    remark: raw.remark,
  }
}

export function billingMethodLabel(method: FreightBillingMethod): string {
  if (method === 'free') return '包邮'
  if (method === 'weight') return '按重量'
  return '按件数'
}

export function regionRulesSummary(rules: FreightRegionRule[]): string {
  if (!rules.length) return '—'
  if (rules.length === 1) return rules[0].regionLabel || rules[0].regions.join('、')
  return `${rules.length} 个配送区域`
}

export function freeRuleSummary(rule: FreightFreeRule): string {
  if (!rule.enabled) return '无'
  return rule.type === 'amount' ? `满 ${rule.threshold} 元包邮` : `满 ${rule.threshold} 件包邮`
}
