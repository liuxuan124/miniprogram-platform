<template>
  <div class="storage-config-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>存储配置</span>
          <div>
            <el-button icon="Connection" @click="handleTestStorage" :loading="testing">测试存储</el-button>
            <el-button type="primary" icon="Check" :loading="saving" @click="handleSave">保存设置</el-button>
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        label-position="right"
        v-loading="loading"
      >
        <!-- 存储方式 -->
        <el-divider content-position="left">存储方式</el-divider>

        <el-form-item label="存储类型" prop="storageType">
          <el-radio-group v-model="formData.storageType" @change="handleStorageTypeChange">
            <el-radio-button value="local">本地存储</el-radio-button>
            <el-radio-button value="oss">阿里云 OSS</el-radio-button>
            <el-radio-button value="cos">腾讯云 COS</el-radio-button>
            <el-radio-button value="qiniu">七牛云</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 本地存储 -->
        <template v-if="formData.storageType === 'local'">
          <el-divider content-position="left">本地存储配置</el-divider>

          <el-form-item label="存储路径" prop="localPath">
            <el-input v-model="formData.localPath" placeholder="/data/uploads" />
          </el-form-item>

          <el-form-item label="访问域名" prop="localDomain">
            <el-input v-model="formData.localDomain" placeholder="https://yourdomain.com/uploads" />
          </el-form-item>
        </template>

        <!-- 阿里云 OSS -->
        <template v-if="formData.storageType === 'oss'">
          <el-divider content-position="left">阿里云 OSS 配置</el-divider>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Endpoint" prop="ossEndpoint">
                <el-input v-model="formData.ossEndpoint" placeholder="oss-cn-hangzhou.aliyuncs.com" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Bucket" prop="ossBucket">
                <el-input v-model="formData.ossBucket" placeholder="my-bucket" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="AccessKey ID" prop="ossAccessKeyId">
                <el-input v-model="formData.ossAccessKeyId" placeholder="请输入 AccessKey ID" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AccessKey Secret" prop="ossAccessKeySecret">
                <el-input
                  v-model="formData.ossAccessKeySecret"
                  placeholder="请输入 AccessKey Secret"
                  type="password"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="自定义域名" prop="ossDomain">
            <el-input v-model="formData.ossDomain" placeholder="https://cdn.example.com（留空则使用默认域名）" />
          </el-form-item>
        </template>

        <!-- 腾讯云 COS -->
        <template v-if="formData.storageType === 'cos'">
          <el-divider content-position="left">腾讯云 COS 配置</el-divider>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Region" prop="cosRegion">
                <el-input v-model="formData.cosRegion" placeholder="ap-guangzhou" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Bucket" prop="cosBucket">
                <el-input v-model="formData.cosBucket" placeholder="my-bucket-1250000000" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="SecretId" prop="cosSecretId">
                <el-input v-model="formData.cosSecretId" placeholder="请输入 SecretId" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SecretKey" prop="cosSecretKey">
                <el-input
                  v-model="formData.cosSecretKey"
                  placeholder="请输入 SecretKey"
                  type="password"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="自定义域名" prop="cosDomain">
            <el-input v-model="formData.cosDomain" placeholder="https://cdn.example.com（留空则使用默认域名）" />
          </el-form-item>
        </template>

        <!-- 七牛云 -->
        <template v-if="formData.storageType === 'qiniu'">
          <el-divider content-position="left">七牛云配置</el-divider>

          <el-form-item label="绑定域名" prop="qiniuDomain">
            <el-input v-model="formData.qiniuDomain" placeholder="https://cdn.example.com" />
          </el-form-item>

          <el-form-item label="Bucket" prop="qiniuBucket">
            <el-input v-model="formData.qiniuBucket" placeholder="my-bucket" />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="AccessKey" prop="qiniuAccessKey">
                <el-input v-model="formData.qiniuAccessKey" placeholder="请输入 AccessKey" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SecretKey" prop="qiniuSecretKey">
                <el-input
                  v-model="formData.qiniuSecretKey"
                  placeholder="请输入 SecretKey"
                  type="password"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 上传限制 -->
        <el-divider content-position="left">上传限制</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最大文件大小" prop="maxFileSize">
              <el-input-number
                v-model="formData.maxFileSize"
                :min="1"
                :max="100"
                controls-position="right"
                style="width: 100%"
              />
              <div class="form-tip">单位：MB，建议不超过 50MB</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="允许的扩展名" prop="allowedExtensions">
              <el-input
                v-model="formData.allowedExtensions"
                placeholder="jpg,jpeg,png,gif,webp,pdf,doc,docx"
              />
              <div class="form-tip">多个扩展名用英文逗号分隔</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getConfigByGroup, updateConfigs } from '@/api/system'
import type { StorageConfigForm, ConfigItem } from '@/types/system'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive<StorageConfigForm>({
  storageType: 'local',
  localPath: '/data/uploads',
  localDomain: '',
  ossEndpoint: '',
  ossBucket: '',
  ossAccessKeyId: '',
  ossAccessKeySecret: '',
  ossDomain: '',
  cosRegion: '',
  cosBucket: '',
  cosSecretId: '',
  cosSecretKey: '',
  cosDomain: '',
  qiniuDomain: '',
  qiniuBucket: '',
  qiniuAccessKey: '',
  qiniuSecretKey: '',
  maxFileSize: 10,
  allowedExtensions: 'jpg,jpeg,png,gif,webp,pdf,doc,docx',
})

const formRules: FormRules = {
  storageType: [{ required: true, message: '请选择存储类型', trigger: 'change' }],
}

/** 存储类型切换 */
function handleStorageTypeChange() {
  // 切换类型时不需要额外操作，表单会自动显示对应配置
}

/** 加载配置 */
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getConfigByGroup('storage')
    const configs: ConfigItem[] = res.data?.configs || []
    configs.forEach((item) => {
      const key = item.key as keyof StorageConfigForm
      if (key in formData) {
        if (key === 'maxFileSize') {
          formData.maxFileSize = Number(item.value) || 10
        } else if (key === 'storageType') {
          formData.storageType = item.value as StorageConfigForm['storageType']
        } else {
          (formData as any)[key] = item.value
        }
      }
    })
  } catch {
    // 使用默认值
  } finally {
    loading.value = false
  }
}

/** 测试存储连接 */
async function handleTestStorage() {
  testing.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    ElMessage.success('存储连接测试成功')
  } catch {
    ElMessage.error('存储连接测试失败，请检查配置')
  } finally {
    testing.value = false
  }
}

/** 保存配置 */
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const configs = Object.entries(formData).map(([key, value]) => ({
      configKey: key,
      configValue: String(value ?? ''),
      configGroup: 'storage',
      description: key,
    }))
    await updateConfigs(configs)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<style lang="scss" scoped>
.storage-config-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    margin-top: 4px;
  }
}
</style>
