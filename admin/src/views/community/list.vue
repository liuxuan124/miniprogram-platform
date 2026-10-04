<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">社区列表</h1>
        <div class="sub">用户端叫「星球」。在这里创建和管理社区，点「进入运营」发动态、管成员、设打卡</div>
      </div>
      <div class="actions">
        <router-link to="/community/create" class="btn primary"><MiniIcon name="plus" :size="15" />新建社区</router-link>
      </div>
    </div>

    <!-- 顶部 KPI 概览条 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-num">{{ communities.length }}</span>
        <span class="kpi-label">社区总数</span>
        <span class="kpi-sub">{{ communities.filter(c => c.on).length }} 个展示中</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-num">{{ totalPosts }}</span>
        <span class="kpi-label">动态总数</span>
        <span class="kpi-sub">{{ totalEssence }} 条精华</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-num">{{ totalToday }}</span>
        <span class="kpi-label">今日动态</span>
        <span class="kpi-sub">较 7 日均 {{ weekAvg > 0 ? (totalToday >= weekAvg ? '+' : '') + (totalToday - weekAvg).toFixed(1) : '—' }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-num">{{ readerGroups.length }}</span>
        <span class="kpi-label">读者群</span>
        <span class="kpi-sub">{{ rgActive }} 个启用 · {{ rgExpiring }} 个将过期</span>
      </div>
    </div>

    <!-- 搜索 + 筛选 -->
    <div class="toolbar">
      <div class="search-box">
        <MiniIcon name="search" :size="14" />
        <input v-model="keyword" class="input" placeholder="按名称 / 副标题 / 介绍搜索" />
      </div>
      <div class="filter-chips">
        <button type="button" class="chip" :class="{ on: statusFilter === 'all' }" @click="statusFilter = 'all'">全部 {{ communities.length }}</button>
        <button type="button" class="chip" :class="{ on: statusFilter === 'on' }" @click="statusFilter = 'on'">展示中 {{ communities.filter(c => c.on).length }}</button>
        <button type="button" class="chip" :class="{ on: statusFilter === 'off' }" @click="statusFilter = 'off'">已停用 {{ communities.filter(c => !c.on).length }}</button>
      </div>
      <div class="sort-box">
        <span class="faint">排序</span>
        <select v-model="sortBy" class="input" style="width:auto">
          <option value="sort">配置顺序</option>
          <option value="posts">动态数</option>
          <option value="today">今日活跃</option>
          <option value="essence">精华数</option>
        </select>
      </div>
    </div>

    <div v-if="configError" class="empty-box">{{ configError }}</div>

    <div v-if="filteredCommunities.length" class="comm-grid">
      <article
        v-for="(c, i) in filteredCommunities"
        :key="c.id"
        class="comm"
        :class="{ off: !c.on }"
      >
        <div class="comm-cover" :style="{ background: c.cover || COMMUNITY_TONES[i % COMMUNITY_TONES.length] }">
          <span style="font-size:22px">{{ c.emoji || '🪐' }}</span>
          <span v-if="c.main" class="tag t-acc">主社区</span>
          <span class="tag" :class="c.on ? 't-live' : 't-draft'" style="margin-left:auto">{{ c.on ? '展示中' : '已停用' }}</span>
        </div>
        <div class="comm-body">
          <div class="comm-title-row">
            <b style="font-size:16px">{{ c.name || '未命名社区' }}</b>
            <button type="button" class="iconbtn" title="复制社区 ID" @click="copyId(c)"><MiniIcon name="copy" :size="13" /></button>
          </div>
          <span class="faint comm-sub-text">{{ c.sub || '还没有副标题' }}</span>
          <div class="comm-stats">
            <span><b>{{ c.memberCount ?? '—' }}</b>成员</span>
            <span><b>{{ statOf(c.id).postCount }}</b>动态</span>
            <span><b>{{ statOf(c.id).essenceCount }}</b>精华</span>
            <span :class="{ 't-today': statOf(c.id).todayCount > 0 }"><b>{{ statOf(c.id).todayCount }}</b>今日</span>
          </div>
          <div class="comm-foot">
            <button type="button" class="btn sm primary" @click="enter(c.id)">概览</button>
            <router-link :to="`/community/members/${c.id}`" class="btn sm">成员</router-link>
            <router-link :to="`/community/content/${c.id}`" class="btn sm">内容</router-link>
            <router-link :to="`/community/membership/${c.id}`" class="btn sm">会员</router-link>
            <router-link :to="`/community/profile/${c.id}`" class="btn sm">编辑</router-link>
            <button type="button" class="btn sm" @click="toggleOn(c)">{{ c.on ? '停用' : '启用' }}</button>
            <button v-if="!c.main" type="button" class="btn sm" @click="setMain(c)">设为主</button>
            <button v-if="!c.main" type="button" class="btn sm danger" @click="removeComm(c)">删除</button>
          </div>
        </div>
      </article>
    </div>
    <div v-else-if="!configError" class="empty-box">
      {{ keyword || statusFilter !== 'all' ? '没有匹配的社区' : '还没有社区，点右上角「新建社区」创建第一个' }}
    </div>

    <!-- 新建 / 建站表单 -->
    <div v-if="createVisible" class="card" style="max-width:640px;margin-top:16px">
      <div class="head">
        <div>
          <h2 class="h2">新建社区</h2>
          <div class="sub">保存后立即写入星球配置，小程序端可见（展示中状态）</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">
        <div class="field"><label>社区名称 *</label><input v-model="createForm.name" class="input" placeholder="如：暖阁星球·内容创作者" /></div>
        <div class="field"><label>副标题</label><input v-model="createForm.sub" class="input" placeholder="{'{n}'} 会替换为成员数" /></div>
        <div class="field">
          <label>封面标识</label>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <input v-model="createForm.emoji" class="input" style="width:72px;text-align:center" placeholder="🪐" />
            <button
              v-for="t in COMMUNITY_TONES"
              :key="t"
              type="button"
              class="tone-dot"
              :class="{ on: createForm.cover === t }"
              :style="{ background: t }"
              @click="createForm.cover = t"
            />
          </div>
        </div>
        <div class="field"><label>介绍</label><textarea v-model="createForm.intro" class="input" rows="3" placeholder="社区是做什么的、加入能得到什么" /></div>
        <div class="field"><label>主按钮文案</label><input v-model="createForm.btn" class="input" placeholder="加入星球" /></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn primary" @click="submitCreate">保存并创建</button>
          <button type="button" class="btn" @click="createVisible = false">取消</button>
        </div>
      </div>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="head">
        <div>
          <h2 class="h2">读者群</h2>
          <div class="sub">按方向分群；微信群二维码 7 天失效，到期前需更新</div>
        </div>
        <div class="actions">
          <button type="button" class="btn sm" @click="addRg"><MiniIcon name="plus" :size="14" />添加读者群</button>
        </div>
      </div>
      <div v-if="rgError" class="empty-box" style="margin-top:12px">{{ rgError }}</div>
      <div v-else style="margin-top:8px">
        <div v-for="g in readerGroups" :key="g.id" class="rg">
          <span class="todo-ic" style="width:34px;height:34px"><MiniIcon name="chat" :size="16" /></span>
          <div style="flex:1;min-width:180px">
            <input v-model="g.name" class="input" style="font-weight:500" @change="saveRg(g)" />
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center">
              <input v-model="g.director" class="input" style="width:100px;padding:4px 8px;font-size:12.5px" placeholder="方向" @change="saveRg(g)" />
              <select v-model="g.whoCanJoin" class="input" style="width:auto;padding:4px 8px;font-size:12.5px" @change="saveRg(g)">
                <option value="all">所有用户可见</option>
                <option value="paid">付费会员可见</option>
                <option value="year">年费会员可见</option>
              </select>
            </div>
          </div>
          <div style="width:170px">
            <span class="tag" :class="qrTag(g).cls">{{ qrTag(g).text }}</span>
            <input v-model="g.qrUrl" class="input" style="margin-top:4px;font-size:12px;padding:4px 8px" placeholder="二维码 URL" @change="saveRg(g)" />
          </div>
          <div v-if="g.qrUrl" class="qr-thumb" :title="g.name + ' 二维码'">
            <img :src="g.qrUrl" alt="二维码" @error="($event.target as HTMLImageElement).style.display='none'" />
          </div>
          <label class="kv" style="width:84px;padding:0;gap:6px">
            <span class="faint">满员</span>
            <label class="switch">
              <input type="checkbox" :checked="!!g.fullFlag" @change="onRgFull(g, $event)" />
              <span />
            </label>
          </label>
          <label class="kv" style="width:84px;padding:0;gap:6px">
            <span class="faint">启用</span>
            <label class="switch">
              <input type="checkbox" :checked="g.status !== 0" @change="onRgStatus(g, $event)" />
              <span />
            </label>
          </label>
          <button type="button" class="iconbtn" @click="delRg(g)"><MiniIcon name="x" :size="14" /></button>
        </div>
        <div v-if="!readerGroups.length" class="muted" style="padding:16px 0">还没有读者群</div>
      </div>
      <div class="faint" style="margin-top:8px">进群须知在「客服中心」里设置。</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  listReaderGroups,
  createReaderGroup,
  updateReaderGroup,
  deleteReaderGroup,
  listCommunityPosts,
  type CommunityPost,
  type ReaderGroup,
} from '@/api/memberOps'
import {
  COMMUNITY_TONES,
  fetchPlanetConfig,
  putPlanetConfig,
  normalizeCommunities,
  buildPlanetSavePayload,
  newCommunityId,
  statsFor,
  isToday,
  type CommCard,
} from './planet-config'

