<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="brand-block">
        <img src="/logo.svg" alt="Logo" class="brand-logo" />
        <div>
          <h1 class="brand-title">小程序运营系统</h1>
          <p class="brand-sub">多场景搭建与运营管理后台</p>
        </div>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <div class="login-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <el-link type="primary" :underline="false" @click="showForgetDialog = true">忘记密码？</el-link>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-dialog v-model="showForgetDialog" title="找回密码" width="400px" align-center>
      <el-alert
        title="本系统暂未开通自助找回"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <p class="forget-tip">请联系 <strong>超级管理员</strong> 在「系统设置 → 管理员账号」中为您重置密码。</p>
      <p class="forget-tip muted">重置后请及时登录并修改为个人密码。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(false)
const showForgetDialog = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为 2-20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 个字符', trigger: 'blur' },
  ],
}

async function handleLogin() {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await userStore.login({
        username: loginForm.username,
        password: loginForm.password,
      })
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.replace(redirect)
    } catch (e: any) {
      ElMessage.error(e?.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(ellipse 80% 60% at 10% 20%, rgba(23, 105, 255, 0.08), transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 80%, rgba(23, 105, 255, 0.06), transparent 50%),
    var(--bg-page);
}

.login-panel {
  width: 100%;
  max-width: 400px;
  padding: 36px 32px 28px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.brand-sub {
  margin: 4px 0 0;
  font-size: var(--font-caption);
  color: var(--text-secondary);
}

.login-form {
  .el-form-item {
    margin-bottom: 18px;
  }
}

.login-options {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}

.forget-tip {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;

  &.muted {
    color: var(--text-muted);
    font-size: 13px;
  }
}
</style>
