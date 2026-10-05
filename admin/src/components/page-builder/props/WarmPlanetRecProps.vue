<template>
  <div class="planet-rec-props">
    <el-form label-width="88px" size="small">
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
      <el-form-item label="更多跳转">
        <el-input
          :model-value="data.more_url || ''"
          placeholder="/pkg-content/planet-list/planet-list"
          @input="(v: string) => emit('update', { more_url: v })"
        />
        <div class="ds-hint">点右上角「{{ data.more_text || '进入 ›' }}」的去向。不填时小程序端默认进星球列表。</div>
      </el-form-item>

      <el-divider content-position="left">卡片展示</el-divider>

      <el-form-item label="展示模式">
        <el-radio-group
          :model-value="data.planet_mode || 'multi'"
          @change="(v: string) => emit('update', { planet_mode: v })"
        >
          <el-radio-button value="multi">多星球横滑</el-radio-button>
          <el-radio-button value="single">只展示主星球</el-radio-button>
        </el-radio-group>
        <div class="ds-hint">
          「多星球横滑」会列出全部启用的星球；用户一旦在介绍页点了「设为常驻星球」，首页就自动收敛成只展示那颗。
        </div>
      </el-form-item>

      <el-form-item label="最多展示">
        <el-input-number
          :model-value="Number(data.planet_limit || 0)"
          :min="0"
          :max="12"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { planet_limit: v ?? 0 })"
        />
        <span class="ds-unit">张</span>
        <div class="ds-hint">0 = 不限制。超出时按后台星球列表顺序取前几张。</div>
      </el-form-item>

      <el-form-item label="点击行为">
        <el-radio-group
          :model-value="data.planet_action || 'auto'"
          @change="(v: string) => emit('update', { planet_action: v })"
        >
          <el-radio-button value="auto">自动</el-radio-button>
          <el-radio-button value="intro">进介绍页</el-radio-button>
          <el-radio-button value="feed">进动态流</el-radio-button>
        </el-radio-group>
        <div class="ds-hint">「自动」= 没加入过的星球进介绍页（可加入），已加入的直接进动态流。</div>
      </el-form-item>
    </el-form>

    <div class="planet-pick">
      <div class="planet-pick__hd">
        <span>指定展示哪些星球</span>
        <span class="planet-pick__count">{{ pickedIds.length }} / {{ planets.length }}</span>
      </div>
      <p class="planet-pick__tip">
        不勾选 = 展示后台「星球运营」里全部启用中的星球。勾了 = 只展示勾中的这几颗。
      </p>
      <div v-if="loading" class="planet-pick__state">星球列表加载中…</div>
      <div v-else-if="loadError" class="planet-pick__state planet-pick__state--err">
        星球列表加载失败
        <el-button link type="primary" size="small" @click="loadPlanets">重试</el-button>
      </div>
      <div v-else-if="!planets.length" class="planet-pick__state">
        后台还没有启用中的星球，请先到「星球运营」里添加。
      </div>
      <label
        v-for="p in planets"
        :key="p.planetId"
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
        <span class="planet-pick__id">{{ p.planetId }}</span>
      </label>      <div v-if="pickedIds.length" class="planet-pick__foot">
        <el-button size="small" text @click="emit('update', { planet_ids: [] })">清空选择（展示全部）</el-button>
      </div>
    </div>

    <el-alert
      title="卡片里的星球名、球友数、今日动态、热点三条都来自真实接口，不能在这里手填演示文案；要改文案请到「星球运营」页。"
      type="info"
      :closable="false"
      show-icon
      style="margin-top: 10px"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchWarmHomeAggregate, type WarmPlanetBrief } from '@/api/warmHome'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const planets = ref<Array<WarmPlanetBrief & { planetId: string }>>([])
const loading = ref(false)
const loadError = ref(false)

const pickedIds = computed<string[]>(() =>
  (Array.isArray(data.planet_ids) ? data.planet_ids : []).map((x: unknown) => String(x || '')).filter(Boolean),
)

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

async function loadPlanets() {
  loading.value = true
  loadError.value = false
  try {
    const res: any = await fetchWarmHomeAggregate()
    const raw = (res?.data ?? res) || {}
    const list = Array.isArray(raw.planets) && raw.planets.length
      ? raw.planets
      : (raw.planet ? [raw.planet] : [])
    planets.value = (list as WarmPlanetBrief[])
      .filter((p): p is WarmPlanetBrief & { planetId: string } => typeof p?.planetId === 'string' && !!p.planetId)
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadPlanets)
</script>

<style scoped>
.ds-hint {
  color: #8a93a3;
  font-size: 12px;
  line-height: 1.4;
  margin: 4px 0 0;
}
.ds-unit {
  margin-left: 8px;
  color: #8a93a3;
  font-size: 12px;
}
.planet-pick {
  margin-top: 4px;
  padding: 10px;
  background: var(--wb-soft, #f8fafc);
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 8px;
}
.planet-pick__hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}
.planet-pick__count {
  font-weight: 400;
  color: #94a3b8;
}
.planet-pick__tip {
  margin: 4px 0 8px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}
.planet-pick__state {
  color: #94a3b8;
  font-size: 12px;
  padding: 6px 0;
}
.planet-pick__state--err {
  color: #e6a23c;
}
.planet-pick__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.planet-pick__row:hover {
  background: #fff;
}
.planet-pick__row.is-on {
  background: #fff;
}
.planet-pick__emoji {
  flex-shrink: 0;
}
.planet-pick__name {
  color: var(--color-ink, #172033);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
}
.planet-pick__tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: #9a3412;
  background: #fde68a;
  border-radius: 4px;
  padding: 1px 5px;
}
.planet-pick__id {
  flex: 1;
  text-align: right;
  color: #b6c0cf;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.planet-pick__foot {
  margin-top: 4px;
  text-align: right;
}
</style>
