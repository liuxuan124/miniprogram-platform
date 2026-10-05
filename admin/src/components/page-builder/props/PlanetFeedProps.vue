<template>
  <div class="planet-props">
    <!-- ===================== 数据源 ===================== -->
    <div class="blk">
      <div class="blk__hd">
        <span class="blk__title">数据来源</span>
        <FieldHint text="「星球动态接口」读线上真实动态；「演示/手动」用下面这份静态清单，不请求接口，适合做尚未上线时的页面预览。" />
      </div>
      <BuilderSegmented
        :model-value="sourceMode"
        :options="SOURCE_MODE_OPTIONS"
        block
        aria-label="数据来源"
        @update:model-value="(v: string | number) => emit('update', { source_mode: String(v) })"
      />

      <!-- 星球动态接口：3 个参数 -->
      <div v-if="isAuto" class="blk__body">
        <div class="fld">
          <span class="fld__lab">
            圈子/星球 ID
            <FieldHint text="留空则自动取当前用户设置的主星球（/mp/planet/main）。填具体 ID 可让此组件固定显示某一个星球，不跟随用户切换。" />
          </span>
          <el-input
            :model-value="data.planet_id || ''"
            placeholder="留空 = 跟随主星球"
            clearable
            @update:model-value="(v: string) => emit('update', { planet_id: v })"
          />
        </div>

        <div class="fld">
          <span class="fld__lab">
            排序方式
            <FieldHint text="置顶动态永远排在最前，不受此项影响。「最后回复」按最近一条评论时间倒序，从未有人回复的动态排在末尾。" />
          </span>
          <el-select
            :model-value="data.sort_by || 'new'"
            style="width: 100%"
            @update:model-value="(v: string) => emit('update', { sort_by: v })"
          >
            <el-option v-for="opt in SORT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value">
              <span class="opt__name">{{ opt.label }}</span>
              <span class="opt__desc">{{ opt.desc }}</span>
            </el-option>
          </el-select>
          <p v-if="!isKnownSort" class="fld__warn">
            排序方式「{{ data.sort_by }}」不在可选范围内，实际会按「最新发布」处理。
          </p>
        </div>

        <div class="fld">
          <span class="fld__lab">
            单次加载条数
            <FieldHint text="首屏向接口请求的条数，范围 5~50。条数越大首屏越慢，建议 20 以内；下拉触底加载会在此基础上继续追加。" />
          </span>
          <el-input-number
            :model-value="pageSize"
            :min="PAGE_SIZE_MIN"
            :max="PAGE_SIZE_MAX"
            :step="5"
            step-strictly
            controls-position="right"
            style="width: 100%"
            @change="(v: number | undefined) => emit('update', { page_size: normalizePageSize(v) })"
          />
          <p class="fld__tip">5 ~ {{ PAGE_SIZE_MAX }} 条，超出范围会自动收敛。</p>
        </div>
      </div>

      <!-- 演示/手动：静态清单 -->
      <div v-else class="blk__body">
        <div class="fld">
          <span class="fld__lab">
            演示列表
            <FieldHint text="这些内容会原样渲染在真机上，不请求接口。每条至少要有作者与正文，否则显示为空白卡片。" />
          </span>
          <div class="demo-toolbar">
            <el-select
              v-model="pickedTemplate"
              size="small"
              style="flex: 1; min-width: 0"
              placeholder="选择预置模板"
            >
              <el-option v-for="tpl in DEMO_TEMPLATES" :key="tpl.id" :label="tpl.label" :value="tpl.id" />
            </el-select>
            <el-button size="small" :disabled="!pickedTemplate" @click="fillTemplate">填充</el-button>
          </div>
          <div class="demo-toolbar">
            <el-button size="small" :disabled="!demoItems.length" @click="addDemoItem">+ 加一条</el-button>
            <el-button size="small" text type="danger" :disabled="!demoItems.length" @click="clearDemoItems">
              清空
            </el-button>
            <span class="demo-toolbar__count">{{ demoItems.length }} 条</span>
          </div>

          <el-collapse v-model="openDemo" class="demo-list">
            <el-collapse-item v-for="(item, idx) in demoItems" :key="item.uid || idx" :name="idx">
              <template #title>
                <span class="demo-item__title">{{ item.author || '（未命名）' }}</span>
                <span class="demo-item__sub">{{ (item.content || '').slice(0, 18) || '（无正文）' }}</span>
              </template>
              <div class="demo-item">
                <div class="demo-item__row">
                  <span class="demo-item__lab">作者</span>
                  <el-input
                    :model-value="item.author || ''"
                    placeholder="如：墨太白"
                    @update:model-value="(v: string) => patchDemoItem(idx, { author: v })"
                  />
                </div>
                <div class="demo-item__row">
                  <span class="demo-item__lab">类型</span>
                  <el-select
                    :model-value="item.type || ''"
                    style="width: 100%"
                    placeholder="决定被哪些分段筛出"
                    @update:model-value="(v: string) => patchDemoItem(idx, { type: v })"
                  >
                    <el-option label="官方更新" value="official" />
                    <el-option label="精华" value="essence" />
                    <el-option label="提问" value="ask" />
                    <el-option label="打卡" value="checkin" />
                    <el-option label="作业" value="homework" />
                  </el-select>
                </div>
                <div class="demo-item__row">
                  <span class="demo-item__lab">正文</span>
                  <el-input
                    :model-value="item.content || ''"
                    type="textarea"
                    :rows="2"
                    placeholder="展示在卡片正文的文字"
                    @update:model-value="(v: string) => patchDemoItem(idx, { content: v })"
                  />
                </div>
                <div class="demo-item__row demo-item__row--split">
                  <div class="demo-item__half">
                    <span class="demo-item__lab">点赞</span>
                    <el-input
                      :model-value="String(item.likes ?? '0')"
                      @update:model-value="(v: string) => patchDemoItem(idx, { likes: v })"
                    />
                  </div>
                  <div class="demo-item__half">
                    <span class="demo-item__lab">评论</span>
                    <el-input
                      :model-value="String(item.comments ?? '0')"
                      @update:model-value="(v: string) => patchDemoItem(idx, { comments: v })"
                    />
                  </div>
                </div>
                <div class="demo-item__acts">
                  <el-button size="small" text type="danger" @click="removeDemoItem(idx)">删除这条</el-button>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>

    <!-- ===================== 分段标签 ===================== -->
    <div class="blk">
      <div class="blk__hd">
        <span class="blk__title">
          分段标签
          <FieldHint text="显示名可自由改；「类型」决定点了之后筛什么，只能从已有类型里选。拖左侧手柄可调整顺序，顺序即标签栏从左到右的排列。" />
        </span>
        <span class="blk__count" :class="{ 'is-full': segs.length >= MAX_SEGS }">
          {{ segs.length }} / {{ MAX_SEGS }}
        </span>
      </div>

      <div class="seg-list">
        <div
          v-for="(seg, idx) in segs"
          :key="seg.key"
          class="seg"
          :class="{
            'is-open': openSegs.includes(idx),
            'is-drag-from': dragFrom === idx,
            'is-drop-target': dragOver === idx && dragFrom !== idx,
          }"
          :ref="(el) => setSegRef(idx, el)"
          :data-seg-key="seg.key"
          @dragover="onDragOver(idx, $event)"
          @drop="onDrop(idx, $event)"
        >
          <div class="seg__hd">
            <span
              class="seg__grip"
              draggable="true"
              role="button"
              tabindex="0"
              title="拖拽调整顺序"
              aria-label="拖拽调整顺序"
              @dragstart="onDragStart(idx, $event)"
              @dragend="onDragEnd"
            >
              <el-icon><Rank /></el-icon>
            </span>

            <button
              type="button"
              class="seg__title"
              :aria-expanded="openSegs.includes(idx)"
              @click="toggleSeg(idx)"
            >
              <el-icon class="seg__caret" :class="{ 'is-open': openSegs.includes(idx) }">
                <ArrowRight />
              </el-icon>
              <span class="seg__text">{{ segTitle(idx, seg) }}</span>
            </button>

            <span v-if="isDefaultSeg(seg.key)" class="seg__badge">默认</span>

            <div class="seg__acts">
              <el-tooltip content="上移一位" placement="top">
                <button type="button" class="seg__act" :disabled="idx === 0" aria-label="上移" @click="moveSeg(idx, idx - 1)">
                  <el-icon><ArrowUp /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip content="下移一位" placement="top">
                <button
                  type="button"
                  class="seg__act"
                  :disabled="idx === segs.length - 1"
                  aria-label="下移"
                  @click="moveSeg(idx, idx + 1)"
                >
                  <el-icon><ArrowDown /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip content="删除此分段" placement="top">
                <button
                  type="button"
                  class="seg__act seg__act--danger"
                  :disabled="segs.length <= 1"
                  aria-label="删除分段"
                  @click="removeSeg(idx)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </el-tooltip>
            </div>
          </div>

          <div v-show="openSegs.includes(idx)" class="seg__body">
            <div class="seg__row">
              <span class="seg__lab">显示名</span>
              <el-input
                :model-value="seg.label || ''"
                maxlength="8"
                placeholder="如：精华"
                @update:model-value="(v: string) => patch(idx, { label: v })"
              />
            </div>
            <div class="seg__row">
              <span class="seg__lab">类型</span>
              <el-select
                :model-value="seg.key || ''"
                style="width: 100%"
                @update:model-value="(v: string) => patch(idx, { key: v })"
              >
                <el-option v-for="opt in SEG_KEYS" :key="opt.value" :label="opt.label" :value="opt.value">
                  <span class="opt__name">{{ opt.label }}</span>
                  <span class="opt__desc">{{ opt.desc }}</span>
                </el-option>
              </el-select>
            </div>
            <p v-if="!isKnownKey(seg.key)" class="seg__warn">
              类型「{{ seg.key || '（空）' }}」不在可选范围内，小程序端点了不会筛选。
            </p>
          </div>
        </div>
      </div>

      <div class="seg-foot">
        <el-tooltip
          :disabled="!atMaxSegs"
          :content="maxSegsTip"
          placement="top"
        >
          <span class="seg-foot__add">
            <el-button
              type="primary"
              text
              size="small"
              :disabled="addDisabled"
              @click="addSeg"
            >
              + 分段
            </el-button>
          </span>
        </el-tooltip>

        <el-popconfirm
          title="恢复默认分段？"
          description="会把当前 N 个分段全部替换为系统的 6 个默认分段，自定义的显示名与顺序都会丢失。"
          placement="top-end"
          :width="230"
          confirm-button-text="恢复默认"
          cancel-button-text="取消"
          confirm-button-type="warning"
          @confirm="resetSegs"
        >
          <template #reference>
            <el-button text size="small" :disabled="!segs.length">恢复默认</el-button>
          </template>
        </el-popconfirm>
      </div>
      <p v-if="!nextFreeKey && !atMaxSegs" class="seg-foot__tip">8 个可选类型已全部用完</p>

      <!-- 默认高亮分段 -->
      <div class="fld fld--last">
        <span class="fld__lab">
          默认高亮分段
          <FieldHint text="打开页面时默认选中哪一段。留空则选中第一个。若该分段之后被删除，会自动回落到第一个，不会出现「哪个都不亮」。" />
        </span>
        <el-select
          :model-value="defaultSeg || ''"
          style="width: 100%"
          clearable
          placeholder="默认选第一个"
          @update:model-value="(v: string) => emit('update', { default_seg: v || '' })"
        >
          <el-option
            v-for="seg in segs"
            :key="seg.key"
            :label="`${seg.label}（${keyLabel(seg.key)}）`"
            :value="seg.key"
          />
        </el-select>
      </div>
    </div>

    <!-- ===================== 资料库路径 ===================== -->
    <div v-if="hasResourcesSeg" class="blk">
      <div class="blk__hd">
        <span class="blk__title">
          资料库路径
          <FieldHint text="「资料」分段点击后跳转的目标页。选「页面」可搜索已有页面，选「链接」可手填路径。" />
        </span>
      </div>
      <div class="blk__body">
        <LinkPickerField
          :link-type="resourcesLinkType"
          :link-url="data.resources_url || ''"
          @update:link-type="(v: string) => emit('update', { resources_link_type: v })"
          @update:link-url="(v: string) => emit('update', { resources_url: v })"
        />
      </div>
    </div>

    <!--
      🔴 展示项控制（置顶角标 / 互动栏 / 正文截断）已迁到「样式」页签的
      「内容可见性」分组（2026-10-06）。它们本质是**显示规则**而非业务内容，
      放在内容页签会让「数据来源 → 分段 → 路径 → 展示规则」这条配置动线被打断，
      而且同一组开关在两个页签各出现一次，运营改一处另一处不动会以为没生效。
    -->
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, Delete, Rank } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'
import { useDragSort } from '../composables/useDragSort'
import { usePageStore } from '@/stores/page'
import {
  PLANET_DEMO_TEMPLATES,
  PLANET_MAX_SEGS,
  PLANET_PAGE_SIZE_MAX,
  PLANET_PAGE_SIZE_MIN,
  PLANET_SEG_KEYS,
  PLANET_SORT_KEYS,
  isKnownPlanetSegKey,
  isKnownPlanetSortKey,
  normalizePlanetDemoItems,
  normalizePlanetPageSize,
  normalizePlanetSegs,
  resolvePlanetDefaultSeg,
  PLANET_DEFAULT_SEGS,
} from '@/utils/preview-planet'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const pageStore = usePageStore()

