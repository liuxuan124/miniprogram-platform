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
    // 🔴 include 是**白名单**：新测试文件不加进来就会被静默跳过（`vitest` 报 0 tests 也不报错）
    include: [
      'src/utils/editorKeyboardGuard.test.ts',
      'src/composables/useEditorPersist.test.ts',
      'src/utils/dsl-*.test.ts',
      // 文章流「不限篇数」解耦 + 来源标签动态映射表（2026-10-06）
      'src/components/page-builder/articleFeed/*.test.ts',
      // 笔记流两层导航样式（2026-10-06）
      'src/components/page-builder/noteFeed/*.test.ts',
    ],
  },
})
