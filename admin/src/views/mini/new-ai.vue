<template>
  <div class="mini-wb mw-page ai-view">
    <div class="aic">
      <form class="card ai-form" @submit.prevent="generate">
        <h1 class="h2" style="display: flex; align-items: center; gap: 8px">
          <span style="color: var(--acc); display: inline-flex">
            <MiniIcon name="spark" :size="20" />
          </span>
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
            {{ options.length > 1 ? `用方案 ${selectedOpt + 1} 继续装修` : '进入装修器继续调整' }}
          </button>
        </div>
      </form>

      <div class="ai-out">
        <div v-if="running" class="gen-empty">
          <b>正在生成…</b>
          <span class="muted">读取内容库与优惠券，套用品牌配色</span>
        </div>
        <template v-else-if="options.length">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">
                {{ options.length > 1 ? `已生成 ${options.length} 套方案` : '已生成 1 版草稿' }}
              </h2>
              <div class="sub">
                {{ options.length > 1
                  ? '选中后进入装修器继续调整；生成结果保存为草稿，不会直接上线'
                  : '本次只生成了 1 版，进入装修器即可继续调整；草稿不会直接上线' }}
              </div>
            </div>
          </div>
          <div class="opts" :class="{ 'opts--single': options.length === 1 }">
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
                <b>
                  <template v-if="options.length > 1">方案 {{ i + 1 }} · </template>{{ opt.name }}
                </b>
                <div class="faint">{{ opt.desc }}</div>
                <span v-if="selectedOpt === i && options.length > 1" class="tag t-acc">已选</span>
              </div>
            </button>
          </div>
          <div v-if="degraded" class="note" style="margin-top: 14px">
            AI 多方案服务本次不可用，已按你的描述建好一版草稿。想看别的结构，可改一下描述再点「重新生成」。
          </div>
        </template>
        <div v-else class="gen-empty">
          <b>描述好需求后点「生成方案」</b>
          <span class="muted">生成结果是可编辑的真实组件，先存为草稿，确认后再发布</span>
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
import MiniIcon from '@/components/mini/MiniIcon.vue'

defineOptions({ name: 'MiniNewAi' })

const purposes = ['活动页', '商品页', '内容页', '落地页', '首页改版'] as const

const router = useRouter()
const running = ref(false)
const purpose = ref<(typeof purposes)[number]>('活动页')
const followBrand = ref(true)
const siteName = ref('暖阁')
const selectedOpt = ref<number | null>(null)
/** 本次结果是否为降级（AI 未真正参与），用于在界面上说清楚 */
const degraded = ref(false)
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
  degraded.value = false
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
      // 只回单份草稿时就诚实显示 1 版：不要用同一个 pageId 伪造 3 张不同的方案卡
      if (pageId) {
        options.value = [{
          name: draft?.name || `${purpose.value}草稿`,
          desc: draft?.summary || 'AI 已按描述生成，可在装修器继续调整',
          pageId,
        }]
        selectedOpt.value = 0
        return
      }
    } catch {
      /* fallback below */
    }
    // AI 链路不可用：建一版空白草稿，并明确告知这是降级结果
    const id = await createBlankPage(`${purpose.value}草稿`)
    degraded.value = true
    options.value = [{
      name: `${purpose.value}草稿`,
      desc: '空白草稿 · AI 未参与生成，需要自己搭或换描述重试',
      pageId: id,
    }]
    selectedOpt.value = 0
    ElMessage.warning('AI 生成不可用，已创建空白草稿')
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
.opts--single {
  grid-template-columns: minmax(0, 320px);
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
