import { describe, expect, it } from 'vitest'
import { absoluteChange, cagr, percentChange, seriesEnds, volatility } from './changeMetrics'

const pts = (...values: (number | null)[]) => values.map((value, i) => ({ year: 2000 + i, value }))

describe('seriesEnds', () => {
  it('uses the first and last non-empty readings, whatever the order', () => {
    const ends = seriesEnds([
      { year: 2003, value: 8 },
      { year: 2000, value: null },
      { year: 2001, value: 2 },
      { year: 2002, value: null },
    ])
    expect(ends).toEqual({ first: { year: 2001, value: 2 }, last: { year: 2003, value: 8 } })
  })
  it('is null with fewer than two readings', () => {
    expect(seriesEnds([])).toBeNull()
    expect(seriesEnds(pts(5, null, null))).toBeNull()
  })
})

describe('absoluteChange', () => {
  it('is last minus first, and negative for a decline', () => {
    expect(absoluteChange(pts(10, 12, 15))).toBe(5)
    expect(absoluteChange(pts(10, 4))).toBe(-6)
  })
  it('works from a zero or negative start', () => {
    expect(absoluteChange(pts(0, 3))).toBe(3)
    expect(absoluteChange(pts(-2, 1))).toBe(3)
  })
})

describe('percentChange', () => {
  it('is relative to the first value', () => {
    expect(percentChange(pts(100, 150))).toBeCloseTo(50)
    expect(percentChange(pts(100, 50))).toBeCloseTo(-50)
  })
  it('is null for a zero or negative start (undefined or sign-flipping)', () => {
    expect(percentChange(pts(0, 5))).toBeNull()
    expect(percentChange(pts(-4, 5))).toBeNull()
  })
})

describe('cagr', () => {
  it('compounds over the years between the first and last readings', () => {
    // 100 -> 121 over 2 years is 10% a year.
    expect(cagr(pts(100, 110, 121))).toBeCloseTo(10)
  })
  it('uses the real year gap when years are missing', () => {
    expect(cagr([{ year: 2000, value: 100 }, { year: 2002, value: 121 }])).toBeCloseTo(10)
  })
  it('is null when an end is zero or negative', () => {
    expect(cagr(pts(0, 5))).toBeNull()
    expect(cagr(pts(5, 0))).toBeNull()
    expect(cagr(pts(5, -1))).toBeNull()
  })
})

describe('volatility', () => {
  it('is zero for a perfectly steady climb', () => {
    expect(volatility(pts(1, 2, 3, 4))).toBeCloseTo(0)
  })
  it('is the sample standard deviation of year-on-year changes', () => {
    // Changes: +2, -2, +2, -2 -> mean 0, sample sd = sqrt(16/3).
    expect(volatility(pts(0, 2, 0, 2, 0))).toBeCloseTo(Math.sqrt(16 / 3))
  })
  it('ignores changes across a gap and needs two real changes', () => {
    expect(volatility(pts(1, 2, null, 9))).toBeNull()
    expect(volatility(pts(1, 2))).toBeNull()
  })
})
