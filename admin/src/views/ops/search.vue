<template>
  <div class="ops-page">
    <PageHeader
      kicker="运营中心 / 搜索运营"
      title="搜索运营"
      description="配置小程序搜索页的热词与建议入口。热词是运营拉动曝光的入口，用户搜索框下方会横向展示，点击直接发起搜索。"
    >
      <template #actions>
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" :loading="savingHot" @click="saveHot">保存热词</el-button>
      </template>
    </PageHeader>

    <el-alert type="info" :closable="false" show-icon class="contract-alert">
      <template #title>热词清空后会回落到小程序内置兜底词</template>
      <div class="contract-alert__body">
        小程序端读取顺序：后台配置的热词 → 读取失败或为空时回落到
        <code>data/warm-source.js</code> 的内置词库。因此<strong>这里留空不会让搜索页空掉</strong>，
        搜索页始终有词可展示。
      </div>
    </el-alert>

    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__k">已配热词</div>
        <div class="stat-card__v">{{ hotWords.length }}</div>
        <div class="stat-card__d">上限 {{ HOT_MAX }} 个</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__k">已配建议位</div>
        <div class="stat-card__v">{{ suggests.length }}</div>
        <div class="stat-card__d">搜索页无结果时展示</div>
      </div>
    </div>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="panel__head">
          <span>热词</span>
          <span class="panel__hint">按顺序展示，最前面的曝光最多；回车或逗号可快速添加</span>
        </div>
      </template>

      <el-input
        v-model="hotInput"
        placeholder="输入热词后回车，或用逗号分隔批量添加，例如：私域搭建,选题库"
        :disabled="hotWords.length >= HOT_MAX"
        @keyup.enter="addHot"
      >
        <template #append>
          <el-button :disabled="!hotInput.trim() || hotWords.length >= HOT_MAX" @click="addHot">添加</el-button>
        </template>
      </el-input>

      <div class="chip-wrap">
        <el-tag
          v-for="(w, i) in hotWords"
          :key="`${w}-${i}`"
          closable
          class="chip"
          :type="i < 3 ? 'danger' : 'info'"
          disable-transitions
          @close="removeHot(i)"
        >
          <span class="chip__idx">{{ i + 1 }}</span>{{ w }}
        </el-tag>
        <el-empty v-if="!hotWords.length" description="尚未配置热词，搜索页将使用小程序内置兜底词" :image-size="60" />
      </div>

      <div class="panel__actions">
        <el-button size="small" @click="hotWords = []">清空</el-button>
        <el-button size="small" @click="moveHot(hotWords.length - 1, -1)" :disabled="hotWords.length < 2">↑ 上移末位</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="panel__head">
          <span>搜索建议位</span>
          <span class="panel__hint">搜索页空态 / 无结果时展示的推荐入口，留空则用小程序默认项</span>
        </div>
      </template>

      <el-table :data="suggests" size="small" border>
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <el-input v-model="row.icon" maxlength="4" placeholder="📚" />
          </template>
        </el-table-column>
        <el-table-column label="标题" width="140">
          <template #default="{ row }">
            <el-input v-model="row.title" maxlength="20" placeholder="内容中心" />
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="140">
          <template #default="{ row }">
            <el-input v-model="row.desc" maxlength="20" placeholder="笔记 / 长文 / 数据" />
          </template>
        </el-table-column>
        <el-table-column label="跳转路径" min-width="240">
          <template #default="{ row }">
            <el-input v-model="row.path" placeholder="/pkg-content/content-list/content-list" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template #default="{ $index }">
            <el-button type="danger" link @click="suggests.splice($index, 1)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="panel__actions">
        <el-button size="small" @click="addSuggest">+ 新增一条</el-button>
        <el-button size="small" type="primary" :loading="savingSuggest" @click="saveSuggest">保存建议位</el-button>
      </div>

      <p class="panel__note">
        路径说明：填小程序内部路由即可，<strong>不存在或未注册的页面会自动兜底</strong>（端上 render.js 会重写到对应分包），
        不会因为填错就点不动。示例：内容中心 <code>/pkg-content/content-list/content-list</code>
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  getSearchHotWords,
  saveSearchHotWords,
  getSearchSuggests,
  saveSearchSuggests,
  type SearchSuggestItem,
} from '@/api/searchOps'

