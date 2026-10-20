import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    // Kepler.gl calls Node's `assert`, which Vite stubs out in the browser (calling it then
    // throws). The trailing slash makes this resolve to the npm polyfill, not the built-in.
    alias: { assert: 'assert/' },
  },
  // The `util` package (pulled in by the assert polyfill) reads this at load time; the browser has no `process`.
  define: { 'process.env.NODE_DEBUG': 'undefined' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
