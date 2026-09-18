<template>
  <el-form label-width="92px" size="small" class="warm-discover-props">
    <el-form-item label="页面标题">
      <el-input :model-value="data.title" placeholder="发现" @input="emit('update', { title: $event })" />
    </el-form-item>

    <el-divider content-position="left">主 Tab</el-divider>
    <div class="ds-hint ds-hint--block">
      可增删排序。数据源：全部=混排；笔记/长文走内容；好物走商品。
    </div>
    <div v-for="(tab, ti) in tabs" :key="tab.key || ti" class="tab-card">
      <div class="tab-card__head">
        <el-input
          :model-value="tab.label"
          placeholder="Tab 文案"
          style="width: 120px"
          @input="(v: string) => patchTab(ti, { label: v })"
        />
        <el-select
          :model-value="tab.source || 'note'"
          style="width: 110px"
          @change="(v: string) => patchTab(ti, { source: v as DiscoverTab['source'] })"
        >
          <el-option label="全部混排" value="all" />
          <el-option label="笔记" value="note" />
          <el-option label="长文" value="article" />
          <el-option label="好物" value="goods" />
        </el-select>
        <el-switch
          :model-value="tab.visible !== false"
          inline-prompt
          active-text="显"
          inactive-text="隐"
          @change="(v: boolean) => patchTab(ti, { visible: v })"
        />
        <el-button link type="danger" :disabled="tabs.length <= 1" @click="removeTab(ti)">删</el-button>
        <el-button link :disabled="ti === 0" @click="moveTab(ti, -1)">↑</el-button>
        <el-button link :disabled="ti >= tabs.length - 1" @click="moveTab(ti, 1)">↓</el-button>
      </div>
      <el-form-item label="招募条" label-width="64px">
        <el-switch
          :model-value="!!tab.showBanner"
          @change="(v: boolean) => patchTab(ti, { showBanner: v })"
        />
      </el-form-item>

      <div class="chip-head">二级标签</div>
      <div v-for="(chip, ci) in (tab.chips || [])" :key="ci" class="chip-row">
        <el-input
          :model-value="chip.label"
          placeholder="标签文案"
          style="width: 100px"
          @input="(v: string) => patchChip(ti, ci, { label: v })"
        />
        <el-select
          :model-value="chip.filter || 'all'"
          style="width: 100px"
          @change="(v: string) => patchChip(ti, ci, { filter: v as DiscoverChip['filter'] })"
        >
          <el-option label="不筛选" value="all" />
          <el-option label="按标签" value="tag" />
          <el-option label="按分类" value="category" />
        </el-select>
        <el-input
          v-if="(chip.filter || 'all') === 'tag'"
          :model-value="chip.tag || chip.label"
          placeholder="标签名"
          style="width: 100px"
          @input="(v: string) => patchChip(ti, ci, { tag: v })"
        />
        <el-select
          v-if="(chip.filter || 'all') === 'category'"
          :model-value="chip.categoryId ?? ''"
          clearable
          filterable
          placeholder="分类"
          style="width: 140px"
          @change="(v: string | number) => patchChip(ti, ci, { categoryId: v || undefined })"
        >
          <el-option
            v-for="opt in categoryOptionsFor(tab.source)"
            :key="opt.id"
            :label="opt.name"
            :value="opt.id"
          />
        </el-select>
        <el-button link type="danger" @click="removeChip(ti, ci)">删</el-button>
      </div>
      <el-button size="small" @click="addChip(ti)">+ 标签</el-button>
    </div>
    <el-button type="primary" plain size="small" style="margin-top: 8px" @click="addTab">+ 主 Tab</el-button>

    <el-divider content-position="left">长文排布</el-divider>
    <div class="ds-hint ds-hint--block">
      控制发现页长文：通栏 / 双列混排。单篇可在内容编辑里覆盖。
    </div>
    <el-form-item label="排布模式">
      <el-radio-group
        :model-value="articleLayout.mode"
        @change="(v: string | number | boolean | undefined) => patchArticleLayout({ mode: String(v) as ArticleLayoutConfig['mode'] })"
      >
        <el-radio-button value="mixed">混排</el-radio-button>
        <el-radio-button value="all_duo">全部双列</el-radio-button>
        <el-radio-button value="all_full">全部通栏</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <template v-if="articleLayout.mode === 'mixed' || articleLayout.mode === 'all_duo'">
      <el-form-item v-if="articleLayout.mode === 'mixed'" label="通栏间隔">
        <el-input-number
          :model-value="articleLayout.fullEvery ?? 3"
          :min="1"
          :max="10"
          controls-position="right"
          @change="(v: number | undefined) => patchArticleLayout({ fullEvery: v ?? 3 })"
        />
        <span class="ds-hint" style="margin-left: 8px">每隔 N 条有封面的长文通栏</span>
      </el-form-item>
      <el-form-item label="无封面">
        <el-switch
          :model-value="articleLayout.fullOnNoCover !== false"
          @change="(v: boolean) => patchArticleLayout({ fullOnNoCover: v })"
        />
        <span class="ds-hint" style="margin-left: 8px">无封面走通栏摘录</span>
      </el-form-item>
      <el-form-item label="双列样式">
        <el-checkbox-group
          :model-value="articleLayout.duoStyles || ['magazine', 'row']"
          @change="(v: string[]) => patchArticleLayout({ duoStyles: v })"
        >
          <el-checkbox label="magazine">杂志卡</el-checkbox>
          <el-checkbox label="row">左图右文</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCategoryList as getContentCategories } from '@/api/content'
