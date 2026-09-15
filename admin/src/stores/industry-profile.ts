/**
 * 业态包 store：加载 industry_profile / glossary，供侧栏、组件面板、Agent 裁剪
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getConfigsSilent, updateConfigs } from '@/api/system'
import { extractConfigList, readConfigEntry, toConfigUpdateItems } from '@/utils/system-config'
import {
  INDUSTRY_PROFILES,
  resolveIndustryProfile,
  listIndustryProfileOptions,
  type IndustryProfile,
} from '@/constants/industry-profiles'
import { applyGlossaryFromProfile, setRuntimeGlossary, getLabel } from '@/constants/glossary'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { normalizeTabBarItems } from '@/utils/tabbar'
import type { NavTab } from '@/types/miniapp'

export const useIndustryProfileStore = defineStore('industryProfile', () => {
  const profile = ref<IndustryProfile>(resolveIndustryProfile('content_ip'))
  const loaded = ref(false)

  const code = computed(() => profile.value.code)
  const componentAllowlist = computed(() => profile.value.componentAllowlist || [])
  const agentRoles = computed(() => profile.value.agentRoles || [])
  const displayNames = computed(() => profile.value.displayNames)

  function isComponentAllowed(type: string): boolean {
    const list = componentAllowlist.value
    if (!list.length) return true
    return list.includes(type)
  }

  function isAgentRoleAllowed(role: string): boolean {
    const list = agentRoles.value
    if (!list.length) return true
    return list.includes(role)
  }

  function applyProfileObject(raw: IndustryProfile) {
    profile.value = raw
    setRuntimeGlossary({ ...raw.glossary })
  }

  async function load() {
    try {
      const res = await getConfigsSilent()
      const configs = extractConfigList(res.data)
      let industryCode = 'content_ip'
      let profileJson: IndustryProfile | null = null
      let glossaryMap: Record<string, string> | null = null

      configs.forEach((item) => {
        const { key, value } = readConfigEntry(item)
        if (key === 'industry_profile' && value) {
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value
            if (parsed && parsed.code) {
              profileJson = parsed as IndustryProfile
              industryCode = String(parsed.code)
            }
          } catch { /* ignore */ }
        }
        if (key === 'glossary' && value) {
          try {
            glossaryMap = typeof value === 'string' ? JSON.parse(String(value)) : (value as Record<string, string>)
          } catch { /* ignore */ }
        }
      })

      const resolved = profileJson || resolveIndustryProfile(industryCode)
      applyProfileObject(resolved)
      if (glossaryMap) {
        setRuntimeGlossary({ ...resolved.glossary, ...(glossaryMap as Record<string, string>) })
      }
      loaded.value = true
    } catch (e) {
      console.warn('[industryProfile] load failed', e)
      applyGlossaryFromProfile('content_ip')
      loaded.value = true
    }
  }

  /** 应用业态包：写回 system_config（plugins/glossary/theme/tabbar/planet 展示名等） */
  async function applyIndustryCode(industryCode: string) {
    const next = resolveIndustryProfile(industryCode)
    const featureModules = useFeatureModulesStore()
    const pluginsPayload = Object.entries(next.plugins).map(([key, enabled]) => ({ key, enabled: !!enabled }))

    const tabbar = normalizeTabBarItems(
      next.tabbar.map((t, i) => ({
        id: `tab-${i}`,
        text: t.text,
        pagePath: t.tabRoute,
        tabRoute: t.tabRoute,
        icon: '/images/nav-icons/g-bag.png',
        pageId: '',
        pageName: '',
      })) as NavTab[],
    )

    await updateConfigs(toConfigUpdateItems({
      industry_profile: next,
      glossary: next.glossary,
      plugins: pluginsPayload,
      miniappThemeConfig: next.theme,
      tabbarItems: tabbar,
      planet_config: {
        title: next.displayNames.planet,
        subtitle: `${next.name} · 社群与专属内容`,
        coverImage: '',
        unpaidViewMode: 'summary',
        previewCount: 3,
        entryLabel: next.glossary.planet || '星球',
      },
    }, 'basic'))

    await featureModules.setModules(pluginsPayload)
    applyProfileObject(next)
    return next
  }

  return {
    profile,
    loaded,
    code,
    componentAllowlist,
    agentRoles,
    displayNames,
    isComponentAllowed,
    isAgentRoleAllowed,
    load,
    applyIndustryCode,
    listOptions: listIndustryProfileOptions,
    getLabel,
    INDUSTRY_PROFILES,
  }
})
