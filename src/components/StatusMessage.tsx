import './StatusMessage.css'

/** Props for {@link StatusMessage}. */
interface StatusMessageProps {
  /** `loading` shows a spinner; `error` shows the message as an alert. */
  kind: 'loading' | 'error'
  /** Text to show. For `error`, the parent supplies the failure description. */
  message: string
}

/** Placeholder shown in place of a panel's content while loading or after a failure. */
export function StatusMessage({ kind, message }: StatusMessageProps) {
  return (
    <div
      className={`status status--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'loading' && <span className="status__spinner" aria-hidden="true" />}
      {message}
    </div>
  )
}
