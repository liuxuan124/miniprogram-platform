import { ref } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { usePageStore } from '@/stores/page'
import { getComponentDef } from '@/components/page-builder/componentRegistry'

const UNDO_MS = 5000

/** 模块级单例：结构树与画布删除共用同一条底栏撤销提示 */
const snackVisible = ref(false)
const snackLabel = ref('')
let timer: ReturnType<typeof setTimeout> | null = null
let pendingRestore: { comp: ComponentInstance; index: number } | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function dismissSnack() {
  clearTimer()
  snackVisible.value = false
  pendingRestore = null
}

export function useEditorDeleteUndo() {
  const pageStore = usePageStore()

  function deleteWithUndo(comp: ComponentInstance) {
    const index = pageStore.components.findIndex((c) => c.id === comp.id)
    if (index < 0) return
    const snapshot = JSON.parse(JSON.stringify(comp)) as ComponentInstance
    pageStore.removeComponent(comp.id)
    pendingRestore = { comp: snapshot, index }
    const label = getComponentDef(comp.type)?.label ?? comp.type
    snackLabel.value = `已删除「${label}」`
    snackVisible.value = true
    clearTimer()
    timer = setTimeout(() => dismissSnack(), UNDO_MS)
  }

  function undoDelete() {
    if (!pendingRestore) return
    const { comp, index } = pendingRestore
    pageStore.insertComponentAt(comp, index)
    dismissSnack()
  }

  return { snackVisible, snackLabel, deleteWithUndo, undoDelete, dismissSnack }
}