import { getCategoryList as getProductCategories } from '@/api/product'

type DiscoverChip = {
  label: string
  filter?: 'all' | 'tag' | 'category'
  tag?: string
  categoryId?: number | string
}

type DiscoverTab = {
  key: string
  label: string
  source?: 'all' | 'note' | 'article' | 'goods'
  visible?: boolean
  showBanner?: boolean
  chips?: DiscoverChip[]
}

type ArticleLayoutConfig = {
  mode?: 'mixed' | 'all_duo' | 'all_full'
  fullEvery?: number
  fullOnNoCover?: boolean
  duoStyles?: string[]
}

const DEFAULT_ARTICLE_LAYOUT: ArticleLayoutConfig = {
  mode: 'all_duo',
  fullEvery: 3,
  fullOnNoCover: true,
  duoStyles: ['magazine', 'row'],
}

const DEFAULT_DISCOVER_TABS: DiscoverTab[] = [
  {
    key: 'all',
    label: '全部',
    source: 'all',
    visible: true,
    showBanner: true,
    chips: [
      { label: '全部', filter: 'all' },
      { label: '创作日常', filter: 'tag', tag: '创作日常' },
      { label: '工位美学', filter: 'tag', tag: '工位美学' },
      { label: '读书', filter: 'tag', tag: '读书' },
      { label: '副业', filter: 'tag', tag: '副业' },
    ],
  },
  {
    key: 'note',
    label: '笔记',
    source: 'note',
    visible: true,
    showBanner: true,
    chips: [
      { label: '全部', filter: 'all' },
      { label: '创作日常', filter: 'tag', tag: '创作日常' },
      { label: '工位美学', filter: 'tag', tag: '工位美学' },
      { label: '读书', filter: 'tag', tag: '读书' },
      { label: '副业', filter: 'tag', tag: '副业' },
      { label: '咖啡', filter: 'tag', tag: '咖啡' },
      { label: '数字游民', filter: 'tag', tag: '数字游民' },
    ],
  },
  {
    key: 'article',
    label: '长文',
    source: 'article',
    visible: true,
    chips: [
      { label: '全部', filter: 'all' },
      { label: '内容创业', filter: 'tag', tag: '内容创业' },
      { label: '写作方法', filter: 'tag', tag: '写作方法' },
      { label: '私域运营', filter: 'tag', tag: '私域运营' },
      { label: '年度精选', filter: 'tag', tag: '年度精选' },
    ],
  },
  {
    key: 'goods',
    label: '好物',
    source: 'goods',
    visible: true,
    chips: [
      { label: '全部', filter: 'all' },
      { label: '电子书', filter: 'tag', tag: '电子书' },
      { label: '资料包', filter: 'tag', tag: '资料包' },
      { label: '专栏', filter: 'tag', tag: '专栏' },
      { label: '周边', filter: 'tag', tag: '周边' },
    ],
  },
]

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const contentCats = ref<{ id: number | string; name: string }[]>([])
const productCats = ref<{ id: number | string; name: string }[]>([])

const tabs = computed<DiscoverTab[]>(() => {
  const raw = data.tabs
  if (Array.isArray(raw) && raw.length) {
    return raw.map((t: any, i: number) => ({
      key: t.key || `tab_${i}`,
      label: t.label || t.key || `Tab${i + 1}`,
      source: t.source || t.key || 'note',
      visible: t.visible !== false,
      showBanner: !!t.showBanner,
      chips: Array.isArray(t.chips) ? t.chips : [{ label: '全部', filter: 'all' }],
    }))
  }
  return DEFAULT_DISCOVER_TABS
})

