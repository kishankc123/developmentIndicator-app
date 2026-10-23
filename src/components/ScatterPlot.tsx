import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from 'recharts'
import type { ComparisonAxis } from '../config/comparisons'
import { formatValue } from '../utils/format'
import { logAxis } from '../utils/logAxis'
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
  /** Chart height: pixels, or a percentage of a parent that has a fixed height (the enlarged view). Default 340. */
  height?: number | `${number}%`
}

const TREND_STEPS = 24

const CALLOUT_WIDTH = 196
const CALLOUT_HEIGHT = 58
const CALLOUT_GAP = 12

/** Props for {@link PointCallout}. */
interface PointCalloutProps {
  /** Pixel position of the dot the callout points at. */
  x: number
  y: number
  point: PairPoint
  driver: ComparisonAxis
  outcome: ComparisonAxis
  /** Draw to the left of the dot (dot is near the right edge). */
  flipX: boolean
  /** Draw below the dot (dot is near the top edge). */
  flipY: boolean
}

/**
 * Name and both values for the emphasised country, drawn next to its dot. It is drawn from the
 * same hover state as the ring and the map outline, so the three always name the same country.
 * (The chart library's own tooltip picks the nearest point by x alone and can name a neighbour.)
 * Ignores the pointer so it never steals the hover from the dot it labels.
 */
function PointCallout({ x, y, point, driver, outcome, flipX, flipY }: PointCalloutProps) {
  const left = flipX ? x - CALLOUT_GAP - CALLOUT_WIDTH : x + CALLOUT_GAP
  const top = flipY ? y + CALLOUT_GAP : y - CALLOUT_GAP - CALLOUT_HEIGHT
  return (
    <g className="scatter-plot__callout" style={{ pointerEvents: 'none' }}>
      <rect
        x={left}
        y={top}
        width={CALLOUT_WIDTH}
        height={CALLOUT_HEIGHT}
        rx={8}
        fill="var(--color-surface)"
        stroke="var(--color-border)"
      />
      <text x={left + 10} y={top + 18} fontSize={12} fontWeight={700} fill="var(--color-text)">
        {point.name}
      </text>
      <text x={left + 10} y={top + 35} fontSize={11} fill="var(--color-text)">
        {driver.label}: {formatValue(point.x, driver.format)}
      </text>
      <text x={left + 10} y={top + 50} fontSize={11} fill="var(--color-text)">
        {outcome.label}: {formatValue(point.y, outcome.format)}
      </text>
    </g>
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
  height = 340,
}: ScatterPlotProps) {
  const xs = points.map((p) => p.x)
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  const xAxis = logAxis(min, max)

  // Log-spaced so the straight (in log space) trend line is drawn smoothly across the axis.
  const trend = useMemo(() => {
    if (!fit || points.length === 0) return []
    const logMin = Math.log10(min)
    const logMax = Math.log10(max)
    // Draw the line across the data only, not the widened axis.
    return Array.from({ length: TREND_STEPS + 1 }, (_, i) => {
      const x = 10 ** (logMin + ((logMax - logMin) * i) / TREND_STEPS)
      return { x, y: predict(fit, x) }
    })
  }, [fit, min, max, points.length])

  const active = points.find((p) => p.code === activeCode)
  // Where the active dot sits across the plot (0 to 1), to keep its callout inside the chart.
  const [logLow, logHigh] = xAxis.domain.map(Math.log10)
  const ys = points.map((p) => p.y)
  const yLow = Math.min(...ys)
  const yHigh = Math.max(...ys)
  const flipX = active ? (Math.log10(active.x) - logLow) / (logHigh - logLow) > 0.5 : false
  // A high value is near the top of the plot, so its callout goes below the dot.
  const flipY = active ? (active.y - yLow) / (yHigh - yLow || 1) > 0.6 : false

  if (points.length === 0) {
    return <p className="scatter-plot__empty">No countries have both values.</p>
  }

  return (
    <div className="scatter-plot">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            scale="log"
            domain={xAxis.domain}
            ticks={xAxis.ticks}
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
            >
              <LabelList
                content={(props) => (
                  <PointCallout
                    x={Number(props.x)}
                    y={Number(props.y)}
                    point={active}
                    driver={driver}
                    outcome={outcome}
                    flipX={flipX}
                    flipY={flipY}
                  />
                )}
              />
            </Scatter>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})
