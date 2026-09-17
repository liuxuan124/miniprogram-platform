/**
 * 租户上下文：超管可切换 X-Tenant-Id
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createTenant, getCurrentTenant, listTenants, type TenantCreatePayload, type TenantInfo } from '@/api/tenant'
import { usePermissionStore } from '@/stores/permission'
import { decodeMojibake } from '@/utils/text-encoding'

function normalizeTenant(t: TenantInfo): TenantInfo {
  return {
    ...t,
    tenantId: t.id ?? t.tenantId,
    name: decodeMojibake(t.name),
    code: decodeMojibake(t.code),
  }
}

const STORAGE_KEY = 'mp_active_tenant_id'

export const useTenantStore = defineStore('tenant', () => {
  const current = ref<TenantInfo | null>(null)
  const tenants = ref<TenantInfo[]>([])
  const activeTenantId = ref<number | null>(null)
  const loaded = ref(false)

  const displayName = computed(() => {
    if (current.value?.name) return current.value.name
    return activeTenantId.value ? `租户 #${activeTenantId.value}` : '默认租户'
  })

  function isSuperAdmin() {
    return usePermissionStore().hasRole('super_admin')
  }

  function readStoredId(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : null
    } catch {
      return null
    }
  }

  function persistActiveId(id: number | null) {
    activeTenantId.value = id
    try {
      if (id == null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, String(id))
    } catch { /* ignore */ }
  }

  async function load() {
    try {
      if (isSuperAdmin()) {
        const stored = readStoredId()
        if (stored) persistActiveId(stored)
        const listRes = await listTenants()
        tenants.value = (listRes.data || []).map(normalizeTenant)
      }
      const cur = await getCurrentTenant()
      current.value = cur.data ? normalizeTenant(cur.data) : null
      if (!activeTenantId.value && current.value?.tenantId) {
        persistActiveId(Number(current.value.tenantId))
      }
      loaded.value = true
    } catch (e) {
      console.warn('[tenant] load failed', e)
      loaded.value = true
    }
  }

  async function switchTenant(id: number) {
    if (!isSuperAdmin()) return
    persistActiveId(id)
    const cur = await getCurrentTenant()
    current.value = cur.data ? normalizeTenant(cur.data) : null
    // 刷新页面数据，避免串租户缓存
    window.location.reload()
  }

  async function create(payload: TenantCreatePayload) {
    const res = await createTenant(payload)
    await load()
    return res.data
  }

  return {
    current,
    tenants,
    activeTenantId,
    loaded,
    displayName,
    isSuperAdmin,
    load,
    switchTenant,
    create,
    persistActiveId,
  }
})