const router = useRouter()

const loading = ref(false)
const configError = ref('')
const communities = ref<CommCard[]>([])
const planetConfig = ref<any>({})
const posts = ref<CommunityPost[]>([])

const keyword = ref('')
const statusFilter = ref<'all' | 'on' | 'off'>('all')
const sortBy = ref<'sort' | 'posts' | 'today' | 'essence'>('sort')

const createVisible = ref(false)
const createForm = reactive({ name: '', sub: '', emoji: '🪐', cover: COMMUNITY_TONES[0], intro: '', btn: '加入星球' })

const readerGroups = ref<ReaderGroup[]>([])
const rgError = ref('')

const totalPosts = computed(() => posts.value.length)
const totalEssence = computed(() => posts.value.filter((p) => p.essence).length)
const totalToday = computed(() => posts.value.filter((p) => isToday(p.createTime)).length)
const weekAvg = computed(() => {
  const weekCount = posts.value.filter((p) => {
    if (!p.createTime) return false
    const t = new Date(p.createTime).getTime()
    return Date.now() - t < 7 * 864e5 && !isToday(p.createTime)
  }).length
  return weekCount / 7
})
const rgActive = computed(() => readerGroups.value.filter((g) => g.status !== 0).length)
const rgExpiring = computed(() => readerGroups.value.filter((g) => {
  if (!g.qrExpireAt) return false
  const d = Math.round((new Date(g.qrExpireAt).getTime() - Date.now()) / 864e5)
  return d >= 0 && d <= 2
}).length)