const MAX_SEGS = PLANET_MAX_SEGS
const PAGE_SIZE_MIN = PLANET_PAGE_SIZE_MIN
const PAGE_SIZE_MAX = PLANET_PAGE_SIZE_MAX

const SOURCE_MODE_OPTIONS = [
  { value: 'auto', label: '星球动态接口' },
  // 🔴 需求方要求过「若仅做静态展示请改文案」—— 但这里**确实可增删改**
  //（下面有模板填充 / 加一条 / 逐条编辑），所以文案写「可编辑」而非「只读」，
  // 否则运营看到「只读」就不敢改，白白少一个不用等接口联调就能出效果的手段。
  { value: 'manual', label: '静态示例数据' },
]

const SEG_KEYS = PLANET_SEG_KEYS
const SORT_OPTIONS = PLANET_SORT_KEYS
const DEMO_TEMPLATES = PLANET_DEMO_TEMPLATES

const sourceMode = computed(() => (data.source_mode === 'manual' ? 'manual' : 'auto'))
const isAuto = computed(() => sourceMode.value === 'auto')
const pageSize = computed(() => normalizePlanetPageSize(data.page_size))
const normalizePageSize = (v: unknown) => normalizePlanetPageSize(v)
const isKnownSort = computed(() => isKnownPlanetSortKey(data.sort_by || 'new'))
const isKnownKey = (key: unknown) => isKnownPlanetSegKey(key)

