<template>
  <div class="resource-ops">
    <PageHeader
      kicker="运营中心"
      title="全局资源位"
      description="配一次，全站生效。弹窗 / 顶部横条 / 悬浮球 / 公告，运营不必再进每个页面逐个改。"
    >
      <template #actions>
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存并生效</el-button>
      </template>
    </PageHeader>

    <!-- 生效范围说明 -->
    <el-alert type="info" :closable="false" class="res-alert">
      <template #title>
        生效范围：首页 / 发现 / 商城 / 星球 / 我的 五个 Tab 页已挂载该组件。
        同类型同时只展示<b>优先级最高</b>的一条；关闭后当天不再自动弹。
      </template>
    </el-alert>

    <!-- 空态 -->
    <el-empty
      v-if="!loading && slots.length === 0"
      description="还没有配置任何资源位"
      class="res-empty"
    >
      <el-button type="primary" @click="add">添加第一个资源位</el-button>
    </el-empty>

    <!-- 资源位卡片列表 -->
    <div v-else class="res-list">
      <div v-for="(slot, idx) in slots" :key="slot.id || idx" class="res-card" :class="{ 'is-off': !slot.enabled }">
        <div class="res-card__head">
          <el-tag :type="tagType(slot.type)" size="small" effect="dark">
            {{ typeLabel(slot.type) }}
          </el-tag>
          <span class="res-card__title">{{ slot.title || '(未填标题)' }}</span>
          <el-switch
            v-model="slot.enabled"
            active-text="启用"
            inactive-text="停用"
            inline-prompt
            class="res-card__switch"
          />
          <div class="res-card__ops">
            <el-button size="small" text @click="move(idx, -1)" :disabled="idx === 0">上移</el-button>
            <el-button size="small" text @click="move(idx, 1)" :disabled="idx === slots.length - 1">下移</el-button>
            <el-button size="small" text type="danger" @click="remove(idx)">删除</el-button>
          </div>
        </div>

        <el-form label-width="96px" size="small" class="res-form">
          <el-form-item label="类型">
            <el-select v-model="slot.type" style="width: 160px">
              <el-option v-for="t in SLOT_TYPES" :key="t" :label="typeLabel(t)" :value="t" />
            </el-select>
            <span class="res-form__hint">{{ typeNote(slot.type) }}</span>
          </el-form-item>

          <el-form-item label="类型图标">
            <div class="res-icons">
              <button
                v-for="t in SLOT_TYPES"
                :key="t"
                type="button"
                class="res-icons__item"
                :class="{ 'is-on': slot.type === t }"
                :title="typeLabel(t)"
                @click="slot.type = t"
              >
                <img :src="`/images/resource-icons/${t}.svg`" :alt="typeLabel(t)" />
                <span>{{ typeLabel(t) }}</span>
              </button>
            </div>
            <span class="res-form__hint">
              切换类型会同步换图标（端上悬浮球与后台预览用同一套 SVG，不用 emoji —— emoji 在
              Windows 会变彩色字形）
            </span>
          </el-form-item>

          <el-form-item label="标题">
            <el-input
              v-model="slot.title"
              :maxlength="maxTitle"
              show-word-limit
              placeholder="一句话说清是什么，用户在屏幕上就看到这一行"
            />
          </el-form-item>

          <el-form-item label="正文">
            <el-input
              v-model="slot.body"
              type="textarea"
              :rows="2"
              :maxlength="maxBody"
              show-word-limit
              placeholder="补充说明，仅弹窗/悬浮球展开时显示"
            />
          </el-form-item>

          <el-form-item label="配图">
            <AssetPickerButton
              :disabled="false"
              label="选择图片"
              @select="(url: string) => (slot.image = url)"
            />
            <el-input
              v-model="slot.image"
              class="res-form__url"
              placeholder="或直接粘贴图片 URL"
            />
            <div class="res-form__hint">仅弹窗类型会用；建议 750×420，宽度撑满卡片</div>
          </el-form-item>

          <el-form-item label="跳转">
            <el-input
              v-model="slot.link"
              placeholder="留空则不可点击（如公告）；填 /pkg-content/xxx/xxx 走分包路径"
            />
            <div class="res-form__hint">
              用分包路径，不要用 <code>/pages/xxx</code>（主包未注册页会被重写，易踩死链）
            </div>
          </el-form-item>

          <el-form-item label="优先级">
            <el-input-number v-model="slot.priority" :min="0" :max="999" />
            <span class="res-form__hint">数字越大越优先；同类型只有优先级最高的一条会展示</span>
          </el-form-item>

          <el-form-item label="生效窗口">
            <el-date-picker
              v-model="slot.startAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="开始（留空=立即）"
              class="res-form__date"
            />
            <span class="res-form__sep">至</span>
            <el-date-picker
              v-model="slot.endAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="结束（留空=不限）"
              class="res-form__date"
            />
          </el-form-item>

          <el-form-item label="每日频次">
            <el-input-number v-model="slot.dailyLimit" :min="0" :max="20" />
            <span class="res-form__hint">
              弹窗/悬浮球每天最多自动弹 N 次，0 = 不限。顶部横条与公告常驻，不计频次。
            </span>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 添加按钮（非空态时也显示在列表末尾） -->
    <div v-if="slots.length" class="res-add">
      <el-button :disabled="slots.length >= maxSlots" @click="add">
        + 添加资源位（{{ slots.length }}/{{ maxSlots }}）
      </el-button>
    </div>

    <!-- 端上预览示意 -->
    <el-card class="res-preview" shadow="never">
      <template #header>端上效果示意</template>
      <div class="pv">
        <div v-if="previewSlots.popup" class="pv__mask">
          <div class="pv__popup">
            <div v-if="previewSlots.popup.image" class="pv__banner">配图</div>
            <div class="pv__body">
              <b>{{ previewSlots.popup.title || '弹窗标题' }}</b>
              <p>{{ previewSlots.popup.body || '弹窗正文' }}</p>
            </div>
            <div class="pv__btns">
              <span class="pv__btn pv__btn--ghost">稍后再说</span>
              <span class="pv__btn pv__btn--primary">立即查看</span>
            </div>
          </div>
        </div>
        <div class="pv__phone">
          <div v-if="previewSlots.bar" class="pv__bar">
            {{ previewSlots.bar.title || '顶部横条' }}
            <span class="pv__bar-x">×</span>
          </div>
          <div v-if="previewSlots.bulletin" class="pv__bulletin">
            · {{ previewSlots.bulletin.title || '公告细条' }}
          </div>
          <div class="pv__body-fake">
            <div class="pv__line" /><div class="pv__line" /><div class="pv__line" />
          </div>
          <div v-if="previewSlots.float" class="pv__float"><img src="/images/resource-icons/float.svg" alt="" /></div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import {
  listSlots,
  slotMeta,
  saveSlots,
  emptySlot,
  SLOT_TYPES,
  type ResourceSlot,
  type SlotType,
} from '@/api/resourceOps'

