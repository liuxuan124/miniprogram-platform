<template>
  <div class="cnv-props">
    <!-- ==================== 基础 ==================== -->
    <el-collapse v-model="openGroups" class="cnv-collapse">
      <el-collapse-item name="basic">
        <template #title>
          <span class="cnv-grp-title">
            基础
            <span class="cnv-grp-badge">{{ cfg.show_title ? cfg.title || '未命名标题' : '标题已隐藏' }}</span>
          </span>
        </template>

        <div class="cnv-field">
          <label class="cnv-label">
            标题
            <FieldHint text="模块顶部的标题行。关掉「显示标题」后画布与真机都不渲染这一行，只展示图标网格。" />
          </label>
          <div class="cnv-title-row">
            <el-input
              class="cnv-title-row__input"
              :model-value="cfg.title"
              size="small"
              clearable
              maxlength="12"
              placeholder="如：快捷分类"
              :disabled="!cfg.show_title"
              @update:model-value="(v: string) => patch({ title: v })"
            />
            <span class="cnv-title-row__switch">
              <span class="cnv-title-row__switch-label">显示标题</span>
              <el-switch
                :model-value="cfg.show_title"
                size="small"
                @update:model-value="(v: boolean) => patch({ show_title: v })"
              />
            </span>
          </div>
        </div>

        <div class="cnv-field">
          <label class="cnv-label">
            布局
            <FieldHint text="固定网格最常用；单行横滑适合图标多；双行分页适合「每页整屏分类位」。" />
          </label>
          <div class="cnv-layout-cards">
            <button
              v-for="opt in LAYOUT_OPTIONS"
              :key="opt.value"
              type="button"
              class="cnv-layout-card"
              :class="{ 'is-on': cfg.layout === opt.value }"
              @click="patch({ layout: opt.value })"
            >
              <span class="cnv-layout-card__demo" :class="`is-${opt.value}`">
                <i v-for="n in (opt.value === 'scroll' ? 4 : opt.value === 'paged' ? 4 : 6)" :key="n" />
              </span>
              <span class="cnv-layout-card__label">{{ opt.label }}</span>
              <span class="cnv-layout-card__desc">{{ opt.desc }}</span>
            </button>
          </div>
        </div>

        <div v-if="cfg.layout === 'grid'" class="cnv-field">
          <label class="cnv-label">
            列数
            <FieldHint text="4 列是移动端最稳的密度；5 列偏挤；3 列适合带副标题的双行卡片。" />
          </label>
          <BuilderSegmented
            :model-value="cfg.columns"
            block
            :options="COLUMN_OPTIONS"
            @update:model-value="(v) => patch({ columns: Number(v) })"
          />
        </div>

        <div v-if="cfg.layout === 'paged'" class="cnv-field">
          <label class="cnv-label">
            每页项数
            <FieldHint text="每页两行，所以 8 项 = 4 列 × 2 行，10 项 = 5 列 × 2 行。底部会加分页指示条。" />
          </label>
          <BuilderSegmented
            :model-value="cfg.page_size"
            block
            :options="PAGE_SIZE_OPTIONS"
            @update:model-value="(v) => patch({ page_size: Number(v) })"
          />
        </div>
      </el-collapse-item>

      <!-- ==================== 分类项 ==================== -->
      <el-collapse-item name="items">
        <template #title>
          <span class="cnv-grp-title">
            分类项
            <span class="cnv-grp-badge">{{ rows.length }} / {{ MAX_ITEMS }}</span>
          </span>
        </template>

        <!-- 空态 -->
        <div v-if="!rows.length" class="cnv-blank">
          <p class="cnv-blank__title">还没有分类项</p>
          <p class="cnv-blank__hint">从商城分类一键导入最快，或手动添加</p>
          <div class="cnv-blank__btns">
            <el-button type="primary" size="small" @click="openImport">一键导入商城分类</el-button>
            <el-button size="small" @click="addRow">手动添加</el-button>
          </div>
        </div>

        <!-- 列表 -->
        <template v-else>
          <draggable
            v-model="listProxy"
            item-key="uid"
            handle=".cnv-item__grip"
            :animation="160"
            ghost-class="cnv-item--ghost"
            class="cnv-list"
          >
            <template #item="{ element, index }">
              <div class="cnv-item" :class="{ 'is-open': expanded === index }">
                <!-- 折叠头：拖拽手柄独立，**点手柄不触发展开** -->
                <div class="cnv-item__head">
                  <button
                    type="button"
                    class="cnv-item__grip"
                    :aria-label="`拖动排序第 ${index + 1} 项`"
                    title="按住拖动排序（不会展开面板）"
                    @click.stop
                    @mousedown.stop
                  >
                    <el-icon :size="13"><Rank /></el-icon>
                  </button>

                  <span class="cnv-item__thumb" :style="{ borderRadius: `${thumbRadius}px` }">
                    <img v-if="isImageIcon(element.icon)" :src="element.icon" alt="" />
                    <span v-else>{{ element.icon || '📌' }}</span>
                  </span>

                  <button type="button" class="cnv-item__main" @click="toggleExpand(index)">
                    <span class="cnv-item__name" :class="{ 'is-empty': !element.title }">
                      {{ element.title || '未命名分类' }}
                    </span>
                    <span class="cnv-item__meta">
                      <em v-if="element.subtitle" class="cnv-item__sub">{{ element.subtitle }}</em>
                      <em v-if="element.badge" class="cnv-item__badge" :style="badgeStyle(element)">
                        {{ element.badge }}
                      </em>
                      <span v-if="!element.link_url" class="cnv-item__nolink">未设跳转</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    class="cnv-item__ico"
                    title="复制一项"
                    :disabled="rows.length >= MAX_ITEMS"
                    @click="copyRow(index)"
                  >
                    <el-icon><CopyDocument /></el-icon>
                  </button>
                  <button
                    type="button"
                    class="cnv-item__ico cnv-item__ico--danger"
                    title="删除"
                    @click="removeRow(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </button>
                  <button
                    type="button"
                    class="cnv-item__ico"
                    :title="expanded === index ? '收起' : '展开'"
                    @click="toggleExpand(index)"
                  >
                    <el-icon><ArrowUp v-if="expanded === index" /><ArrowDown v-else /></el-icon>
                  </button>
                </div>

                <!-- 展开体 -->
                <div v-if="expanded === index" class="cnv-item__body">
                  <!-- 图标 -->
                  <div class="cnv-field">
                    <label class="cnv-label cnv-label--sub">
                      图标
                      <FieldHint text="点缩略图打开选择器：内置图标库 / 系统媒体库 / 本地上传，不用手打路径。" />
                    </label>
                    <div class="cnv-icon-row">
                      <button
                        type="button"
                        class="cnv-icon-trigger"
                        :style="{ borderRadius: `${thumbRadius}px` }"
                        title="点击选择图标"
                        @click="openIconPicker(index)"
                      >
                        <img v-if="isImageIcon(element.icon)" :src="element.icon" alt="" />
                        <span v-else>{{ element.icon || '选择图标' }}</span>
                      </button>
                      <div class="cnv-icon-ops">
                        <el-button size="small" @click="openIconPicker(index)">选择图标</el-button>
                        <el-button v-if="element.icon" size="small" text @click="patchRow(index, { icon: '' })">
                          清除
                        </el-button>
                      </div>
                    </div>
                  </div>

                  <!-- 名称 + 副标题 -->
                  <div class="cnv-field">
                    <label class="cnv-label cnv-label--sub">
                      名称
                      <FieldHint text="分类主标题，建议 2–4 字。副标题不填则画布只显示单行。" />
                    </label>
                    <div class="cnv-two">
                      <div class="cnv-two__cell">
                        <el-input
                          :model-value="element.title"
                          size="small"
                          clearable
                          :maxlength="TITLE_MAX"
                          placeholder="分类名称"
                          @update:model-value="(v: string) => patchRow(index, { title: v })"
                        />
                        <span class="cnv-two__count">{{ (element.title || '').length }}/{{ TITLE_MAX }}</span>
                      </div>
                      <div class="cnv-two__cell">
                        <el-input
                          :model-value="element.subtitle"
                          size="small"
                          clearable
                          :maxlength="SUB_MAX"
                          placeholder="副标题（选填）"
                          @update:model-value="(v: string) => patchRow(index, { subtitle: v })"
                        />
                        <span class="cnv-two__count">{{ (element.subtitle || '').length }}/{{ SUB_MAX }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 跳转 -->
                  <div class="cnv-field">
                    <label class="cnv-label cnv-label--sub">
                      跳转
                      <FieldHint text="点按钮从商品分类 / 商品 / 页面 / 外部链接里选，不用手拼路径。" />
                    </label>
                    <button type="button" class="cnv-link" @click="openLinkPicker(index)">
                      <span class="cnv-link__tag">{{ linkTag(element) }}</span>
                      <span class="cnv-link__text">{{ element.link_url || '未设置（点击不可跳转）' }}</span>
                      <span class="cnv-link__act">{{ element.link_url ? '重新选择' : '选择' }}</span>
                    </button>
                  </div>

                  <!-- 角标 -->
                  <div class="cnv-field">
                    <label class="cnv-label cnv-label--sub">
                      角标
                      <FieldHint text="最多 4 个字符，如 HOT / NEW / 秒殺。留空不显示。" />
                    </label>
                    <div class="cnv-two cnv-two--badge">
                      <div class="cnv-two__cell">
                        <el-input
                          :model-value="element.badge"
                          size="small"
                          clearable
                          :maxlength="BADGE_MAX"
                          placeholder="如 HOT"
                          @update:model-value="(v: string) => patchRow(index, { badge: v })"
                        />
                        <span class="cnv-two__count">{{ (element.badge || '').length }}/{{ BADGE_MAX }}</span>
                      </div>
                      <div class="cnv-two__cell">
                        <div class="cnv-tones">
                          <button
                            v-for="t in BADGE_TONES"
                            :key="t.value"
                            type="button"
                            class="cnv-tone"
                            :class="{ 'is-on': element.badge_tone === t.value }"
                            :title="t.label"
                            :style="t.value === 'custom' ? {} : { background: t.color }"
                            @click="patchRow(index, { badge_tone: t.value })"
                          >
                            <MiniIcon v-if="t.value === 'custom'" name="palette" :size="12" />
                          </button>
                          <ColorPickerField
                            v-if="element.badge_tone === 'custom'"
                            class="cnv-tone-picker"
                            :model-value="element.badge_color || '#E85D6C'"
                            @update:model-value="(v: string) => patchRow(index, { badge_color: v })"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>

          <div class="cnv-list__ops">
            <el-button
              type="primary"
              text
              size="small"
              :disabled="rows.length >= MAX_ITEMS"
              @click="addRow"
            >
              + 添加分类项
            </el-button>
            <el-button
              size="small"
              :disabled="rows.length >= MAX_ITEMS"
              @click="openImport"
            >
              一键导入商城分类
            </el-button>
            <span v-if="rows.length >= MAX_ITEMS" class="cnv-limit">已达 {{ MAX_ITEMS }} 项上限</span>
          </div>
        </template>
      </el-collapse-item>
    </el-collapse>

    <CategoryIconPicker
      v-if="iconPickerIndex >= 0"
      :model-value="rows[iconPickerIndex]?.icon || ''"
      @update:model-value="(v: string) => iconPickerIndex >= 0 && patchRow(iconPickerIndex, { icon: v })"
    />
    <CategoryLinkPicker
      v-if="linkPickerIndex >= 0"
      :model-value="rows[linkPickerIndex]?.link_url || ''"
      @update:model-value="(v: string) => linkPickerIndex >= 0 && patchRow(linkPickerIndex, { link_url: v, link_type: v ? 'page' : 'none' })"
    />
    <CategoryImportDialog
      ref="importDialogRef"
      :items="cfg.items"
      :remaining="MAX_ITEMS - rows.length"
      @confirm="onImported"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { ArrowDown, ArrowUp, CopyDocument, Delete, Rank } from '@element-plus/icons-vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import CategoryIconPicker from '../categoryNav/CategoryIconPicker.vue'
import CategoryLinkPicker from '../categoryNav/CategoryLinkPicker.vue'
import CategoryImportDialog from '../categoryNav/CategoryImportDialog.vue'
import {
  CATEGORY_NAV_BADGE_MAX_LEN,
  CATEGORY_NAV_BADGE_TONES,
  CATEGORY_NAV_LAYOUT_OPTIONS,
  CATEGORY_NAV_MAX_ITEMS,
  CATEGORY_NAV_SUBTITLE_MAX_LEN,
  CATEGORY_NAV_TITLE_MAX_LEN,
  clipByCodePoint,
  isImageIcon,
  normalizeCategoryNavProps,
  resolveBadgeColor,
  resolveIconRadius,
  type CategoryNavItem,
  type CategoryNavLayout,
  type CategoryNavProps as CategoryConfig,
} from '../categoryNav/categoryNavSchema'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const MAX_ITEMS = CATEGORY_NAV_MAX_ITEMS
const TITLE_MAX = CATEGORY_NAV_TITLE_MAX_LEN
const SUB_MAX = CATEGORY_NAV_SUBTITLE_MAX_LEN
const BADGE_MAX = CATEGORY_NAV_BADGE_MAX_LEN
const LAYOUT_OPTIONS = CATEGORY_NAV_LAYOUT_OPTIONS
const BADGE_TONES = CATEGORY_NAV_BADGE_TONES
const COLUMN_OPTIONS = [
  { value: 3, label: '3 列' },
  { value: 4, label: '4 列' },
  { value: 5, label: '5 列' },
]
const PAGE_SIZE_OPTIONS = [
  { value: 8, label: '8 项 / 页' },
  { value: 10, label: '10 项 / 页' },
]

const cfg = computed<CategoryConfig>(() => normalizeCategoryNavProps(props.props))
const openGroups = ref<string[]>(['basic', 'items'])
const expanded = ref(-1)
const iconPickerIndex = ref(-1)
const linkPickerIndex = ref(-1)
const importDialogRef = ref<InstanceType<typeof CategoryImportDialog> | null>(null)

const thumbRadius = computed(() => {
  const r = resolveIconRadius(cfg.value.icon_shape)
  return r > 100 ? 999 : r
})

/* ---------------- 分类项：本地缓冲 + 最后发出值守卫 ---------------- */

/**
 * 与 SearchProps 同款设计：
 *  - 列表状态放本地，允许「新增的空行」停在界面上不立刻消失
 *    （归一化会把空 title 项照常保留，但空行若直接由 cfg 驱动会因
 *    新增时还没填内容而抖动）；
 *  - lastEmitted 守卫防打字被自己回写的结果打断。
 */
interface Row extends CategoryNavItem {
  uid: string
}

let uidSeed = 0
function nextUid() {
  uidSeed += 1
  return `cnr_${uidSeed.toString(36)}`
}

const rows = ref<Row[]>([])
const lastEmitted = ref<string>('')

watch(
  () => cfg.value.items,
  (list) => {
    const incoming = JSON.stringify(list)
    if (incoming === lastEmitted.value) return
    rows.value = (list || []).map((it) => ({ ...it, uid: nextUid() }))
    lastEmitted.value = incoming
  },
  { immediate: true, deep: false },
)

/** 本地行 → 纯业务字段（剥掉 uid 再落库） */
function toItems(list: Row[]): CategoryNavItem[] {
  return list.map(({ uid: _uid, ...rest }) => ({
    ...rest,
    title: clipByCodePoint(rest.title || '', TITLE_MAX),
    subtitle: clipByCodePoint(rest.subtitle || '', SUB_MAX),
    badge: clipByCodePoint(rest.badge || '', BADGE_MAX),
  }))
}

function flushRows() {
  const next = toItems(rows.value)
  lastEmitted.value = JSON.stringify(next)
  patch({ items: next })
}

const listProxy = computed<Row[]>({
  get: () => rows.value,
  set: (next) => {
    rows.value = next
    flushRows()
  },
})

/* ---------------- patch ---------------- */
function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

function patchRow(index: number, partial: Partial<CategoryNavItem>) {
  const next = [...rows.value]
  if (index < 0 || index >= next.length) return
  next[index] = { ...next[index], ...partial }
  rows.value = next
  flushRows()
  // 折叠头要实时显示角标/副标题，所以不收起
}

/* ---------------- 行操作 ---------------- */
function addRow() {
  if (rows.value.length >= MAX_ITEMS) return
  rows.value = [
    ...rows.value,
    { id: `cnav_${nextUid()}`, uid: nextUid(), icon: '', title: '', subtitle: '', link_url: '', link_type: 'none', badge: '', badge_tone: 'red', badge_color: '' },
  ]
  expanded.value = rows.value.length - 1
  // 空行不落库：先让用户填，填完再写。否则会存出一堆空壳项
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
  flushRows()
  if (expanded.value === index) expanded.value = -1
  else if (expanded.value > index) expanded.value -= 1
}

function copyRow(index: number) {
  if (rows.value.length >= MAX_ITEMS) return
  const src = rows.value[index]
  if (!src) return
  const next = [...rows.value]
  next.splice(index + 1, 0, { ...src, id: `cnav_${nextUid()}`, uid: nextUid() })
  rows.value = next
  flushRows()
  expanded.value = index + 1
}

function toggleExpand(index: number) {
  expanded.value = expanded.value === index ? -1 : index
}

/* ---------------- 弹窗 ---------------- */
function openIconPicker(index: number) {
  iconPickerIndex.value = index
}

function openLinkPicker(index: number) {
  linkPickerIndex.value = index
}

function openImport() {
  importDialogRef.value?.open()
}

const LINK_TAG_TEXT: Record<string, string> = {
  page: '页面',
  product: '商品',
  content: '内容',
  webview: '网页',
  url: '链接',
  miniapp: '小程序',
  none: '无跳转',
}

function linkTag(item: Row): string {
  const t = item.link_type || 'none'
  if (t === 'page' && String(item.link_url || '').includes('categoryId=')) return '商品分类'
  return LINK_TAG_TEXT[t] || '页面'
}

function badgeStyle(item: Row) {
  return { background: resolveBadgeColor(item) }
}

/** 导入：只补新项，不覆盖已配好的项（去重按 link_url） */
function onImported(ids: number[]) {
  if (!ids.length) return
  const exists = new Set(rows.value.map((r) => (r.link_url || '').trim()).filter(Boolean))
  const next = [...rows.value]
  for (const id of ids) {
    if (next.length >= MAX_ITEMS) break
    const path = `/pkg-content/product-list/product-list?categoryId=${id}`
    if (exists.has(path)) continue
    exists.add(path)
    next.push({
      id: `cnav_${nextUid()}`,
      uid: nextUid(),
      icon: '',
      title: '',
      subtitle: '',
      link_url: path,
      link_type: 'page',
      badge: '',
      badge_tone: 'red',
      badge_color: '',
    })
  }
  rows.value = next
  flushRows()
}
</script>

<style lang="scss" scoped>
.cnv-collapse {
  border: 0;

  :deep(.el-collapse-item__header),
  :deep(.el-collapse-item__wrap) {
    border-bottom-color: #efe9e0;
  }

  /*
   *折叠头高度。
   * 🔴 `line-height` 必须在这里归零 —— el-collapse-item__header 默认带 `line-height: 1.5 * 字体`
   * （13px → 约 20px，这里实测是 **48px**），而 badge 是 `<span>`，会**继承**这个值。
   * 后果：badge 被撑成 50px 高的竖长条，整行跟着长高，两个折叠头合计多出近 30px，
   * 在窄面板里非常突兀（lx 截图现象）。
   */
  :deep(.el-collapse-item__header) {
    height: 38px;
    padding: 0 2px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: #3f3a35;
  }

  :deep(.el-collapse-item__content) {
    padding: 4px 2px 14px;
  }
}

.cnv-grp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 同样归零，标题与 badge 才在同一条基线上 */
  line-height: 1;
}

