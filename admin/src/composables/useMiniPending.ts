/**
 * 小程序工作台：待发布数量（侧栏角标 / 顶栏「发布 N」共用）
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { getPendingChanges, getMiniSite } from '@/api/miniSite'

const pendingCount = ref(0)
const siteLabel = ref('小程序')
const liveReleaseNo = ref<number | null>(null)
let loaded = false
let inflight: Promise<void> | null = null

export async function refreshMiniPending(force = false) {
  if (inflight && !force) return inflight
  inflight = (async () => {
    try {
      const [pending, site] = await Promise.all([
        getPendingChanges().catch(() => ({ pendingCount: 0, items: [] })),
        getMiniSite('draft').catch(() => null),
      ])
      const n = Number(pending.pendingCount ?? pending.items?.length ?? 0)
      pendingCount.value = Number.isFinite(n) ? n : 0
      if (site?.name) siteLabel.value = String(site.name)
      if (site?.liveReleaseNo != null) liveReleaseNo.value = Number(site.liveReleaseNo)
      loaded = true
    } catch {
      /* ignore */
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useMiniPending(autoLoad = true) {
  onMounted(() => {
    if (autoLoad && !loaded) void refreshMiniPending()
  })
  // 路由切换时由 Header/Sidebar 主动 refresh；此处不卸载清零
  onUnmounted(() => {})
  return {
    pendingCount,
    siteLabel,
    liveReleaseNo,
    refreshMiniPending,
  }
}

export { pendingCount, siteLabel, liveReleaseNo }
