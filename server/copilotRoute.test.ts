// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)

describe('Vercel routing for the chat runtime', () => {
  it('rewrites every /api/copilotkit/* path to the single function', () => {
    const config = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'))
    expect(config.rewrites).toContainEqual({
      source: '/api/copilotkit/:path*',
      destination: '/api/copilotkit',
    })
  })

  it('uses one function file and no catch-all file (Vercel does not route nested paths to it)', () => {
    expect(existsSync(new URL('api/copilotkit.ts', root))).toBe(true)
    expect(existsSync(new URL('api/copilotkit/[...path].ts', root))).toBe(false)
  })
})

describe('api/copilotkit fetch handler', () => {
  it('serves runtime info', async () => {
    const { default: fn } = await import('../api/copilotkit.js')
    const response = await fn.fetch(new Request('http://localhost/api/copilotkit/info'))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { agents: Record<string, unknown> }
    expect(Object.keys(body.agents)).toContain('default')
  })

  it('routes a deep agent path to the runtime instead of answering 404', async () => {
    const { default: fn } = await import('../api/copilotkit.js')
    // An invalid body is rejected by the runtime before any model call, so this is offline.
    const response = await fn.fetch(
      new Request('http://localhost/api/copilotkit/agent/default/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    )
    expect(response.status).not.toBe(404)
  })
})
