import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ChartDialog } from './ChartDialog'

// jsdom does not implement the modal methods of <dialog>; this stand-in toggles `open`
// and fires `close` like a browser does.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

describe('ChartDialog', () => {
  it('renders nothing inside while closed, and the title and content once open', () => {
    const { rerender } = render(
      <ChartDialog open={false} title="Big chart" onClose={() => {}}>
        <p>chart body</p>
      </ChartDialog>,
    )
    expect(screen.queryByText('chart body')).not.toBeInTheDocument()

    rerender(
      <ChartDialog open title="Big chart" onClose={() => {}}>
        <p>chart body</p>
      </ChartDialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Big chart' })).toBeInTheDocument()
    expect(screen.getByText('chart body')).toBeInTheDocument()
  })

  it('calls onClose from the cross button', async () => {
    const onClose = vi.fn()
    render(
      <ChartDialog open title="Big chart" onClose={onClose}>
        <p>chart body</p>
      </ChartDialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close enlarged chart' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the backdrop (the dialog element itself) is clicked, but not its content', async () => {
    const onClose = vi.fn()
    render(
      <ChartDialog open title="Big chart" onClose={onClose}>
        <p>chart body</p>
      </ChartDialog>,
    )
    await userEvent.click(screen.getByText('chart body'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('dialog', { name: 'Big chart' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the native dialog closes itself, as it does on Escape', () => {
    const onClose = vi.fn()
    render(
      <ChartDialog open title="Big chart" onClose={onClose}>
        <p>chart body</p>
      </ChartDialog>,
    )
    screen.getByRole('dialog', { name: 'Big chart' }).dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalled()
  })
})
