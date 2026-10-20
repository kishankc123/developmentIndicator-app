import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Observation } from '../types/worldBank'
import { toChartRows } from '../utils/chartRows'
import { formatValue, type ValueFormat } from '../utils/format'
import './TrendChart.css'

/** One line on the chart. */
export interface TrendSeries {
  /** ISO3 code; matches `Observation.countryCode`. */
  code: string
  /** Legend/tooltip label. */
  name: string
  /** Line colour. */
  color: string
}

/** Props for {@link TrendChart}. */
interface TrendChartProps {
  /** Yearly observations for every series; the parent fetches them. */
  observations: Observation[]
  /** Lines to draw, in legend order. */
  series: TrendSeries[]
  /** How axis ticks and tooltip values are formatted. */
  format: ValueFormat
}

/** Multi-country line chart of one indicator over time. */
export function TrendChart({ observations, series, format }: TrendChartProps) {
  const rows = toChartRows(
    observations,
    series.map((s) => s.code),
  )

  if (rows.length === 0) {
    return <p className="trend-chart__empty">No data for the selected countries.</p>
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" stroke="var(--color-muted)" tickLine={false} fontSize={12} />
          <YAxis
            stroke="var(--color-muted)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={64}
            tickFormatter={(v: number) => formatValue(v, format, true)}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? formatValue(value, format) : 'No data'
            }
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
          />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.code}
              dataKey={s.code}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
