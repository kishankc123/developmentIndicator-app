import './StatCard.css'

/** Props for {@link StatCard}. */
interface StatCardProps {
  /** Small caption above the number (e.g. "Highest"). */
  label: string
  /** Pre-formatted headline value; the parent formats it. Use "—" when unknown. */
  value: string
  /** Optional context under the value (e.g. a country name and year). */
  detail?: string
}

/** A compact key figure: caption, big number and optional context line. */
export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {detail && <span className="stat-card__detail">{detail}</span>}
    </div>
  )
}
