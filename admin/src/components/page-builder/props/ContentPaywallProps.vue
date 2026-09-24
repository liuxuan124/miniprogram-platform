<template>
  <div class="props-block">
    <el-form label-width="96px" size="small">
      <el-divider content-position="left">文案</el-divider>
      <el-form-item label="主标题">
        <el-input :model-value="data.title" @update:model-value="(v: string) => emit('update', { title: v })" />
        <div class="ds-hint">可用变量：{剩余比例} {价格} {会员价}</div>
      </el-form-item>
      <el-form-item label="副标题">
        <el-input
          :model-value="data.subtitle"
          placeholder="剩余 {剩余比例} 内容需解锁"
          @update:model-value="(v: string) => emit('update', { subtitle: v })"
        />
      </el-form-item>
      <el-form-item label="说明">
        <el-input
          type="textarea"
          :rows="2"
          :model-value="data.hint"
          @update:model-value="(v: string) => emit('update', { hint: v })"
        />
      </el-form-item>
      <el-form-item label="主按钮">
        <el-input
          :model-value="data.button_text"
          @update:model-value="(v: string) => emit('update', { button_text: v })"
        />
      </el-form-item>

      <el-divider content-position="left">解锁方式</el-divider>
      <el-form-item label="方式排序">
        <el-checkbox-group
          :model-value="unlockMethods"
          @change="(v: string[]) => emit('update', { unlock_methods: v })"
        >
          <el-checkbox label="vip">会员</el-checkbox>
          <el-checkbox label="single">单篇购买</el-checkbox>
          <el-checkbox label="planet">星球</el-checkbox>
          <el-checkbox label="invite">邀请</el-checkbox>
          <el-checkbox label="points">积分</el-checkbox>
        </el-checkbox-group>
        <div class="ds-hint">勾选顺序即展示顺序；第一项为主按钮</div>
      </el-form-item>

      <el-divider content-position="left">遮罩与已解锁</el-divider>
      <el-form-item label="遮罩高度">
        <el-input-number
          :model-value="Number(data.mask_height ?? 72)"
          :min="40"
          :max="200"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { mask_height: v ?? 72 })"
        />
      </el-form-item>
      <el-form-item label="遮罩色">
        <el-input
          :model-value="data.mask_color"
          placeholder="留空用默认渐变"
          @update:model-value="(v: string) => emit('update', { mask_color: v })"
        />
      </el-form-item>
      <el-form-item label="已解锁后">
        <el-radio-group
          :model-value="data.unlocked_behavior || 'hide'"
          @change="(v: string) => emit('update', { unlocked_behavior: v })"
        >
          <el-radio-button value="hide">隐藏墙</el-radio-button>
          <el-radio-button value="banner">提示条</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-divider content-position="left">编辑器预览</el-divider>
      <el-form-item label="预览身份">
        <el-radio-group
          :model-value="data.preview_identity || 'guest'"
          @change="(v: string) => emit('update', { preview_identity: v })"
        >
          <el-radio-button value="guest">访客</el-radio-button>
          <el-radio-button value="logged_unpaid">已登录未付</el-radio-button>
          <el-radio-button value="unlocked">已解锁</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="演示数据">
        <el-input
          :model-value="String(paywallRemain)"
          placeholder="剩余比例"
          @update:model-value="patchPaywall('remainPercent', $event)"
        />
      </el-form-item>

      <el-divider content-position="left">关联内容</el-divider>
      <el-form-item label="长文 ID">
        <el-input
          :model-value="data.content_id"
          placeholder="小程序端可拉取真实解锁选项"
          @update:model-value="(v: string) => emit('update', { content_id: v })"
        />
      </el-form-item>
      <LinkPickerField
        label="主按钮跳转"
        :model-value="data.primary_link"
        @update:model-value="(v: string) => emit('update', { primary_link: v })"
      />
      <el-form-item label="主题">
        <el-select
          :model-value="data.theme || 'warm'"
          style="width: 100%"
          @change="(v: string) => emit('update', { theme: v })"
        >
          <el-option label="暖色" value="warm" />
          <el-option label="蓝色" value="blue" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import LinkPickerField from '../LinkPickerField.vue'
import { normalizeUnlockMethods } from '@/utils/dsl-paywall'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const unlockMethods = computed(() => normalizeUnlockMethods(data.unlock_methods))
const paywallRemain = computed(() => data.paywall?.remainPercent ?? 30)

function patchPaywall(key: string, value: string) {
  const paywall = { ...(data.paywall || {}), [key]: value }
  emit('update', { paywall })
}
</script>
