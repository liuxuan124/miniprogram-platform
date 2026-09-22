<template>
  <div class="member-wb mw-page" v-loading="loading">
    <template v-if="!activeId">
      <div class="head">
        <div>
          <h1 class="h1">社区</h1>
          <div class="sub">用户端叫「星球」。顺序即小程序展示顺序；成员由付费档自动决定</div>
        </div>
        <div class="actions">
          <button type="button" class="btn primary" @click="savePlanet"><MiniIcon name="plus" :size="15" />保存星球配置</button>
        </div>
      </div>

      <div v-if="configError" class="empty-box">{{ configError }}</div>

      <div class="comm-grid">
        <article
          v-for="(c, i) in communities"
          :key="c.id"
          class="comm"
          :class="{ off: !c.on }"
        >
          <div class="comm-cover" :style="{ background: c.cover || TONES[i % TONES.length] }">
            <span v-if="c.main" class="tag t-acc">主社区</span>
            <span class="tag" :class="c.on ? 't-live' : 't-draft'" style="margin-left:auto">{{ c.on ? '展示中' : '已停用' }}</span>
          </div>
          <div class="comm-body">
            <b style="font-size:16px">{{ c.name || '未命名社区' }}</b>
            <span class="faint">{{ c.sub || '还没有副标题' }}</span>
            <div class="comm-stats">
              <span><b>{{ c.memberCount ?? '—' }}</b>成员</span>
              <span><b>{{ postCount(c.id) }}</b>动态</span>
              <span><b>{{ essenceCount(c.id) }}</b>精华</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn sm primary" @click="enter(c.id)">进入运营</button>
              <button type="button" class="btn sm" @click="toggleOn(c)">{{ c.on ? '停用' : '启用' }}</button>
              <button v-if="!c.main" type="button" class="btn sm" @click="setMain(c)">设为主社区</button>
            </div>
          </div>
        </article>
        <div v-if="!communities.length" class="empty-box" style="grid-column:1/-1">
          暂无社区配置。请在星球配置中补充，或等待接口返回。
        </div>
      </div>

      <section class="card">
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
        <div class="faint" style="margin-top:8px">进群须知在「客服」里设置。</div>
      </section>
    </template>

    <!-- 社区详情 -->
    <template v-else>
      <div class="head">
        <div>
          <button type="button" class="link" style="font-size:13px;color:var(--mute)" @click="activeId = ''">‹ 全部社区</button>
          <h1 class="h1" style="margin-top:4px">{{ activeComm?.name || '未命名社区' }}</h1>
          <div class="sub">{{ activeComm?.on ? '展示中' : '已停用' }}{{ activeComm?.main ? ' · 主社区' : '' }}</div>
        </div>
      </div>

      <div class="tabs-line" role="tablist">
        <button type="button" :class="{ on: ctab === 'feed' }" @click="ctab = 'feed'">动态</button>
        <button type="button" :class="{ on: ctab === 'members' }" @click="ctab = 'members'">成员</button>
        <button type="button" :class="{ on: ctab === 'topics' }" @click="ctab = 'topics'; loadCheckins()">话题与打卡</button>
        <button type="button" :class="{ on: ctab === 'set' }" @click="ctab = 'set'">资料与入场</button>
      </div>

      <template v-if="ctab === 'feed'">
        <form class="card composer2" @submit.prevent="publishPost">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-for="k in ['feed', 'topic', 'checkin']" :key="k" type="button" class="chip" :class="{ on: postKind === k }" @click="postKind = k">
              {{ k === 'feed' ? '动态' : k === 'topic' ? '热议' : '打卡' }}
            </button>
            <span class="faint" style="margin-left:auto;align-self:center">以星主身份发布</span>
          </div>
          <textarea v-model="postText" class="input" rows="3" placeholder="在社区里直接发，不用再去内容管理建「动态」" />
          <div style="display:flex;justify-content:flex-end">
            <button type="submit" class="btn primary sm"><MiniIcon name="send" :size="14" />发布</button>
          </div>
        </form>

        <div v-if="postsError" class="empty-box">{{ postsError }}</div>
        <article v-for="p in posts" :key="p.id" class="post" :class="{ hid: !!p.hidden }">
          <div class="ihead">
            <span class="uav" style="width:30px;height:30px;background:var(--accsoft)">{{ (p.authorName || '?').charAt(0) }}</span>
            <b>{{ p.authorName || '匿名' }}</b>
            <span class="tag t-draft">{{ p.kind || 'feed' }}</span>
            <span v-if="p.pinned" class="tag t-pending">置顶</span>
            <span v-if="p.essence" class="tag t-acc">精华</span>
            <span v-if="p.hidden" class="tag t-err">已隐藏</span>
            <span class="faint" style="margin-left:auto">{{ shortDate(p.createTime) }}</span>
          </div>
          <div class="itext">{{ p.textContent }}</div>
          <div v-if="p.replyText" class="answer"><b>星主回复：</b>{{ p.replyText }}</div>
          <div class="post-foot">
            <span class="faint">{{ p.likes || 0 }} 赞 · {{ p.comments || 0 }} 评论</span>
            <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn sm" @click="patchPost(p, { pinned: p.pinned ? 0 : 1 })">{{ p.pinned ? '取消置顶' : '置顶' }}</button>
              <button type="button" class="btn sm" @click="patchPost(p, { essence: p.essence ? 0 : 1 })">{{ p.essence ? '取消精华' : '加精' }}</button>
              <button type="button" class="btn sm" @click="replyPost(p)">回复</button>
              <button type="button" class="btn sm" :class="{ danger: !p.hidden }" @click="patchPost(p, { hidden: p.hidden ? 0 : 1 })">{{ p.hidden ? '恢复' : '隐藏' }}</button>
            </span>
          </div>
        </article>
        <div v-if="!posts.length && !postsError" class="card muted" style="text-align:center">这里还没有动态</div>
      </template>

      <template v-else-if="ctab === 'members'">
        <div class="note">成员由持有对应付费档且未过期的用户自动计算。想让某人进来，去「用户」里赠送会员。</div>
        <div class="empty-box" style="margin-top:12px">成员名单依赖后端社区成员接口；当前请从用户页按付费档筛选。</div>
      </template>

      <template v-else-if="ctab === 'topics'">
        <div class="set-grid">
          <section class="card">
            <h2 class="h2">打卡挑战</h2>
            <div class="sub">给成员一个每天回来的理由</div>
            <div style="margin-top:10px">
              <div v-for="k in checkins" :key="k.id" class="list-row">
                <label class="switch">
                  <input type="checkbox" :checked="k.status !== 0" @change="toggleChk(k, $event)" />
                  <span />
                </label>
                <div style="flex:1">
                  <b style="font-weight:500;display:block">{{ k.name }}</b>
                  <span class="faint">{{ k.days || 7 }} 天 · {{ k.joinedCount || 0 }} 人参加 · 今天 {{ k.todayCount || 0 }} 人</span>
                </div>
                <button type="button" class="iconbtn" @click="delChk(k)"><MiniIcon name="x" :size="12" /></button>
              </div>
              <div v-if="!checkins.length" class="faint" style="padding:10px 0">暂无打卡</div>
            </div>
            <form style="display:flex;gap:8px;margin-top:12px" @submit.prevent="addChk">
              <input v-model="chkName" class="input" placeholder="新挑战，比如：21 天读完一本书" style="flex:1" />
              <button type="submit" class="btn sm"><MiniIcon name="plus" :size="14" />添加</button>
            </form>
          </section>
          <section class="card">
            <h2 class="h2">话题说明</h2>
            <div class="sub">热议话题按动态互动汇总；无数据时显示空态</div>
            <div class="faint" style="margin-top:12px">本周带话题动态：{{ posts.filter((p) => p.topic).length }}</div>
          </section>
        </div>
      </template>

      <template v-else>
        <div class="card" style="display:flex;flex-direction:column;gap:14px;max-width:720px">
          <div class="field"><label>社区名称</label><input v-model="editForm.name" class="input" /></div>
          <div class="field"><label>副标题</label><input v-model="editForm.sub" class="input" /><span class="faint">{'{n}'} 会替换为成员数</span></div>
          <div class="field"><label>介绍</label><textarea v-model="editForm.intro" class="input" rows="3" /></div>
          <div class="field"><label>主按钮文案</label><input v-model="editForm.btn" class="input" /></div>
          <button type="button" class="btn primary" style="align-self:flex-start" @click="applySet">保存到星球配置</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { get, put } from '@/api/request'
