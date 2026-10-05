<template>
  <div class="mine-config-page">
    <PageHeader
      title="固定页 · 我的"
      description="路径锁定为 /pages/mine/mine，属于固定页（非列表里的自定义装修页）。先从模板库挑一套成型方案，再微调皮肤、会员卡与菜单；保存并上线后真机立即读取。"
    >
      <template #actions>
        <el-button @click="router.push('/mini/pages')">返回页面列表</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="mine-layout">
      <div class="mine-form">
        <div class="section-head">
          <div class="section-label">我的页模板</div>
          <span class="section-badge">当前：{{ currentTemplateName }}</span>
        </div>
        <p class="section-hint">每张卡片都是这套模板的真实效果缩略图，点开可看大图对比；选定后写入下方配置，仍可继续微调。</p>
        <div class="tpl-grid">
          <button
            v-for="tpl in MINE_TEMPLATES"
            :key="tpl.key"
            type="button"
            class="tpl-card"
            :class="{ selected: currentTemplate === tpl.key }"
            @click="openPreview(tpl.key)"
          >
            <div class="tpl-thumb">
              <div class="tpl-thumb__inner">
                <MinePagePreview :mine-config="templateConfig(tpl.key)" :theme="form.theme" />
              </div>
              <span v-if="currentTemplate === tpl.key" class="tpl-thumb__flag">使用中</span>
            </div>
            <div class="tpl-body">
              <div class="tpl-body__name">{{ tpl.name }}</div>
              <div class="tpl-body__desc">{{ tpl.desc }}</div>
              <div class="tpl-body__scene">{{ tpl.menuKeys.length }} 项菜单 · {{ tpl.scene }}</div>
            </div>
          </button>
        </div>

        <div class="section-divider"></div>

        <div class="section-label">外观皮肤</div>
        <p class="section-hint">同一套菜单组合下可换配色；点右上写作 icon 可微调主辅色。</p>
        <div class="mine-template-picker">
          <button
            v-for="tpl in personalCenterTemplates"
            :key="tpl.key"
            type="button"
            class="mine-tpl-card"
            :class="{ selected: selectedMineTemplate === tpl.key }"
            @click="selectMineTemplate(tpl.key)"
          >
            <div class="mine-tpl-preview" :style="{ background: tpl.gradient, border: tpl.border }">
              <div class="mine-tpl-icon">{{ tpl.icon }}</div>
            </div>
            <div class="mine-tpl-name">{{ tpl.name }}</div>
            <div class="mine-tpl-desc">{{ tpl.desc }}</div>
          </button>
        </div>

        <div class="section-divider"></div>
        <MinePageConfig v-model="form.mineConfig" />
      </div>
      <div class="mine-preview-wrap">
        <MinePagePreview :mine-config="form.mineConfig" :theme="form.theme" />
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      width="780px"
      top="4vh"
      destroy-on-close
      :title="`模板预览 · ${previewTpl?.name || ''}`"
    >
      <div class="pv">
        <div class="pv__phone">
          <MinePagePreview :mine-config="previewConfig" :theme="form.theme" />
        </div>
        <div class="pv__side">
          <div class="pv__name">{{ previewTpl?.name }}</div>
          <div class="pv__scene">{{ previewTpl?.scene }}</div>
          <p class="pv__desc">{{ previewTpl?.desc }}。套用后可继续改菜单顺序、增删条目与换肤。</p>

          <div class="pv__label">包含的菜单（{{ previewMenuTitles.length }}）</div>
          <div class="pv__tags">
            <span v-for="t in previewMenuTitles" :key="t" class="pv__tag">{{ t }}</span>
          </div>

          <div class="pv__label">右侧信息</div>
          <div class="pv__kv">
            <span>会员卡</span><b>{{ previewTpl?.showMemberCard ? '显示' : '隐藏' }}</b>
            <span>订单入口</span><b>{{ previewTpl?.showOrderTabs ? '显示' : '隐藏' }}</b>
            <span>装饰背景</span><b>{{ previewTpl?.showDecorBackground ? '显示' : '隐藏' }}</b>
            <span>菜单图标</span><b>{{ previewTpl?.showMenuIcons ? '显示' : '隐藏' }}</b>
          </div>

          <p class="pv__warn">套用会覆盖当前的菜单组合、文案与开关，皮肤等外观设置会保留。</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="applyPreviewTemplate">使用这套模板</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import {
  MINE_TEMPLATES,
  buildTemplateConfig,
  getMineTemplate,
  resolveTemplateKey,
} from '@/components/miniapp-builder/mineTemplates'
import type { MinePageConfig as MinePageConfigType } from '@/types/miniapp'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import { MINE_STYLE_TEMPLATES, applyMineStylePreset, resolveMineStyleKey } from '@/types/miniapp'

