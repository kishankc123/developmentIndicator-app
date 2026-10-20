import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node'
import { COPILOT_BASE_PATH } from './paths.ts'

/**
 * Serves the same CopilotKit runtime as the Vercel function from the Vite dev server,
 * so `npm run dev` works without `vercel dev`. The runtime is loaded through Vite so
 * TypeScript and edits are picked up. OPENAI_API_KEY is read from `.env.local` into the
 * server process only; it has no VITE_ prefix, so it never reaches the browser.
 */
export function copilotDevPlugin(): Plugin {
  return {
    name: 'copilot-dev-runtime',
    apply: 'serve',
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      if (env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
      }
    },
    configureServer(server) {
      let listener: ((req: IncomingMessage, res: ServerResponse) => void) | undefined
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(COPILOT_BASE_PATH)) return next()
        if (!process.env.OPENAI_API_KEY) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server.' }))
          return
        }
        try {
          if (!listener) {
            const { copilotRuntime } = await server.ssrLoadModule('/server/copilotRuntime.ts')
            listener = createCopilotNodeListener({ runtime: copilotRuntime, basePath: COPILOT_BASE_PATH })
          }
          listener(req, res)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
