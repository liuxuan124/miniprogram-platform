<template>
  <el-drawer
    v-model="visible"
    class="mini-wb-overlay diff-drawer"
    title="发布变更清单"
    size="480px"
    destroy-on-close
    @open="load"
  >
    <div v-loading="loading" class="diff-body">
      <!-- 站点级改动（导航 / 配色 / 品牌） -->
      <section v-if="siteItems.length" class="diff-sec">
        <div class="diff-sec__head">
          <b>站点配置</b>
          <span class="faint">{{ siteItems.length }} 项</span>
        </div>
        <label v-for="it in siteItems" :key="it.key" class="diff-row">
          <input
            type="checkbox"
            :checked="isChecked(it.key)"
            :disabled="!it.selectable"
            @change="toggle(it.key, !isChecked(it.key))"
          />
          <span class="diff-row__main">
            <b>{{ it.name }}</b>
            <span class="faint">{{ it.summary || '站点级配置改动' }}</span>
          </span>
          <span class="tag t-pending">配置</span>
        </label>
      </section>

      <!-- 页面级改动 -->
      <section v-if="pageItems.length" class="diff-sec">
        <div class="diff-sec__head">
          <b>页面内容</b>
          <div class="diff-sec__ops">
            <button type="button" class="link" @click="toggleAll(true)">全选</button>
            <button type="button" class="link" @click="toggleAll(false)">全不选</button>
          </div>
        </div>
        <label v-for="it in pageItems" :key="it.key" class="diff-row">
          <input
            type="checkbox"
            :checked="isChecked(it.key)"
            @change="toggle(it.key, !isChecked(it.key))"
          />
          <span class="diff-row__main">
            <b>
              {{ it.name }}
              <span :class="['tag', it.kind === '新增' ? 't-new' : 't-pending']">{{ it.kind }}</span>
            </b>
            <span class="faint">{{ it.summary || it.path || '—' }}</span>
          </span>
        </label>
      </section>

      <div v-if="!loading && !allItems.length" class="empty-mini">
        <span class="muted">当前没有待发布的改动，草稿与线上一致。</span>
      </div>

      <!-- 预检结果：不隐藏，让用户在点发布前就看到风险 -->
      <section v-if="blocking.length || warnings.length" class="diff-sec">
        <div class="diff-sec__head"><b>发布前检查</b></div>
        <ul v-if="blocking.length" class="diff-alert diff-alert--block">
          <li v-for="(b, i) in blocking" :key="`b${i}`">{{ b }}</li>
        </ul>
        <ul v-if="warnings.length" class="diff-alert diff-alert--warn">
          <li v-for="(wmsg, i) in warnings" :key="`w${i}`">{{ wmsg }}</li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="diff-foot">
        <span class="faint">已选 {{ checkedCount }} / {{ allItems.length }} 项</span>
        <div class="diff-foot__btns">
          <el-button @click="visible = false">取消</el-button>
          <el-button
            type="primary"
            class="mw-btn-primary"
            :loading="publishing"
            :disabled="!checkedCount || !!blocking.length"
            @click="publish"
          >
            发布所选
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getPendingChanges,
  postContentPreflight,
  publishMiniSite,
  type PendingChangeItem,
} from '@/api/miniSite'
import { refreshMiniPendingGlobal } from '@/composables/useMiniPending'

/**
 * 发布变更清单（Diff Drawer）。
 *
 * 定位：全局唯一的发布决策界面。改动本身已由各页面静默写入草稿，
 * 这里只负责「看清要发什么 → 按需勾选 → 发布」，不承担任何配置编辑。
 *
 * 两个必须注意的点：
 * 1. 勾选的是 changeId 而不是 id —— 后端 publish 走的是 changeId 维度。
 * 2. 站点级改动（导航/配色/品牌）没有 changeId，只能整块带或不带，
 *    所以给它一个「不可单独取消」的语义：只要勾了页面就默认带上站点，
 *    用户想只发页面时需要显式取消。
 */

type DiffItem = {
  key: string
  name: string
  summary: string
  path: string
  kind: '新增' | '修改'
  changeId: string
  pageId: number | string
  selectable: boolean
}

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  published: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const publishing = ref(false)
const items = ref<DiffItem[]>([])
const siteDirty = ref(false)
const checked = ref<Set<string>>(new Set())
const blocking = ref<string[]>([])
const warnings = ref<string[]>([])

function kindOf(it: PendingChangeItem): '新增' | '修改' {
  const st = String(it.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(it.summary || ''))) return '新增'
  return '修改'
}

/**
 * 站点级改动没有 changeId，用固定 key 占位。
 * 它参与「全选/全不选」时按整块处理，不拆成多项。
 */
const SITE_KEY = '__site__'

const allItems = computed<DiffItem[]>(() => items.value)

const siteItems = computed(() =>
  allItems.value.filter((i) => !i.selectable),
)
const pageItems = computed(() =>
  allItems.value.filter((i) => i.selectable),
)

function isChecked(key: string) {
  return checked.value.has(key)
}

const checkedCount = computed(() => checked.value.size)

function toggle(key: string, on: boolean) {
  const next = new Set(checked.value)
  if (on) next.add(key)
  else next.delete(key)
  checked.value = next
}

