<template>
  <div class="content-wb cw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">设置</h1>
        <div class="sub">分类、会员门禁、审核、导入来源；改完即时生效</div>
      </div>
    </div>

    <div class="set-grid">
      <section class="card">
        <h2 class="h2">标签</h2>
        <div class="sub">平台维 × 主题维 + 自由标签；内容可多选标签</div>
        <div style="margin-top:10px">
          <div v-for="t in tags" :key="t.id" class="list-row">
            <input v-model="t.name" class="input" style="flex:1" aria-label="标签名" @change="saveTagRow(t)" />
            <select v-model="t.tag_kind" class="input" style="width:96px" @change="saveTagRow(t)">
              <option value="custom">自由</option>
              <option value="platform">平台</option>
              <option value="topic">主题</option>
            </select>
            <input
              v-if="t.tag_kind === 'platform'"
              v-model="t.platform_code"
              class="input"
              style="width:88px"
              placeholder="平台码"
              @change="saveTagRow(t)"
            />
            <span class="faint" style="width:48px;text-align:right">{{ t.content_count ?? 0 }}</span>
            <button type="button" class="iconbtn" aria-label="删除标签" @click="removeTagRow(t)">
              <MiniIcon name="x" :size="14" />
            </button>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button type="button" class="btn sm" @click="addTagRow">
            <MiniIcon name="plus" :size="14" />新增标签
          </button>
          <button type="button" class="btn sm" :disabled="!mergeFrom || !mergeTo" @click="runMergeTags">
            合并选中
          </button>
        </div>
        <div class="faint" style="margin-top:8px;font-size:12px">
          合并：先在列表选两个标签 ID（下方），将「源」并入「目标」。AI 批量打标仍在内容 Agent 任务里确认后应用。
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input v-model.number="mergeTo" class="input" type="number" placeholder="目标 ID" style="width:120px" />
          <input v-model.number="mergeFrom" class="input" type="number" placeholder="源 ID" style="width:120px" />
        </div>
      </section>

      <section class="card">
        <h2 class="h2">分类</h2>
        <div class="sub">内容只属于一个分类；标签可以多个</div>
        <div style="margin-top:10px">
          <div v-for="c in categories" :key="c.id" class="list-row">
            <input v-model="c.name" class="input" style="flex:1" aria-label="分类名" @change="saveCat(c)" />
            <span class="faint" style="width:56px;text-align:right">{{ c.count }} 篇</span>
            <button
              type="button"
              class="iconbtn"
              aria-label="删除分类"
              :disabled="c.count > 0"
              :title="c.count > 0 ? '分类下还有内容' : '删除'"
              @click="removeCat(c)"
            >
              <MiniIcon name="x" :size="14" />
            </button>
          </div>
        </div>
        <button type="button" class="btn sm" style="margin-top:10px" @click="addCat">
          <MiniIcon name="plus" :size="14" />新增分类
        </button>
      </section>

      <section class="card">
        <h2 class="h2">会员门禁（默认规则）</h2>
        <div class="sub">单篇可在「写内容 → 谁可以看」里改</div>
        <div class="field" style="margin-top:14px">
          <label>非会员可读 {{ 100 - wall.remainPercent }}%</label>
          <input
            v-model.number="wall.readablePercent"
            type="range"
            min="10"
            max="90"
            style="accent-color:var(--acc)"
            @change="onReadableChange"
          />
        </div>
        <div class="field" style="margin-top:10px">
          <label>门禁卡文案</label>
          <input v-model="wall.desc" class="input" placeholder="开通会员后继续阅读" />
        </div>
        <div class="field" style="margin-top:10px">
          <label>年费参考价</label>
          <input v-model="wall.memberYearPrice" class="input" placeholder="如 ¥168" />
        </div>
        <button type="button" class="btn sm primary" style="margin-top:12px;align-self:flex-start" :disabled="wallSaving" @click="saveWall">
          {{ wallSaving ? '保存中…' : '保存门禁' }}
        </button>
        <div class="gatecard">
          <b><MiniIcon name="lock" :size="14" /> 会员专享</b>
          <span>{{ wall.desc || '开通会员后继续阅读全文' }}</span>
          <span class="btn primary sm" style="align-self:center">开通会员</span>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">审核</h2>
        <div class="sub">机器先审，结果显示在「互动」的每一条上</div>
        <div class="note" style="margin-top:12px">
          详细拦截词与机器审核开关请在审核规则页配置。投稿、作者申请默认需人工确认。
        </div>
        <button type="button" class="btn sm" style="margin-top:12px" @click="router.push('/content/audit-rules')">
          打开审核规则
        </button>
      </section>

      <section class="card">
        <h2 class="h2">导入来源</h2>
        <div class="sub">替代原「同步导入」：绑定后可按链接或自动同步为草稿</div>
        <div class="note" style="margin-top:10px">
          目前支持公众号文章链接导入（内容库 → 从链接导入）。导入的内容一律先进「草稿」。
        </div>
        <button type="button" class="btn sm" style="margin-top:12px" @click="router.push({ path: '/content/articles', query: { import: '1' } })">
          <MiniIcon name="link" :size="14" />去导入
        </button>
      </section>

      <section class="card">
        <h2 class="h2">小程序里的内容展示</h2>
        <div class="sub">原先放在内容列表顶部的两块配置，统一收到这里</div>
        <label class="kv" style="margin-top:10px">
          <span>长文列表显示「热读榜」</span>
          <input v-model="listCfg.showRank" type="checkbox" @change="saveListCfg" />
        </label>
        <label class="kv">
          <span>长文列表显示「推荐大卡」</span>
          <input v-model="listCfg.showFeatured" type="checkbox" @change="saveListCfg" />
        </label>
        <div class="faint">推荐大卡轮播内容库里标了「推荐」的内容</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  getContentList,
  getTagList,
  createTag,
  updateTag,
  deleteTag,
  mergeTags,
} from '@/api/content'
import { getConfigsSilent, updateConfigs } from '@/api/system'
import { extractConfigList, readConfigEntry, toConfigUpdateItems } from '@/utils/system-config'
import { CategoryStatus } from '@/types/content'
import { unwrapList } from './utils'