import {
  listCommunityPosts,
  createCommunityPost,
  updateCommunityPost,
  listCheckins,
  createCheckin,
  updateCheckin,
  deleteCheckin,
  listReaderGroups,
  createReaderGroup,
  updateReaderGroup,
  deleteReaderGroup,
  type CommunityPost,
  type CommunityCheckin,
  type ReaderGroup,
} from '@/api/memberOps'

const TONES = ['#F3D9A4', '#FCEBDD', '#E6EEFA', '#E3F3EA', '#EFE6DA', '#F3DDE6']

interface CommCard {
  id: string
  name: string
  sub?: string
  intro?: string
  cover?: string
  btn?: string
  on: boolean
  main: boolean
  memberCount?: number
  raw?: any
}

const loading = ref(false)
const configError = ref('')
const communities = ref<CommCard[]>([])
const planetConfig = ref<any>({})
const activeId = ref('')
const ctab = ref<'feed' | 'members' | 'topics' | 'set'>('feed')

const posts = ref<CommunityPost[]>([])
const postsError = ref('')
const postKind = ref('feed')
const postText = ref('')

const checkins = ref<CommunityCheckin[]>([])
const chkName = ref('')

const readerGroups = ref<ReaderGroup[]>([])
const rgError = ref('')

const editForm = reactive({ name: '', sub: '', intro: '', btn: '' })

