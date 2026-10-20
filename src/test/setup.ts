import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest does not auto-unmount rendered components between tests (no globals), so do it here.
afterEach(() => cleanup())
