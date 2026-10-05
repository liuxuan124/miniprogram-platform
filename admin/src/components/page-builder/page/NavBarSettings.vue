<template>
  <div class="nbs">
    <!-- 导航模式：2×2 网格卡片（每张带极简示意图，直观表达滚动行为） -->
    <div class="fld">
      <span class="fld__lab">
        导航模式
        <el-tooltip :content="modeHint" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <div class="mode-grid" role="radiogroup" aria-label="导航模式">
        <button
          v-for="m in PAGE_NAV_MODES"
          :key="m.value"
          type="button"
          class="mode-card"
          role="radio"
          :aria-checked="model.mode === m.value"
          :class="{ 'is-on': model.mode === m.value }"
          :title="m.desc"
          @click="patch({ mode: m.value })"
        >
          <span class="mode-card__art" :class="`is-${m.value}`">
            <span class="mode-card__bar"></span>
            <span class="mode-card__body"></span>
            <span class="mode-card__badge"></span>
          </span>
          <span class="mode-card__label">{{ m.label }}</span>
          <el-icon v-if="model.mode === m.value" class="mode-card__check"><Select /></el-icon>
        </button>
      </div>
    </div>

    <div class="switch-row">
      <span class="switch-row__lab">同步页面名称</span>
      <el-switch :model-value="model.sync_title" @change="(v: boolean) => patch({ sync_title: v })" />
    </div>

    <!-- 折叠展开：关闭「同步页面名」后才需要独立标题 -->
    <div class="fold" :class="{ 'is-closed': model.sync_title }">
      <div class="fold__inner">
        <div class="fld">
          <span class="fld__lab">
            自定义标题
            <el-tooltip text="留空则使用页面名称。超过 20 字真机会截断。" placement="top" :show-after="200">
              <span class="fld__q" role="button" tabindex="0">?</span>
            </el-tooltip>
          </span>
          <div class="row-gap">
            <el-input
              :model-value="model.title"
              maxlength="20"
              show-word-limit
              placeholder="留空则用页面名称"
              :disabled="model.mode === 'hidden'"
              @input="(v: string) => patch({ title: v })"
            />
            <el-button
              size="small"
              :disabled="!pageName || model.mode === 'hidden'"
              title="把页面名称填进来"
              @click="patch({ title: pageName })"
            >带入页面名</el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="model.mode !== 'hidden'" class="fld">
      <span class="fld__lab">
        导航栏背景
        <el-tooltip text="留空则跟随页面背景主色。支持透明（Alpha）。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <ColorInputRow
        :model-value="model.bg_color"
        aria-label="导航栏背景色"
        @update:model-value="(v: string | null) => patch({ bg_color: v || '' })"
      />
    </div>

    <div v-if="model.mode === 'gradient'" class="fld">
      <span class="fld__lab">渐变终点色</span>
      <ColorInputRow
        :model-value="model.gradient_to || model.bg_color"
        aria-label="导航栏渐变终点色"
        @update:model-value="(v: string | null) => patch({ gradient_to: v || '' })"
      />
    </div>

    <div class="fld">
      <span class="fld__lab">
        状态栏文字
        <el-tooltip text="深色适合浅底，浅色适合深底。沉浸式与渐变模式下务必按背景深浅选，否则状态栏时间会看不清。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <el-radio-group
        :model-value="model.status_text_tone"
        size="small"
        @update:model-value="(v: 'dark' | 'light') => patch({ status_text_tone: v })"
      >
        <el-radio-button value="dark">深色</el-radio-button>
        <el-radio-button value="light">浅色</el-radio-button>
      </el-radio-group>
    </div>

    <!--
      明度冲突告警：只在「能算出顶栏底色明度」时出现。
      🔴 拿不到颜色就报警 = 运营学会忽略告警，真告警时反而不看。
    -->
    <div v-if="risk" class="alert-row" role="alert">
      <el-icon class="alert-row__ic"><WarningFilled /></el-icon>
      <span class="alert-row__txt">{{ riskText }}</span>
      <button type="button" class="alert-row__fix" @click="applyFix">
        一键改为{{ risk === 'dark-on-dark' ? '浅色' : '深色' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Select, WarningFilled } from '@element-plus/icons-vue'
import ColorInputRow from '@/components/ColorInputRow.vue'
import {
  PAGE_NAV_MODES,
  statusBarContrastRisk,
  type PageNavConfig,
  type PageStatusBarTextTone,
} from './pageConfigSchema'

/**
 * 顶部导航栏设置（2026-10-06 拆分自 PropsPanel）。
 * 🔴 明度检测用 WCAG 相对亮度（0.2126/0.7152/0.0722），
 * 与端上 `getNavigationFrontColor` 的 0.299/0.587/0.114 **刻意不同** ——
 * 那是真机导航色的判定，这里是给运营看的可读性预警，职责不同不要混用。
 */
const props = defineProps<{
  model: PageNavConfig
  pageName?: string
}>()

const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

/** ⚠️ 嵌套对象必须整对象回写（store 是浅合并），由父级负责合并后 emit */
function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}