const activeComm = computed(() => communities.value.find((c) => c.id === activeId.value))

function shortDate(s?: string) {
  return s ? String(s).replace('T', ' ').slice(5, 16) : ''
}
function postCount(id: string) {
  return posts.value.filter((p) => (p.communityId || 'main') === id).length
}
function essenceCount(id: string) {
  return posts.value.filter((p) => (p.communityId || 'main') === id && p.essence).length
}
function qrTag(g: ReaderGroup) {
  if (!g.qrExpireAt) return { cls: 't-draft', text: '未设过期' }
  const d = Math.round((new Date(g.qrExpireAt).getTime() - Date.now()) / 864e5)
  if (d < 0) return { cls: 't-err', text: '二维码已过期' }
  if (d <= 2) return { cls: 't-pending', text: d === 0 ? '今天过期' : `还剩 ${d} 天` }
  return { cls: 't-live', text: `还剩 ${d} 天` }
}

function normalizeCommunities(cfg: any): CommCard[] {
  const list = cfg?.communities || cfg?.planets || cfg?.items
  if (Array.isArray(list) && list.length) {
    return list.map((c: any, i: number) => ({
      id: String(c.id || c.planetId || `c${i}`),
      name: c.name || c.title || '',
      sub: c.sub || c.subtitle || '',
      intro: c.intro || c.description || '',
      cover: c.cover || c.coverColor || TONES[i % TONES.length],
      btn: c.btn || c.buttonText || '加入',
      on: c.on !== false && c.status !== 0 && c.enabled !== false,
      main: !!(c.main || c.isMain || i === 0),
      memberCount: c.memberCount,
      raw: c,
    }))
  }
  // 兼容单星球配置
  if (cfg && (cfg.name || cfg.title || cfg.planetName)) {
    return [{
      id: String(cfg.planetId || cfg.id || 'main'),
      name: cfg.name || cfg.title || cfg.planetName || '主星球',
      sub: cfg.sub || cfg.subtitle || '',
      intro: cfg.intro || cfg.description || '',
      cover: cfg.cover || TONES[0],
      btn: cfg.btn || '加入',
      on: true,
      main: true,
      raw: cfg,
    }]
  }
  return []
}

