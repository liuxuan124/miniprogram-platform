<template>
  <div class="ads">
    <!-- 访问权限 -->
    <div class="fld">
      <span class="fld__lab">
        访问权限
        <el-tooltip text="「需登录」未登录时跳登录页；「仅特定会员」勾选允许的身份；「密码验证」需输入 6 位密码。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <el-select
        :model-value="model.access_mode"
        style="width: 100%"
        @update:model-value="(v: string) => patch({ access_mode: v })"
      >
        <el-option
          v-for="m in ACCESS_OPTIONS"
          :key="m.value"
          :label="m.label"
          :value="m.value"
        >
          <span class="opt__name">{{ m.label }}</span>
          <span class="opt__desc">{{ m.desc }}</span>
        </el-option>
      </el-select>
    </div>

    <!-- 仅特定会员：多选身份 -->
    <div v-if="model.access_mode === 'vip'" class="fld fold-in">
      <span class="fld__lab">允许的会员身份</span>
      <el-checkbox-group
        :model-value="vipTiers"
        class="tier-list"
        @update:model-value="(v: string[]) => patch({ vip_tiers: v })"
      >
        <el-checkbox v-for="t in PAGE_VIP_TIERS" :key="t.value" :value="t.value" :label="t.value">
          {{ t.label }}
        </el-checkbox>
      </el-checkbox-group>
      <p v-if="!vipTiers.length" class="fld__warn">
        还没勾选任何身份，等于谁都能进
      </p>
    </div>

    <!-- 密码验证：6 位数字 -->
    <div v-if="model.access_mode === 'password'" class="fld fold-in">
      <span class="fld__lab">
        访问密码
        <el-tooltip text="6 位数字。未设置时等于不生效（等于公开），请确认后保存。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <div class="pwd-row">
        <el-input
          :model-value="model.access_password"
          maxlength="6"
          type="password"
          placeholder="6 位数字"
          class="pwd-input"
          @input="(v: string) => patch({ access_password: sanitizePwd(v) })"
        />
        <el-button
          v-if="model.access_password"
          text size="small"
          @click="togglePwd"
        >{{ pwdVisible ? '隐藏' : '显示' }}</el-button>
      </div>
      <p class="fld__tip">数字密码不支持字母，避免「看起来一样」的歧义（0/O、1/l）。</p>
    </div>

    <!-- 动态防录屏水印 -->
    <div class="switch-row">
      <span class="switch-row__lab">
        动态防录屏水印
        <el-tooltip text="在页面层叠加访客 ID + 手机尾号 + 时间的半透明斜向水印，用于溯源盗图与录屏传播。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <el-switch
        :model-value="watermarkOn"
        @change="(v: boolean) => patch({ watermark: v })"
      />
    </div>

    <!-- 定时发布 -->
    <div class="switch-row">
      <span class="switch-row__lab">定时发布</span>
      <el-switch
        :model-value="model.schedule.enabled"
        @change="(v: boolean) => patch({ schedule: { ...model.schedule, enabled: v } })"
      />
    </div>

    <div class="fold" :class="{ 'is-closed': !model.schedule.enabled }">
      <div class="fold__inner">
        <div class="fld">
          <span class="fld__lab">上线时间</span>
          <el-date-picker
            :model-value="model.schedule.onlineAt || ''"
            type="datetime"
            placeholder="留空 = 立即上线"
            size="small"
            style="width: 100%"
            @update:model-value="(v: number | null) => patch({ schedule: { ...model.schedule, onlineAt: v || 0 } })"
          />
        </div>

        <div class="fld">
          <span class="fld__lab">自动下线时间</span>
          <div class="sched-row">
            <el-date-picker
              :model-value="model.schedule.offlineAt || ''"
              type="datetime"
              placeholder="留空 = 永不下线"
              size="small"
              style="flex: 1 1 auto; min-width: 0"
              @update:model-value="(v: number | null) => patch({ schedule: { ...model.schedule, offlineAt: v || 0 } })"
            />
            <el-select
              :model-value="''"
              size="small"
              class="sched-preset"
              placeholder="快捷"
              @change="(v: string) => onOfflinePreset(v)"
            >
              <el-option
                v-for="o in OFFLINE_PRESETS"
                :key="o.value"
                :label="o.label"
                :value="String(o.value)"
              />
            </el-select>
          </div>
        </div>

        <div class="fld">
          <span class="fld__lab">下线后行为</span>
          <el-radio-group
            :model-value="model.schedule.fallback"
            size="small"
            @update:model-value="(v: string) => patch({ schedule: { ...model.schedule, fallback: v } })"
          >
            <el-radio-button
              v-for="f in PAGE_EXPIRE_FALLBACKS"
              :key="f.value"
              :value="f.value"
            >{{ f.label }}</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="model.schedule.fallback === 'home'" class="fld">
          <span class="fld__lab">
            自定义跳转页
            <el-tooltip text="留空 = 回小程序首页。填了则下线后跳到该页面。" placement="top" :show-after="200">
              <span class="fld__q" role="button" tabindex="0">?</span>
            </el-tooltip>
          </span>
          <PagePathField
            :model-value="model.schedule.redirectPath"
            page-type="custom"
            @update:model-value="(v: string) => patch({ schedule: { ...model.schedule, redirectPath: v } })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PagePathField from '../PagePathField.vue'
