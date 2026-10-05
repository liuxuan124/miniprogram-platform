<template>
  <div class="planet-rec-props">
    <el-form label-width="76px" size="small">
      <el-form-item label="区块标题">
        <el-input
          :model-value="data.title || ''"
          placeholder="我的星球"
          @input="(v: string) => emit('update', { title: v })"
        />
      </el-form-item>
      <el-form-item label="更多文案">
        <el-input
          :model-value="data.more_text || ''"
          placeholder="进入 ›"
          @input="(v: string) => emit('update', { more_text: v })"
        />
      </el-form-item>
      <el-form-item>
        <template #label>
          <span class="pr-label">更多跳转<FieldHint :text="MORE_HINT" /></span>
        </template>
        <el-input
          :model-value="data.more_url || ''"
          placeholder="/pkg-content/planet-list/planet-list"
          @input="(v: string) => emit('update', { more_url: v })"
        >
          <template #append>
            <el-dropdown trigger="click" @command="applyPreset">
              <el-button text size="small">常用</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="p in MORE_PRESETS" :key="p.value" :command="p.value">
                    {{ p.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-input>
        <div v-if="data.more_url" class="pr-row-actions">
          <el-button size="small" text @click="emit('update', { more_url: '' })">清空</el-button>
          <span class="pr-err-hint">路径写错会 404，优先用「常用」预设</span>
        </div>
      </el-form-item>
    </el-form>

    <el-divider content-position="left">卡片展示</el-divider>

    <el-form label-width="76px" size="small">
      <el-form-item>
        <template #label>
          <span class="pr-label">展示模式<FieldHint :text="MODE_HINT" /></span>
        </template>
        <BuilderSegmented
          :model-value="mode"
          :options="MODE_OPTIONS"
          block
          aria-label="展示模式"
          @update:model-value="(v) => emit('update', { planet_mode: v })"
        />
      </el-form-item>

      <!-- 互斥联动：单卡模式下这两项不参与渲染，配置入口整体收起 -->
      <template v-if="isSingle">
        <el-form-item>
          <div class="pr-locked-tip">
            当前模式下自动展示主打星球，无需配置展示数量与列表
          </div>
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item>
          <template #label>
            <span class="pr-label">最多展示<FieldHint :text="LIMIT_HINT" /></span>
          </template>
          <el-input-number
            :model-value="Number(data.planet_limit || 0)"
            :min="0"
            :max="12"
            controls-position="right"
            @change="(v: number | undefined) => emit('update', { planet_limit: v ?? 0 })"
          />
          <span class="pr-unit">张</span>
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="pr-label">点击行为<FieldHint :text="ACTION_HINT" /></span>
          </template>
          <BuilderSegmented
            :model-value="data.planet_action || 'auto'"
            :options="ACTION_OPTIONS"
            block
            aria-label="点击行为"
            @update:model-value="(v) => emit('update', { planet_action: v })"
          />
        </el-form-item>
      </template>
    </el-form>

    <!-- 指定星球：单卡模式下同样收起（它只影响横滑多卡的筛选与顺序） -->
    <div v-if="isSingle" class="pr-collapsed">
      <span>「指定展示哪些星球」与「最多展示张数」在当前模式下不生效</span>
    </div>
    <div v-else class="planet-pick">
      <div class="planet-pick__hd">
        <span class="pr-label">指定展示哪些星球<FieldHint :text="PICK_HINT" /></span>
        <span class="planet-pick__count">{{ pickedIds.length }} / {{ planets.length }}</span>
      </div>

      <div class="planet-pick__tools">
        <el-button size="small" text :disabled="!planets.length" @click="selectAll">全选</el-button>
        <el-button size="small" text :disabled="!pickedIds.length" @click="clearAll">清空</el-button>
        <span v-if="pickedIds.length > 1" class="planet-pick__tip">已选 {{ pickedIds.length }} 颗，可拖动右侧抓手调整横滑顺序</span>
        <span v-else class="planet-pick__tip">不勾选 = 展示全部启用的星球</span>
      </div>

      <div v-if="loading" class="planet-pick__state">星球列表加载中…</div>
      <div v-else-if="loadError" class="planet-pick__state planet-pick__state--err">
        星球列表加载失败
        <el-button link type="primary" size="small" @click="loadPlanets">重试</el-button>
      </div>
      <div v-else-if="!planets.length" class="planet-pick__state">
        后台还没有启用中的星球，请先到「星球运营」里添加。
      </div>

      <draggable
        v-else
        :model-value="orderedRows"
        item-key="planetId"
        handle=".planet-pick__grip"
        ghost-class="planet-pick__row--ghost"
        class="planet-pick__list"
        @update:model-value="onReorder"
      >
        <template #item="{ element: p }">
          <label
            class="planet-pick__row"
            :class="{ 'is-on': isPicked(p.planetId) }"
          >
            <el-checkbox
              :model-value="isPicked(p.planetId)"
              @change="(v: boolean) => toggle(p.planetId, v)"
            />
            <span class="planet-pick__emoji">{{ p.emoji || '🪐' }}</span>
            <span class="planet-pick__name">{{ p.title || p.planetId }}</span>
            <span v-if="p.primary" class="planet-pick__tag">主</span>
            <span v-if="isPicked(p.planetId)" class="planet-pick__grip" title="拖动调整顺序">
              <el-icon :size="13"><Rank /></el-icon>
            </span>
            <span v-else class="planet-pick__id">{{ p.planetId }}</span>
          </label>
        </template>
      </draggable>
    </div>

    <el-alert
      title="星球名、球友数、动态与热点都来自真实接口，不能手填演示文案；改文案请到「星球运营」页。"
      type="info"
      :closable="false"
      show-icon
      class="pr-foot-alert"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import { Rank } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { fetchWarmHomeAggregate, type WarmPlanetBrief } from '@/api/warmHome'
import FieldHint from '../FieldHint.vue'
import BuilderSegmented from '../BuilderSegmented.vue'

/**
 * 分段控件的选项类型。
 * ⚠️ 不能从 `BuilderSegmented.vue` 具名导入 —— .vue 的具名导出在
 * vue-tsc 下解析不到（TS2614）。项目里其他 props 面板都是本地内联字面量，
 * 这里跟着同一做法，避免为一个类型去改公共组件的导出面。
 */
interface SegOption {
  value: string | number
  label: string
  disabled?: boolean
  title?: string
}

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

/* ---------------- 说明文案（全部收进 ? 气泡，面板不再平铺长段解释） ---------------- */
const MORE_HINT =
  '点区块右上角「进入 ›」的去向。留空时小程序端默认进星球列表。路径必须是已注册页面，否则点击会 404 —— 建议用下方「常用」预设。'
const MODE_HINT =
  '「多星球横滑」把勾选的星球排成可滑动卡片；「只展示主星球」收敛成一张通栏大卡，固定取带「主」标的那颗。注意：小程序端对「已加入的用户」会自动收敛成单卡，那是用户态，跟这里的后台配置无关。'
const LIMIT_HINT = '最多显示几张横滑卡。0 = 不限制；超出时按下方列表顺序取前几张。'
const ACTION_HINT =
  '点卡片后的去向。「自动」= 没加入过的进介绍页（可加入），已加入的直接进动态流。'
const PICK_HINT =
  '不勾选 = 展示后台「星球运营」里全部启用中的星球；勾了 = 只展示勾中的这几颗。勾选后拖动右侧抓手可调整横滑顺序（如活动期把主推星球拖到首位）。'

const MODE_OPTIONS: SegOption[] = [
  { value: 'multi', label: '多星球横滑' },
  { value: 'single', label: '只展示主星球' },
]
const ACTION_OPTIONS: SegOption[] = [
  { value: 'auto', label: '自动' },
  { value: 'intro', label: '进介绍页' },
  { value: 'feed', label: '进动态流' },
]

/** 常用跳转预设：手打长路径是 404 的主要来源，改成点选 */
const MORE_PRESETS = [
  { label: '星球列表（默认）', value: '/pkg-content/planet-list/planet-list' },
  { label: '我的星球主页', value: '/pages/planet/planet' },
  { label: '资源资料库', value: '/pkg-content/resources/resources' },
]

function applyPreset(value: string) {
  emit('update', { more_url: value })
}

const planets = ref<Array<WarmPlanetBrief & { planetId: string }>>([])
const loading = ref(false)
const loadError = ref(false)

const mode = computed(() => (data.planet_mode === 'single' ? 'single' : 'multi'))
/** 单卡模式：多卡专属配置（数量/列表/点击行为）全部不参与渲染 */
const isSingle = computed(() => mode.value === 'single')

const pickedIds = computed<string[]>(() =>
  (Array.isArray(data.planet_ids) ? data.planet_ids : [])
    .map((x: unknown) => String(x || ''))
    .filter(Boolean),
)

/**
 * 列表展示顺序 = **已勾选在前（按勾选/拖拽定的顺序）+ 未勾选在后（后台原序）**。
 * 这样「拖拽调整横滑顺序」所见即所得：画布横滑顺序就是这个数组的顺序。
 */
const orderedRows = computed<Array<WarmPlanetBrief & { planetId: string }>>(() => {
  const picked = pickedIds.value
    .map((id: string) => planets.value.find((p: { planetId: string }) => p.planetId === id))
    .filter(Boolean) as Array<WarmPlanetBrief & { planetId: string }>
  const rest = planets.value.filter((p) => !pickedIds.value.includes(p.planetId))
  return [...picked, ...rest]
})

function isPicked(id: string): boolean {
  return pickedIds.value.includes(String(id || ''))
}

function toggle(id: string, on: boolean) {
  const idStr = String(id || '')
  if (!idStr) return
  const next = on
    ? Array.from(new Set([...pickedIds.value, idStr]))
    : pickedIds.value.filter((x) => x !== idStr)
  emit('update', { planet_ids: next })
}

function selectAll() {
  emit('update', { planet_ids: planets.value.map((p) => p.planetId) })
}

function clearAll() {
  if (!pickedIds.value.length) return
  emit('update', { planet_ids: [] })
}

/**
 * 拖拽排序落库。
 * ⚠️ 拖拽会重排**整个列表**（含未勾选的），但只有勾选项参与画布横滑，
 * 所以要把新顺序折算回「仅已勾选项的 id 序列」再写回 —— 直接存整个列表
 * 会让未勾选的星球混进 planet_ids，等于把它们变成「已指定」。
 */
function onReorder(list: Array<{ planetId: string }>) {
  const pickedSet = new Set(pickedIds.value)
  const next = list.filter((x) => pickedSet.has(x.planetId)).map((x) => x.planetId)
  if (next.length !== pickedIds.value.length) return
  emit('update', { planet_ids: next })
}

async function loadPlanets() {
  loading.value = true
  loadError.value = false
  try {
    const res: any = await fetchWarmHomeAggregate()
    const raw = (res?.data ?? res) || {}
    const list = Array.isArray(raw.planets) && raw.planets.length
      ? raw.planets
      : raw.planet
        ? [raw.planet]
        : []
    planets.value = (list as WarmPlanetBrief[]).filter(
      (p): p is WarmPlanetBrief & { planetId: string } =>
        typeof p?.planetId === 'string' && !!p.planetId,
    )
  } catch {
    loadError.value = true
    ElMessage.warning('星球列表加载失败，展示数量与列表暂不可配置')
  } finally {
    loading.value = false
  }
}

onMounted(loadPlanets)
</script>

<style scoped>
.planet-rec-props {
  --pr-line: var(--wb-line, #e5eaf3);
  --pr-ink: var(--color-ink, #172033);
}

/* 标签行内嵌 ? 提示 */
.pr-label {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.pr-unit {
  margin-left: 8px;
  color: #8a93a3;
  font-size: 12px;
}

.pr-row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
}

.pr-err-hint {
  color: #b45309;
  font-size: 11px;
}

/* 单卡模式下的收起提示 */
.pr-locked-tip {
  padding: 9px 11px;
  font-size: 12px;
  line-height: 1.6;
  color: #7c6a55;
  background: #faf6f0;
  border: 1px dashed #e3d8c8;
  border-radius: 8px;
}

.pr-collapsed {
  padding: 8px 11px;
  margin-top: 8px;
  font-size: 11.5px;
  line-height: 1.6;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 8px;
}

.pr-foot-alert {
  margin-top: 10px;
}

/* ---------------- 星球选择 ---------------- */
.planet-pick {
  padding: 10px;
  margin-top: 4px;
  background: var(--wb-soft, #f8fafc);
  border: 1px solid var(--pr-line);
  border-radius: 8px;
}

.planet-pick__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.planet-pick__count {
  font-weight: 400;
  color: #94a3b8;
}

.planet-pick__tools {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 2px 0 6px;
}

.planet-pick__tip {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planet-pick__state {
  padding: 6px 0;
  font-size: 12px;
  color: #94a3b8;
}

.planet-pick__state--err {
  color: #e6a23c;
}

.planet-pick__list {
  max-height: 220px;
  overflow-y: auto;
}

.planet-pick__row {
  display: flex;
  gap: 7px;
  align-items: center;
  padding: 5px 7px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s;
}

.planet-pick__row:hover {
  background: #fff;
}

.planet-pick__row.is-on {
  background: #fff;
  box-shadow: inset 2px 0 0 var(--el-color-primary, #c08e6e);
}

.planet-pick__row--ghost {
  opacity: 0.5;
}

.planet-pick__emoji {
  flex-shrink: 0;
}

.planet-pick__name {
  max-width: 96px;
  overflow: hidden;
  font-weight: 600;
  color: var(--pr-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planet-pick__tag {
  flex-shrink: 0;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #9a3412;
  background: #fde68a;
  border-radius: 4px;
}

.planet-pick__id {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: #b6c0cf;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 拖拽抓手：只在已勾选时出现（未勾选的顺序无所谓） */
.planet-pick__grip {
  display: inline-flex;
  flex-shrink: 0;
  color: #a3aebf;
  cursor: grab;
  transition: color 0.12s;
}

.planet-pick__grip:hover {
  color: var(--el-color-primary, #c08e6e);
}

.planet-pick__grip:active {
  cursor: grabbing;
}
</style>
