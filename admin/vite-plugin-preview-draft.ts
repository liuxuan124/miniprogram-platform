/**
 * 开发态：临时草稿预览走 Vite 内存，避免远端尚未部署 preview-drafts 时 404。
 * 关预览 DELETE 即清；TTL 2h 兜底。
 */
import type { Plugin, Connect } from 'vite'
import { randomBytes } from 'crypto'

type DraftEntry = {
  dsl: unknown
  pageTitle?: string
  expiresAt: number
}

const store = new Map<string, DraftEntry>()
const TTL_MS = 2 * 60 * 60 * 1000
const MAX_BYTES = 2 * 1024 * 1024

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: Connect.ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(text)
}

function purgeExpired() {
  const now = Date.now()
  for (const [token, entry] of store) {
    if (entry.expiresAt <= now) store.delete(token)
  }
}

export function previewDraftDevPlugin(): Plugin {
  return {
    name: 'preview-draft-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/v1/admin/preview-drafts') && !url.startsWith('/api/v1/mp/preview-drafts')) {
          return next()
        }

        purgeExpired()
        const method = (req.method || 'GET').toUpperCase()

        try {
          if (method === 'POST' && url.split('?')[0] === '/api/v1/admin/preview-drafts') {
            const raw = await readBody(req)
            if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
              return sendJson(res, 200, { code: 400, message: '预览内容过大，请精简页面后再试', data: null })
            }
            const payload = raw ? JSON.parse(raw) : {}
            if (payload?.dsl == null) {
              return sendJson(res, 200, { code: 400, message: 'dsl 不能为空', data: null })
            }
            const token = randomBytes(24).toString('base64url')
            const expiresAt = Date.now() + TTL_MS
            store.set(token, {
              dsl: payload.dsl,
              pageTitle: payload.pageTitle || '',
              expiresAt,
            })
            return sendJson(res, 200, {
              code: 200,
              message: 'ok',
              data: {
                token,
                expiresAt: new Date(expiresAt).toISOString(),
                previewPath: `/h5/draft-preview?token=${token}`,
              },
            })
          }

          const adminDelete = url.match(/^\/api\/v1\/admin\/preview-drafts\/([^/?]+)/)
          if (method === 'DELETE' && adminDelete) {
            store.delete(decodeURIComponent(adminDelete[1]))
            return sendJson(res, 200, { code: 200, message: 'ok', data: null })
          }

          const mpGet = url.match(/^\/api\/v1\/mp\/preview-drafts\/([^/?]+)/)
          if (method === 'GET' && mpGet) {
            const token = decodeURIComponent(mpGet[1])
            const entry = store.get(token)
            if (!entry || entry.expiresAt <= Date.now()) {
              store.delete(token)
              return sendJson(res, 200, {
                code: 404,
                message: '预览已关闭或过期，请回电脑端重新生成',
                data: null,
              })
            }
            return sendJson(res, 200, {
              code: 200,
              message: 'ok',
              data: {
                dsl: entry.dsl,
                pageTitle: entry.pageTitle,
                expiresAt: new Date(entry.expiresAt).toISOString(),
              },
            })
          }
        } catch (e: any) {
          return sendJson(res, 200, {
            code: 500,
            message: e?.message || '预览服务异常',
            data: null,
          })
        }

        return next()
      })
    },
  }
}
