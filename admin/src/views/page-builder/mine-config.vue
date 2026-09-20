<template>
  <div class="mine-config-page">
    <PageHeader
      title="固定页 · 我的"
      description="路径锁定为 /pages/mine/mine，属于固定页（非列表里的自定义装修页）。先选模板外观，再配置会员卡、订单入口、菜单；保存后真机立即读取。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/list')">返回页面列表</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="mine-layout">
      <div class="mine-form">
        <div class="section-label">模板风格</div>
        <p class="section-hint">点选一套「我的」页外观，右侧实时预览；保存后真机同步。</p>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import { MINE_STYLE_TEMPLATES, applyMineStylePreset, resolveMineStyleKey } from '@/types/miniapp'

const router = useRouter()
const { form, loading, saving, loadConfig, handleSave } = useMiniappConfig()
const personalCenterTemplates = MINE_STYLE_TEMPLATES

const selectedMineTemplate = computed(() => resolveMineStyleKey(form.mineConfig as Record<string, unknown>))

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
.mine-template-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.mine-tpl-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.mine-tpl-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.15);
}
.mine-tpl-preview {
  height: 64px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.mine-tpl-icon { font-size: 22px; }
.mine-tpl-name { margin-top: 8px; font-size: 13px; font-weight: 700; text-align: center; }
.mine-tpl-desc { margin-top: 2px; font-size: 11px; color: #8b93a7; text-align: center; line-height: 1.35; }

@media (max-width: 960px) {
  .mine-layout { grid-template-columns: 1fr; }
  .mine-preview-wrap { position: static; }
}
</style>
