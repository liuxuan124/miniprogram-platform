<template>
  <teleport to="body">
    <div v-if="visible" class="cmd-mask" @click.self="close">
      <div class="cmd-panel" role="dialog" aria-label="命令面板">
        <el-input
          ref="inputRef"
          v-model="query"
          placeholder="搜索页面 / 功能（Ctrl+K）"
          clearable
          @keydown.esc="close"
          @keydown.enter.prevent="goActive"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
        />
        <ul class="cmd-list">
          <li
            v-for="(item, idx) in filtered"
            :key="item.path"
            :class="{ active: idx === active }"
            @click="go(item.path)"
          >
            <span>{{ item.title }}</span>
            <code>{{ item.path }}</code>
          </li>
          <li v-if="!filtered.length" class="empty">无匹配结果</li>
        </ul>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureModulesStore } from '@/stores/feature-modules'

const router = useRouter()
const featureModulesStore = useFeatureModulesStore()
const visible = ref(false)
const query = ref('')
const active = ref(0)
const inputRef = ref<{ focus?: () => void } | null>(null)

const routes = [
  { title: '工作总览', path: '/dashboard' },
  { title: '运营概览', path: '/mini/overview' },
  { title: '页面管理', path: '/mini/pages' },
  { title: '模板中心', path: '/mini/templates' },
  { title: '发布中心', path: '/mini/publish' },
  { title: 'AI 建页', path: '/mini/pages/new-ai' },
  { title: '商品管理', path: '/commerce/products', featureModule: 'product' },
  { title: '内容概览', path: '/content/overview' },
  { title: '内容列表', path: '/content/library' },
  { title: '撰写内容', path: '/content/write' },
  { title: '订单管理', path: '/commerce/orders', featureModule: 'product' },
  { title: '卡券中心', path: '/commerce/coupons' },
  { title: '用户管理', path: '/member/users', featureModule: 'member' },
  { title: '成长积分', path: '/member/growth', featureModule: 'member' },
  { title: '活动管理', path: '/activity/list' },
  { title: '预约管理', path: '/appointment/list' },
  { title: '增长数据', path: '/commerce/growth' },
  { title: '系统设置', path: '/settings/basic' },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const visibleRoutes = routes.filter((r) => {
    if (r.featureModule && !featureModulesStore.isEnabled(r.featureModule)) return false
    return true
  })
  if (!q) return visibleRoutes
  return visibleRoutes.filter((r) => r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q))
})

function open() {
  visible.value = true
  query.value = ''
  active.value = 0
  nextTick(() => inputRef.value?.focus?.())
}

function close() {
  visible.value = false
}

function move(delta: number) {
  const len = filtered.value.length
  if (!len) return
  active.value = (active.value + delta + len) % len
}

function go(path: string) {
  close()
  router.push(path)
}

function goActive() {
  const item = filtered.value[active.value]
  if (item) go(item.path)
}

function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (visible.value) close()
    else open()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.cmd-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
}
.cmd-panel {
  width: min(560px, 92vw);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  padding: 12px;
}
.cmd-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  max-height: 360px;
  overflow: auto;
}
.cmd-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #1f2937;
}
.cmd-list li.active,
.cmd-list li:hover {
  background: #f3f4f6;
}
.cmd-list code {
  color: #6b7280;
  font-size: 12px;
}
.cmd-list .empty {
  justify-content: center;
  color: #9ca3af;
  cursor: default;
}
</style>
