import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { previewDraftDevPlugin } from './vite-plugin-preview-draft'

function resolvePlatformVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version?: string }
  const base = pkg.version || '0.0.0'
  const cn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${pad(cn.getMonth() + 1)}${pad(cn.getDate())}-${pad(cn.getHours())}${pad(cn.getMinutes())}`
  return `${base} · ${stamp}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const platformVersion = resolvePlatformVersion()

  return {
    define: {
      __PLATFORM_VERSION__: JSON.stringify(platformVersion),
    },
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