import {
  ACCESS_OPTIONS,
  OFFLINE_PRESETS,
  PAGE_EXPIRE_FALLBACKS,
  PAGE_PASSWORD_LENGTH,
  PAGE_VIP_TIERS,
} from './pageConfigSchema'
import type { PageAdvancedConfig } from './pageConfigSchema'

/**
 * 高级设置（2026-10-06 拆分自 PropsPanel）。
 * 🔴 权限是**互斥四档**而不是三个独立开关：
 * 用开关组合会出现「需登录 且 仅会员 且 需密码」这种互相矛盾的组合，
 * 端上无法判定优先级。改成 Select 单选后不存在非法状态。
 */
const props = defineProps<{ model: PageAdvancedConfig }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const pwdVisible = ref(false)

const vipTiers = computed(() => props.model.vip_tiers || [])
const watermarkOn = computed(() => props.model.watermark === true)

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}

/** 密码只收数字，且限 6 位 */
function sanitizePwd(v: string): string {
  return String(v || '').replace(/\D/g, '').slice(0, PAGE_PASSWORD_LENGTH)
}

function onOfflinePreset(minutes: string) {
  const n = Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return
  patch({ schedule: { ...props.model.schedule, offlineAt: Date.now() + n * 60000 } })
}

function togglePwd() {
  pwdVisible.value = !pwdVisible.value
}
</script>

<style scoped>
.ads { display: flex; flex-direction: column; gap: 6px; }

.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }
.fld__q {
  display: inline-grid; place-items: center; flex: none;
  width: 13px; height: 13px; color: #a8b3c4;
  font-size: 9px; font-weight: 700; line-height: 1;
  border: 1px solid #dbe2ec; border-radius: 50%; cursor: help;
}
.fld__q:hover { color: #64748b; background: #f1f5f9; border-color: #cbd5e1; }
.fld__tip { margin: 0; color: #a8b3c4; font-size: 11px; line-height: 1.4; }
.fld__warn { margin: 0; color: #e6a23c; font-size: 11px; line-height: 1.4; }

.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
.switch-row__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }

/* 条件展开：权限/密码从属上一级，左缩进 + 细线表达从属 */
.fold-in { padding-left: 8px; border-left: 1px solid #eef1f6; }

.fold { overflow: hidden; max-height: 320px; opacity: 1; transition: max-height 0.22s ease, opacity 0.18s ease; }
.fold.is-closed { max-height: 0; opacity: 0; pointer-events: none; }
.fold__inner {
  display: flex; flex-direction: column; gap: 6px;
  margin-top: 2px;
  padding-left: 8px;
  border-left: 1px solid #eef1f6;
}

/* 会员身份多选：两列 */
.tier-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 8px; }
.tier-list :deep(.el-checkbox) { margin-right: 0; }

.pwd-row { display: flex; align-items: center; gap: 6px; }
.pwd-input { flex: 1 1 auto; min-width: 0; }

.sched-row { display: flex; align-items: center; gap: 6px; }
.sched-preset { width: 100px; flex: none; }

.opt__name { font-size: 12px; }
.opt__desc { float: right; margin-left: 12px; color: #94a3b8; font-size: 11px; }
</style>