import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/system'

export function useImageUpload() {
  const uploading = ref(false)

  async function uploadImage(
    file: File,
    options?: {
      maxSizeMB?: number
      accept?: string[]
      onSuccess?: (url: string) => void
    }
  ): Promise<string | null> {
    const maxSize = (options?.maxSizeMB || 5) * 1024 * 1024
    const accept = options?.accept || ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (!accept.includes(file.type)) {
      ElMessage.warning('仅支持 JPG/PNG/GIF/WEBP 格式')
      return null
    }
    if (file.size > maxSize) {
      ElMessage.warning(`图片大小不能超过 ${options?.maxSizeMB || 5}MB`)
      return null
    }

    uploading.value = true
    try {
      const res = await uploadFile(file)
      const url = (res.data as any)?.url || (res.data as any)?.fileUrl || (res as any)?.url || ''
      if (url && options?.onSuccess) {
        options.onSuccess(url)
      }
      return url
    } catch (e: any) {
      ElMessage.error(e?.message || '上传失败')
      return null
    } finally {
      uploading.value = false
    }
  }

  return { uploading, uploadImage }
}