interface CatRow {
  id: number
  name: string
  count: number
}

const router = useRouter()
const loading = ref(false)
const categories = ref<CatRow[]>([])
const tags = ref<Array<{ id: number; name: string; tag_kind?: string; platform_code?: string; content_count?: number }>>([])
const mergeFrom = ref<number | null>(null)
const mergeTo = ref<number | null>(null)
const wallSaving = ref(false)

const wall = reactive({
  remainPercent: 68,
  readablePercent: 32,
  desc: '',
  memberYearPrice: '',
})

const listCfg = reactive({
  showRank: true,
  showFeatured: true,
})

function onReadableChange() {
  wall.remainPercent = 100 - Number(wall.readablePercent || 32)
}

function flattenCats(nodes: any[]): Array<{ id: number; name: string }> {
  const out: Array<{ id: number; name: string }> = []
  const walk = (list: any[]) => {
    for (const n of list || []) {
      out.push({ id: Number(n.id), name: String(n.name || '') })
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

function parseJsonConfig(raw: string) {
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function loadTags() {
  const res = await getTagList()
  const list = (res as any)?.data ?? res
  tags.value = (Array.isArray(list) ? list : []).map((t: any) => ({
    id: Number(t.id),
    name: String(t.name || ''),
    tag_kind: t.tag_kind || 'custom',
    platform_code: t.platform_code || '',
    content_count: t.content_count ?? t.useCount ?? 0,
  }))
}

async function saveTagRow(t: { id: number; name: string; tag_kind?: string; platform_code?: string }) {
  if (!t.name.trim()) {
    ElMessage.warning('标签名不能为空')
    return
  }
  await updateTag(t.id, {
    name: t.name.trim(),
    tag_kind: (t.tag_kind as 'custom' | 'platform' | 'topic') || 'custom',
    platform_code: t.tag_kind === 'platform' ? t.platform_code : undefined,
  })
  ElMessage.success('标签已更新')
}

async function addTagRow() {
  const name = window.prompt('新标签名称')
  if (!name?.trim()) return
  await createTag({ name: name.trim(), tag_kind: 'custom' })
  ElMessage.success('已新增标签')
  await loadTags()
}

async function removeTagRow(t: { id: number; name: string }) {
  await ElMessageBox.confirm(`删除标签「${t.name}」？`, '确认', { type: 'warning' })
  await deleteTag(t.id)
  ElMessage.success('已删除')
  await loadTags()
}

async function runMergeTags() {
  if (!mergeTo.value || !mergeFrom.value) return
  await mergeTags({ targetId: mergeTo.value, sourceId: mergeFrom.value })
  ElMessage.success('已合并标签')
  mergeFrom.value = null
  mergeTo.value = null
  await loadTags()
}

async function loadCats() {
  const [catRes, listRes] = await Promise.all([
    getCategoryList(),
    getContentList({ current: 1, size: 200 }),
  ])
  const cats = (catRes as any)?.data ?? catRes
  const flat = flattenCats(Array.isArray(cats) ? cats : [])
  const records = unwrapList(listRes).records as any[]
  categories.value = flat.map((c) => ({
    id: c.id,
    name: c.name,
    count: records.filter((r) => Number(r.category_id ?? r.categoryId) === c.id).length,
  }))
}

async function loadConfigs() {
  try {
    const payload = await getConfigsSilent()
    const items = extractConfigList((payload as any)?.data ?? payload)
    const wallHit = items.find((item) => readConfigEntry(item).key === 'content_member_wall')
    const wallCfg = parseJsonConfig(wallHit ? readConfigEntry(wallHit).value : '') as Record<string, unknown>
    wall.remainPercent = Number(wallCfg.remainPercent) || 68
    wall.readablePercent = 100 - wall.remainPercent
    wall.desc = String(wallCfg.desc || '')
    wall.memberYearPrice = String(wallCfg.memberYearPrice || '')

    const listHit = items.find((item) => readConfigEntry(item).key === 'content_list_config')
    const list = parseJsonConfig(listHit ? readConfigEntry(listHit).value : '') as Record<string, unknown>
    listCfg.showRank = list.showRank !== false
    listCfg.showFeatured = list.showFeatured !== false
  } catch {
    /* defaults */
  }
}

async function saveCat(c: CatRow) {
  if (!c.name.trim()) {
    ElMessage.warning('分类名不能为空')
    return
  }
  await updateCategory(c.id, { name: c.name.trim() })
  ElMessage.success('已更新分类')
}

async function addCat() {
  const name = window.prompt('新分类名称')
  if (!name?.trim()) return
  await createCategory({ name: name.trim(), status: CategoryStatus.Enabled })
  ElMessage.success('已新增')
  await loadCats()
}

async function removeCat(c: CatRow) {
  if (c.count > 0) return
  await ElMessageBox.confirm(`删除分类「${c.name}」？`, '确认', { type: 'warning' })
  await deleteCategory(c.id)
  ElMessage.success('已删除')
  await loadCats()
}

async function saveWall() {
  wallSaving.value = true
  try {
    onReadableChange()
    await updateConfigs(
      toConfigUpdateItems(
        {
          content_member_wall: {
            remainPercent: wall.remainPercent,
            desc: wall.desc || '',
            memberYearPrice: wall.memberYearPrice || '',
          },
        },
        'basic',
      ),
    )
    ElMessage.success('门禁已保存')
  } finally {
    wallSaving.value = false
  }
}

async function saveListCfg() {
  await updateConfigs(
    toConfigUpdateItems(
      {
        content_list_config: {
          showRank: listCfg.showRank,
          showFeatured: listCfg.showFeatured,
        },
      },
      'basic',
    ),
  )
  ElMessage.success('展示配置已保存')
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadCats(), loadConfigs(), loadTags()])
  } finally {
    loading.value = false
  }
})
</script>
