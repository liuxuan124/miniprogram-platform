<template>
  <div v-if="visible" class="preview-login-overlay">
    <div class="preview-login-overlay__mask" @click="emit('close')" />
    <div class="preview-login-overlay__sheet">
      <div class="preview-login-overlay__handle" />
      <div class="preview-login-overlay__brand">
        <img
          v-if="brand.logoUrl"
          class="preview-login-overlay__mark preview-login-overlay__mark--img"
          :src="brand.logoUrl"
          alt=""
        />
        <span v-else class="preview-login-overlay__mark">{{ brand.logoMark }}</span>
        <div class="preview-login-overlay__brand-copy">
          <strong>{{ brand.appName }}</strong>
          <span>{{ brand.loginTagline }}</span>
        </div>
      </div>
      <div class="preview-login-overlay__panel">
        <div class="preview-login-overlay__row">
          <span>头像、昵称</span>
          <em>让主页有你的样子</em>
        </div>
        <div class="preview-login-overlay__divider" />
        <div class="preview-login-overlay__row">
          <span>手机号</span>
          <em>点击授权微信手机号</em>
        </div>
      </div>
      <label class="preview-login-overlay__agreement">
        <input v-model="privacyAccepted" type="checkbox" />
        <span>已阅读并同意《用户协议》与《隐私政策》</span>
      </label>
      <button
        type="button"
        class="preview-login-overlay__cta"
        :disabled="!privacyAccepted"
        @click="emit('complete')"
      >微信一键登录</button>
      <button type="button" class="preview-login-overlay__skip" @click="emit('close')">先随便逛逛</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  visible: boolean
  brand: {
    appName: string
    logoMark: string
    loginTagline: string
    logoUrl?: string
  }
}>()

const privacyAccepted = defineModel<boolean>('privacyAccepted', { default: false })

const emit = defineEmits<{
  close: []
  complete: []
}>()

watch(
  () => props.visible,
  (open) => {
    if (open) privacyAccepted.value = false
  },
)
</script>

<style scoped lang="scss">
.preview-login-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  animation: loginOverlayIn 0.24s ease;
}

.preview-login-overlay__mask {
  position: absolute;
  inset: 0;
  background: rgba(11, 18, 33, 0.42);
}

.preview-login-overlay__sheet {
  position: relative;
  z-index: 1;
  padding: 8px 18px 20px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgba(23, 32, 51, 0.12);
  animation: loginSheetUp 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes loginOverlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes loginSheetUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.preview-login-overlay__handle {
  width: 32px;
  height: 4px;
  margin: 0 auto 16px;
  border-radius: 99px;
  background: #e5dfd6;
}

.preview-login-overlay__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.preview-login-overlay__mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #315efb, #2446c7);
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  box-shadow: 0 5px 12px rgba(49, 94, 251, 0.24);
}

.preview-login-overlay__mark--img {
  object-fit: cover;
  background: #fff;
}

.preview-login-overlay__brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 17px;
    font-weight: 800;
    color: #2a3142;
  }

  span {
    font-size: 12px;
    color: #9aa3b5;
  }
}

.preview-login-overlay__panel {
  margin-bottom: 14px;
  padding: 4px 14px;
  background: #f6f3ee;
  border-radius: 14px;
}

.preview-login-overlay__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  font-size: 14px;
  color: #2a3142;

  em {
    font-style: normal;
    font-size: 12px;
    color: #9aa3b5;
  }
}

.preview-login-overlay__divider {
  height: 1px;
  background: rgba(42, 49, 66, 0.08);
}

.preview-login-overlay__agreement {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #7c879d;
  line-height: 1.45;
  cursor: pointer;

  input {
    margin-top: 2px;
  }
}

.preview-login-overlay__cta {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: #315efb;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(49, 94, 251, 0.28);
}

.preview-login-overlay__cta:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.preview-login-overlay__skip {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #9aa3b5;
  font-size: 13px;
  cursor: pointer;
}
</style>