const loading = ref(false)
const saving = ref(false)
const slots = ref<ResourceSlot[]>([])
const maxSlots = ref(20)
const maxTitle = ref(40)
const maxBody = ref(300)
const metaDesc = ref<Record<string, string>>({})

const typeLabel = (t: string) => metaDesc.value[t] || t
const typeNote = (t: string) => {
  const hit = (typeDesc.value || []).find((x) => x.type === t)
  return hit ? hit.note : ''
}
const tagType = (t: string) =>
  ({ popup: 'danger', bar: 'primary', float: 'success', bulletin: 'info' } as Record<string, any>)[t] ||
  'info'

const typeDesc = computed(() => meta.value.typeDesc || [])

/** 本地预览：按端上同一套规则挑（type → priority 最大） */
const previewSlots = computed(() => {
  const out: Record<string, ResourceSlot | null> = {
    popup: null,
    bar: null,
    float: null,
    bulletin: null,
  }
  slots.value.forEach((s) => {
    if (!s.enabled) return
    const cur = out[s.type]
    if (!cur || (s.priority || 0) > (cur.priority || 0)) out[s.type] = s
  })
  return out
})

const meta = ref<any>({ typeDesc: [] })

async function load() {
  loading.value = true
  try {
    const [listRes, metaRes] = await Promise.all([listSlots(), slotMeta()])
    const data = listRes.data || []
    slots.value = Array.isArray(data) ? data : []
    meta.value = metaRes.data || { typeDesc: [] }
    metaDesc.value = {}
    ;(meta.value.typeDesc || []).forEach((d: any) => {
      metaDesc.value[d.type] = d.label
    })
    maxSlots.value = meta.value.maxSlots || 20
    maxTitle.value = meta.value.maxTitle || 40
    maxBody.value = meta.value.maxBody || 300
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  const bad = slots.value.find((s) => s.enabled && !s.title && !s.body)
  if (bad) {
    ElMessage.warning('有启用的资源位既没标题也没正文，端上不会显示它')
  }
  saving.value = true
  try {
    const res = await saveSlots(slots.value)
    slots.value = res.data || slots.value
    ElMessage.success('已保存，配置会在小程序下次冷启动或回到前台时刷新')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function add() {
  if (slots.value.length >= maxSlots.value) {
    ElMessage.warning(`最多 ${maxSlots.value} 个`)
    return
  }
  slots.value.push(emptySlot('bar'))
}

function remove(idx: number) {
  slots.value.splice(idx, 1)
}

function move(idx: number, delta: number) {
  const to = idx + delta
  if (to < 0 || to >= slots.value.length) return
  const arr = slots.value
  const tmp = arr[idx]
  arr[idx] = arr[to]
  arr[to] = tmp
}

onMounted(load)
</script>

<style scoped>
.resource-ops {
  padding: 16px;
}
.res-alert {
  margin-bottom: 14px;
}
.res-empty {
  padding: 40px 0;
}
.res-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.res-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  padding: 14px 16px 4px;
}
.res-card.is-off {
  opacity: 0.62;
}
.res-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.res-card__title {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary, inherit);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.res-card__switch {
  flex-shrink: 0;
}
.res-card__ops {
  flex-shrink: 0;
}
.res-form__hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
.res-form__url {
  width: 260px;
  margin-left: 10px;
}
.res-form__date {
  width: 200px;
}
.res-form__sep {
  margin: 0 8px;
  color: var(--text-muted);
}

/* 类型图标选择 */
.res-icons {
  display: flex;
  gap: 8px;
}
.res-icons__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 66px;
  padding: 6px 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted);
  transition: border-color 0.15s, background 0.15s;
}
.res-icons__item img {
  width: 28px;
  height: 28px;
}
.res-icons__item:hover {
  border-color: #c08e6e;
}
.res-icons__item.is-on {
  border-color: #c08e6e;
  background: #fdf6ec;
  color: #a0704e;
  font-weight: 600;
}
.res-add {
  margin-top: 12px;
}