const segs = computed(() => normalizePlanetSegs(data.segs))
const defaultSeg = computed(() => String(data.default_seg || ''))

const resourcesLinkType = computed(() => String(data.resources_link_type || 'page'))
const hasResourcesSeg = computed(() => segs.value.some((it) => it.key === 'resources'))

/* ---------------- 分段：折叠 + 拖拽 ---------------- */

const openSegs = ref<number[]>([0])
const segRefs = new Map<number, HTMLElement>()

function setSegRef(index: number, el: any) {
  if (el instanceof HTMLElement) segRefs.set(index, el)
  else segRefs.delete(index)
}

function toggleSeg(index: number) {
  const i = openSegs.value.indexOf(index)
  if (i >= 0) openSegs.value = openSegs.value.filter((x) => x !== index)
  else openSegs.value = [...openSegs.value, index]
}

const { dragFrom, dragOver, onDragStart, onDragOver, onDrop, onDragEnd } = useDragSort(segs, (next) => {
  emit('update', { segs: next })
})

/** 折叠态标题：分段 2: 精华 (精华)。下标用 1 起，与用户口头表述一致。 */
function segTitle(index: number, seg: { key: string; label: string }): string {
  return `分段 ${index + 1}: ${seg.label || '（未命名）'} (${keyLabel(seg.key)})`
}

