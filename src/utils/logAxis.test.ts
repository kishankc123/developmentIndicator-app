import { describe, expect, it } from 'vitest'
import { logAxis } from './logAxis'

describe('logAxis', () => {
  it('widens the domain to the powers of ten around the data', () => {
    const { domain, ticks } = logAxis(46, 11_600)
    expect(domain).toEqual([10, 100_000])
    expect(ticks).toEqual([10, 100, 1_000, 10_000, 100_000])
  })

  it('keeps every tick inside the domain, so none is clamped to an edge with the wrong label', () => {
    for (const [min, max] of [[1, 9], [264, 135_000], [10, 10], [0.5, 2_000_000]]) {
      const { domain, ticks } = logAxis(min, max)
      expect(ticks.every((t) => t >= domain[0] && t <= domain[1])).toBe(true)
      expect(domain[0]).toBeLessThanOrEqual(min)
      expect(domain[1]).toBeGreaterThanOrEqual(max)
    }
  })

  it('always spans at least one decade, even when all values are equal', () => {
    const { domain } = logAxis(100, 100)
    expect(domain[1]).toBeGreaterThan(domain[0])
  })
})
