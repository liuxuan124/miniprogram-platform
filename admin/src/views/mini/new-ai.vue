<template>
  <div class="mini-page">
    <header class="page-head">
      <div>
        <div class="page-head__kicker">小程序 · AI 建页</div>
        <h1>AI 生成一页</h1>
        <p>描述想要的页面，优先走 AI 流水线；失败则创建空白草稿并提示。</p>
      </div>
      <el-button @click="router.push('/mini/pages')">返回页面</el-button>
    </header>

    <section class="panel">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="页面名称">
          <el-input v-model="form.name" maxlength="64" show-word-limit placeholder="例如：春季活动页" />
        </el-form-item>
        <el-form-item label="一句话描述">
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="例如：顶部大图轮播 + 三个活动入口 + 商品推荐列表"
          />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" class="btn-terracotta" :loading="running" @click="generate">生成草稿</el-button>
          <el-button :disabled="running" @click="createBlank">跳过 AI，空白创建</el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPage, runAiPagePipeline } from '@/api/page'

defineOptions({ name: 'MiniNewAi' })

const router = useRouter()
const running = ref(false)
const form = reactive({
  name: '',
  prompt: '',
})

async function createBlankPage(nameHint?: string) {
  const suffix = Date.now().toString(36).slice(-5)
  const name = (nameHint || form.name || 'AI 草稿').trim() || `未命名-${suffix}`
  const res = await createPage({
    name,
    type: 3,
    path: `pages/custom/ai-${suffix}`,
  })
  const id = Number((res as any)?.data?.id || 0)
  if (!id) throw new Error('未返回页面 id')
  return id
}

async function generate() {
  if (!form.prompt.trim() && !form.name.trim()) {
    ElMessage.warning('请填写名称或描述')
    return
  }
  running.value = true
  try {
    const prompt = form.prompt.trim() || `创建一个名为「${form.name}」的运营页面`
    try {
      const res = await runAiPagePipeline(prompt)
      const draft = (res as any)?.data?.draft || (res as any)?.draft
      const pageId = Number(draft?.pageId || 0)
      if (pageId) {
        ElMessage.success('AI 已生成草稿')
        router.push(`/mini/pages/${pageId}/editor`)
        return
      }
      ElMessage.warning('AI 未返回草稿，已改为空白页')
    } catch {
      ElMessage.warning('AI 流水线不可用，已创建空白页')
    }
    const id = await createBlankPage(form.name)
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    running.value = false
  }
}

async function createBlank() {
  running.value = true
  try {
    const id = await createBlankPage()
    ElMessage.success('已创建空白页')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    running.value = false
  }
}
</script>

<style scoped lang="scss">
.mini-page {
  --mini-bg: #f6f2ec;
  --mini-terracotta: #b4430f;
  --mini-ink: #2c241c;
  --mini-muted: #7a6e64;
  --mini-card: #fffcf8;
  --mini-border: #e5ddd2;
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mini-bg);
  color: var(--mini-ink);
  max-width: 720px;
}
.page-head {
  margin-bottom: 16px;
  h1 { margin: 4px 0; font-size: 24px; }
  p { margin: 0; color: var(--mini-muted); font-size: 13px; }
}
.page-head__kicker { font-size: 12px; color: var(--mini-muted); }
.panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 18px 20px;
}
.actions { display: flex; gap: 8px; margin-top: 8px; }
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
}
</style>
