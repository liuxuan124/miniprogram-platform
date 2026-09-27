<template>
  <div class="golden-parity" data-parity-root="1">
    <header v-if="!isEmbed" class="golden-parity__bar">
      <strong>黄金 DSL 渲染比对</strong>
      <el-tag size="small" type="info">结构要素 · 非像素</el-tag>
    </header>
    <div v-loading="loading" class="golden-parity__body">
      <PreviewPhone :page-title="pageTitle" :page-bg-color="pageBgColor" hide-back>
        <div
          v-for="(comp, index) in flowComponents"
          :key="comp.id"
          class="parity-block"
          :data-parity-type="comp.type"
          :data-parity-id="comp.id"
        >
          <ComponentItem
            :component="comp"
            :index="index"
            :selected="false"
            :preview-mode="true"
          />
        </div>
        <div v-if="!loading && !flowComponents.length" class="golden-parity__empty">黄金 DSL 为空</div>
        <template #fab>
          <div
            v-for="(comp, index) in floatComponents"
            :key="comp.id"
            class="parity-block parity-block--fab"
            data-parity-type="float_button"
            :data-parity-id="comp.id"
          >
            <ComponentItem
              :component="comp"
              :index="index"
              :selected="false"
              :fab-only="true"
              :preview-mode="true"
            />
          </div>
        </template>
      </PreviewPhone>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { ComponentType } from '@/types/page'

const route = useRoute()
const loading = ref(true)
const components = ref<ComponentInstance[]>([])
const pageTitle = ref('渲染比对黄金页')
const pageBgColor = ref('#f5f6f9')

const isEmbed = computed(() => String(route.query.embed || '') === '1')

const flowComponents = computed(() =>
  components.value.filter((c) => c.type !== ComponentType.FloatButton),
)
const floatComponents = computed(() =>
  components.value.filter((c) => c.type === ComponentType.FloatButton),
)

async function loadGolden() {
  loading.value = true
  try {
    const res = await fetch('/golden-dsl.json', { cache: 'no-store' })
    if (!res.ok) throw new Error(`golden-dsl.json ${res.status}`)
    const dsl = (await res.json()) as PageDSL
    pageTitle.value = dsl.page?.name || pageTitle.value
    pageBgColor.value = dsl.page?.background_color || pageBgColor.value
    // 黄金 DSL 已内联静态 props，跳过灌数以免 Playwright/CI 被接口拖住
    components.value = Array.isArray(dsl.components) ? dsl.components : []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGolden()
})
</script>

<style scoped lang="scss">
.golden-parity {
  min-height: 100vh;
  background: #eef3fb;
}

.golden-parity__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.golden-parity__body {
  display: flex;
  justify-content: center;
  padding: 20px 12px 40px;
}

.parity-block {
  width: 100%;
}

.golden-parity__empty {
  padding: 40px 16px;
  text-align: center;
  color: #94a3b8;
}
</style>