const modeHint = computed(() => PAGE_NAV_MODES.find((m) => m.value === props.model.mode)?.desc || '')

const risk = computed(() =>
  statusBarContrastRisk(props.model.bg_color, props.model.status_text_tone),
)

const riskText = computed(() =>
  risk.value === 'dark-on-dark'
    ? '当前顶栏底色较深，深色文字会导致状态栏时间难以看清'
    : '当前顶栏底色较浅，浅色文字会导致状态栏时间难以看清',
)

function applyFix() {
  const tone: PageStatusBarTextTone = risk.value === 'dark-on-dark' ? 'light' : 'dark'
  patch({ status_text_tone: tone })
}
</script>

<style scoped>
.nbs { display: flex; flex-direction: column; gap: 6px; }

.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }
.fld__q {
  display: inline-grid; place-items: center; flex: none;
  width: 13px; height: 13px; color: #a8b3c4;
  font-size: 9px; font-weight: 700; line-height: 1;
  border: 1px solid #dbe2ec; border-radius: 50%; cursor: help;
}
.fld__q:hover { color: #64748b; background: #f1f5f9; border-color: #cbd5e1; }

.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
.switch-row__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }

.row-gap { display: flex; align-items: center; gap: 6px; }
.row-gap :deep(.el-input) { flex: 1 1 auto; min-width: 0; }

/* 折叠展开：max-height 过渡而非 v-if，保留内部实例 */
.fold { overflow: hidden; max-height: 90px; opacity: 1; transition: max-height 0.22s ease, opacity 0.18s ease; }
.fold.is-closed { max-height: 0; opacity: 0; pointer-events: none; }
.fold__inner { padding-left: 8px; border-left: 1px solid #eef1f6; }

/* 导航模式 2×2 卡片 */
.mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }

.mode-card {
  position: relative;
  display: flex; flex-direction: column; gap: 3px;
  padding: 6px 6px 5px;
  font-family: inherit; text-align: left;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mode-card:hover { border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #e3e8f0); }
.mode-card.is-on {
  border-color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 6%, #fff);
}

.mode-card__label {
  color: #64748b;
  font-size: 11px;
  line-height: 1.3;
}
.mode-card.is-on .mode-card__label { color: #475569; font-weight: 500; }

.mode-card__check {
  position: absolute;
  right: 4px; bottom: 4px;
  color: var(--el-color-primary, #c08e6e);
  font-size: 12px;
}

/* 极简示意图：顶栏条 + 内容块 + 角标，用纯 div 画 */
.mode-card__art {
  position: relative;
  display: block;
  height: 26px;
  overflow: hidden;
  background: #f4f6f9;
  border-radius: 4px;
}
.mode-card__bar { position: absolute; left: 0; top: 0; right: 0; height: 7px; background: #cbd5e1; }
.mode-card__body { position: absolute; left: 5px; right: 5px; top: 11px; height: 4px; background: #e2e8f0; border-radius: 2px; box-shadow: 0 6px 0 #e2e8f0; }
.mode-card__badge { position: absolute; left: 5px; top: 3px; width: 8px; height: 2px; background: #94a3b8; border-radius: 1px; }

/* 沉浸式：顶栏透明，内容穿透上来 */
.mode-card__art.is-immersive .mode-card__bar { background: transparent; }
.mode-card__art.is-immersive .mode-card__body { top: 2px; }
/* 渐显：顶栏半透明 */
.mode-card__art.is-gradient .mode-card__bar { background: rgba(203, 213, 225, 0.45); }
/* 隐藏：整条顶栏不见了，只留状态栏一点 */
.mode-card__art.is-hidden .mode-card__bar { height: 3px; background: #e2e8f0; }
.mode-card__art.is-hidden .mode-card__body { top: 6px; }

/* 明度冲突告警 */
.alert-row {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 7px;
  color: #8a6d3b;
  background: var(--el-color-warning-light-9, #fdf6ec);
  border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.4;
}
.alert-row__ic { flex: none; color: #f59e0b; font-size: 13px; }
.alert-row__txt { flex: 1 1 auto; min-width: 0; }
.alert-row__fix {
  flex: none;
  padding: 2px 6px;
  color: #8a6d3b;
  font-family: inherit;
  font-size: 11px;
  background: #fff;
  border: 1px solid #f0c98a;
  border-radius: 4px;
  cursor: pointer;
}
.alert-row__fix:hover { color: #b45309; border-color: #f59e0b; }
</style>