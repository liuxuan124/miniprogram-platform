<template>
  <div class="article-list-props">
    <el-form label-width="76px" size="small">
      <div v-if="!data.show_header" class="ds-hint ds-hint--block">
        未开启内置标题头时，可单独拖入「标题栏」放在列表上方；开启后标题与列表在同一张卡内。
      </div>

      <el-collapse v-model="openPanels">
        <!-- ── 标题头 ── -->
        <el-collapse-item name="header">
          <template #title>
            <span class="ds-sec">标题头</span>
            <span class="ds-sec__state">{{ data.show_header ? '已开启' : '未开启' }}</span>
          </template>
          <BuilderFieldItem label="显示标题头">
            <el-switch
              :model-value="data.show_header === true"
              @change="(v: boolean) => emit('update', { show_header: v })"
            />
          </BuilderFieldItem>
          <template v-if="data.show_header === true">
            <BuilderFieldItem label="标题" hint="组件顶部主标题；留空则整行不显示。">
              <el-input
                :model-value="data.title || ''"
                maxlength="24"
                show-word-limit
                placeholder="深度解读"
                @input="(v: string) => emit('update', { title: v })"
              />
            </BuilderFieldItem>
            <BuilderFieldItem label="副标题" hint="标题下面那行小字，可留空。">
              <el-input
                :model-value="data.subtitle || ''"
                maxlength="40"
                show-word-limit
                placeholder="可选"
                @input="(v: string) => emit('update', { subtitle: v })"
              />
            </BuilderFieldItem>
            <BuilderFieldItem label="查看更多" hint="在列表右上角显示跳转入口。">
              <el-switch
                :model-value="data.show_more === true"
                @change="(v: boolean) => emit('update', { show_more: v })"
              />
            </BuilderFieldItem>
            <template v-if="data.show_more === true">
              <BuilderFieldItem label="更多文案" hint="右上角入口上的文字。">
                <el-input
                  :model-value="data.more_text || '更多 ›'"
                  @input="(v: string) => emit('update', { more_text: v })"
                />
              </BuilderFieldItem>
              <BuilderFieldItem
                label="更多链接"
                hint="点击「查看更多」跳到哪个页面；从预设里选可避免手打路径填错。"
              >
                <LinkPickerField
                  :link-url="data.more_link || ''"
                  :link-type="data.more_link_type || 'page'"
                  @update="(v: Record<string, string>) => emit('update', { more_link: v.url, more_link_type: v.type })"
                />
              </BuilderFieldItem>
            </template>
          </template>
        </el-collapse-item>

        <!-- ── 文章展示 ── -->
        <el-collapse-item name="display">
          <template #title>
            <span class="ds-sec">文章展示</span>
            <span class="ds-sec__state">{{ layoutMeta.label }}</span>
          </template>

          <BuilderFieldItem
            label="布局样式"
            hint="选一种排版方式，下方示意图就是它在手机上的样子。字号与条目间距在「样式」页签调整。"
          >
            <ArticleLayoutPicker :model-value="layoutValue" @update:model-value="onLayoutChange" />
          </BuilderFieldItem>

          <!-- 展示元素：原先散落在「文章展示」和「来源标签」两处的开关收在一组 -->
          <BuilderFieldItem
            label="展示元素"
            hint="控制每篇文章里显示哪些信息。关掉越多，单条越矮、单屏能看越多条。"
          >
            <div class="ds-meta-group">
              <label class="ds-meta">
                <span class="ds-meta__name">封面图</span>
                <el-switch
                  :model-value="data.show_cover !== false"
                  @change="(v: boolean) => emit('update', { show_cover: v })"
                />
              </label>
              <label class="ds-meta">
                <span class="ds-meta__name">发布日期</span>
                <el-switch
                  :model-value="data.show_date !== false"
                  @change="(v: boolean) => emit('update', { show_date: v })"
                />
              </label>
              <label class="ds-meta">
                <span class="ds-meta__name">
                  来源角标
                  <FieldHint text="在标题旁或日期行显示「原创 / 公众号 / 小红书」这类小标签。" />
                </span>
                <el-switch
                  :model-value="data.show_source_tag === true"
                  @change="onSourceTagToggle"
                />
              </label>
              <label class="ds-meta">
                <span class="ds-meta__name">
                  阅读热度
                  <FieldHint text="显示阅读量数字。需要内容已积累阅读数据，新内容会显示 0。" />
                </span>
                <el-switch
                  :model-value="data.show_views === true"
                  @change="(v: boolean) => emit('update', { show_views: v })"
                />
              </label>
              <label v-if="summaryOptional" class="ds-meta">
                <span class="ds-meta__name">
                  摘要简介
                  <FieldHint text="标题下方的两三行导读。报刊细排 / 杂志首篇自带摘要，该布局下此项不适用。" />
                </span>
                <el-switch
                  :model-value="data.show_summary === true"
                  @change="(v: boolean) => emit('update', { show_summary: v })"
                />
              </label>
            </div>
          </BuilderFieldItem>

          <!-- 分类标签开启后的子配置 -->
          <BuilderFieldItem
            label="分类标签"
            hint="开启后在列表顶部显示「全部 / 分类」可切换；与「查看更多」互斥。"
          >
            <el-switch
              :model-value="data.show_category_tabs === true"
              @change="(v: boolean) => emit('update', { show_category_tabs: v, show_more: v ? false : data.show_more })"
            />
          </BuilderFieldItem>
          <template v-if="data.show_category_tabs === true">
            <BuilderFieldItem
              label="标签样式"
              hint="顶部标签的视觉形式；分类多选滑动胶囊，分类少选下划线。"
            >
              <BuilderSegmented
                :model-value="String(data.category_tab_style || 'pill')"
                :options="TAB_STYLES"
                @update:model-value="(v: string | number) => emit('update', { category_tab_style: String(v) })"
              />
            </BuilderFieldItem>
            <BuilderFieldItem
              label="分类范围"
              hint="自动生成会按内容库的全部分类铺标签；也可以只挑几个固定分类。"
            >
              <el-select
                :model-value="categoryScope"
                style="width: 100%"
                @change="(v: string) => onCategoryScopeChange(v)"
              >
                <el-option label="自动生成全部分类" value="auto" />
                <el-option label="只显示指定分类" value="picked" />
              </el-select>
            </BuilderFieldItem>
            <BuilderFieldItem
              v-if="categoryScope === 'picked'"
              label="指定分类"
              hint="勾选的分类才会作为顶部标签出现。"
            >
              <el-select
                :model-value="pickedCategoryIds"
                multiple
                collapse-tags
                clearable
                placeholder="不指定"
                style="width: 100%"
                @change="(v: (number | string)[]) => emit('update', { category_tab_ids: v })"
              >
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </BuilderFieldItem>
          </template>

          <!-- 空状态处理策略 -->
          <BuilderFieldItem
            label="无内容时"
            hint="筛选条件太窄导致一篇都拉不到时的兜底方式。首页大板块建议选「隐藏整个组件」，不留空白更显干净。"
          >
            <el-radio-group
              :model-value="emptyMode"
              style="width: 100%"
              @change="(v: string) => emit('update', { empty_mode: v })"
            >
              <el-radio value="hide">隐藏整个组件</el-radio>
              <el-radio value="placeholder">展示空状态卡片</el-radio>
            </el-radio-group>
          </BuilderFieldItem>
          <template v-if="emptyMode === 'placeholder'">
            <BuilderFieldItem label="空状态图标">
              <div class="ds-icon-row">
                <button
                  v-for="ic in EMPTY_ICON_OPTIONS"
                  :key="ic"
                  type="button"
                  class="ds-icon-btn"
                  :class="{ 'is-on': emptyIcon === ic }"
                  :aria-label="`空状态图标 ${ic}`"
                  @click="emit('update', { empty_icon: ic })"
                >
                  {{ ic }}
                </button>
              </div>
            </BuilderFieldItem>
            <BuilderFieldItem label="空状态文案">
              <el-input
                :model-value="data.empty_text || '暂时还没有内容'"
                maxlength="20"
                placeholder="暂时还没有内容"
                @input="(v: string) => emit('update', { empty_text: v })"
              />
            </BuilderFieldItem>
          </template>
        </el-collapse-item>

        <!-- ── 内容筛选规则（原「数据来源」+「展示哪些内容」合并） ── -->
        <el-collapse-item name="filter">
          <template #title>
            <span class="ds-sec">内容筛选规则</span>
            <span class="ds-sec__state">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇可用` }}</span>
            <a
              class="ds-extlink"
              :href="CONTENT_MANAGE_URL"
              target="_blank"
              rel="noopener noreferrer"
              title="在新标签页打开内容管理"
              @click.stop
            >去发布文章 ↗</a>
          </template>

          <!--
            数据源由组件内部默认绑定内容库（type=content，见 componentRegistry defaultProps），
            运营无需显式绑定 —— 原先顶部的「数据源绑定（必填）/ type / query」技术标签已移除。
          -->
          <BuilderFieldItem label="内容分类" hint="按内容库分类筛选；留空表示全部。">
            <el-select
              :model-value="queryParams.category_id ?? ''"
              clearable
              filterable
              placeholder="全部分类"
              style="width: 100%"
              @change="(v: string | number) => patchQuery({ category_id: v || undefined })"
            >
              <el-option label="全部分类" value="" />
              <el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </BuilderFieldItem>
          <BuilderFieldItem label="内容类型" hint="只要图文文章、或只要视频等；留空表示全部。">
            <el-select
              :model-value="queryParams.type || ''"
              clearable
              placeholder="全部类型"
              style="width: 100%"
              @change="(v: string) => patchQuery({ type: v || undefined })"
            >
              <el-option label="全部类型" value="" />
              <el-option label="图文文章" value="article" />
              <el-option label="图文素材" value="image_text" />
              <el-option label="视频" value="video" />
            </el-select>
          </BuilderFieldItem>
          <BuilderFieldItem label="排序规则" hint="决定列表里文章的先后顺序；选「推荐优先」会自动只排推荐内容。">
            <el-select :model-value="sortBy" style="width: 100%" @change="onSortByChange">
              <el-option label="最新发布" value="newest" />
              <el-option label="阅读量最多" value="popular" />
              <el-option label="推荐优先" value="recommended" />
            </el-select>
          </BuilderFieldItem>
          <BuilderFieldItem
            label="显示数量"
            :hint="`最多展示几篇，可填 ${LIMIT_MIN}–${LIMIT_MAX}。若同时设了来源/标签筛选而命中不足，实际会少于这个数。`"
          >
            <NumSliderRow
              :model-value="limitValue"
              :min="LIMIT_MIN"
              :max="LIMIT_MAX"
              :step="limitStep"
              :fallback="LIMIT_FALLBACK"
              unit="篇"
              @update:model-value="(v: number) => emit('update', { limit: v })"
            />
            <div v-if="limitParityWarning" class="ds-hint ds-hint--warn">{{ limitParityWarning }}</div>
          </BuilderFieldItem>

          <!-- 实时预览 + 手动置顶 + 刷新 -->
          <BuilderFieldItem label="文章预览" hint="下面是按当前规则真实拉到的内容。">
            <div class="ds-live">
              <div class="ds-live__head">
                <span class="ds-live__title">
                  实时预览
                  <span v-if="liveLoading" class="ds-live__state">读取中…</span>
                  <span v-else-if="liveItems.length" class="ds-live__state">{{ liveItems.length }} 篇</span>
                  <span v-else class="ds-live__state is-empty">0 篇</span>
                </span>
                <el-tooltip content="重新读取线上已发布内容" placement="top" :show-after="260" effect="light">
                  <button
                    type="button"
                    class="ds-live__refresh"
                    aria-label="刷新实时数据"
                    :disabled="liveLoading"
                    @click="onRefresh"
                  >
                    <el-icon><Refresh /></el-icon>
                  </button>
                </el-tooltip>
              </div>

              <ul v-if="liveItems.length" class="ds-live__list">
                <li
                  v-for="(item, idx) in liveItems.slice(0, 6)"
                  :key="item.id || item.title"
                  class="ds-live__row"
                  :class="{ 'is-pinned': isPinned(item) }"
                >
                  <span v-if="isPinned(item)" class="ds-live__flag">置顶</span>
                  <span v-else class="ds-live__no">{{ idx + 1 }}</span>
                  <span class="ds-live__name" :title="item.title">{{ item.title || '（无标题）' }}</span>
                  <el-tooltip
                    :content="isPinned(item) ? '取消置顶' : '置顶到第 1 位'"
                    placement="top"
                    :show-after="260"
                    effect="light"
                  >
                    <button
                      type="button"
                      class="ds-live__pin"
                      :class="{ 'is-on': isPinned(item) }"
                      :aria-label="isPinned(item) ? '取消置顶' : '置顶'"
                      @click="togglePin(item)"
                    >
                      <el-icon><component :is="isPinned(item) ? StarFilled : Star" /></el-icon>
                    </button>
                  </el-tooltip>
                </li>
              </ul>
              <div v-else-if="liveLoading" class="ds-empty">正在读取已发布内容…</div>
              <div v-else class="ds-empty">当前筛选下没有已发布内容</div>

              <div v-if="liveItems.length && pinnedList.length" class="ds-live__note">
                置顶的 {{ pinnedList.length }} 篇固定排在最前，其余按上面的排序规则展示。
              </div>
            </div>
          </BuilderFieldItem>
        </el-collapse-item>

        <!-- ── 来源标签（低频，默认折叠） ── -->
        <el-collapse-item name="source">
          <template #title>
            <span class="ds-sec">来源标签</span>
            <span class="ds-sec__state">{{ data.show_source_tag ? '已开启' : '未开启' }}</span>
          </template>
          <SourceTagFields :props="data" @update="(v) => emit('update', v)" />
        </el-collapse-item>

        <!-- ── 内容标签筛选（低频，默认折叠） ── -->
        <el-collapse-item name="tags">
          <template #title>
            <span class="ds-sec">内容标签筛选</span>
            <span class="ds-sec__state">{{ activeTagCount ? `${activeTagCount} 项` : '不限' }}</span>
          </template>
          <ContentTagFilterFields :props="data" @update="(v) => emit('update', v)" />
        </el-collapse-item>
      </el-collapse>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Star, StarFilled } from '@element-plus/icons-vue'
import { getCategoryList } from '@/api/content'
import { ComponentType, type ComponentInstance } from '@/types/page'
import BuilderFieldItem from '../BuilderFieldItem.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import SourceTagFields from './SourceTagFields.vue'
import ContentTagFilterFields from './ContentTagFilterFields.vue'
import ArticleLayoutPicker from '../articleFeed/ArticleLayoutPicker.vue'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { layoutMetaOf, resolveArticleLayout } from '../articleLayouts'
import {
  EMPTY_ICON_OPTIONS,
  LIMIT_FALLBACK,
  LIMIT_MAX,
  LIMIT_MIN,
  PIN_MAX_LIMIT,
  limitParityWarningOf,
  limitStepOf,
  normalizeLimit,
  type PinnedArticle,
} from '../articleFeed/articleListSchema'

/**
 * 文章列表属性面板。
 *
 * 本轮结构决策（与原实现的对照）：
 * ① 顶部「数据源绑定（必填）/ type / query」技术调试卡整块移除。
 *    文章数据源由组件内部默认绑定内容库（componentRegistry 的 defaultProps 已带
 *    data_source.type='content'），运营无需、也不应该看到 type/query 这类研发字段。
 *    同理移除 PropsPanel 里那张共享的 ds-binding-card（见 HIDE_DS_BINDING_TYPES）。
 * ② 原「数据来源」说明行 + 「展示哪些内容」两个区块合并为【内容筛选规则】，
 *    只留 4 个字段：内容分类 / 内容类型 / 排序规则 / 显示数量。
 *    原「仅推荐」独立开关删除 —— 它与「排序规则=推荐优先」是同一件事，
 *    两个入口给同一个状态赋值必然出现「开关关了但仍只显示推荐」的困惑。
 * ③ 分散在两处的元信息开关（封面/日期 + 来源角标）合并为【展示元素】一组，
 *    并新增「阅读热度」「摘要简介」。
 * ④ 「管理数据」按钮（顶部 data-status 卡里的）改为【内容筛选规则】标题右侧的
 *    轻量文字外链「去发布文章 ↗」，新标签页打开 /content/articles ——
 *    原按钮用 router.push 同页跳转，会把装修器当前页面顶掉。
 * ⑤ 7 个布局 radio → 3 列缩略图卡片（ArticleLayoutPicker），元数据收在 articleLayouts.ts。
 * ⑥ 「卡片间距 / 标题字号 / 日期字号」在「样式」页签（ArticleListStyleProps.vue）。
 */

/** 内容管理路由。绝对路径拼当前 origin，避免 router base 变化时跳错 */
const CONTENT_MANAGE_URL = `${window.location.origin}/content/articles`

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const categoryOptions = ref<{ id: number | string; name: string }[]>([])

/** 默认展开高频区块，低频（来源 / 标签筛选）收起 */
const openPanels = ref<string[]>(['header', 'display', 'filter'])

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-article-list',
  type: ComponentType.ArticleList,
  props: data,
}))

const { items: liveItems, loading: liveLoading, refresh } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const layoutValue = computed(() => resolveArticleLayout(data.layout || data.style_type, 'list'))
const layoutMeta = computed(() => layoutMetaOf(data.layout || data.style_type))

const TAB_STYLES = [
  { value: 'pill', label: '胶囊' },
  { value: 'underline', label: '下划线' },
  { value: 'bold', label: '加粗' },
]

const queryParams = computed(() => {
  const ds = data.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

const sortBy = computed(() => queryParams.value.sort_by || 'newest')

const categoryScope = computed(() => String(data.category_tab_scope || 'auto'))
const pickedCategoryIds = computed<(number | string)[]>(() =>
  Array.isArray(data.category_tab_ids) ? data.category_tab_ids : [],
)

const emptyMode = computed(() => String(data.empty_mode || 'placeholder'))
const emptyIcon = computed(() => String(data.empty_icon || '📭'))

/** 报刊细排 / 杂志首篇的排版本身依赖摘要，这两个布局下不提供摘要开关 */
const summaryOptional = computed(() => layoutValue.value !== 'editorial' && layoutValue.value !== 'magazine')

/** 显示数量：夹进 1–20；grid 布局步长自动变 2 */
const limitValue = computed(() => normalizeLimit(data.limit))
const limitStep = computed(() => limitStepOf(layoutValue.value))
const limitParityWarning = computed(() => limitParityWarningOf(layoutValue.value, limitValue.value))

const activeTagCount = computed(() => {
  const p = Array.isArray(data.filter_platform_codes) ? data.filter_platform_codes.length : 0
  const t = Array.isArray(data.filter_topic_tags) ? data.filter_topic_tags.length : 0
  return p + t
})

/* ───── 手动置顶 ───── */
const pinnedList = computed<PinnedArticle[]>(() =>
  Array.isArray(data.pinned) ? data.pinned.filter((p: PinnedArticle) => p && p.id != null) : [],
)

function isPinned(item: { id?: number | string }): boolean {
  const id = String(item.id ?? '')
  if (!id) return false
  return pinnedList.value.some((p) => String(p.id) === id)
}

function togglePin(item: { id?: number | string; title?: string; cover?: string }) {
  if (item.id == null || String(item.id) === '') {
    ElMessage.warning('这条内容缺少 ID，无法置顶')
    return
  }
  const id = String(item.id)
  const next = isPinned(item)
    ? pinnedList.value.filter((p) => String(p.id) !== id)
    // 已达上限时替换最后一条，而不是静默失败 —— 运营点了要有反馈
    : [
        ...pinnedList.value,
        { id: item.id, title: item.title, cover: item.cover },
      ].slice(-PIN_MAX_LIMIT)
  emit('update', { pinned: next })
  if (!isPinned(item) && pinnedList.value.length >= PIN_MAX_LIMIT) {
    ElMessage.info(`最多置顶 ${PIN_MAX_LIMIT} 篇，已替换最早的一条`)
  }
}

/* ───── 来源角标 ───── */
function onSourceTagToggle(v: boolean) {
  // 关闭时连带清掉筛选与文案，避免下次开启时残留一套看不见的筛选条件
  emit('update', v
    ? { show_source_tag: true }
    : { show_source_tag: false, source_filter: [], source_labels: {} })
}

/* ───── 实时数据刷新 ───── */
async function onRefresh() {
  await refresh()
  ElMessage.success(liveItems.value.length ? `已刷新，命中 ${liveItems.value.length} 篇` : '已刷新，当前筛选下没有内容')
}

function onCategoryScopeChange(v: string) {
  // 切回「自动生成」时清掉手选分类，避免残留上一模式的脏配置
  emit('update', {
    category_tab_scope: v,
    ...(v === 'auto' ? { category_tab_ids: undefined } : {}),
  })
}

function flattenCategories(nodes: any[], prefix = ''): { id: number | string; name: string }[] {
  const out: { id: number | string; name: string }[] = []
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const id = node.id
    const name = String(node.name || '')
    if (id == null) continue
    const label = prefix ? `${prefix} / ${name}` : name
    out.push({ id, name: label })
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenCategories(node.children, label))
    }
  }
  return out
}

function patchQuery(patch: Record<string, any>) {
  const params = { ...queryParams.value, status: 'published', ...patch }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  emit('update', {
    data_source: {
      type: 'content',
      params,
      query: params,
    },
  })
}

function onLayoutChange(val: string) {
  emit('update', { layout: val, style_type: val })
}

function onSortByChange(val: string) {
  patchQuery({
    sort_by: val,
    is_recommended: val === 'recommended' ? true : queryParams.value.is_recommended,
  })
}

onMounted(async () => {
  try {
    const res = await getCategoryList()
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    categoryOptions.value = flattenCategories(list)
  } catch {
    categoryOptions.value = []
  }
})
</script>

<style scoped lang="scss">
.ds-hint {
  margin: 4px 0 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-hint--block {
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #f5f7fb;
  border-radius: 6px;
}

.ds-hint--warn {
  color: #a4661a;
}

/* 手风琴分区标题 */
.ds-sec {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.ds-sec__state {
  margin-left: 6px;
  color: #9aa5b1;
  font-size: 11px;
  font-weight: 400;
}

/* 分区标题右侧的「去发布文章 ↗」外链。
   用 a 而非 button：浏览器自带新标签页行为，无需 preventDefault 手工 window.open。 */
.ds-extlink {
  margin-left: auto;
  padding-left: 8px;
  overflow: hidden;
  color: #8c3208;
  font-size: 11px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-decoration: none;
}

.ds-extlink:hover {
  text-decoration: underline;
}

/* ───── 展示元素分组 ───── */
/*
 * 单列而非 2 列：面板净宽 ~180px，2 列每格仅 88px ——
 * 「发布日期」4 个字就刚好占满，带「?」提示的项（来源角标/阅读热度/摘要简介）
 * 必然被 ellipsis 截掉半个问号，等于提示失效。实测 clipped=4/5。
 * 单列每行 ~170px，标签 + 提示 + 开关都放得下，且行高只有 26px，5项仍不占多少纵向空间。
 */
.ds-meta-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.ds-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 5px 7px;
  background: #f8fafc;
  border: 1px solid #eef1f5;
  border-radius: 7px;
  cursor: pointer;
}

.ds-meta__name {
  display: inline-flex;
  gap: 1px;
  align-items: center;
  overflow: hidden;
  color: #475569;
  font-size: 11.5px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ds-meta :deep(.el-switch) {
  flex-shrink: 0;
}

/* ───── 空状态图标 ───── */
.ds-icon-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.ds-icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 15px;
  background: #fbf8f4;
  border: 1px solid #e8dfd3;
  border-radius: 7px;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    background: #f7efe7;
    border-color: #d9c7b4;
  }

  &.is-on {
    background: #f7efe7;
    border-color: #c08e6e;
    box-shadow: 0 0 0 1px #c08e6e;
  }
}

/* ───── 实时预览 ───── */
.ds-live {
  width: 100%;
  padding: 7px 8px;
  background: #f8fafc;
  border: 1px solid #eef1f5;
  border-radius: 8px;
}

.ds-live__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.ds-live__title {
  display: inline-flex;
  gap: 5px;
  align-items: baseline;
  color: #475569;
  font-size: 11.5px;
  font-weight: 600;
}

.ds-live__state {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 400;

  &.is-empty {
    color: #b45309;
  }
}

.ds-live__refresh {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  cursor: pointer;
  transition: 0.15s;

  &:hover:not(:disabled) {
    color: #8c3208;
    border-color: #c08e6e;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.ds-live__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ds-live__row {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 3px 0;
  border-top: 1px solid #f1f5f9;

  &:first-child {
    border-top: none;
  }

  &.is-pinned .ds-live__name {
    color: #8c3208;
    font-weight: 600;
  }
}

.ds-live__no {
  display: grid;
  place-items: center;
  flex: none;
  width: 14px;
  height: 14px;
  color: #94a3b8;
  font-size: 10px;
  background: #eef2f7;
  border-radius: 999px;
}

.ds-live__flag {
  flex: none;
  padding: 0 5px;
  color: #8c3208;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  background: #fdf1e7;
  border-radius: 999px;
}

.ds-live__name {
  flex: 1;
  overflow: hidden;
  color: #172033;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-live__pin {
  display: grid;
  place-items: center;
  flex: none;
  width: 19px;
  height: 19px;
  color: #cbd5e1;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    color: #d4a04a;
    background: #fff8ec;
  }

  &.is-on {
    color: #d4a04a;
  }
}

.ds-live__note {
  margin-top: 5px;
  padding-top: 5px;
  color: #8a7461;
  font-size: 10.5px;
  line-height: 1.4;
  border-top: 1px dashed #e6ddcf;
}

.ds-empty {
  padding: 6px 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

:deep(.el-collapse-item__header) {
  height: 34px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 500;
  line-height: 34px;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}
</style>