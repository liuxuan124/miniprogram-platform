<template>
  <div class="mine-config-page">
    <PageHeader
      kicker="小程序 / 页面"
      title="我的"
      description="「我的」页使用表单配置（会员卡、订单入口、菜单等），与拖拽装修页不同。保存后真机立即读取。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/list')">返回页面列表</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="mine-layout">
      <div class="mine-form">
        <div class="section-label">模板风格</div>
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
  margin-bottom: 10px;
}
.section-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}
.mine-template-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}
.mine-tpl-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  background: #fff;
  cursor: pointer;
}
.mine-tpl-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.15);
}
.mine-tpl-preview {
  height: 56px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.mine-tpl-icon { font-size: 20px; }
.mine-tpl-name { margin-top: 6px; font-size: 12px; text-align: center; }

@media (max-width: 960px) {
  .mine-layout { grid-template-columns: 1fr; }
  .mine-preview-wrap { position: static; }
}
</style>