function keyLabel(key: string): string {
  return SEG_KEYS.find((o) => o.value === key)?.label || '未定义'
}

function isDefaultSeg(key: string): boolean {
  return resolvePlanetDefaultSeg(segs.value, defaultSeg.value) === key
}

const atMaxSegs = computed(() => segs.value.length >= MAX_SEGS)
/** 新增时挑尚未使用的类型，避免两段筛出同样内容 */
const nextFreeKey = computed(() => SEG_KEYS.find((opt) => !segs.value.some((it) => it.key === opt.value))?.value || '')
const addDisabled = computed(() => atMaxSegs.value || !nextFreeKey.value)

/** 上限 Tooltip 文案：区分「到 8 段上限」与「类型用完」，两种情况处置不同 */
const maxSegsTip = computed(() =>
  nextFreeKey.value
    ? `分段最多 ${MAX_SEGS} 个，当前已达上限`
    : `${SEG_KEYS.length} 个可选类型已全部用完，请先删除或改类型`,
)

function addSeg() {
  const key = nextFreeKey.value
  if (!key || atMaxSegs.value) return
  const preset = SEG_KEYS.find((opt) => opt.value === key)
  const next = [...segs.value, { key, label: preset?.label || '新分段' }]
  emit('update', { segs: next })
  openSegs.value = [...openSegs.value, next.length - 1]
}