const router = useRouter()
const { form, loading, saving, loadConfig, handleSave } = useMiniappConfig()
const personalCenterTemplates = MINE_STYLE_TEMPLATES

const selectedMineTemplate = computed(() => resolveMineStyleKey(form.mineConfig as Record<string, unknown>))

const currentTemplate = computed(() => resolveTemplateKey(form.mineConfig))
const currentTemplateName = computed(() => {
  const tpl = getMineTemplate(currentTemplate.value)
  return tpl ? tpl.name : '自定义组合'
})

/** 模板配置缓存：同一份对象反复渲染会拖慢 6 张缩略图 */
const templateCache = new Map<string, MinePageConfigType>()
function templateConfig(key: string): MinePageConfigType {
  const cached = templateCache.get(key)
  if (cached) return cached
  const built = buildTemplateConfig(key)
  templateCache.set(key, built)
  return built
}

const previewVisible = ref(false)
const previewKey = ref('')
const previewTpl = computed(() => getMineTemplate(previewKey.value))
const previewConfig = computed<MinePageConfigType>(() =>
  previewKey.value ? templateConfig(previewKey.value) : form.mineConfig)
const previewMenuTitles = computed(() => previewConfig.value.menuItems.map((m) => m.title))

function openPreview(key: string) {
  previewKey.value = key
  previewVisible.value = true
}

function applyPreviewTemplate() {
  const key = previewKey.value
  const tpl = getMineTemplate(key)
  if (!tpl) return
  const next = buildTemplateConfig(key)
  // 沿用当前皮肤配色，避免套模板把用户选过的主色冲掉
  const currentStyle = resolveMineStyleKey(form.mineConfig as Record<string, unknown>)
  form.mineConfig = next
  applyMineStylePreset(form.mineConfig as Record<string, unknown>, currentStyle)
  previewVisible.value = false
  ElMessage.success(`已套用「${tpl.name}」模板，记得保存`)
}

function selectMineTemplate(key: string) {
  applyMineStylePreset(form.mineConfig as Record<string, unknown>, key)
}

async function onSave() {
  await handleSave()
}

onMounted(async () => {
  await loadConfig()
})
</script>

<style scoped lang="scss">
.mine-config-page { padding-bottom: 24px; }
.mine-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;
}
.mine-form {
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.mine-preview-wrap {
  position: sticky;
  top: 16px;
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.section-badge {
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(23, 105, 255, 0.08);
  border-radius: 999px;
  padding: 2px 10px;
}
.section-label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}
.section-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
}
.section-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.tpl-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.tpl-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}
.tpl-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.15);
}
.tpl-thumb {
  position: relative;
  width: 128px;
  height: 246px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #f4f6fa;
  pointer-events: none;
}
.tpl-thumb__inner {
  width: 375px;
  transform: scale(0.3413);
  transform-origin: top left;
}
.tpl-thumb__flag {
  position: absolute;
  right: 4px;
  top: 4px;
  font-size: 11px;
  color: #fff;
  background: var(--color-primary);
  border-radius: 999px;
  padding: 1px 8px;
}
.tpl-body {
  padding-top: 8px;
}
.tpl-body__name {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.tpl-body__desc {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
.tpl-body__scene {
  margin-top: 2px;
  font-size: 11px;
  color: #9aa3b2;
  text-align: center;
  line-height: 1.35;
}

.pv {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}
.pv__phone {
  width: 340px;
  height: 620px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
}
.pv__phone > :deep(div) {
  width: 375px;
  transform: scale(0.9067);
  transform-origin: top left;
}
.pv__name { font-size: 16px; font-weight: 700; }
.pv__scene { margin-top: 4px; font-size: 12px; color: var(--color-primary); }
.pv__desc { margin: 10px 0 0; font-size: 13px; color: #4a5568; line-height: 1.7; }
.pv__label { margin-top: 16px; font-size: 12px; font-weight: 700; color: #4a5568; }
.pv__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pv__tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f2f5fa;
  color: #4a5568;
}
.pv__kv {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 6px 10px;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.pv__kv b { color: #172033; font-weight: 500; }
.pv__warn {
  margin: 16px 0 0;
  padding: 8px 10px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .mine-layout { grid-template-columns: 1fr; }
  .mine-preview-wrap { position: static; }
  .pv { grid-template-columns: 1fr; }
  .pv__phone { width: 100%; height: 560px; }
}
</style>
