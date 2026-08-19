<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="如：知识产品" />
    </el-form-item>
    <el-form-item label="副标题">
      <el-input :model-value="data.subtitle" @input="emit('update', { subtitle: $event })" placeholder="可选" />
    </el-form-item>
    <el-form-item label="对齐">
      <el-radio-group :model-value="data.align || 'left'" @change="(v: string) => emit('update', { align: v })">
        <el-radio-button value="left">居左</el-radio-button>
        <el-radio-button value="center">居中</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="标题加粗">
      <el-switch
        :model-value="data.title_bold !== false"
        @change="(v: boolean) => emit('update', { title_bold: v })"
      />
    </el-form-item>
    <el-divider content-position="left">间距</el-divider>
    <el-form-item label="上留白">
      <el-input-number
        :model-value="Number(data.padding_top ?? 4)"
        :min="0"
        :max="48"
        controls-position="right"
        @change="(v: number | undefined) => emit('update', { padding_top: v ?? 4 })"
      />
      <div class="hint" style="margin-top:4px">单位 px</div>
    </el-form-item>
    <el-form-item label="下留白">
      <el-input-number
        :model-value="Number(data.padding_bottom ?? 8)"
        :min="0"
        :max="48"
        controls-position="right"
        @change="(v: number | undefined) => emit('update', { padding_bottom: v ?? 8 })"
      />
      <div class="hint" style="margin-top:4px">单位 px</div>
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      subtitle-label="副标题字号"
      :title-default="16"
      :subtitle-default="11"
      @update="(v) => emit('update', v)"
    />
    <el-form-item label="标题颜色">
      <el-color-picker
        :model-value="data.title_color || '#172033'"
        @change="(v: string | null) => emit('update', { title_color: v || '#172033' })"
      />
    </el-form-item>
    <el-form-item label="副标题色">
      <el-color-picker
        :model-value="data.subtitle_color || '#7b8798'"
        @change="(v: string | null) => emit('update', { subtitle_color: v || '#7b8798' })"
      />
    </el-form-item>
    <el-divider content-position="left">右侧更多</el-divider>
    <el-form-item label="显示更多">
      <el-switch
        :model-value="data.show_more === true"
        @change="(v: boolean) => emit('update', { show_more: v })"
      />
    </el-form-item>
    <template v-if="data.show_more === true">
      <el-form-item label="更多文案">
        <el-input
          :model-value="data.more_text ?? '查看更多>'"
          @input="emit('update', { more_text: $event })"
        />
      </el-form-item>
      <el-form-item label="跳转路径">
        <el-input
          :model-value="data.more_link ?? ''"
          placeholder="/pages/content-list/content-list"
          @input="emit('update', { more_link: $event })"
        />
      </el-form-item>
      <el-form-item label="更多颜色">
        <el-color-picker
          :model-value="data.more_color || '#7b8798'"
          @change="(v: string | null) => emit('update', { more_color: v || '#7b8798' })"
        />
      </el-form-item>
    </template>
    <div class="hint">标题栏与列表已拆开：先拖本组件，再在下方拖「商品列表 / 文章列表」。</div>
  </el-form>
</template>

<script setup lang="ts">
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped>
.hint {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
