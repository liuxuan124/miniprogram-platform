import { describe, it, expect, beforeEach } from 'vitest'
import { isEditableTarget, isCanvasShortcutBlocked, isEditorOverlayBlocking } from './editorKeyboardGuard'

describe('editorKeyboardGuard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('blocks when input is focused', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(isEditableTarget(document.activeElement)).toBe(true)
    expect(isCanvasShortcutBlocked()).toBe(true)
  })

  it('blocks when message box wrapper is visible', () => {
    const box = document.createElement('div')
    box.className = 'el-message-box__wrapper'
    document.body.appendChild(box)
    expect(isEditorOverlayBlocking()).toBe(true)
    expect(isCanvasShortcutBlocked()).toBe(true)
  })

  it('allows shortcuts on plain canvas', () => {
    expect(isCanvasShortcutBlocked()).toBe(false)
  })
})
