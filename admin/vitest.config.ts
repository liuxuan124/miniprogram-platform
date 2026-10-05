import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  // 🔴 2026-10-06 新增：__PLATFORM_VERSION__ 是 vite define 在构建时注入的全局常量
  // （见 vite.config.ts 的 define），单测环境里没有它，任何 import 到
  // constants/platform.ts 的模块都会抛 ReferenceError。
  // ⚠️ 必须放在 test 之外的顶层——放进 test.define 不生效（实测仍然报未定义）。
  define: {
    __PLATFORM_VERSION__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/utils/editorKeyboardGuard.test.ts',
      'src/composables/useEditorPersist.test.ts',
      'src/utils/dsl-*.test.ts',
    ],
  },
})