const filteredCommunities = computed(() => {
  let list = communities.value
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter((c) =>
      (c.name || '').toLowerCase().includes(kw) ||
      (c.sub || '').toLowerCase().includes(kw) ||
      (c.intro || '').toLowerCase().includes(kw),
    )
  }
  if (statusFilter.value === 'on') list = list.filter((c) => c.on)
  if (statusFilter.value === 'off') list = list.filter((c) => !c.on)
  const sorted = [...list]
  if (sortBy.value === 'posts') sorted.sort((a, b) => statOf(b.id).postCount - statOf(a.id).postCount)
  else if (sortBy.value === 'today') sorted.sort((a, b) => statOf(b.id).todayCount - statOf(a.id).todayCount)
  else if (sortBy.value === 'essence') sorted.sort((a, b) => statOf(b.id).essenceCount - statOf(a.id).essenceCount)
  return sorted
})

function statOf(id: string) {
  return statsFor(posts.value, id)
}

function qrTag(g: ReaderGroup) {
  if (!g.qrExpireAt) return { cls: 't-draft', text: '未设过期' }
  const d = Math.round((new Date(g.qrExpireAt).getTime() - Date.now()) / 864e5)
  if (d < 0) return { cls: 't-err', text: '二维码已过期' }
  if (d <= 2) return { cls: 't-pending', text: d === 0 ? '今天过期' : `还剩 ${d} 天` }
  return { cls: 't-live', text: `还剩 ${d} 天` }
}

async function loadConfig() {
  configError.value = ''
  try {
    planetConfig.value = await fetchPlanetConfig()
    communities.value = normalizeCommunities(planetConfig.value)
  } catch (e: any) {
    configError.value = e?.message || '星球配置加载失败'
    communities.value = []
  }
}

async function loadPosts() {
  try {
    const res: any = await listCommunityPosts()
    const rows = res?.data ?? res
    posts.value = Array.isArray(rows) ? rows : []
  } catch {
    posts.value = []
  }
}

async function persistCommunities(): Promise<boolean> {
  try {
    await putPlanetConfig(buildPlanetSavePayload(planetConfig.value, communities.value))
    return true
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
    return false
  }
}

function copyId(c: CommCard) {
  navigator.clipboard?.writeText(c.id).then(
    () => ElMessage.success(`已复制 ${c.id}`),
    () => ElMessage.warning('复制失败，请手动选择'),
  )
}

function openCreate() {
  Object.assign(createForm, { name: '', sub: '', emoji: '🪐', cover: COMMUNITY_TONES[communities.value.length % COMMUNITY_TONES.length], intro: '', btn: '加入星球' })
  createVisible.value = true
}

