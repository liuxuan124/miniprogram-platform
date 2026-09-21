<template>
  <div class="mini-wb mw-page ai-view">
    <div class="aic">
      <form class="card ai-form" @submit.prevent="generate">
        <h1 class="h2" style="display: flex; align-items: center; gap: 8px">
          <span style="color: var(--acc)">✦</span>
          AI 生成页面
        </h1>

        <div class="field">
          <label>页面用途</label>
          <div class="purpose-row">
            <button
              v-for="p in purposes"
              :key="p"
              type="button"
              class="chip"
              :class="{ on: purpose === p }"
              @click="purpose = p"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div class="field">
          <label for="aidesc">描述你想要的页面</label>
          <textarea
            id="aidesc"
            v-model="form.prompt"
            class="input"
            rows="5"
            maxlength="300"
            placeholder="例如：中秋活动页，顶部倒计时，中间书单推荐，底部报名按钮"
          />
          <span class="faint">{{ form.prompt.length }} / 300</span>
        </div>

        <div class="field">
          <label>使用我的素材</label>
          <div class="mat">
            <span>内容库 · 可选绑定</span>
            <span class="faint">生成时自动读取</span>
          </div>
          <div class="mat">
            <span>优惠券 · 可选绑定</span>
            <span class="faint">生成时自动读取</span>
          </div>
        </div>

        <label class="brand-row">
          <input v-model="followBrand" type="checkbox" />
          <span>跟随品牌配色（{{ siteName }}）</span>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn primary" :disabled="running">
            {{ options.length ? '重新生成' : '生成方案' }}
          </button>
          <button
            v-if="selectedOpt != null"
            type="button"
            class="btn soft"
            :disabled="running"
            @click="useSelected"
          >
            用方案 {{ selectedOpt + 1 }} 继续装修
          </button>
        </div>
      </form>

      <div class="ai-out">
        <div v-if="running" class="gen-empty">
          <b>正在生成 3 套方案…</b>
          <span class="muted">读取内容库与优惠券，套用品牌配色</span>
        </div>
        <template v-else-if="options.length">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">已生成 3 套方案</h2>
              <div class="sub">选中后进入装修器继续调整；生成结果保存为草稿，不会直接上线</div>
            </div>
          </div>
          <div class="opts">
            <button
              v-for="(opt, i) in options"
              :key="i"
              type="button"
              class="opt"
              :class="{ on: selectedOpt === i }"
              @click="selectedOpt = i"
            >
              <div class="phone sm">
                <div class="opt-ph">
                  <div class="opt-bar" /><div class="opt-bar" /><div class="opt-bar short" />
                </div>
              </div>
              <div>
                <b>方案 {{ i + 1 }} · {{ opt.name }}</b>
                <div class="faint">{{ opt.desc }}</div>
                <span v-if="selectedOpt === i" class="tag t-acc">已选</span>
              </div>
            </button>
          </div>
        </template>
        <div v-else class="gen-empty">
          <b>描述好需求后点「生成方案」</b>
          <span class="muted">会同时给出 3 套结构不同的方案，全部由可编辑的真实组件组成</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPage, runAiPagePipeline } from '@/api/page'
import { getMiniSite } from '@/api/miniSite'

defineOptions({ name: 'MiniNewAi' })

const purposes = ['活动页', '商品页', '内容页', '落地页', '首页改版'] as const

const router = useRouter()
const running = ref(false)
const purpose = ref<(typeof purposes)[number]>('活动页')
const followBrand = ref(true)
const siteName = ref('暖阁')
const selectedOpt = ref<number | null>(null)
const options = ref<Array<{ name: string; desc: string; pageId?: number }>>([])
const form = reactive({ prompt: '' })

async function createBlankPage(nameHint?: string) {
  const suffix = Date.now().toString(36).slice(-5)
  const name = (nameHint || `${purpose.value}-${suffix}`).trim() || `未命名-${suffix}`
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
  if (!form.prompt.trim()) {
    ElMessage.warning('请先描述你想要的页面')
    return
  }
  running.value = true
  selectedOpt.value = null
  options.value = []
  try {
    const prompt = [
      `【用途】${purpose.value}`,
      followBrand.value ? '【配色】跟随品牌主色' : '【配色】自由发挥',
      form.prompt.trim(),
    ].join('\n')
    try {
      const res = await runAiPagePipeline(prompt)
      const draft = (res as any)?.data?.draft || (res as any)?.draft
      const pageId = Number(draft?.pageId || 0)
      const variants = (res as any)?.data?.variants || (res as any)?.variants
      if (Array.isArray(variants) && variants.length) {
        options.value = variants.slice(0, 3).map((v: any, i: number) => ({
          name: v.name || ['简洁转化', '内容沉淀', '活动会场'][i],
          desc: v.summary || v.desc || '可进入装修器继续调整',
          pageId: Number(v.pageId || pageId || 0) || undefined,
        }))
        selectedOpt.value = 0
        return
      }
      if (pageId) {
        options.value = [
          { name: '简洁转化', desc: '首屏 CTA 更突出', pageId },
          { name: '内容沉淀', desc: '书单与图文更完整', pageId },
          { name: '活动会场', desc: '倒计时与报名更强', pageId },
        ]
        selectedOpt.value = 0
        return
      }
    } catch {
      /* fallback below */
    }
    // API 无多方案时：生成 3 个空白草稿方案卡片（仅第一个真正建页）
    const id = await createBlankPage(`${purpose.value}方案`)
    options.value = [
      { name: '简洁转化', desc: '首屏 CTA 更突出 · 已建草稿', pageId: id },
      { name: '内容沉淀', desc: '书单与图文更完整 · 选中后基于同稿装修', pageId: id },
      { name: '活动会场', desc: '倒计时与报名更强 · 选中后基于同稿装修', pageId: id },
    ]
    selectedOpt.value = 0
    ElMessage.success('已生成方案（可进入装修）')
  } catch (e: any) {
    ElMessage.error(e?.message || '生成失败')
  } finally {
    running.value = false
  }
}

async function useSelected() {
  if (selectedOpt.value == null) return
  const opt = options.value[selectedOpt.value]
  if (opt?.pageId) {
    router.push(`/mini/pages/${opt.pageId}/editor`)
    return
  }
  running.value = true
  try {
    const id = await createBlankPage(opt?.name)
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    running.value = false
  }
}

onMounted(async () => {
  try {
    const s = await getMiniSite('draft')
    if (s.name) siteName.value = s.name
  } catch { /* ignore */ }
})
</script>

<style scoped lang="scss">
.ai-view.mw-page {
  margin: -16px;
}
.ai-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.purpose-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12.5px;
  gap: 8px;
  margin-bottom: 6px;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.form-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ai-out {
  min-width: 0;
}
.opt-ph {
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}
.opt-bar {
  height: 28px;
  border-radius: 6px;
  background: #efe6da;
  &.short { width: 60%; }
}
.phone.sm {
  width: 120px;
  height: 200px;
  border-width: 6px;
  border-radius: 20px;
}
</style>
