import { onMounted, reactive } from 'vue'
import { getConfigsSilent, normalizeUploadUrl } from '@/api/system'
import { applyBrandConfigToForm } from '@/utils/brand-config'
import { extractConfigList } from '@/utils/system-config'
import { DEFAULT_MINIAPP_BRAND_CONFIG, type MiniappBrandConfig } from '@/types/miniapp'

/** 后台预览登录半屏：读取已保存的品牌配置（与小程序同源） */
export function usePreviewBrandConfig() {
  const brand = reactive<MiniappBrandConfig>({ ...DEFAULT_MINIAPP_BRAND_CONFIG })

  onMounted(async () => {
    try {
      const res = await getConfigsSilent()
      applyBrandConfigToForm(extractConfigList(res.data), brand)
      if (brand.logoUrl) {
        brand.logoUrl = normalizeUploadUrl(brand.logoUrl)
      }
    } catch {
      // 保留默认值
    }
  })

  return brand
}
