<template>
  <el-dialog
    v-model="visibleProxy"
    :title="isEdit ? '编辑运费模板' : '新建运费模板'"
    width="920px"
    top="4vh"
    class="freight-editor-dialog"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px" class="freight-editor-form">
      <!-- 基本信息 -->
      <section class="editor-section">
        <div class="section-head">
          <h4>基本信息</h4>
          <span>参考有赞/淘宝：模板名称 + 计费方式 + 是否默认</span>
        </div>
        <div class="form-grid-2col">
          <el-form-item label="模板名称" prop="name">
            <el-input v-model="form.name" placeholder="如：全国包邮、江浙沪特惠" maxlength="40" show-word-limit />
          </el-form-item>
          <el-form-item label="模板状态">
            <el-radio-group v-model="form.status">
              <el-radio value="active">使用中</el-radio>
              <el-radio value="inactive">已停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="计费方式" prop="billingMethod">
          <el-radio-group v-model="form.billingMethod" class="billing-radio-group">
            <el-radio-button value="piece">按件数</el-radio-button>
            <el-radio-button value="weight">按重量</el-radio-button>
            <el-radio-button value="free">卖家包邮</el-radio-button>
          </el-radio-group>
          <p class="field-hint">
            按件：首件/续件计费；按重：需商品填写重量；包邮：下单免运费
          </p>
        </el-form-item>
        <div class="form-grid-2col">
          <el-form-item label="运费计算">
            <el-select v-model="form.calcMode" :disabled="form.billingMethod === 'free'" style="width: 100%">
              <el-option label="按商品累加运费（默认）" value="sum" />
              <el-option label="组合运费（取首费最高模板）" value="combo" />
            </el-select>
          </el-form-item>
          <el-form-item label="默认模板">
            <el-switch v-model="form.isDefault" active-text="是" inactive-text="否" />
          </el-form-item>
        </div>
      </section>

      <!-- 配送区域及运费 -->
      <section v-if="form.billingMethod !== 'free'" class="editor-section">
        <div class="section-head">
          <h4>配送区域及运费</h4>
          <el-button type="primary" plain size="small" :icon="Plus" @click="openRegionDialog()">添加配送区域</el-button>
        </div>
        <el-table :data="form.regionRules" border stripe size="small" class="region-table">
          <el-table-column label="配送区域" min-width="200">
            <template #default="{ row }">
              <div class="region-cell">
                <strong>{{ row.regionLabel }}</strong>
                <span class="region-sub">{{ formatRegions(row.regions) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="unitLabels.first" width="110" align="center">
            <template #default="{ row }">{{ row.firstUnit }}{{ unitSuffix }}</template>
          </el-table-column>
          <el-table-column label="首费(元)" width="90" align="center">
            <template #default="{ row }">{{ row.firstFee.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column :label="unitLabels.extra" width="110" align="center">
            <template #default="{ row }">{{ row.extraUnit }}{{ unitSuffix }}</template>
          </el-table-column>
          <el-table-column label="续费(元)" width="90" align="center">
            <template #default="{ row }">{{ row.extraFee.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row, $index }">
              <el-button link type="primary" size="small" @click="openRegionDialog(row, $index)">编辑</el-button>
              <el-button
                link
                type="danger"
                size="small"
                :disabled="form.regionRules.length <= 1"
                @click="removeRegionRule($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <p class="field-hint">
          示例：首1{{ unitSuffix.slice(1) || '件' }}运费10元，每续1{{ unitSuffix.slice(1) || '件' }}续费5元；不足1个续费单位按1个计算
        </p>
      </section>

      <!-- 指定条件包邮 -->
      <section v-if="form.billingMethod !== 'free'" class="editor-section">
        <div class="section-head">
          <h4>指定条件包邮</h4>
          <el-switch v-model="form.freeRule.enabled" active-text="启用" inactive-text="关闭" />
        </div>
        <div v-if="form.freeRule.enabled" class="free-rule-row">
          <span>满</span>
          <el-input-number v-model="form.freeRule.threshold" :min="0" :precision="form.freeRule.type === 'amount' ? 2 : 0" />
          <el-select v-model="form.freeRule.type" style="width: 120px">
            <el-option label="元" value="amount" />
            <el-option label="件" value="piece" />
          </el-select>
          <span>包邮</span>
        </div>
      </section>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="内部说明，可选" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存模板</el-button>
    </template>

    <!-- 配送区域子弹窗 -->
    <el-dialog
      v-model="regionDialogVisible"
      :title="regionEditingIndex === null ? '添加配送区域' : '编辑配送区域'"
      width="640px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form label-width="96px">
        <el-form-item label="区域名称">
          <el-input v-model="regionDraft.regionLabel" placeholder="如：华东地区、偏远加价" maxlength="30" />
        </el-form-item>
        <el-form-item label="快捷选择">
          <div class="preset-tags">
            <button
              v-for="preset in REGION_PRESETS"
              :key="preset.label"
              type="button"
              class="preset-chip"
              :class="{ active: selectedPresetLabels.has(preset.label) }"
              @click="togglePreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
          <p class="field-hint">可多选，选中区域会自动合并到下方「配送省份」</p>
        </el-form-item>
        <el-form-item label="配送省份">
          <el-select
            v-model="regionDraft.regions"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择可配送省份"
            style="width: 100%"
            @change="syncPresetsFromRegions"
          >
            <el-option v-for="p in CHINA_PROVINCES" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <div class="region-fee-grid">
          <el-form-item :label="unitLabels.first">
            <el-input-number v-model="regionDraft.firstUnit" :min="0.01" :precision="form.billingMethod === 'weight' ? 2 : 0" />
          </el-form-item>
          <el-form-item label="首费(元)">
            <el-input-number v-model="regionDraft.firstFee" :min="0" :precision="2" />
          </el-form-item>
          <el-form-item :label="unitLabels.extra">
            <el-input-number v-model="regionDraft.extraUnit" :min="0.01" :precision="form.billingMethod === 'weight' ? 2 : 0" />
          </el-form-item>
          <el-form-item label="续费(元)">
            <el-input-number v-model="regionDraft.extraFee" :min="0" :precision="2" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="regionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRegionRule">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { CHINA_PROVINCES, REGION_PRESETS } from '@/constants/china-regions'
import {
  createDefaultRegionRule,
  createEmptyFreightTemplate,
  type FreightRegionRule,
  type FreightTemplate,
} from '@/types/freight'

const props = defineProps<{
  visible: boolean
  template?: FreightTemplate | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [template: FreightTemplate]
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const isEdit = computed(() => !!props.template?.id)

const formRef = ref<FormInstance>()
const form = reactive(createEmptyFreightTemplate())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  billingMethod: [{ required: true, message: '请选择计费方式', trigger: 'change' }],
}

const unitLabels = computed(() => {
  if (form.billingMethod === 'weight') {
    return { first: '首重(kg)', extra: '续重(kg)' }
  }
  return { first: '首件(件)', extra: '续件(件)' }
})

const unitSuffix = computed(() => (form.billingMethod === 'weight' ? 'kg' : '件'))

const regionDialogVisible = ref(false)
const regionEditingIndex = ref<number | null>(null)
const regionDraft = reactive<FreightRegionRule>(createDefaultRegionRule())
const selectedPresetLabels = ref<Set<string>>(new Set())

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    const source = props.template ? JSON.parse(JSON.stringify(props.template)) as FreightTemplate : createEmptyFreightTemplate()
    Object.assign(form, source)
    if (form.billingMethod !== 'free' && !form.regionRules.length) {
      form.regionRules = [createDefaultRegionRule()]
    }
  },
)