/** 与后端 AdminSearchOpsController.MAX_WORDS 保持一致 */
const HOT_MAX = 20

const hotWords = ref<string[]>([])
const hotInput = ref('')
const suggests = ref<SearchSuggestItem[]>([])
const savingHot = ref(false)
const savingSuggest = ref(false)

async function load() {
  try {
    // 两个接口互不依赖，并行拉；单个失败不阻塞另一个（用 allSettled）
    const [hotRes, sugRes] = await Promise.allSettled([
      getSearchHotWords(),
      getSearchSuggests(),
    ])
    if (hotRes.status === 'fulfilled') {
      hotWords.value = Array.isArray(hotRes.value?.data) ? hotRes.value!.data : []
    } else {
      ElMessage.warning('热词加载失败，本次编辑不会覆盖线上配置')
    }
    if (sugRes.status === 'fulfilled') {
      const d = sugRes.value?.data
      suggests.value = Array.isArray(d) ? d.map((x) => ({ ...x })) : []
    } else {
      ElMessage.warning('建议位加载失败，本次编辑不会覆盖线上配置')
    }
  } catch (e) {
    ElMessage.error('加载失败')
  }
}

/** 支持逗号/顿号批量添加；静默忽略重复与超限项 */
function addHot() {
  const raw = hotInput.value.trim()
  if (!raw) return
  const incoming = raw.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
  let added = 0
  let skipped = 0
  for (const w of incoming) {
    if (hotWords.value.length >= HOT_MAX) break
    if (hotWords.value.includes(w)) {
      skipped += 1
      continue
    }
    hotWords.value.push(w)
    added += 1
  }
  hotInput.value = ''
  if (added === 0 && skipped > 0) {
    ElMessage.info(`已存在，跳过 ${skipped} 个`)
  } else if (added > 0) {
    ElMessage.success(`已添加 ${added} 个`)
  }
}

function removeHot(i: number) {
  hotWords.value.splice(i, 1)
}

function moveHot(i: number, delta: number) {
  const j = i + delta
  if (i < 0 || i >= hotWords.value.length || j < 0 || j >= hotWords.value.length) return
  const arr = hotWords.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

async function saveHot() {
  savingHot.value = true
  try {
    const res = await saveSearchHotWords(hotWords.value)
    // 以后端归一化后的结果为准（去重/截长可能改变内容）
    if (Array.isArray(res?.data)) {
      hotWords.value = res!.data
    }
    ElMessage.success(`已保存 ${hotWords.value.length} 个热词，小程序下次冷启动生效`)
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    savingHot.value = false
  }
}

function addSuggest() {
  suggests.value.push({ icon: '📌', title: '', desc: '', path: '' })
}

async function saveSuggest() {
  const bad = suggests.value.find((s) => !s.title || !s.title.trim())
  if (bad) {
    ElMessage.warning('存在标题为空的建议位，请补全或删除')
    return
  }
  savingSuggest.value = true
  try {
    const res = await saveSearchSuggests(suggests.value.filter((s) => s.title && s.title.trim()))
    if (Array.isArray(res?.data)) {
      suggests.value = res!.data
    }
    ElMessage.success('已保存建议位')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    savingSuggest.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.contract-alert {
  margin-bottom: 16px;
}
.contract-alert__body {
  font-size: 12px;
  line-height: 1.7;
}
.contract-alert__body code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-subtle);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.stat-card__k {
  font-size: 12px;
  color: var(--text-muted);
}
.stat-card__v {
  margin: 6px 0 2px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}
.stat-card__d {
  font-size: 12px;
  color: var(--text-muted);
}

.panel {
  margin-bottom: 16px;
}
.panel__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-weight: 600;
}
.panel__hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}
.panel__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.panel__note {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-muted);
}
.panel__note code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-subtle);
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  min-height: 40px;
  align-items: center;
}
.chip__idx {
  margin-right: 4px;
  font-size: 11px;
  opacity: 0.65;
}
</style>
