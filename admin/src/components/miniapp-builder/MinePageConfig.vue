<template>
  <div class="mine-page-config">
    <div class="config-label">我的页面配置</div>

    <!-- 登录区域 -->
    <div class="config-block">
      <div class="block-title">登录提示区</div>
      <el-form label-width="80px" size="small">
        <el-form-item label="登录标题">
          <el-input :model-value="modelValue.loginTitle" @input="(v: string) => updateField('loginTitle', v)" placeholder="点击登录，解锁会员权益" />
        </el-form-item>
        <el-form-item label="登录副标">
          <el-input :model-value="modelValue.loginSubtitle" @input="(v: string) => updateField('loginSubtitle', v)" placeholder="登录后查看订单、优惠券、积分等个人信息" />
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input :model-value="modelValue.loginButtonText" @input="(v: string) => updateField('loginButtonText', v)" placeholder="微信一键登录" />
        </el-form-item>
        <el-form-item label="会员卡名">
          <el-input :model-value="modelValue.memberCardTitle" @input="(v: string) => updateField('memberCardTitle', v)" placeholder="我的会员中心" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 用户信息区 -->
    <div class="config-block">
      <div class="block-title">用户信息区</div>
      <el-form label-width="100px" size="small" class="compact-form">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="显示头像">
              <el-switch :model-value="modelValue.userProfile.showAvatar" @change="(v: boolean) => updateNested('userProfile', 'showAvatar', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示昵称">
              <el-switch :model-value="modelValue.userProfile.showNickname" @change="(v: boolean) => updateNested('userProfile', 'showNickname', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示等级">
              <el-switch :model-value="modelValue.userProfile.showMemberLevel" @change="(v: boolean) => updateNested('userProfile', 'showMemberLevel', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="允许编辑资料">
              <el-switch :model-value="modelValue.userProfile.allowEditProfile" @change="(v: boolean) => updateNested('userProfile', 'allowEditProfile', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级标签文字">
              <el-input :model-value="modelValue.userProfile.memberLevelLabel" @input="(v: string) => updateNested('userProfile', 'memberLevelLabel', v)" placeholder="会员等级" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 订单快捷入口 -->
    <div class="config-block">
      <div class="block-title">
        订单快捷入口
        <el-switch :model-value="modelValue.orderQuickAccess.showOrderTabs" @change="(v: boolean) => updateNested('orderQuickAccess', 'showOrderTabs', v)" style="margin-left:auto" />
      </div>
      <template v-if="modelValue.orderQuickAccess.showOrderTabs">
        <el-form label-width="70px" size="small" class="compact-form">
          <el-row :gutter="10">
            <el-col :span="6">
              <el-form-item label="待付款">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.pending" @input="(v: string) => updateNestedDeep('orderQuickAccess.tabLabels', 'pending', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="待发货">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.paid" @input="(v: string) => updateNestedDeep('orderQuickAccess.tabLabels', 'paid', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="待收货">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.shipped" @input="(v: string) => updateNestedDeep('orderQuickAccess.tabLabels', 'shipped', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="退换/售后">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.refund" @input="(v: string) => updateNestedDeep('orderQuickAccess.tabLabels', 'refund', v)" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="全部订单按钮">
            <el-switch :model-value="modelValue.orderQuickAccess.showAllOrdersBtn" @change="(v: boolean) => updateNested('orderQuickAccess', 'showAllOrdersBtn', v)" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <!-- 菜单项 -->
    <div class="config-block">
      <div class="block-title">
        功能菜单
        <el-button text type="primary" size="small" @click="addMenuItem">
          <el-icon><Plus /></el-icon> 添加菜单
        </el-button>
      </div>

      <draggable v-model="menuItems" item-key="id" handle=".drag-handle" @update:modelValue="emitUpdate" class="menu-list">
        <template #item="{ element: item, index }">
          <div class="menu-item" :class="{ hidden: !item.enabled }">
            <div class="drag-handle">⠿</div>
            <span class="menu-icon" @click="editMenuIcon(index)">{{ item.icon }}</span>
            <div class="menu-fields">
              <el-input v-model="item.title" placeholder="菜单名称" size="small" @input="emitUpdate" />
              <el-input v-model="item.url" placeholder="页面路径 / action标识" size="small" @input="emitUpdate" />
            </div>
            <div class="menu-actions">
              <el-switch v-model="item.enabled" size="small" @change="emitUpdate" />
              <el-button text size="small" type="danger" @click="removeMenuItem(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </draggable>

      <el-dialog v-model="iconDialogVisible" title="选择图标" width="400px" destroy-on-close>
        <div class="icon-grid">
          <button v-for="icon in menuIconList" :key="icon" class="icon-opt" :class="{ active: pickedIcon === icon }" @click="pickedIcon = icon">{{ icon }}</button>
        </div>
        <template #footer>
          <el-button @click="iconDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMenuIcon">确认</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import type { MineMenuItem, MinePageConfig } from '@/types/miniapp'

const props = defineProps<{ modelValue: MinePageConfig }>()
const emit = defineEmits<{ 'update:modelValue': [value: MinePageConfig] }>()

const menuItems = ref<MineMenuItem[]>([...props.modelValue.menuItems])
watch(() => props.modelValue.menuItems, (v) => { menuItems.value = [...v] }, { deep: true })

function updateField(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateNested(parent: string, key: string, value: any) {
  const current = props.modelValue
  if (parent === 'orderQuickAccess') {
    emit('update:modelValue', { ...current, orderQuickAccess: { ...current.orderQuickAccess, [key]: value } })
  } else if (parent === 'userProfile') {
    emit('update:modelValue', { ...current, userProfile: { ...current.userProfile, [key]: value } })
  }
}

function updateNestedDeep(parent1: string, parent2: string, value: any) {
  const current = props.modelValue
  if (parent1 === 'orderQuickAccess') {
    emit('update:modelValue', { ...current, orderQuickAccess: { ...current.orderQuickAccess, [parent2]: value } })
  } else if (parent1 === 'userProfile') {
    emit('update:modelValue', { ...current, userProfile: { ...current.userProfile, [parent2]: value } })
  }
}

function emitUpdate() {
  emit('update:modelValue', { ...props.modelValue, menuItems: [...menuItems.value] })
}

function addMenuItem() {
  menuItems.value.push({ id: `mine-${Date.now()}`, icon: '📦', title: '新菜单', url: '', enabled: true, group: '' })
  emitUpdate()
}

function removeMenuItem(index: number) {
  menuItems.value.splice(index, 1)
  emitUpdate()
}

const iconDialogVisible = ref(false)
const editingMenuIdx = ref(-1)
const pickedIcon = ref('')
const menuIconList = ['📦','💰','🎫','❤️','📍','📞','⚙️','💬','🎯','📊','🎪','🎮','🎵','📸','🔔','🎁','🚀','💡','🔑','📱','🛒','📋','👤','👑','📝','🔍','📅','🛍️','🤖','⭐']

function editMenuIcon(index: number) {
  editingMenuIdx.value = index
  pickedIcon.value = menuItems.value[index].icon
  iconDialogVisible.value = true
}

function confirmMenuIcon() {
  if (editingMenuIdx.value >= 0) {
    menuItems.value[editingMenuIdx.value].icon = pickedIcon.value
    emitUpdate()
  }
  iconDialogVisible.value = false
}
</script>

<style scoped>
.mine-page-config { margin-bottom: 20px; }
.config-label { font-size: 14px; font-weight: 700; color: #172033; margin-bottom: 14px; }
.config-block { background: #fafbfc; border: 1px solid #e3e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.block-title { display: flex; align-items: center; font-size: 13px; font-weight: 700; color: #4a5568; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eef0f4; }
.compact-form .el-form-item { margin-bottom: 8px; }
.compact-form .el-form-item__label { font-size: 12px; }

.menu-list { display: flex; flex-direction: column; gap: 6px; }
.menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; transition: 0.14s; }
.menu-item:hover { border-color: #a0b4d0; }
.menu-item.hidden { opacity: 0.5; }
.drag-handle { cursor: grab; color: #a0b4d0; font-size: 14px; }
.drag-handle:active { cursor: grabbing; }
.menu-icon { width: 32px; height: 32px; display: grid; place-items: center; font-size: 18px; cursor: pointer; border-radius: 6px; background: #f0f4ff; }
.menu-icon:hover { background: #e0e7ff; }
.menu-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.menu-actions { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.icon-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.icon-opt { width: 40px; height: 40px; display: grid; place-items: center; font-size: 20px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; cursor: pointer; transition: 0.14s; }
.icon-opt:hover { border-color: #1769ff; }
.icon-opt.active { border-color: #1769ff; background: #eff6ff; box-shadow: 0 0 0 2px rgba(23,105,255,0.2); }
</style>
