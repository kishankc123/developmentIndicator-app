import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { ComparisonAxis } from '../config/comparisons'
import { formatValue } from '../utils/format'
import { predict, type PairPoint, type TrendFit } from '../utils/pairs'
import './ScatterPlot.css'

/** Props for {@link ScatterPlot}. */
interface ScatterPlotProps {
  /** One dot per country; the parent joins the two indicators. Keep the array stable between renders. */
  points: PairPoint[]
  /** Trend line to draw, or null when there are too few points for one. */
  fit: TrendFit | null
  /** The x-axis indicator (log scale). */
  driver: ComparisonAxis
  /** The y-axis indicator. */
  outcome: ComparisonAxis
  /** ISO3 code of the country to emphasise (hovered or selected elsewhere); undefined for none. */
  activeCode?: string
  /** Called with a country's code when the pointer enters its dot, and with undefined when it leaves. */
  onHover: (code: string | undefined) => void
  /** Called with a country's code when its dot is clicked. */
  onSelect: (code: string) => void
}

const TREND_STEPS = 24

/** Ticks at each power of ten that fits the data, so the log axis reads $10, $100, $1K... */
function powerOfTenTicks(min: number, max: number): number[] {
  const ticks: number[] = []
  for (let p = Math.floor(Math.log10(min)); p <= Math.ceil(Math.log10(max)); p++) ticks.push(10 ** p)
  return ticks
}

/** Hover card for a dot: country name and both values. */
function PointTooltip({
  active,
  payload,
  driver,
  outcome,
}: TooltipContentProps & { driver: ComparisonAxis; outcome: ComparisonAxis }) {
  const point = payload?.[0]?.payload as PairPoint | undefined
  // The trend line is a second series; only dots (which carry a code) get a card.
  if (!active || !point?.code) return null
  return (
    <div className="scatter-plot__tooltip">
      <strong>{point.name}</strong>
      <div>
        {driver.label}: {formatValue(point.x, driver.format)}
      </div>
      <div>
        {outcome.label}: {formatValue(point.y, outcome.format)}
      </div>
    </div>
  )
}

/**
 * Scatter plot of one indicator against another, one dot per country, with the trend line
 * and one emphasised country. Memoised: hovering a country re-renders the page, and the
 * ~190 dots only need to repaint when the data changes.
 */
export const ScatterPlot = memo(function ScatterPlot({
  points,
  fit,
  driver,
  outcome,
  activeCode,
  onHover,
  onSelect,
}: ScatterPlotProps) {
  const xs = points.map((p) => p.x)
  const min = Math.min(...xs)
  const max = Math.max(...xs)

  // Log-spaced so the straight (in log space) trend line is drawn smoothly across the axis.
  const trend = useMemo(() => {
    if (!fit || points.length === 0) return []
    const logMin = Math.log10(min)
    const logMax = Math.log10(max)
    return Array.from({ length: TREND_STEPS + 1 }, (_, i) => {
      const x = 10 ** (logMin + ((logMax - logMin) * i) / TREND_STEPS)
      return { x, y: predict(fit, x) }
    })
  }, [fit, min, max, points.length])

  const active = points.find((p) => p.code === activeCode)

  if (points.length === 0) {
    return <p className="scatter-plot__empty">No countries have both values.</p>
  }

  return (
    <div className="scatter-plot">
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            scale="log"
            domain={[min, max]}
            ticks={powerOfTenTicks(min, max)}
            allowDataOverflow
            stroke="var(--color-muted)"
            tickLine={false}
            fontSize={12}
            tickFormatter={(v: number) => formatValue(v, driver.format, true)}
            label={{ value: `${driver.label} (log scale)`, position: 'insideBottom', offset: -14, fontSize: 12, fill: 'var(--color-muted)' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={['auto', 'auto']}
            stroke="var(--color-muted)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={48}
            tickFormatter={(v: number) => formatValue(v, outcome.format, true)}
          />
          <Tooltip
            cursor={false}
            content={(props) => <PointTooltip {...props} driver={driver} outcome={outcome} />}
          />
          <Scatter
            name="Countries"
            data={points}
            fill="var(--color-accent)"
            fillOpacity={0.55}
            isAnimationActive={false}
            onMouseEnter={(entry) => onHover((entry as unknown as PairPoint).code)}
            onMouseLeave={() => onHover(undefined)}
            onClick={(entry) => onSelect((entry as unknown as PairPoint).code)}
          />
          {fit && (
            <Line
              name="Trend"
              data={trend}
              dataKey="y"
              stroke="var(--color-text)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {active && (
            <Scatter
              name="Selected"
              data={[active]}
              fill="var(--color-accent)"
              stroke="var(--color-text)"
              strokeWidth={2}
              isAnimationActive={false}
              shape="circle"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})