watch(
  () => form.billingMethod,
  (method) => {
    if (method === 'free') {
      form.regionRules = []
      form.freeRule.enabled = false
    } else if (!form.regionRules.length) {
      form.regionRules = [createDefaultRegionRule()]
    }
  },
)

function formatRegions(regions: string[]) {
  if (!regions.length) return '未选择'
  if (regions.includes('全国')) return '全国'
  if (regions.length <= 4) return regions.join('、')
  return `${regions.slice(0, 3).join('、')} 等${regions.length}省`
}

function openRegionDialog(row?: FreightRegionRule, index?: number) {
  regionEditingIndex.value = index ?? null
  const draft = row ? { ...row, regions: [...row.regions] } : createDefaultRegionRule({ regionLabel: '', regions: [] })
  Object.assign(regionDraft, draft)
  syncPresetsFromRegions()
  regionDialogVisible.value = true
}

function syncPresetsFromRegions() {
  const selected = new Set<string>()
  for (const preset of REGION_PRESETS) {
    if (preset.provinces.every((province) => regionDraft.regions.includes(province))) {
      selected.add(preset.label)
    }
  }
  selectedPresetLabels.value = selected
}

function rebuildRegionsFromPresets() {
  const provinces = new Set<string>()
  const labels: string[] = []
  for (const preset of REGION_PRESETS) {
    if (!selectedPresetLabels.value.has(preset.label)) continue
    labels.push(preset.label)
    preset.provinces.forEach((province) => provinces.add(province))
  }
  regionDraft.regions = Array.from(provinces)
  if (labels.length) {
    regionDraft.regionLabel = labels.join('、')
  }
}