async function loadConfig() {
  configError.value = ''
  try {
    const res: any = await get('/api/v1/admin/planet/config')
    planetConfig.value = res?.data ?? res ?? {}
    communities.value = normalizeCommunities(planetConfig.value)
  } catch (e: any) {
    configError.value = e?.message || '星球配置加载失败'
    communities.value = []
  }
}

async function savePlanet() {
  try {
    const payload = {
      ...planetConfig.value,
      communities: communities.value.map((c) => ({
        ...(c.raw || {}),
        id: c.id,
        name: c.name,
        sub: c.sub,
        intro: c.intro,
        cover: c.cover,
        btn: c.btn,
        on: c.on,
        main: c.main,
      })),
    }
    await put('/api/v1/admin/planet/config', payload)
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

function toggleOn(c: CommCard) {
  if (c.on && c.main) {
    ElMessage.warning('主社区不能停用')
    return
  }
  c.on = !c.on
}
function setMain(c: CommCard) {
  if (!c.on) {
    ElMessage.warning('先启用再设为主社区')
    return
  }
  communities.value.forEach((x) => { x.main = false })
  c.main = true
}

async function enter(id: string) {
  activeId.value = id
  ctab.value = 'feed'
  const c = communities.value.find((x) => x.id === id)
  if (c) Object.assign(editForm, { name: c.name, sub: c.sub || '', intro: c.intro || '', btn: c.btn || '' })
  await loadPosts()
}

async function loadPosts() {
  postsError.value = ''
  try {
    const res: any = await listCommunityPosts({ communityId: activeId.value })
    const rows = res?.data ?? res
    posts.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    postsError.value = e?.message || '动态接口暂不可用'
    posts.value = []
  }
}

async function publishPost() {
  if (!postText.value.trim()) return
  try {
    await createCommunityPost({
      communityId: activeId.value,
      kind: postKind.value,
      textContent: postText.value,
      authorName: '星主',
    })
    postText.value = ''
    ElMessage.success('已发布')
    loadPosts()
  } catch (e: any) {
    ElMessage.error(e?.message || '发布失败')
  }
}

async function patchPost(p: CommunityPost, patch: Partial<CommunityPost>) {
  try {
    await updateCommunityPost(p.id, patch)
    Object.assign(p, patch)
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

async function replyPost(p: CommunityPost) {
  try {
    const { value } = await ElMessageBox.prompt('星主回复', '回复', { inputValue: p.replyText || '' })
    await patchPost(p, { replyText: value })
  } catch {
    /* */
  }
}

async function loadCheckins() {
  try {
    const res: any = await listCheckins({ communityId: activeId.value })
    const rows = res?.data ?? res
    checkins.value = Array.isArray(rows) ? rows : []
  } catch {
    checkins.value = []
  }
}

async function addChk() {
  if (!chkName.value.trim()) return
  try {
    await createCheckin({ communityId: activeId.value, name: chkName.value, days: 7, status: 1 })
    chkName.value = ''
    loadCheckins()
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

async function toggleChk(k: CommunityCheckin, e: Event) {
  const on = (e.target as HTMLInputElement).checked
  try {
    await updateCheckin(k.id, { status: on ? 1 : 0 })
    k.status = on ? 1 : 0
  } catch (err: any) {
    ElMessage.error(err?.message || '更新失败')
  }
}

async function delChk(k: CommunityCheckin) {
  try {
    await deleteCheckin(k.id)
    loadCheckins()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function applySet() {
  const c = activeComm.value
  if (!c) return
  Object.assign(c, { ...editForm })
  savePlanet()
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
    await Promise.all([loadConfig(), loadRg()])
  } finally {
    loading.value = false
  }
})
</script>
