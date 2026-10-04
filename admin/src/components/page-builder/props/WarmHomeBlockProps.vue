<template>
  <el-form label-width="72px" size="small">
    <template v-if="type === 'warm_greet'">
      <el-form-item label="问候语">
        <el-input :model-value="data.greet_template" placeholder="你好" @input="emit('update', { greet_template: $event })" />
      </el-form-item>
      <el-form-item label="顶部视觉">
        <el-radio-group
          :model-value="data.greet_skin || 'classic'"
          @change="(v: string) => emit('update', { greet_skin: v })"
        >
          <el-radio value="classic">经典暖阁</el-radio>
          <el-radio value="plain">墨太白 plain</el-radio>
        </el-radio-group>
        <div class="ds-hint">
          「墨太白 plain」= 白底搜索条 + 36px 首字头像。这是总开关，选了哪个就按哪个渲染。
        </div>
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
      <el-form-item label="会员标签">
        <el-switch
          :model-value="data.show_member_badge === true"
          @change="(v: boolean) => emit('update', { show_member_badge: v })"
        />
        <div class="ds-hint">开启后右侧显示会员身份标签，替代通知铃样式</div>
      </el-form-item>
      <template v-if="data.show_member_badge === true">
        <el-form-item label="未开通文案">
          <el-input
            :model-value="data.member_cta_label || '开通会员 ›'"
            @input="(v: string) => emit('update', { member_cta_label: v })"
          />
        </el-form-item>
        <el-form-item label="已开通文案">
          <el-input
            :model-value="data.member_active_label || '年度会员'"
            @input="(v: string) => emit('update', { member_active_label: v })"
          />
        </el-form-item>
        <el-form-item label="跳转路径">
          <el-input
            :model-value="data.member_link || '/pages/member-center/member-center'"
            @input="(v: string) => emit('update', { member_link: v })"
          />
        </el-form-item>
      </template>
      <el-form-item label="品牌首字">
        <el-input
          :model-value="data.brand_initial || ''"
          maxlength="1"
          placeholder="无头像时圆形内显示，如「墨」"
          @input="(v: string) => emit('update', { brand_initial: v })"
        />
      </el-form-item>
      <el-form-item label="问候字号">
        <el-input-number
          :model-value="Number(data.greet_title_font_size ?? 20)"
          :min="12"
          :max="28"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { greet_title_font_size: v ?? 20 })"
        />
        <div class="ds-hint">墨太白建议 15</div>
      </el-form-item>
      <el-form-item label="副标题字号">
        <el-input-number
          :model-value="Number(data.greet_sub_font_size ?? 11)"
          :min="10"
          :max="16"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { greet_sub_font_size: v ?? 11 })"
        />
        <div class="ds-hint">墨太白建议 11.5（取 11 或 12）</div>
      </el-form-item>

      <el-divider content-position="left">金刚区入口</el-divider>
      <p class="ds-hint">写入首页全局配置，问候区会实时读取。建议 5 个，最多 8 个。</p>
      <div class="nav-list">
        <div v-for="(nav, ni) in navs" :key="nav.key || ni" class="nav-item">
          <div class="nav-item__head">
            <span class="nav-item__idx">{{ ni + 1 }}</span>
            <span class="nav-item__title">{{ nav.label || '未命名入口' }}</span>
            <span class="nav-item__spacer" />
            <el-tooltip content="上移一位" placement="top">
              <el-button link :disabled="ni === 0" @click="moveNav(ni, -1)">↑</el-button>
            </el-tooltip>
            <el-tooltip content="下移一位" placement="top">
              <el-button link :disabled="ni >= navs.length - 1" @click="moveNav(ni, 1)">↓</el-button>
            </el-tooltip>
            <el-tooltip content="删除入口" placement="top">
              <el-button link type="danger" aria-label="删除入口" :disabled="navs.length <= 1" @click="removeNav(ni)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div class="nav-item__grid">
            <div class="nav-field nav-field--icon">
              <span class="nav-field__label">图标</span>
              <!-- 图标支持两种：素材库图片（/uploads/ 开头）或直接输入 emoji。
                   图片与 emoji 不能同存，所以按isImageValue 二选一渲染控件。 -->
              <div v-if="isImageIcon(nav.icon)" class="nav-icon-picker">
                <img class="nav-icon-picker__preview" :src="String(nav.icon)" alt="" />
                <div class="nav-icon-picker__actions">
                  <el-button size="small" @click="pickIcon(ni)">换图</el-button>
                  <el-tooltip content="改回输入 emoji" placement="top"><el-button size="small" text @click="patchNav(ni, { icon: '' })">改 emoji</el-button></el-tooltip>
                </div>
              </div>
              <div v-else class="nav-icon-picker">
                <el-input
                  :model-value="nav.icon"
                  placeholder="emoji 或点右侧选图"
                  maxlength="8"
                  @input="(v: string) => patchNav(ni, { icon: v })"
                />
                <el-button size="small" class="nav-icon-picker__btn" @click="pickIcon(ni)">素材库</el-button>
              </div>
              <AssetPickerDialog v-model="iconPickerVisible" @select="(url: string) => patchNav(pickingIndex, { icon: url })" />
            </div>
            <label class="nav-field">
              <span class="nav-field__label">文案</span>
              <el-input
                :model-value="nav.label"
                placeholder="如：资料库"
                maxlength="8"
                @input="(v: string) => patchNav(ni, { label: v })"
              />
            </label>
            <label class="nav-field nav-field--wide">
              <span class="nav-field__label">跳转路径</span>
              <el-input
                :model-value="nav.url"
                placeholder="/pages/... 或 /pkg-xxx/xxx/xxx"
                @input="(v: string) => patchNav(ni, { url: v })"
              />
            </label>
            <div class="nav-field nav-field--switch">
              <span class="nav-field__label">打开方式</span>
              <el-tooltip content="页 = 普通页面跳转；Tab = 切换到小程序底部 Tab 页" placement="top">
                <el-switch
                  :model-value="!!nav.tab"
                  inline-prompt
                  active-text="Tab"
                  inactive-text="页"
                  @change="(v: boolean) => patchNav(ni, { tab: v })"
                />
              </el-tooltip>
            </div>
          </div>
        </div>
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
        <el-input :model-value="data.more_url || '/pkg-content/author-list/author-list'" @input="emit('update', { more_url: $event })" />
      </el-form-item>
      <el-form-item label="Tab 跳转">
        <el-switch :model-value="!!data.more_tab" @change="(v: boolean) => emit('update', { more_tab: v })" />
      </el-form-item>
      <el-form-item label="空态文案">
        <el-input
          :model-value="data.empty_text || ''"
          placeholder="暂无作者"
          @input="(v: string) => emit('update', { empty_text: v })"
        />
      </el-form-item>

      <el-divider content-position="left">作者条目</el-divider>
      <p class="ds-hint">
        这里留空时显示首页聚合接口返回的作者；一旦在这里填写，就以本处为准（可覆盖接口数据）。建议 3~6 个。
      </p>
      <div class="nav-list">
        <div v-for="(a, ai) in authorList" :key="a.key || ai" class="nav-item">
          <div class="nav-item__head">
            <span class="nav-item__idx">{{ ai + 1 }}</span>
            <span class="nav-item__title">{{ a.name || '未命名作者' }}</span>
            <span class="nav-item__spacer" />
            <el-tooltip content="上移一位" placement="top">
              <el-button link :disabled="ai === 0" @click="moveAuthor(ai, -1)">↑</el-button>
            </el-tooltip>
            <el-tooltip content="下移一位" placement="top">
              <el-button link :disabled="ai >= authorList.length - 1" @click="moveAuthor(ai, 1)">↓</el-button>
            </el-tooltip>
            <el-tooltip content="删除作者" placement="top">
              <el-button link type="danger" aria-label="删除作者" :disabled="authorList.length <= 1" @click="removeAuthor(ai)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div class="nav-item__grid nav-item__grid--author">
            <div class="nav-field nav-field--icon">
              <span class="nav-field__label">头像</span>
              <div class="nav-icon-picker">
                <img v-if="a.avatar" class="nav-icon-picker__preview nav-icon-picker__preview--round" :src="String(a.avatar)" alt="" />
                <div v-else class="nav-icon-picker__preview nav-icon-picker__preview--round nav-icon-picker__preview--empty">
                  {{ (a.name || '作').slice(0, 1) }}
                </div>
                <div class="nav-icon-picker__actions">
                  <el-button size="small" @click="pickAuthorAvatar(ai)">素材库</el-button>
                  <el-tooltip v-if="a.avatar" content="清空头像（改用首字）" placement="top">
                    <el-button size="small" text @click="patchAuthor(ai, { avatar: '' })">清空</el-button>
                  </el-tooltip>
                </div>
              </div>
            </div>
            <label class="nav-field">
              <span class="nav-field__label">名称</span>
              <el-input
                :model-value="a.name"
                placeholder="如：太白"
                maxlength="12"
                @input="(v: string) => patchAuthor(ai, { name: v })"
              />
            </label>
            <label class="nav-field">
              <span class="nav-field__label">身份</span>
              <el-input
                :model-value="a.role"
                placeholder="如：主理人"
                maxlength="12"
                @input="(v: string) => patchAuthor(ai, { role: v })"
              />
            </label>
            <div class="nav-field nav-field--switch">
              <span class="nav-field__label">招募位</span>
              <el-tooltip content="开启后头像位置显示「＋」，点击进投稿页（用于末尾邀请加入）" placement="top">
                <el-switch
                  :model-value="!!a.apply"
                  @change="(v: boolean) => patchAuthor(ai, { apply: v })"
                />
              </el-tooltip>
            </div>
            <label class="nav-field nav-field--wide">
              <span class="nav-field__label">点进跳转（留空走作者作品页）</span>
              <el-input
                :model-value="a.url"
                placeholder="/pkg-content/... 或 /pages/..."
                @input="(v: string) => patchAuthor(ai, { url: v })"
              />
            </label>
          </div>
        </div>
      </div>
      <div class="nav-actions">
        <el-button size="small" :disabled="authorList.length >= 8" @click="addAuthor">+ 作者</el-button>
        <el-button size="small" :disabled="!data.authors?.length" @click="clearAuthors">清空（改回接口数据）</el-button>
      </div>
      <AssetPickerDialog v-model="authorPickerVisible" @select="(url: string) => patchAuthor(pickingAuthorIndex, { avatar: url })" />
      <el-alert
        title="作者条目不再写死：填写后真机与预览都用这里的头像/名称/身份；「招募位」点击进投稿页。作者档案库仍可在「作者档案管理」维护。"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 10px"
      />
    </template>

    <template v-else-if="type === 'warm_columns'">
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
import { Delete } from '@element-plus/icons-vue'
import { getConfigsSilent, updateConfigs } from '@/api/system'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'