function removeSeg(index: number) {
  const next = segs.value.filter((_, i) => i !== index)
  emit('update', { segs: next })
  // 被删的若是默认高亮段，清掉配置让它回落到第一个，否则 resolve 会一直找不到
  if (segs.value[index]?.key === defaultSeg.value) emit('update', { default_seg: '' })
  openSegs.value = openSegs.value.filter((x) => x !== index).map((x) => (x > index ? x - 1 : x))
}

function moveSeg(from: number, to: number) {
  if (to < 0 || to >= segs.value.length) return
  const next = [...segs.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  emit('update', { segs: next })
  // 折叠状态下换位，展开项的下标要跟着挪，否则展开的卡片会突然变成另一段
  openSegs.value = openSegs.value.map((x) => {
    if (x === from) return to
    if (from < to && x > from && x <= to) return x - 1
    if (from > to && x >= to && x < from) return x + 1
    return x
  })
}

function patch(index: number, value: Record<string, unknown>) {
  const next = segs.value.map((it, i) => (i === index ? { ...it, ...value } : it))
  emit('update', { segs: next })
}

function resetSegs() {
  emit('update', { segs: PLANET_DEFAULT_SEGS.map((it) => ({ ...it })), default_seg: '' })
  openSegs.value = [0]
  ElMessage.success('已恢复为 6 个默认分段')
}

/* ---------------- 演示/手动 ---------------- */

const demoItems = computed(() => normalizePlanetDemoItems(data.items))
const pickedTemplate = ref('')
const openDemo = ref<number[]>([])

function fillTemplate() {
  const tpl = DEMO_TEMPLATES.find((t) => t.id === pickedTemplate.value)
  if (!tpl) return
  emit('update', { items: tpl.items.map((it) => ({ ...it })) })
  ElMessage.success(`已填充「${tpl.label}」`)
}

function addDemoItem() {
  const n = demoItems.value.length + 1
  emit('update', {
    items: [
      ...demoItems.value,
      { uid: `demo-${Date.now()}`, author: '新球友', content: `第 ${n} 条演示内容`, type: '', likes: '0', comments: '0' },
    ],
  })
  openDemo.value = [...openDemo.value, demoItems.value.length]
}

function patchDemoItem(index: number, value: Record<string, unknown>) {
  emit('update', {
    items: demoItems.value.map((it, i) => (i === index ? { ...it, ...value } : it)),
  })
}

function removeDemoItem(index: number) {
  emit('update', { items: demoItems.value.filter((_, i) => i !== index) })
  openDemo.value = openDemo.value.filter((x) => x !== index).map((x) => (x > index ? x - 1 : x))
}

function clearDemoItems() {
  emit('update', { items: [] })
  openDemo.value = []
}

/* ---------------- 画布 → 面板联动 ---------------- */

/**
 * 画布里点了某个分段标签，右侧面板自动展开并滚到该分段配置项。
 *
 * 监听 store 的 canvasFocus（带自增 token），不是 seg key：
 * 连点同一个标签两次 key 不变，靠 watch(key) 第二次不会触发。
 * 用 nextTick 等 segs 重渲染完成再滚，否则 ref 还没挂上。
 */
watch(
  () => pageStore.canvasFocus?.token,
  () => {
    const key = pageStore.canvasFocus?.key
    if (!key) return
    const idx = segs.value.findIndex((s) => s.key === key)
    if (idx < 0) return
    if (!openSegs.value.includes(idx)) openSegs.value = [...openSegs.value, idx]
    void nextTick(() => {
      const el = segRefs.get(idx)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.classList.add('is-flash')
      window.setTimeout(() => el?.classList.remove('is-flash'), 1200)
    })
  },
)
</script>

<style scoped>
.planet-props { display: flex; flex-direction: column; gap: 12px; }

/* 折叠分组：统一浅底卡片，收起时只占一行 */
.blk { padding: 9px 10px 10px; background: #fbfcfe; border: 1px solid #e6ebf3; border-radius: 10px; }
.blk__hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.blk__hd--toggle { margin-bottom: 0; }
.blk__hd > .blk__title { display: inline-flex; align-items: center; }
.blk__title { display: inline-flex; align-items: center; color: #64748b; font-size: 12px; font-weight: 700; }
.blk__count { color: #94a3b8; font-size: 11px; font-variant-numeric: tabular-nums; }
.blk__count.is-full { color: #e6a23c; font-weight: 600; }
.blk__body { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.blk__toggle {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0; color: #64748b; font-family: inherit; font-size: 12px; font-weight: 700;
  background: transparent; border: 0; cursor: pointer;
}

.fld { display: flex; flex-direction: column; gap: 5px; }
.fld--last { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e3e8f0; }
.fld__lab { display: inline-flex; align-items: center; color: #64748b; font-size: 12px; }
.fld__tip { margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.45; }
.fld__warn { margin: 0; color: #e6a23c; font-size: 11px; line-height: 1.45; }

.opt__name { font-size: 12px; }
.opt__desc { float: right; margin-left: 12px; color: #94a3b8; font-size: 11px; }

/* ---------------- 分段卡片 ---------------- */

.seg-list { display: flex; flex-direction: column; gap: 5px; }
.seg {
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.seg.is-open { border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #e3e8f0); }
.seg.is-drag-from { opacity: 0.4; }
.seg.is-drop-target { border-top: 2px solid var(--el-color-primary, #c08e6e); }
.seg.is-flash { animation: seg-flash 1.2s ease; }
@keyframes seg-flash {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  25% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary, #c08e6e) 30%, transparent); }
}

.seg__hd { display: flex; align-items: center; gap: 2px; padding: 3px 4px 3px 2px; }
.seg__grip {
  display: grid; place-items: center;
  flex: none; width: 20px; height: 24px;
  color: #c3ccd9; cursor: grab; border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.seg__grip:hover { color: #94a3b8; background: #f1f5f9; }
.seg__grip:active { cursor: grabbing; }
.seg__grip:focus-visible { outline: 2px solid var(--el-color-primary, #c08e6e); outline-offset: -2px; }

.seg__title {
  display: flex; align-items: center; gap: 4px;
  flex: 1; min-width: 0;
  padding: 3px 4px;
  font-family: inherit; font-size: 12px; text-align: left;
  color: #475569; background: transparent; border: 0; border-radius: 5px; cursor: pointer;
}
.seg__title:hover { background: #f8fafc; }
.seg__caret { flex: none; color: #a3aec0; font-size: 12px; transition: transform 0.18s; }
.seg__caret.is-open { transform: rotate(90deg); }
.seg__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.seg__badge {
  flex: none; padding: 1px 5px;
  color: var(--el-color-primary, #c08e6e); font-size: 10px;
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 12%, #fff);
  border-radius: 999px;
}

.seg__acts { display: flex; align-items: center; gap: 0; flex: none; }
.seg__act {
  display: grid; place-items: center;
  width: 21px; height: 21px; padding: 0;
  color: #94a3b8; font-size: 12px;
  background: transparent; border: 0; border-radius: 5px; cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.seg__act:hover:not(:disabled) { color: var(--el-color-primary, #c08e6e); background: #f5f7fa; }
.seg__act--danger:hover:not(:disabled) { color: var(--el-color-danger, #f56c6c); background: #fef0f0; }
.seg__act:disabled { opacity: 0.35; cursor: not-allowed; }

.seg__body { padding: 4px 6px 7px 24px; display: flex; flex-direction: column; gap: 6px; }
.seg__row { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 6px; }
.seg__lab { color: #94a3b8; font-size: 11px; }
.seg__warn { margin: 0; color: #e6a23c; font-size: 11px; line-height: 1.45; }

.seg-foot { display: flex; align-items: center; gap: 4px; margin-top: 7px; }
/* Tooltip 需要一个真实元素承载，disabled 的按钮不会触发 tooltip */
.seg-foot__add { display: inline-flex; }
.seg-foot__tip { margin: 4px 0 0; color: #e6a23c; font-size: 11px; }

/* ---------------- 演示列表 ---------------- */
.demo-toolbar { display: flex; align-items: center; gap: 6px; }
.demo-toolbar__count { margin-left: auto; color: #94a3b8; font-size: 11px; font-variant-numeric: tabular-nums; }
.demo-list { margin-top: 2px; }
.demo-list :deep(.el-collapse-item__header) { padding: 0 8px; height: 32px; font-size: 12px; }
.demo-list :deep(.el-collapse-item__wrap) { border-bottom: 1px solid #eef1f6; }
.demo-list :deep(.el-collapse-item__content) { padding: 6px 8px 10px; }
.demo-item__title { font-size: 12px; font-weight: 600; color: #334155; }
.demo-item__sub { margin-left: 6px; color: #94a3b8; font-size: 11px; }
.demo-item { display: flex; flex-direction: column; gap: 6px; }
.demo-item__row { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 6px; }
.demo-item__row--split { grid-template-columns: 1fr; gap: 6px; }
.demo-item__half { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 6px; }
.demo-item__lab { color: #94a3b8; font-size: 11px; }
.demo-item__acts { display: flex; justify-content: flex-end; }
</style>