async function submitCreate() {
  const name = createForm.name.trim()
  if (!name) {
    ElMessage.warning('先给社区起个名字')
    return
  }
  const main = communities.value.length === 0
  communities.value.push({
    id: newCommunityId(),
    name,
    sub: createForm.sub.trim(),
    intro: createForm.intro.trim(),
    cover: createForm.cover,
    emoji: createForm.emoji.trim() || '🪐',
    btn: createForm.btn.trim() || '加入星球',
    on: true,
    main,
  })
  if (await persistCommunities()) {
    createVisible.value = false
    ElMessage.success(main ? '已创建并设为主社区' : '已创建')
    loadConfig()
  } else {
    communities.value.pop()
  }
}

function toggleOn(c: CommCard) {
  if (c.on && c.main) {
    ElMessage.warning('主社区不能停用')
    return
  }
  c.on = !c.on
  persistCommunities().then((ok) => {
    if (!ok) c.on = !c.on
  })
}

function setMain(c: CommCard) {
  if (!c.on) {
    ElMessage.warning('先启用再设为主社区')
    return
  }
  const prev = communities.value.find((x) => x.main)
  communities.value.forEach((x) => { x.main = false })
  c.main = true
  persistCommunities().then((ok) => {
    if (!ok) {
      communities.value.forEach((x) => { x.main = false })
      if (prev) prev.main = true
    }
  })
}

async function removeComm(c: CommCard) {
  const postN = statOf(c.id).postCount
  try {
    await ElMessageBox.confirm(
      `删除「${c.name || '未命名社区'}」？${postN ? `该社区还有 ${postN} 条动态，删除后不再展示但动态记录保留。` : ''}`,
      '删除社区',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const backup = communities.value
  communities.value = communities.value.filter((x) => x.id !== c.id)
  if (c.main && communities.value.length) communities.value[0].main = true
  if (await persistCommunities()) {
    ElMessage.success('已删除')
  } else {
    communities.value = backup
  }
}

function enter(id: string) {
  localStorage.setItem('community_last_id', id)
  router.push(`/community/overview/${id}`)
}

async function loadRg() {
  rgError.value = ''
  try {
    const res: any = await listReaderGroups()
    const rows = res?.data ?? res
    readerGroups.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    rgError.value = e?.message || '读者群接口暂不可用'
    readerGroups.value = []
  }
}

async function addRg() {
  try {
    await createReaderGroup({ name: '新读者群', whoCanJoin: 'paid', status: 1 })
    loadRg()
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

async function saveRg(g: ReaderGroup) {
  try {
    await updateReaderGroup(g.id, {
      name: g.name,
      director: g.director,
      whoCanJoin: g.whoCanJoin,
      qrUrl: g.qrUrl,
      qrExpireAt: g.qrExpireAt,
      fullFlag: g.fullFlag ? 1 : 0,
      status: g.status,
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

function onRgFull(g: ReaderGroup, e: Event) {
  g.fullFlag = (e.target as HTMLInputElement).checked ? 1 : 0
  saveRg(g)
}

function onRgStatus(g: ReaderGroup, e: Event) {
  g.status = (e.target as HTMLInputElement).checked ? 1 : 0
  saveRg(g)
}

async function delRg(g: ReaderGroup) {
  try {
    await ElMessageBox.confirm(`删除「${g.name}」？`, '确认')
    await deleteReaderGroup(g.id)
    loadRg()
  } catch {
    /* */
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadConfig(), loadRg(), loadPosts()])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tone-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.tone-dot.on {
  border-color: var(--acc, #b45309);
  box-shadow: 0 0 0 2px var(--accsoft, #faf7f2) inset;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.kpi-card {
  background: var(--card, #fff);
  border: 1px solid var(--line, #eee);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-num {
  font-size: 26px;
  font-weight: 600;
  color: var(--ink, #1f1f1f);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kpi-label {
  font-size: 13px;
  color: var(--mute, #909399);
}
.kpi-sub {
  font-size: 11.5px;
  color: var(--mute, #909399);
  margin-top: 4px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--card, #fff);
  border: 1px solid var(--line, #eee);
  border-radius: 8px;
  padding: 0 10px;
  flex: 1;
  min-width: 220px;
}
.search-box .input {
  border: none;
  background: transparent;
  padding: 8px 0;
  flex: 1;
}
.filter-chips {
  display: flex;
  gap: 6px;
}
.sort-box {
  display: flex;
  align-items: center;
  gap: 6px;
}
.comm-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.comm-sub-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-foot {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.t-today b {
  color: var(--acc, #b45309);
}
.qr-thumb {
  width: 56px;
  height: 56px;
  border: 1px solid var(--line, #eee);
  border-radius: 6px;
  overflow: hidden;
  flex: none;
  background: #fff;
}
.qr-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
@media (max-width: 900px) {
  .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