function togglePreset(preset: { label: string; provinces: string[] }) {
  const next = new Set(selectedPresetLabels.value)
  if (next.has(preset.label)) next.delete(preset.label)
  else next.add(preset.label)
  selectedPresetLabels.value = next
  rebuildRegionsFromPresets()
}

function saveRegionRule() {
  if (!regionDraft.regionLabel.trim()) {
    ElMessage.warning('请填写区域名称')
    return
  }
  if (!regionDraft.regions.length) {
    ElMessage.warning('请选择配送省份')
    return
  }
  const payload: FreightRegionRule = {
    id: regionDraft.id || createDefaultRegionRule().id,
    regionLabel: regionDraft.regionLabel.trim(),
    regions: [...regionDraft.regions],
    firstUnit: Number(regionDraft.firstUnit),
    firstFee: Number(regionDraft.firstFee),
    extraUnit: Number(regionDraft.extraUnit),
    extraFee: Number(regionDraft.extraFee),
  }
  if (regionEditingIndex.value === null) {
    form.regionRules.push(payload)
  } else {
    form.regionRules[regionEditingIndex.value] = payload
  }
  regionDialogVisible.value = false
}

function removeRegionRule(index: number) {
  form.regionRules.splice(index, 1)
}

function handleClosed() {
  Object.assign(form, createEmptyFreightTemplate())
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.billingMethod !== 'free' && !form.regionRules.length) {
    ElMessage.warning('请至少添加一个配送区域')
    return
  }

  const legacyType = form.billingMethod === 'free' ? 'free' : form.billingMethod === 'weight' ? 'weight' : 'default'
  const payload: FreightTemplate = {
    ...JSON.parse(JSON.stringify(form)),
    id: props.template?.id || form.id || `ft_${Date.now()}`,
    name: form.name.trim(),
    type: legacyType,
    remark: form.remark?.trim() || undefined,
  }
  emit('save', payload)
  visibleProxy.value = false
}
</script>

<style lang="scss" scoped>
.freight-editor-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.editor-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef0f4;

  &:last-of-type {
    border-bottom: none;
  }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #111;
  }

  span {
    flex: 1;
    font-size: 12px;
    color: #9ca3af;
  }
}

.form-grid-2col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.billing-radio-group {
  width: 100%;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
}

.region-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 13px;
    color: #222;
  }
}

.region-sub {
  font-size: 11px;
  color: #9ca3af;
}

.free-rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  border: 1px solid #dce3ef;
  background: #f8fafc;
  color: #475569;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #93b4ff;
    color: #2469f0;
  }

  &.active {
    border-color: #2469f0;
    background: #ecf3ff;
    color: #2469f0;
    font-weight: 600;
  }
}

.region-fee-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

@media (max-width: 768px) {
  .form-grid-2col,
  .region-fee-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="scss">
.freight-editor-dialog .el-dialog__body {
  padding-top: 8px;
}
</style>
