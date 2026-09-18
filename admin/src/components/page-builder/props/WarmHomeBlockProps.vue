<template>
  <el-form label-width="92px" size="small">
    <template v-if="type === 'warm_greet'">
      <el-form-item label="问候语">
        <el-input :model-value="data.greet_template" placeholder="你好" @input="emit('update', { greet_template: $event })" />
      </el-form-item>
      <el-form-item label="搜索提示">
        <el-input :model-value="data.search_placeholder" @input="emit('update', { search_placeholder: $event })" />
      </el-form-item>
      <el-form-item label="显示搜索">
        <el-switch :model-value="data.show_search !== false" @change="(v: boolean) => emit('update', { show_search: v })" />
      </el-form-item>
      <el-form-item label="显示导航">
        <el-switch :model-value="data.show_nav !== false" @change="(v: boolean) => emit('update', { show_nav: v })" />
      </el-form-item>
      <el-form-item label="通知铃">
        <el-switch :model-value="data.show_notice !== false" @change="(v: boolean) => emit('update', { show_notice: v })" />
      </el-form-item>

      <el-divider content-position="left">快捷入口（navs）</el-divider>
      <p class="ds-hint">写入系统 warm_home_config，首页问候区实时读取。建议 5 个。</p>
      <div v-for="(nav, ni) in navs" :key="nav.key || ni" class="nav-row">
        <el-input
          :model-value="nav.icon"
          placeholder="图标"
          style="width: 56px"
          @input="(v: string) => patchNav(ni, { icon: v })"
        />
        <el-input
          :model-value="nav.label"
          placeholder="文案"
          style="width: 88px"
          @input="(v: string) => patchNav(ni, { label: v })"
        />
        <el-input
          :model-value="nav.url"
          placeholder="/pages/..."
          style="flex: 1; min-width: 140px"
          @input="(v: string) => patchNav(ni, { url: v })"
        />
        <el-switch
          :model-value="!!nav.tab"
          inline-prompt
          active-text="Tab"
          inactive-text="页"
          @change="(v: boolean) => patchNav(ni, { tab: v })"
        />
        <el-button link :disabled="ni === 0" @click="moveNav(ni, -1)">↑</el-button>
        <el-button link :disabled="ni >= navs.length - 1" @click="moveNav(ni, 1)">↓</el-button>
        <el-button link type="danger" :disabled="navs.length <= 1" @click="removeNav(ni)">删</el-button>
      </div>
      <div class="nav-actions">
        <el-button size="small" :disabled="navs.length >= 8" @click="addNav">+ 入口</el-button>
        <el-button type="primary" size="small" :loading="navSaving" @click="saveNavs">保存到首页配置</el-button>
      </div>

      <el-alert title="连续阅读天数、头像、昵称来自当前登录用户，不能在这里填写。" type="info" :closable="false" show-icon style="margin-top: 12px" />
    </template>

    <template v-else-if="type === 'warm_authors'">
      <el-form-item label="区块标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" />
      </el-form-item>
      <el-form-item label="更多文案">
        <el-input :model-value="data.more_text" @input="emit('update', { more_text: $event })" />
      </el-form-item>
      <el-form-item label="跳转路径">
        <el-input :model-value="data.more_url || '/pages/author-list/author-list'" @input="emit('update', { more_url: $event })" />
      </el-form-item>
      <el-form-item label="Tab 跳转">
        <el-switch :model-value="!!data.more_tab" @change="(v: boolean) => emit('update', { more_tab: v })" />
      </el-form-item>
      <el-alert title="头像点进该作者作品页；「全部作者」默认进作者列表。作者数据来自首页聚合配置。" type="info" :closable="false" show-icon />
    </template>

    <template v-else-if="type === 'warm_columns' || type === 'warm_planet_rec'">
      <el-form-item label="区块标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" />
      </el-form-item>
      <el-form-item label="更多文案">
        <el-input :model-value="data.more_text" @input="emit('update', { more_text: $event })" />
      </el-form-item>
      <el-form-item label="跳转路径">
        <el-input :model-value="data.more_url" @input="emit('update', { more_url: $event })" />
      </el-form-item>
      <el-form-item label="Tab 跳转">
        <el-switch :model-value="!!data.more_tab" @change="(v: boolean) => emit('update', { more_tab: v })" />
      </el-form-item>
      <el-alert title="列表内容来自首页聚合接口里的真实商品/星球，不支持手填演示条目。" type="info" :closable="false" show-icon />
    </template>

    <template v-else-if="type === 'warm_feature'">
      <el-form-item label="空状态">
        <el-input :model-value="data.empty_text" placeholder="暂无精选内容" @input="emit('update', { empty_text: $event })" />
      </el-form-item>
      <el-alert title="精选封面与标题来自后台绑定的已发布内容。" type="info" :closable="false" show-icon />
    </template>

    <template v-else-if="type === 'warm_feed'">
      <el-form-item label="底部文案">
        <el-input :model-value="data.footer" @input="emit('update', { footer: $event })" />
      </el-form-item>
      <el-form-item label="阅读/点赞">
        <el-radio-group
          :model-value="feedStatsMode"
          @change="onFeedStatsMode"
        >
          <el-radio-button value="auto">自动（内容真实数）</el-radio-button>
          <el-radio-button value="manual">手动（配置 meta）</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-alert
        title="自动：长文用阅读数、笔记用点赞数，并写入系统 warm_home_config。手动：沿用 feed[].meta。内容编辑页可改阅读/点赞基数。"
        type="info"
        :closable="false"
        show-icon
      />
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getConfigsSilent, updateConfigs } from '@/api/system'

