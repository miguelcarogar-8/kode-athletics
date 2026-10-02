import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const SERVER_ENV = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, '.', '')
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  if (env) {
    for (const key of SERVER_ENV) {
      if (fileEnv[key] && !env[key]) env[key] = fileEnv[key]
    }
  }

  return {
    plugins: [react(), wodLevelsDevApi()],
    server: {
      port: 5180,
    },
  }
})

function wodLevelsDevApi(): Plugin {
  return {
    name: 'wod-levels-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const incoming = req as Incoming
        const path = incoming.url?.split('?')[0]
        if (path !== '/api/wod-levels') {
          next()
          return
        }
        if (incoming.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Método no permitido.' }))
          return
        }
        void readBody(incoming)
          .then(async (body) => {
            const headers = new Headers()
            const authorization = incoming.headers.authorization
            if (typeof authorization === 'string') headers.set('authorization', authorization)
            headers.set('content-type', 'application/json')
            const mod = (await server.ssrLoadModule('/src/levelApi.ts')) as {
              handleLevelRequest: (request: Request) => Promise<Response>
            }
            const response = await mod.handleLevelRequest(
              new Request('http://localhost/api/wod-levels', { method: 'POST', headers, body }),
            )
            res.statusCode = response.status
            res.setHeader('content-type', 'application/json')
            res.end(await response.text())
          })
          .catch(() => {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'No se pudieron calcular los niveles.' }))
          })
      })
    },
  }
}

interface Incoming {
  url?: string
  method?: string
  headers: { authorization?: string | string[] }
  on(event: 'data', listener: (chunk: Uint8Array | string) => void): void
  on(event: 'end', listener: () => void): void
  on(event: 'error', listener: (error: unknown) => void): void
}

function readBody(req: {
  on(event: 'data', listener: (chunk: Uint8Array | string) => void): void
  on(event: 'end', listener: () => void): void
  on(event: 'error', listener: (error: unknown) => void): void
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = []
    req.on('data', (chunk) => {
      parts.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk))
    })
    req.on('end', () => {
      const size = parts.reduce((sum, part) => sum + part.byteLength, 0)
      const out = new Uint8Array(size)
      let offset = 0
      for (const part of parts) {
        out.set(part, offset)
        offset += part.byteLength
      }
      resolve(new TextDecoder().decode(out))
    })
    req.on('error', reject)
  })
}