const articleLayout = computed<ArticleLayoutConfig>(() => {
  const raw = data.article_layout || data.articleLayout || {}
  const hasMode = raw.mode === 'all_duo' || raw.mode === 'all_full' || raw.mode === 'mixed'
  return {
    mode: hasMode ? raw.mode : DEFAULT_ARTICLE_LAYOUT.mode,
    fullEvery: Number(raw.fullEvery) > 0 ? Number(raw.fullEvery) : 3,
    fullOnNoCover: raw.fullOnNoCover !== false,
    duoStyles: Array.isArray(raw.duoStyles) && raw.duoStyles.length
      ? raw.duoStyles
      : ['magazine', 'row'],
  }
})

function patchArticleLayout(patch: Partial<ArticleLayoutConfig>) {
  emit('update', {
    article_layout: { ...articleLayout.value, ...patch },
  })
}

function flattenCategories(list: any[]): { id: number | string; name: string }[] {
  const out: { id: number | string; name: string }[] = []
  const walk = (rows: any[], prefix = '') => {
    ;(rows || []).forEach((row) => {
      if (!row) return
      const id = row.id
      const name = `${prefix}${row.name || row.title || id}`
      if (id != null) out.push({ id, name })
      if (Array.isArray(row.children) && row.children.length) {
        walk(row.children, `${name} / `)
      }
    })
  }
  walk(list)
  return out
}

function categoryOptionsFor(source?: string) {
  return source === 'goods' ? productCats.value : contentCats.value
}

function commitTabs(next: DiscoverTab[]) {
  emit('update', { tabs: next })
}

function patchTab(index: number, patch: Partial<DiscoverTab>) {
  const next = tabs.value.map((t, i) => (i === index ? { ...t, ...patch } : { ...t }))
  commitTabs(next)
}

function moveTab(index: number, delta: number) {
  const next = tabs.value.map((t) => ({ ...t, chips: (t.chips || []).map((c) => ({ ...c })) }))
  const j = index + delta
  if (j < 0 || j >= next.length) return
  const tmp = next[index]
  next[index] = next[j]
  next[j] = tmp
  commitTabs(next)
}

function removeTab(index: number) {
  if (tabs.value.length <= 1) return
  commitTabs(tabs.value.filter((_, i) => i !== index).map((t) => ({ ...t })))
}

function addTab() {
  const key = `tab_${Date.now().toString(36)}`
  commitTabs([
    ...tabs.value.map((t) => ({ ...t })),
    {
      key,
      label: '新 Tab',
      source: 'note',
      visible: true,
      chips: [{ label: '全部', filter: 'all' }],
    },
  ])
}

function patchChip(ti: number, ci: number, patch: Partial<DiscoverChip>) {
  const next = tabs.value.map((t, i) => {
    if (i !== ti) return { ...t, chips: (t.chips || []).map((c) => ({ ...c })) }
    const chips = (t.chips || []).map((c, j) => (j === ci ? { ...c, ...patch } : { ...c }))
    return { ...t, chips }
  })
  commitTabs(next)
}

function removeChip(ti: number, ci: number) {
  const next = tabs.value.map((t, i) => {
    if (i !== ti) return { ...t, chips: (t.chips || []).map((c) => ({ ...c })) }
    return { ...t, chips: (t.chips || []).filter((_, j) => j !== ci).map((c) => ({ ...c })) }
  })
  commitTabs(next)
}

function addChip(ti: number) {
  const next = tabs.value.map((t, i) => {
    if (i !== ti) return { ...t, chips: (t.chips || []).map((c) => ({ ...c })) }
    return {
      ...t,
      chips: [...(t.chips || []).map((c) => ({ ...c })), { label: '新标签', filter: 'tag' as const, tag: '' }],
    }
  })
  commitTabs(next)
}

onMounted(async () => {
  try {
    const res = await getContentCategories({ status: 'enabled' })
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    contentCats.value = flattenCategories(list)
  } catch {
    contentCats.value = []
  }
  try {
    const res = await getProductCategories()
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    productCats.value = flattenCategories(list)
  } catch {
    productCats.value = []
  }
  // 首次打开若无 tabs，写入默认（含「全部」）
  if (!Array.isArray(data.tabs) || !data.tabs.length) {
    emit('update', { tabs: DEFAULT_DISCOVER_TABS })
  }
  if (!data.article_layout && !data.articleLayout) {
    emit('update', { article_layout: { ...DEFAULT_ARTICLE_LAYOUT } })
  }
})
</script>

<style scoped lang="scss">
.ds-hint {
  color: #8a93a3;
  font-size: 12px;
  line-height: 1.4;
}
.ds-hint--block {
  margin: 0 0 10px;
}
.tab-card {
  margin-bottom: 12px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}
.tab-card__head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.chip-head {
  font-size: 12px;
  color: #5c6573;
  margin: 4px 0 6px;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
</style>
