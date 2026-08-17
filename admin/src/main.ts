import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { setupRouterGuards } from './router/guards'
import '@/assets/styles/index.scss'
import ColorPickerField from '@/components/ColorPickerField.vue'

// 注册路由守卫
setupRouterGuards(router)

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
