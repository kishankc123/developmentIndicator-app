import { createCopilotRuntimeHandler } from '@copilotkit/runtime/v2'
import { copilotRuntime } from '../../server/copilotRuntime.js'
import { COPILOT_BASE_PATH } from '../../server/paths.js'

// Vercel Function: same-origin, so no CORS headers are needed.
const handler = createCopilotRuntimeHandler({ runtime: copilotRuntime, basePath: COPILOT_BASE_PATH })

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE }
