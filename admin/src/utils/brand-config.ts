import {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  type MiniappBrandConfig,
} from '@/types/miniapp'
import { readConfigEntry, type RawConfigItem } from '@/utils/system-config'

function pickText(value: unknown, fallback: string) {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function normalizeBrandConfig(
  raw?: Partial<MiniappBrandConfig> | null,
  legacy?: Record<string, unknown>,
): MiniappBrandConfig {
  const src = raw || {}
  const legacyMap = legacy || {}
  const appName = pickText(
    src.appName || legacyMap.site_name || legacyMap.appName,
    DEFAULT_MINIAPP_BRAND_CONFIG.appName,
  )
  const logoUrl = pickText(src.logoUrl || legacyMap.site_logo, '')
  const logoMark = pickText(src.logoMark || appName.charAt(0), DEFAULT_MINIAPP_BRAND_CONFIG.logoMark)
  return {
    appName,
    logoUrl,
    logoMark,
    loginTagline: pickText(src.loginTagline, DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline),
    brandEyebrow: pickText(src.brandEyebrow, DEFAULT_MINIAPP_BRAND_CONFIG.brandEyebrow),
  }
}

export function applyBrandConfigToForm(
  configs: RawConfigItem[],
  target: MiniappBrandConfig,
) {
  let parsed: Partial<MiniappBrandConfig> | null = null
  const legacy: Record<string, unknown> = {}

  configs.forEach((item) => {
    const { key, value } = readConfigEntry(item)
    if (!key) return
    if (key === 'miniappBrandConfig' && value) {
      try {
        parsed = JSON.parse(value) as Partial<MiniappBrandConfig>
      } catch {
        parsed = null
      }
      return
    }
    if (key === 'site_name' || key === 'appName') legacy.site_name = value
    if (key === 'site_logo' || key === 'logoUrl') legacy.site_logo = value
  })

  const normalized = normalizeBrandConfig(parsed, legacy)
  if (normalized.logoUrl) {
    normalized.logoUrl = normalized.logoUrl.trim()
  }
  Object.assign(target, normalized)
}

export function buildBrandConfigUpdateItems(brand: MiniappBrandConfig) {
  const payload = normalizeBrandConfig(brand)
  return [
    {
      configKey: 'miniappBrandConfig',
      configValue: JSON.stringify(payload),
      configGroup: 'basic',
      description: '小程序品牌基础信息',
    },
    {
      configKey: 'site_name',
      configValue: payload.appName,
      configGroup: 'basic',
      description: '站点名称',
    },
    {
      configKey: 'site_logo',
      configValue: payload.logoUrl,
      configGroup: 'basic',
      description: '站点Logo URL',
    },
  ]
}
