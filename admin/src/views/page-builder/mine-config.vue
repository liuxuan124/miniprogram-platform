<template>
  <div class="mine-config-page builder-studio">
    <StudioHeader
      section="个人中心"
      title="个人中心设计"
      description="选择个人中心样式，再配置资料、订单和功能入口。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/list')">返回页面列表</el-button>
        <span class="studio-save-state" :class="{ 'is-dirty': isDirty && configReady }" role="status">{{ loading ? '正在读取配置' : (!configReady ? '配置未读取' : (isDirty ? '有未保存的修改' : '配置已保存')) }}</span>
        <el-button type="primary" :loading="saving" :disabled="!configReady || loading || !isDirty" @click="onSave">保存并生效</el-button>
      </template>
    </StudioHeader>

    <div v-if="configError" class="studio-feedback is-error" role="alert"><span>{{ configError }}</span><el-button size="small" @click="loadConfig">重新加载</el-button></div>
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
        <div class="mine-preview-label">实时预览<span>保存后生效</span></div>
        <MinePagePreview v-if="configReady" :mine-config="form.mineConfig" :theme="form.theme" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import StudioHeader from '@/components/builder-studio/StudioHeader.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import { MINE_STYLE_TEMPLATES, applyMineStylePreset, resolveMineStyleKey } from '@/types/miniapp'

const router = useRouter()
const { form, loading, saving, loadConfig, handleSave, isDirty, configReady, configError } = useMiniappConfig()
const personalCenterTemplates = MINE_STYLE_TEMPLATES

const selectedMineTemplate = computed(() => resolveMineStyleKey(form.mineConfig as Record<string, unknown>))

function selectMineTemplate(key: string) {
  applyMineStylePreset(form.mineConfig as Record<string, unknown>, key)
}

async function onSave() {
  await handleSave()
}

onBeforeRouteLeave(async () => {
  if (!configReady.value || !isDirty.value) return true
  try {
    await ElMessageBox.confirm('有未保存的个人中心修改，离开后将不会生效。', '保留你的修改', { confirmButtonText: '放弃修改并离开', cancelButtonText: '继续设计', type: 'warning' })
    return true
  } catch { return false }
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

.mine-layout { grid-template-columns: minmax(0, 1fr) 386px; gap: 24px; }
.mine-form { padding: 24px; border-color: var(--studio-line); border-radius: 12px; }
.mine-preview-wrap { padding: 16px; border: 1px solid var(--studio-line); border-radius: 12px; background: var(--studio-canvas); overflow: hidden; }
.mine-preview-label { display: flex; align-items: center; justify-content: space-between; font-size: .875rem; font-weight: 600; margin-bottom: 20px; }
.mine-preview-label span { font-size: .75rem; color: var(--studio-muted); font-weight: 400; }
.mine-form .section-label { font-size: 1rem; font-weight: 600; }
.mine-form .section-hint { font-size: .8125rem; margin-top: 8px; }
.mine-tpl-name { font-size: .875rem; }
.mine-tpl-desc { font-size: .75rem; }
.mine-form :deep(.el-form-item__label) { font-size: .8125rem; }
.mine-form :deep(.el-col) { min-width: 145px; flex-grow: 1; }
@media (max-width: 1100px) { .mine-layout { grid-template-columns: 1fr; } .mine-preview-wrap { position: static; display: flex; flex-direction: column; align-items: center; } .mine-preview-label { width: 100%; } }
</style>
