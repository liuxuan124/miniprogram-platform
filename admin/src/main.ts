import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router, { reloadOnceForChunkError } from './router'
import { setupRouterGuards } from './router/guards'
import '@/assets/styles/index.scss'
import '@/styles/tokens.css'
import '@/styles/mini-workbench.scss'
import '@/styles/content-workbench.scss'
import '@/styles/member-workbench.scss'
import '@/styles/commerce-workbench.scss'
import ColorPickerField from '@/components/ColorPickerField.vue'

// index.html 内联脚本已设置 data-admin-theme；此处与 Pinia 再同步一次
try {
  const t = localStorage.getItem('admin-theme') ?? localStorage.getItem('admin-ui-theme')
  document.documentElement.setAttribute('data-admin-theme', t === 'warm' ? 'warm' : 'classic')
} catch {
  document.documentElement.setAttribute('data-admin-theme', 'classic')
}

// 注册路由守卫
setupRouterGuards(router)

// P1-04 白屏兜底（入口级）：Vite 预载的动态 import 失败不会进 router.onError，
// 监听 vite:preloadError 同样自动刷新一次（含 60 秒防死循环守卫，见 router/index.ts）
window.addEventListener('vite:preloadError', () => {
  reloadOnceForChunkError()
})

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
// 全局替换颜色选择器：自带吸管取色
app.component('ElColorPicker', ColorPickerField)
app.component('el-color-picker', ColorPickerField)
app.component('ColorPickerField', ColorPickerField)

app.mount('#app')
