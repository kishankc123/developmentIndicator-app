import { useEffect, useRef, type ReactNode } from 'react'
import './ChartDialog.css'

/** Props for {@link ChartDialog}. */
interface ChartDialogProps {
  /** Whether the dialog is showing. The parent owns this so it can also render only while open. */
  open: boolean
  /** Heading shown at the top and used as the dialog's accessible name. */
  title: string
  /** Called when the user closes the dialog: the cross button, the Escape key or a click outside. */
  onClose: () => void
  /** Dialog body, e.g. an enlarged chart. */
  children: ReactNode
}

/**
 * A modal dialog for enlarging content, built on the native `<dialog>` element so focus is
 * trapped, the page behind is inert and Escape closes it without extra code.
 */
export function ChartDialog({ open, title, onClose, children }: ChartDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  // Open and close the native dialog to match the `open` prop.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="chart-dialog"
      aria-labelledby="chart-dialog-title"
      // Escape fires `cancel`/`close` on the native dialog; keep the parent's state in step.
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="chart-dialog__body">
          <header className="chart-dialog__header">
            <h2 id="chart-dialog-title" className="chart-dialog__title">
              {title}
            </h2>
            <button type="button" className="chart-dialog__close" aria-label="Close enlarged chart" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
