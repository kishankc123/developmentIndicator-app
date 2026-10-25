import { describe, expect, it } from 'vitest'
import type { Country, Observation } from '../types/worldBank'
import { extremes, fitTrend, joinPairs, predict, withResiduals, type PairPoint } from './pairs'

const country = (code: string, name: string): Country => ({
  code,
  name,
  region: 'Test',
  incomeLevel: 'Test',
  latitude: null,
  longitude: null,
})
const countries = [country('AAA', 'Alpha'), country('BBB', 'Beta'), country('CCC', 'Gamma')]

const obs = (code: string, value: number | null): Observation => ({
  countryCode: code,
  countryName: countries.find((c) => c.code === code)?.name ?? code,
  year: 2021,
  value,
})

describe('joinPairs', () => {
  it('keeps only real countries that have a value on both sides', () => {
    const drivers = [obs('AAA', 10), obs('BBB', 100), obs('CCC', null), obs('WLD', 50)]
    const outcomes = [obs('AAA', 60), obs('CCC', 70), obs('WLD', 65)]
    // BBB has no outcome, CCC has no driver, WLD is an aggregate (not in the country list).
    expect(joinPairs(drivers, outcomes, countries)).toEqual([
      { code: 'AAA', name: 'Alpha', x: 10, y: 60 },
    ])
  })

  it('drops a driver of zero or less, which a log axis cannot show', () => {
    expect(joinPairs([obs('AAA', 0), obs('BBB', -5)], [obs('AAA', 1), obs('BBB', 2)], countries)).toEqual([])
  })

  it('sorts by country name', () => {
    const drivers = [obs('CCC', 1), obs('AAA', 1), obs('BBB', 1)]
    const names = joinPairs(drivers, drivers, countries).map((p) => p.name)
    expect(names).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
})

describe('fitTrend', () => {
  // y rises by 10 for every tenfold increase in x: y = 50 + 10 * log10(x), exactly.
  const exact: PairPoint[] = [1, 10, 100, 1000].map((x, i) => ({ code: `C${i}`, name: `C${i}`, x, y: 50 + 10 * i }))

  it('recovers the slope and intercept of a perfect log relationship', () => {
    const fit = fitTrend(exact)!
    expect(fit.slope).toBeCloseTo(10)
    expect(fit.intercept).toBeCloseTo(50)
    expect(fit.r2).toBeCloseTo(1)
    expect(predict(fit, 10000)).toBeCloseTo(90)
  })

  it('returns null when there is no line to draw', () => {
    expect(fitTrend(exact.slice(0, 2))).toBeNull()
    const sameX = [1, 2, 3].map((y) => ({ code: `C${y}`, name: `C${y}`, x: 10, y }))
    expect(fitTrend(sameX)).toBeNull()
  })

  it('reports an r2 below 1 when points scatter around the line', () => {
    const noisy = exact.map((p, i) => ({ ...p, y: p.y + (i % 2 === 0 ? 5 : -5) }))
    const fit = fitTrend(noisy)!
    expect(fit.r2).toBeGreaterThan(0)
    expect(fit.r2).toBeLessThan(1)
  })
})

describe('residuals', () => {
  const points: PairPoint[] = [
    { code: 'A', name: 'A', x: 1, y: 50 },
    { code: 'B', name: 'B', x: 10, y: 60 },
    { code: 'C', name: 'C', x: 100, y: 80 }, // above the line
    { code: 'D', name: 'D', x: 1000, y: 70 }, // below the line
  ]

  it('is positive above the trend line and negative below it', () => {
    const fit = fitTrend(points)!
    const byCode = Object.fromEntries(withResiduals(points, fit).map((p) => [p.code, p]))
    expect(byCode.C.residual).toBeGreaterThan(0)
    expect(byCode.D.residual).toBeLessThan(0)
    expect(byCode.C.residual).toBeCloseTo(byCode.C.y - byCode.C.expected)
  })

  it('residuals of a least-squares fit sum to about zero', () => {
    const fit = fitTrend(points)!
    const sum = withResiduals(points, fit).reduce((s, p) => s + p.residual, 0)
    expect(sum).toBeCloseTo(0)
  })

  it('extremes lists the biggest over- and under-performers, most extreme first', () => {
    const fit = fitTrend(points)!
    const { above, below } = extremes(withResiduals(points, fit), 1)
    expect(above.map((p) => p.code)).toEqual(['C'])
    expect(below.map((p) => p.code)).toEqual(['D'])
  })
})