export type WarmNavItem = {
  key?: string
  icon?: string
  label?: string
  url?: string
  tab?: boolean
}

export type WarmAuthorItem = {
  key?: string
  name?: string
  role?: string
  avatar?: string
  url?: string
  /** true = 末尾「＋」招募位，点击进投稿页 */
  apply?: boolean
}

const DEFAULT_NAVS: WarmNavItem[] = [
  { key: 'list', icon: '📚', label: '长文', url: '/pkg-content/content-list/content-list' },
  { key: 'column', icon: '🎧', label: '专栏课', url: '/pkg-content/product-list/product-list?type=column' },
  { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
  { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
  { key: 'resources', icon: '🗂', label: '资料库', url: '/pkg-content/resources/resources' },
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

/** 金刚区图标：支持素材库图片或 emoji 二选一 */
const iconPickerVisible = ref(false)
/** 正在挑图的那一行索引 */
const pickingIndex = ref(0)

/** 作者头像素材库选择器（warm_authors 区块用） */
const authorPickerVisible = ref(false)
const pickingAuthorIndex = ref(0)

/**
 * 作者条目：DSL 里配了 authors 就用配的（覆盖接口），
 * 没配时返回 null，渲染层回落 warm_home_config.authors 接口数据。
 */
const authorList = computed<WarmAuthorItem[]>(() => {
  const list = data.authors
  return Array.isArray(list) ? (list as WarmAuthorItem[]) : []
})

function normalizeAuthor(a: any, i: number): WarmAuthorItem {
  return {
    key: String(a?.key || `author_${i}`),
    name: String(a?.name || ''),
    role: String(a?.role || ''),
    avatar: String(a?.avatar || ''),
    url: String(a?.url || ''),
    apply: !!a?.apply,
  }
}

function commitAuthors(next: WarmAuthorItem[]) {
  emit('update', { authors: next.map((a) => ({ ...a })) })
}

function patchAuthor(index: number, patch: Partial<WarmAuthorItem>) {
  const next = authorList.value.map((a, i) => (i === index ? { ...normalizeAuthor(a, i), ...patch } : { ...a }))
  commitAuthors(next)
}

function moveAuthor(index: number, delta: number) {
  const next = authorList.value.map((a, i) => normalizeAuthor(a, i))
  const j = index + delta
  if (j < 0 || j >= next.length) return
  const tmp = next[index]
  next[index] = next[j]
  next[j] = tmp
  commitAuthors(next)
}

function removeAuthor(index: number) {
  if (authorList.value.length <= 1) return
  commitAuthors(authorList.value.filter((_, i) => i !== index))
}

function addAuthor() {
  if (authorList.value.length >= 8) return
  commitAuthors([
    ...authorList.value.map((a, i) => normalizeAuthor(a, i)),
    { key: `author_${Date.now().toString(36)}`, name: '', role: '', avatar: '', url: '', apply: false },
  ])
}

function clearAuthors() {
  emit('update', { authors: [] })
}

function pickAuthorAvatar(index: number) {
  pickingAuthorIndex.value = index
  authorPickerVisible.value = true
}

/** 是否是图片图标：素材库图片一律以 /uploads/ 开头（相对路径），emoji 则不是 */
function isImageIcon(icon: unknown): boolean {
  const s = String(icon || '').trim()
  return s.startsWith('/uploads/') || /^https?:\/\//i.test(s)
}

function pickIcon(index: number) {
  pickingIndex.value = index
  iconPickerVisible.value = true
}

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
/* 金刚区入口：每个入口一张卡片，字段用栅格对齐，避免原来 flex-wrap 换行后
   「图标/文案」和「路径/开关」错位、看不出哪几个字段属于同一条入口 */
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  padding: 8px 10px 10px;
  background: var(--wb-soft, #f8fafc);
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 8px;
}
.nav-item__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.nav-item__idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--color-primary, #002fa7);
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.nav-item__title {
  color: var(--color-ink, #172033);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-item__spacer {
  flex: 1;
}
.nav-item__grid {
  display: grid;
  /* 图标 / 文案 / 开关各一列，跳转路径占剩余宽度。
     图标列给 132px：既能显示 emoji，也能放下「预览/输入 + 素材库按钮」而不换行。 */
  grid-template-columns: 148px 84px minmax(96px, 1fr) 58px;
  gap: 8px;
  align-items: end;
}
.nav-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.nav-field__label {
  color: var(--text-muted, #94a3b8);
  font-size: 11px;
  line-height: 1.2;
}
/* 图标控件：emoji 输入与素材库图片预览共用一个紧凑容器 */
.nav-icon-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.nav-icon-picker :deep(.el-input) {
  min-width: 0;
  flex: 1;
}
/* emoji 直接以文字渲染；图片图标固定 22×22 方形预览，超出部分裁切 */
.nav-icon-picker__preview {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 4px;
  object-fit: cover;
  background: #fff;
}
.nav-icon-picker__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.nav-icon-picker__actions :deep(.el-button) {
  padding: 5px 7px;
  font-size: 12px;
}
.nav-icon-picker__btn {
  flex-shrink: 0;
  padding: 5px 7px !important;
  font-size: 12px !important;
}
.nav-field--switch :deep(.el-switch) {
  margin-top: 1px;
}
/* 作者条目栅格：头像 / 名称 / 身份 / 招募位开关 一行，跨栏跳转路径占整行 */
.nav-item__grid--author {
  grid-template-columns: 148px minmax(72px, 1fr) minmax(72px, 1fr) 58px;
}
.nav-icon-picker__preview--round {
  border-radius: 50%;
}
.nav-icon-picker__preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a1897a;
  font-size: 12px;
  font-weight: 700;
}
/* 窄侧栏：文案与图标并排、路径与开关各占整行，仍保持「一条入口一块卡片」的分组感 */
@media (max-width: 460px) {
  .nav-item__grid {
    grid-template-columns: 148px 1fr;
    row-gap: 6px;
  }
  .nav-field--wide,
  .nav-field--switch {
    grid-column: 1 / -1;
  }
  /* 窄屏下开关与标签并排，省一行高度 */
  .nav-field--switch {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .nav-field--switch .nav-field__label {
    order: -1;
  }
}
.nav-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