.cnv-grp-badge {
  /* 🔴 自身必须显式给行高，不能靠继承（见上面 header 的注释） */
  display: inline-flex;
  align-items: center;
  flex: none;
  max-width: 100%;
  height: 17px;
  padding: 0 6px;
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 17px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f7f3ec;
  border-radius: 5px;
}

.cnv-field {
  margin-top: 12px;
}

.cnv-field:first-child {
  margin-top: 2px;
}

.cnv-label {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b5b4e;
}

.cnv-label--sub {
  color: #8a7d6f;
}

/* ---------- 标题行 ---------- */
.cnv-title-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cnv-title-row__input {
  flex: 1;
  min-width: 0;
}

.cnv-title-row__switch {
  display: flex;
  flex: none;
  gap: 5px;
  align-items: center;
}

.cnv-title-row__switch-label {
  font-size: 11.5px;
  color: #8a7d6f;
  white-space: nowrap;
}

/* ---------- 布局卡 ---------- */
.cnv-layout-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cnv-layout-card {
  display: grid;
  grid-template-columns: 52px 1fr;
  grid-template-rows: auto auto;
  gap: 1px 10px;
  align-items: center;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.cnv-layout-card__demo {
  display: grid;
  grid-row: 1 / 3;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  width: 52px;
  height: 34px;
  padding: 3px;
  background: #f1ede6;
  border-radius: 5px;

  i {
    display: block;
    background: #d8cfc2;
    border-radius: 2px;
  }

  &.is-grid i:nth-child(n + 5) { display: none; }
  &.is-scroll { grid-template-columns: repeat(4, 1fr); }
  &.is-paged i:nth-child(n + 3) { display: none; }
}

.cnv-layout-card__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.cnv-layout-card__desc {
  font-size: 11px;
  color: #a89c8d;
}

.cnv-layout-card.is-on .cnv-layout-card__label {
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 空态 ---------- */
.cnv-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 9px;
}

.cnv-blank__title {
  margin: 0;
  font-size: 12.5px;
  color: #5c5249;
}

.cnv-blank__hint {
  margin: 3px 0 10px;
  font-size: 11px;
  color: #a89c8d;
}

.cnv-blank__btns {
  display: flex;
  gap: 8px;
}

/* ---------- 列表 ---------- */
.cnv-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cnv-item {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 9px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-open {
    border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #fff);
  }
}

.cnv-item--ghost {
  background: #f3ede4;
  border-style: dashed;
}

.cnv-item__head {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
}

/* 拖拽手柄独立成块：hover 才显形，click/mousedown 都不冒泡，
   否则「想拖动排序」会误触发整行展开（需求明确点出的问题） */
.cnv-item__grip {
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 26px;
  padding: 0;
  color: #c2b6a8;
  cursor: grab;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:hover {
    color: #8a7c6e;
    background: #efe9e2;
  }

  &:active {
    cursor: grabbing;
  }
}

.cnv-item__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  overflow: hidden;
  font-size: 14px;
  background: #f1ede6;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.cnv-item__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.cnv-item__name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnv-item__name.is-empty {
  color: #c4b9ac;
  font-style: italic;
}

