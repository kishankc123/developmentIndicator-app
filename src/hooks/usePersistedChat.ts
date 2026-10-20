import { UseAgentUpdate, useAgent } from '@copilotkit/react-core/v2'
import { useCallback, useEffect, useRef } from 'react'
import {
  MAX_HISTORY_MESSAGES,
  getStorage,
  loadHistory,
  saveHistory,
  trimHistory,
} from '../utils/chatHistory'

/** Messages as the agent stores them; saved messages come from JSON, so they are cast in. */
type AgentMessages = Parameters<ReturnType<typeof useAgent>['agent']['setMessages']>[0]

/** What {@link usePersistedChat} gives the component. */
interface PersistedChat {
  /** True when there is any conversation to clear. */
  hasMessages: boolean
  /** Starts a fresh conversation and forgets the saved one. */
  clear: () => void
}

/**
 * Keeps the chat across page reloads and limits its memory. The agent's message list is
 * exactly what is sent to the model, so trimming it caps both what is remembered and what
 * each request costs. Saving and trimming happen only while the agent is idle, never in
 * the middle of a streamed reply.
 */
export function usePersistedChat(limit: number = MAX_HISTORY_MESSAGES): PersistedChat {
  const { agent } = useAgent({
    // Re-render on new/updated messages and when a run starts or ends; coalesce streaming deltas.
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
    throttleMs: 100,
  })
  // CopilotKit can swap in a different agent object once the runtime has answered, so restore
  // per agent instance. The ref also keeps StrictMode's repeated effects from restoring twice.
  const restoredFor = useRef<unknown>(null)

  useEffect(() => {
    if (restoredFor.current === agent) return
    restoredFor.current = agent
    // Never overwrite a conversation that is already in progress.
    if (agent.messages.length > 0) return
    const saved = trimHistory(loadHistory(getStorage()), limit)
    if (saved.length > 0) agent.setMessages(saved as AgentMessages)
  }, [agent, limit])

  // Enforce the limit and save whenever the conversation settles. This subscribes to the agent
  // instead of using an effect keyed on `agent.messages`: the agent mutates that array in
  // place, so React (and the React Compiler) would never see it change.
  useEffect(() => {
    const persist = () => {
      if (agent.isRunning) return
      const trimmed = trimHistory(agent.messages, limit)
      // An empty list is "nothing yet" (a fresh agent before restore), not "forget everything":
      // only `clear` may erase saved history.
      if (trimmed.length === 0 && agent.messages.length === 0) return
      if (trimmed.length < agent.messages.length) {
        // Triggers onMessagesChanged again, which then saves the trimmed list.
        agent.setMessages(trimmed as AgentMessages)
        // Trimming everything away is a deliberate reset, so the saved copy goes too.
        if (trimmed.length === 0) saveHistory(getStorage(), [])
        return
      }
      saveHistory(getStorage(), trimmed)
    }
    // A run can still count as running at the moment it reports being finished, so settle first.
    const settle = () => void setTimeout(persist, 0)
    const subscription = agent.subscribe({
      onMessagesChanged: persist,
      onRunFinalized: settle,
      onRunFailed: settle,
    })
    return () => subscription.unsubscribe()
  }, [agent, limit])

  const clear = useCallback(() => {
    agent.setMessages([])
    saveHistory(getStorage(), [])
  }, [agent])

  return { hasMessages: agent.messages.length > 0, clear }
}