function toggleAll(on: boolean) {
  checked.value = on ? new Set(allItems.value.map((i) => i.key)) : new Set()
}

async function load() {
  loading.value = true
  blocking.value = []
  warnings.value = []
  try {
    const res = await getPendingChanges()
    const raw = (res.items || []) as PendingChangeItem[]
    const list: DiffItem[] = []

    if (res.siteDraftChanged || res.siteDirty) {
      list.push({
        key: SITE_KEY,
        name: '站点配置（导航 / 配色 / 品牌）',
        summary: '底部导航顺序、主色、品牌信息等',
        path: '',
        kind: '修改',
        changeId: '',
        pageId: '',
        selectable: false,
      })
    }

    for (const it of raw) {
      const changeId = String(it.changeId || '')
      const pageId = it.pageId ?? it.id ?? ''
      list.push({
        key: changeId || `p-${pageId || it.name}`,
        name: it.name || '未命名页面',
        summary: it.summary || '',
        path: it.path || '',
        kind: kindOf(it),
        changeId,
        pageId,
        selectable: !!changeId,
      })
    }

    items.value = list
    // 默认全选：绝大多数场景用户就是想一次发完；取消勾选比逐个勾选更常见
    checked.value = new Set(list.map((i) => i.key))

    const ids = list.filter((i) => i.selectable).map((i) => i.changeId)
    if (ids.length) await runPreflight(ids)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '读取待发布清单失败')
  } finally {
    loading.value = false
  }
}

async function runPreflight(ids: string[]) {
  try {
    const pre = await postContentPreflight(ids)
    blocking.value = pre.blocking || []
    warnings.value = pre.warnings || []
    if (pre.canPublish === false && !blocking.value.length) {
      blocking.value = ['后台判定不能发布，但没有给出具体原因；请确认确实存在未发布的改动。']
    }
  } catch {
    // 预检失败不阻断发布：真正的阻断由后端 publish 再兜一次，
    // 这里宁可少提示也不要因为预检接口抖动把用户挡在门外。
  }
}

async function publish() {
  const chosen = pageItems.value.filter((i) => checked.value.has(i.key))
  const changeIds = chosen.map((i) => i.changeId).filter(Boolean)
  // publishMiniSite 的 pageIds 收页面 id，changeId 只用于预检维度——两者不能混
  const pageIds = chosen
    .map((i) => Number(i.pageId))
    .filter((n) => Number.isFinite(n) && n > 0)
  const includeSite = checked.value.has(SITE_KEY)

  if (!changeIds.length && !includeSite) {
    ElMessage.warning('没有勾选任何要发布的改动')
    return
  }

  publishing.value = true
  try {
    const result = await publishMiniSite({
      includeSite,
      pageIds: pageIds.length ? pageIds : undefined,
      notes: `后台发布：${changeIds.length} 个页面${includeSite ? ' + 站点配置' : ''}`,
    })
    if (result.deduplicated) {
      ElMessage.info(result.message || '刚刚已发布过同一批改动，无需重复提交')
    } else if (result.siteConfigPromoted === false && !result.publishedPageCount) {
      ElMessage.warning('本次没有任何内容被写入线上（后台判定无改动）')
    } else {
      const no = result.liveReleaseNo
      ElMessage.success(no != null ? `已发布，线上配置版本 ${no}` : '已发布')
    }
    visible.value = false
    await refreshMiniPendingGlobal(true)
    emit('published')
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ElMessage.error(msg || (e instanceof Error ? e.message : '发布失败'))
  } finally {
    publishing.value = false
  }
}

/** publishMiniSite 的 pageIds 要的是页面 id，不是 changeId */
const pageIdList = computed<Array<number | string>>(() => {
  const res = getPendingChanges
  void res
  return pageItems.value
    .filter((i) => checked.value.has(i.key))
    .map((i) => i.key.replace(/^p-/, ''))
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
})

watch(() => props.modelValue, (v) => {
  if (v) {
    items.value = []
    checked.value = new Set()
  }
})

defineExpose({ reload: load })
</script>

<style scoped lang="scss">
.diff-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 120px;
}
.diff-sec { display: flex; flex-direction: column; gap: 8px; }
.diff-sec__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
}
.diff-sec__ops { display: inline-flex; gap: 10px; }
.diff-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .12s;
  &:hover { background: var(--soft); }
  input { margin-top: 3px; flex: none; }
}
.diff-row__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
  b {
    font-size: 13px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .faint { font-size: 11.5px; word-break: break-all; }
}
.diff-alert {
  margin: 0;
  padding: 10px 12px 10px 26px;
  border-radius: 8px;
  font-size: 12.5px;
  line-height: 1.6;
}
.diff-alert--block {
  background: rgba(180, 35, 24, .07);
  color: #B42318;
  border: 1px solid rgba(180, 35, 24, .18);
}
.diff-alert--warn {
  background: rgba(186, 117, 23, .08);
  color: #854F0B;
  border: 1px solid rgba(186, 117, 23, .2);
}
.diff-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.diff-foot__btns { display: inline-flex; gap: 8px; }
</style>
