/** 画布快捷键是否应失效（弹层打开或输入框聚焦） */

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (el.closest('.el-input, .el-textarea, .el-select, [contenteditable="true"]')) return true
  return false
}

function isVisible(el: Element | null): boolean {
  if (!el) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (Number(style.opacity) === 0) return false
  return true
}

/** Modal / Drawer / Popover 打开时不响应画布快捷键 */
export function isEditorOverlayBlocking(): boolean {
  if (document.querySelector('.el-message-box__wrapper')) return true
  const overlays = document.querySelectorAll('.el-overlay')
  for (const node of overlays) {
    if (!isVisible(node)) continue
    if (node.querySelector('.el-message-box, .el-dialog, .el-drawer')) return true
  }
  const poppers = document.querySelectorAll('.el-popper')
  for (const node of poppers) {
    if (!isVisible(node)) continue
    const role = node.getAttribute('role')
    if (role === 'tooltip') continue
    return true
  }
  return false
}

export function isCanvasShortcutBlocked(event?: KeyboardEvent): boolean {
  const target = event?.target ?? document.activeElement
  if (isEditableTarget(target)) return true
  return isEditorOverlayBlocking()
}
