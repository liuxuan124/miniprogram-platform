import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import type { PageDSL } from '@/types/page'
import { usePageStore } from '@/stores/page'

const DEBOUNCE_MS = 1500
const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 60_000
const MAX_RETRIES = 8
const BACKUP_PREFIX = 'page-editor-backup:'

export type EditorSaveUiStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function backupDraftLocal(pageId: number, dsl: PageDSL) {
  try {
    localStorage.setItem(
      `${BACKUP_PREFIX}${pageId}`,
      JSON.stringify({ savedAt: Date.now(), dsl }),
    )
  } catch {
    /* quota */
  }
}

export function clearDraftBackup(pageId: number) {
  try {
    localStorage.removeItem(`${BACKUP_PREFIX}${pageId}`)
  } catch {
    /* ignore */
  }
}

export function readDraftBackup(pageId: number): { savedAt: number; dsl: PageDSL } | null {
  try {
    const raw = localStorage.getItem(`${BACKUP_PREFIX}${pageId}`)
    if (!raw) return null
    return JSON.parse(raw) as { savedAt: number; dsl: PageDSL }
  } catch {
    return null
  }
}

function formatSavedTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function retryDelayMs(retryCount: number): number {
  const exp = RETRY_BASE_MS * 2 ** Math.max(0, retryCount - 1)
  return Math.min(RETRY_MAX_MS, exp)
}

/**
 * 防抖自动保存 + 失败重试 + 本地备份
 * @param saveFn 返回 true 表示已成功落库
 */
export function useEditorPersist(saveFn: () => Promise<boolean>) {
  const pageStore = usePageStore()
  const saveStatus = ref<EditorSaveUiStatus>('idle')
  const saveStatusText = ref('')
  const lastSavedAt = ref<Date | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  let saveInFlight = false

  function updateStatusText() {
    if (saveStatus.value === 'saving' || saveStatus.value === 'pending') {
      saveStatusText.value = '保存中…'
      return
    }
    if (saveStatus.value === 'error') {
      saveStatusText.value = '保存失败·重试'
      return
    }
    if (saveStatus.value === 'saved' && lastSavedAt.value) {
      saveStatusText.value = `已保存 ${formatSavedTime(lastSavedAt.value)}`
      return
    }
    saveStatusText.value = ''
  }

  async function runSave() {
    if (!pageStore.currentPage?.id || saveInFlight) return
    if (!pageStore.hasUnpersistedChanges) {
      saveStatus.value = 'saved'
      updateStatusText()
      return
    }
    saveInFlight = true
    saveStatus.value = 'saving'
    updateStatusText()
    const pageId = pageStore.currentPage.id
    backupDraftLocal(pageId, pageStore.dsl)
    try {
      const ok = await saveFn()
      if (ok) {
        retryCount = 0
        lastSavedAt.value = new Date()
        saveStatus.value = 'saved'
        clearDraftBackup(pageId)
        updateStatusText()
      } else {
        throw new Error('save rejected')
      }
    } catch {
      saveStatus.value = 'error'
      updateStatusText()
      scheduleRetry()
    } finally {
      saveInFlight = false
    }
  }

  function scheduleRetry() {
    if (retryTimer) return
    if (retryCount >= MAX_RETRIES) return
    retryCount += 1
    const delay = retryDelayMs(retryCount)
    retryTimer = setTimeout(() => {
      retryTimer = null
      if (pageStore.hasUnpersistedChanges) void runSave()
    }, delay)
  }

  function queueSave() {
    if (!pageStore.currentPage?.id) return
    const pageId = pageStore.currentPage.id
    backupDraftLocal(pageId, pageStore.dsl)
    saveStatus.value = 'pending'
    updateStatusText()
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void runSave()
    }, DEBOUNCE_MS)
  }

  function retryNow() {
    retryCount = 0
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    void runSave()
  }

  function resetPersistState() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
    retryCount = 0
    saveInFlight = false
    saveStatus.value = 'idle'
    lastSavedAt.value = null
    saveStatusText.value = ''
  }

  function bindAutoSaveWatch(source: Ref<unknown>) {
    const stop = watch(
      source,
      () => {
        if (!pageStore.hasUnpersistedChanges) return
        queueSave()
      },
      { deep: true },
    )
    onBeforeUnmount(stop)
    return stop
  }

  return {
    saveStatus,
    saveStatusText,
    lastSavedAt,
    queueSave,
    runSave,
    retryNow,
    resetPersistState,
    bindAutoSaveWatch,
    updateStatusText,
  }
}
