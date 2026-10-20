import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BarRow } from '../utils/chartData'
import { formatValue, type ValueFormat } from '../utils/format'
import './ComparisonBarChart.css'

/** Props for {@link ComparisonBarChart}. */
interface ComparisonBarChartProps {
  /** Bars to draw, in display order (top to bottom). */
  rows: BarRow[]
  /** How axis ticks and tooltip values are formatted. */
  format: ValueFormat
}

const ROW_HEIGHT = 34

/** Horizontal bar chart comparing one indicator across countries. */
export function ComparisonBarChart({ rows, format }: ComparisonBarChartProps) {
  if (rows.length === 0) {
    return <p className="comparison-bar-chart__empty">No data for these countries.</p>
  }

  return (
    <div className="comparison-bar-chart">
      <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 36}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--color-muted)"
            tickLine={false}
            fontSize={12}
            tickFormatter={(v: number) => formatValue(v, format, true)}
          />
          <YAxis
            type="category"
            dataKey="country"
            stroke="var(--color-muted)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={96}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
            formatter={(value, _name, item) =>
              typeof value === 'number'
                ? `${formatValue(value, format)} (${(item.payload as BarRow).year})`
                : 'No data'
            }
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" name="Latest value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
