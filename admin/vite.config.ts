import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { previewDraftDevPlugin } from './vite-plugin-preview-draft'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue(), previewDraftDevPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 3000,
      open: true,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          // 后端 CORS 白名单不含 localhost，去掉 Origin/Referer 让代理请求视为同源
          // 临时草稿预览由 previewDraftDevPlugin 本地处理，不转发远端
          bypass(req) {
            const u = req.url || ''
            if (u.startsWith('/api/v1/admin/preview-drafts') || u.startsWith('/api/v1/mp/preview-drafts')) {
              return false
            }
          },
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
        // 上传静态资源同源代理，便于装修预览里「保存图片」直接下载到本地
        '/uploads': {
          target: env.VITE_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: ``,
        },
      },
    },
  }
})