/* ── 端上效果示意 ── */
.res-preview {
  margin-top: 18px;
}
.pv {
  position: relative;
  height: 320px;
  background: var(--bg-subtle);
  border-radius: var(--radius);
  overflow: hidden;
}
.pv__phone {
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  width: 240px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.pv__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: linear-gradient(90deg, #2b2118, #4a3728);
  color: #f7f1e6;
  font-size: 11px;
}
.pv__bar-x {
  margin-left: auto;
  opacity: 0.8;
}
.pv__bulletin {
  padding: 4px 10px;
  background: #fdf6ec;
  color: #8a6a4a;
  font-size: 10px;
}
.pv__body-fake {
  padding: 12px 10px;
}
.pv__line {
  height: 8px;
  border-radius: 4px;
  background: #efe7db;
  margin-bottom: 8px;
}
.pv__float {
  position: absolute;
  right: 14px;
  bottom: 42px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: linear-gradient(135deg, #c08e6e, #a0704e);
  color: #fff;
}
.pv__mask {
  position: absolute;
  inset: 0;
  background: rgba(28, 20, 14, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.pv__popup {
  width: 220px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.pv__banner {
  height: 64px;
  background: linear-gradient(135deg, #c08e6e, #a0704e);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv__body {
  padding: 12px 14px 4px;
  text-align: center;
  font-size: 12px;
  color: #2f241c;
}
.pv__body p {
  margin: 6px 0 0;
  font-size: 11px;
  color: #6b5b4b;
}
.pv__btns {
  display: flex;
  gap: 8px;
  padding: 12px 14px 14px;
}
.pv__btn {
  flex: 1;
  text-align: center;
  height: 26px;
  line-height: 26px;
  border-radius: 13px;
  font-size: 11px;
}
.pv__btn--ghost {
  background: #f3ece2;
  color: #6b5b4b;
}
.pv__btn--primary {
  background: #c08e6e;
  color: #fff;
}
</style>