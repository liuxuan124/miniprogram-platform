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

const router = useRouter()
const visible = ref(false)
const query = ref('')
const active = ref(0)
const inputRef = ref<{ focus?: () => void } | null>(null)

const routes = [
  { title: '工作台', path: '/dashboard' },
  { title: '小程序总览', path: '/page-builder/overview' },
  { title: '页面管理', path: '/page-builder/pages' },
  { title: '外观配置', path: '/page-builder/miniapp' },
  { title: '版本发布', path: '/page-builder/release' },
  { title: '商品列表', path: '/product/list' },
  { title: '新建商品', path: '/product/edit' },
  { title: '内容列表', path: '/content/list' },
  { title: '发布内容', path: '/content/edit' },
  { title: '订单管理', path: '/order/list' },
  { title: '优惠券', path: '/marketing/coupon' },
  { title: '会员列表', path: '/member/list' },
  { title: '积分管理', path: '/member/points' },
  { title: '活动管理', path: '/activity/list' },
  { title: '预约管理', path: '/appointment/list' },
  { title: '增长与数据', path: '/growth/overview' },
  { title: '系统配置', path: '/system/config' },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return routes
  return routes.filter((r) => r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q))
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