export type WarmNavItem = {
  key?: string
  icon?: string
  label?: string
  url?: string
  tab?: boolean
}

const DEFAULT_NAVS: WarmNavItem[] = [
  { key: 'list', icon: '📚', label: '长文', url: '/pages/content-list/content-list' },
  { key: 'column', icon: '🎧', label: '专栏课', url: '/pages/product-list/product-list?type=column' },
  { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
  { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
  { key: 'resources', icon: '🗂', label: '资料库', url: '/pages/resources/resources' },
]

const { props: data, type } = defineProps<{ props: Record<string, any>; type?: string }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const remoteFeedStatsMode = ref<'auto' | 'manual'>('auto')
const navDraft = ref<WarmNavItem[]>([])
const navSaving = ref(false)
const navHydrated = ref(false)

const feedStatsMode = computed(() => {
  if (data.feed_stats_mode === 'manual' || data.feed_stats_mode === 'auto') {
    return data.feed_stats_mode
  }
  return remoteFeedStatsMode.value
})

const navs = computed(() => {
  if (navDraft.value.length) return navDraft.value
  if (Array.isArray(data.navs) && data.navs.length) return data.navs as WarmNavItem[]
  return DEFAULT_NAVS
})

function parseWarmHomeConfig(raw: string) {
  try {
    const obj = JSON.parse(raw || '{}')
    return obj && typeof obj === 'object' ? obj as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function normalizeNav(n: any, i: number): WarmNavItem {
  return {
    key: String(n?.key || `nav_${i}`),
    icon: String(n?.icon || ''),
    label: String(n?.label || ''),
    url: String(n?.url || ''),
    tab: !!n?.tab,
  }
}

function commitNavs(next: WarmNavItem[]) {
  navDraft.value = next.map((n, i) => normalizeNav(n, i))
  emit('update', { navs: navDraft.value.map((n) => ({ ...n })) })
}

function patchNav(index: number, patch: Partial<WarmNavItem>) {
  const next = navs.value.map((n, i) => (i === index ? { ...n, ...patch } : { ...n }))
  commitNavs(next)
}

function moveNav(index: number, delta: number) {
  const next = navs.value.map((n) => ({ ...n }))
  const j = index + delta
  if (j < 0 || j >= next.length) return
  const tmp = next[index]
  next[index] = next[j]
  next[j] = tmp
  commitNavs(next)
}

function removeNav(index: number) {
  if (navs.value.length <= 1) return
  commitNavs(navs.value.filter((_, i) => i !== index))
}

function addNav() {
  if (navs.value.length >= 8) return
  commitNavs([
    ...navs.value.map((n) => ({ ...n })),
    { key: `nav_${Date.now().toString(36)}`, icon: '⭐', label: '新入口', url: '/pages/index/index', tab: false },
  ])
}

async function loadWarmHomeHit() {
  const res = await getConfigsSilent()
  const rows = Array.isArray(res) ? res : ((res as any)?.data || [])
  const hit = (rows as any[]).find((r) => (r.configKey || r.config_key) === 'warm_home_config')
  const cfg = parseWarmHomeConfig(String(hit?.configValue || hit?.config_value || ''))
  return { hit, cfg }
}

async function loadFeedStatsMode() {
  try {
    const { cfg } = await loadWarmHomeHit()
    remoteFeedStatsMode.value = cfg.feedStatsMode === 'manual' ? 'manual' : 'auto'
  } catch {
    remoteFeedStatsMode.value = 'auto'
  }
}

async function hydrateNavs() {
  if (navHydrated.value) return
  try {
    if (Array.isArray(data.navs) && data.navs.length) {
      navDraft.value = data.navs.map((n: any, i: number) => normalizeNav(n, i))
      navHydrated.value = true
      return
    }
    const { cfg } = await loadWarmHomeHit()
    const remote = Array.isArray(cfg.navs) ? cfg.navs as WarmNavItem[] : []
    if (remote.length) {
      navDraft.value = remote.map((n, i) => normalizeNav(n, i))
      emit('update', { navs: navDraft.value.map((n) => ({ ...n })) })
    } else {
      navDraft.value = DEFAULT_NAVS.map((n, i) => normalizeNav(n, i))
    }
  } catch {
    navDraft.value = DEFAULT_NAVS.map((n, i) => normalizeNav(n, i))
  } finally {
    navHydrated.value = true
  }
}

async function saveNavs() {
  navSaving.value = true
  try {
    const list = navs.value.map((n, i) => normalizeNav(n, i)).filter((n) => n.label || n.url)
    emit('update', { navs: list.map((n) => ({ ...n })) })
    const { hit, cfg } = await loadWarmHomeHit()
    cfg.navs = list
    await updateConfigs([{
      configKey: 'warm_home_config',
      configValue: JSON.stringify(cfg),
      configGroup: hit?.configGroup || hit?.config_group || 'miniapp',
      description: hit?.description || '暖阁首页配置',
    }])
    navDraft.value = list
    ElMessage.success('快捷入口已写入首页配置')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    navSaving.value = false
  }
}

async function onFeedStatsMode(v: string) {
  const mode = v === 'manual' ? 'manual' : 'auto'
  emit('update', { feed_stats_mode: mode })
  try {
    const { hit, cfg } = await loadWarmHomeHit()
    cfg.feedStatsMode = mode
    await updateConfigs([{
      configKey: 'warm_home_config',
      configValue: JSON.stringify(cfg),
      configGroup: hit?.configGroup || hit?.config_group || 'miniapp',
      description: hit?.description || '暖阁首页配置',
    }])
    remoteFeedStatsMode.value = mode
    ElMessage.success(mode === 'auto' ? '已改为自动真实数据' : '已改为手动 meta')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

watch(() => data.navs, (v) => {
  if (!navHydrated.value) return
  if (Array.isArray(v) && v.length) {
    navDraft.value = v.map((n: any, i: number) => normalizeNav(n, i))
  }
})

onMounted(() => {
  if (type === 'warm_feed') loadFeedStatsMode()
  if (type === 'warm_greet') hydrateNavs()
})
</script>

<style scoped>
.ds-hint {
  color: #8a93a3;
  font-size: 12px;
  line-height: 1.4;
  margin: 0 0 10px;
}
.nav-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.nav-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
