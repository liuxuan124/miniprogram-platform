<template>
  <div class="planet-props">
    <el-form label-width="72px" size="small">
      <el-form-item label="数据来源">
        <el-radio-group :model-value="data.source_mode || 'auto'" @change="(v: string) => emit('update', { source_mode: v })">
          <el-radio-button value="auto">星球动态接口</el-radio-button>
          <el-radio-button value="manual">演示/手动</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="条数">
        <el-input-number :model-value="Number(data.page_size || 20)" :min="5" :max="50" controls-position="right" @change="(v: number | undefined) => emit('update', { page_size: v ?? 20 })" />
      </el-form-item>
      <el-form-item v-if="hasResourcesSeg" label="资料库路径">
        <el-input :model-value="data.resources_url || ''" placeholder="/pages/custom/motai-library" @input="(v: string) => emit('update', { resources_url: v })" />
      </el-form-item>
    </el-form>

    <div class="item-head">
      <span>分段标签</span>
      <span class="item-head__count">{{ segs.length }} / {{ MAX_SEGS }}</span>
    </div>
    <p class="item-tip">显示名可自由改；「类型」决定点了之后筛什么，只能从已有类型里选。</p>

    <div v-for="(seg, idx) in segs" :key="idx" class="seg-card">
      <div class="seg-card__hd">
        <span class="seg-card__no">分段 {{ idx + 1 }}</span>
        <div class="seg-card__acts">
          <el-tooltip content="上移一位" placement="top">
            <el-button link :disabled="idx === 0" aria-label="上移" @click="moveSeg(idx, idx - 1)">
              <el-icon><ArrowUp /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="下移一位" placement="top">
            <el-button link :disabled="idx === segs.length - 1" aria-label="下移" @click="moveSeg(idx, idx + 1)">
              <el-icon><ArrowDown /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除此分段" placement="top">
            <el-button link type="danger" :disabled="segs.length <= 1" aria-label="删除分段" @click="removeSeg(idx)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="seg-card__row">
        <span class="seg-card__lab">显示名</span>
        <el-input
          :model-value="seg.label || ''"
          maxlength="8"
          placeholder="如：精华"
          @input="(v: string) => patch(idx, { label: v })"
        />
      </div>

      <div class="seg-card__row">
        <span class="seg-card__lab">类型</span>
        <el-select :model-value="seg.key || ''" style="width: 100%" @change="(v: string) => patch(idx, { key: v })">
          <el-option v-for="opt in SEG_KEYS" :key="opt.value" :label="opt.label" :value="opt.value">
            <span class="opt__name">{{ opt.label }}</span>
            <span class="opt__desc">{{ opt.desc }}</span>
          </el-option>
        </el-select>
      </div>

      <p v-if="!isKnownKey(seg.key)" class="seg-card__warn">
        类型「{{ seg.key || '（空）' }}」不在可选范围内，小程序端点了不会筛选。
      </p>
    </div>

    <div class="seg-foot">
      <el-button type="primary" text size="small" :disabled="segs.length >= MAX_SEGS || !nextFreeKey" @click="addSeg">
        + 分段
      </el-button>
      <el-button text size="small" :disabled="!segs.length" @click="resetSegs">恢复默认</el-button>
      <span v-if="!nextFreeKey" class="seg-foot__tip">已用完所有可选类型</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Delete } from '@element-plus/icons-vue'
import { useListEditor } from '../composables/useListEditor'
import { PLANET_DEFAULT_SEGS, PLANET_SEG_KEYS, isKnownPlanetSegKey, normalizePlanetSegs } from '@/utils/preview-planet'

const MAX_SEGS = 8

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const SEG_KEYS = PLANET_SEG_KEYS

const segs = computed(() => normalizePlanetSegs(data.segs))

const { removeItem, updateItem, moveItem } = useListEditor(segs, {
  createDefault: () => ({ key: 'all', label: '新分段' }),
  maxItems: MAX_SEGS,
})

const hasResourcesSeg = computed(() => segs.value.some((it) => it.key === 'resources'))

function isKnownKey(key: unknown): boolean {
  return isKnownPlanetSegKey(key)
}

/** 新增时挑一个尚未使用的类型，避免一上来就撞 key 造成两段筛出同样内容。 */
const nextFreeKey = computed(() => SEG_KEYS.find((opt) => !segs.value.some((it) => it.key === opt.value))?.value || '')

function addSeg() {
  const key = nextFreeKey.value
  if (!key) return
  const preset = SEG_KEYS.find((opt) => opt.value === key)
  emit('update', { segs: [...segs.value, { key, label: preset?.label || '新分段' }] })
}

function removeSeg(index: number) {
  emit('update', { segs: removeItem(index) })
}

function moveSeg(from: number, to: number) {
  emit('update', { segs: moveItem(from, to) })
}

function patch(index: number, value: Record<string, unknown>) {
  emit('update', { segs: updateItem(index, (item: any) => ({ ...item, ...value })) })
}

function resetSegs() {
  emit('update', { segs: PLANET_DEFAULT_SEGS.map((it) => ({ ...it })) })
}
</script>

<style scoped>
.item-head { display: flex; align-items: baseline; justify-content: space-between; margin: 8px 0 4px; font-size: 12px; font-weight: 700; color: #64748b; }
.item-head__count { font-weight: 400; color: #94a3b8; }
.item-tip { margin: 0 0 8px; color: #94a3b8; font-size: 11px; line-height: 1.5; }
.seg-card { margin-bottom: 8px; padding: 8px 9px; border: 1px solid #e3e8f0; border-radius: 8px; background: #f8faff; }
.seg-card__hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.seg-card__no { color: #7b8798; font-size: 11px; }
.seg-card__acts { display: flex; align-items: center; gap: 2px; }
.seg-card__row { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 6px; margin-bottom: 6px; }
.seg-card__row:last-child { margin-bottom: 0; }
.seg-card__lab { color: #64748b; font-size: 12px; }
.seg-card__warn { margin: 6px 0 0; color: #e6a23c; font-size: 11px; line-height: 1.5; }
.seg-foot { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.seg-foot__tip { color: #94a3b8; font-size: 11px; }
.opt__name { font-size: 12px; }
.opt__desc { float: right; margin-left: 12px; color: #94a3b8; font-size: 11px; }
</style>