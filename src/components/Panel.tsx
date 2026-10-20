import type { ReactNode } from 'react'
import './Panel.css'

/** Props for {@link Panel}. */
interface PanelProps {
  /** Heading shown at the top of the card. */
  title: string
  /** Optional muted line under the title. */
  subtitle?: string
  /** Optional controls rendered at the right of the header (e.g. a selector). */
  actions?: ReactNode
  /** Card body. */
  children: ReactNode
}

/** A titled card that groups one piece of the dashboard. */
export function Panel({ title, subtitle, actions, children }: PanelProps) {
  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="panel__actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
