import { createCopilotRuntimeHandler } from '@copilotkit/runtime/v2'
import { copilotRuntime } from '../server/copilotRuntime.js'
import { COPILOT_BASE_PATH } from '../server/paths.js'

const handler = createCopilotRuntimeHandler({ runtime: copilotRuntime, basePath: COPILOT_BASE_PATH })

/**
 * Vercel Function serving every /api/copilotkit/* route. vercel.json rewrites those paths
 * to this single file; a `[...path].ts` catch-all did not route nested paths such as
 * /api/copilotkit/agent/default/run (Vercel answered NOT_FOUND). Same-origin, so no CORS.
 */
export default {
  fetch: (request: Request) => handler(request),
}