.cnv-item__meta {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.cnv-item__sub {
  overflow: hidden;
  font-size: 10.5px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnv-item__badge {
  flex: none;
  padding: 0 4px;
  font-size: 9.5px;
  font-style: normal;
  line-height: 14px;
  color: #fff;
  border-radius: 3px;
}

.cnv-item__nolink {
  flex: none;
  font-size: 10.5px;
  color: #c0a99a;
}

.cnv-item__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #8a7d6f;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;

  &:hover:not(:disabled) {
    color: var(--el-color-primary, #c08e6e);
    background: #f6f2ec;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.cnv-item__ico--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeeec;
}

.cnv-item__body {
  padding: 4px 10px 12px;
  border-top: 1px dashed #efe9e0;
}

/* ---------- 图标 ---------- */
.cnv-icon-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cnv-icon-trigger {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  overflow: hidden;
  font-size: 19px;
  color: #b3a596;
  cursor: pointer;
  background: #f1ede6;
  border: 1px dashed #ddd5c9;

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.cnv-icon-ops {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* ---------- 两列 ---------- */
.cnv-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.cnv-two__cell {
  position: relative;
  min-width: 0;
}

.cnv-two__count {
  position: absolute;
  top: 50%;
  right: 6px;
  font-size: 10px;
  color: #c4b9ac;
  pointer-events: none;
  transform: translateY(-50%);
}

.cnv-two--badge {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.cnv-tones {
  display: flex;
  gap: 5px;
  align-items: center;
}

.cnv-tone {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #fff;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;

  &.is-on {
    border-color: #3f3a35;
  }
}

.cnv-tone-picker {
  margin-left: 2px;
}

/* ---------- 跳转 ---------- */
.cnv-link {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.cnv-link__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  background: #fff;
  border-radius: 6px;
}

.cnv-link__text {
  flex: 1;
  overflow: hidden;
  font-size: 11.5px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnv-link__act {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 底部操作 ---------- */
.cnv-list__ops {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.cnv-limit {
  font-size: 11px;
  color: #b3a596;
}
</style>
