/** How many of the most recent messages the chat remembers and sends to the model. */
export const MAX_HISTORY_MESSAGES = 10

/** localStorage key; bump the suffix if the stored shape ever changes. */
export const CHAT_STORAGE_KEY = 'development-indicator:chat:v1'

/** The minimum shape we rely on; the rest of each message is passed through untouched. */
export interface StoredMessage {
  id: string
  role: string
  [key: string]: unknown
}

/**
 * Keeps the last `limit` messages, then drops leading messages until the history starts
 * with a user message. Cutting mid-turn would leave a tool result without the assistant
 * message that requested it (or the reverse), which the model API rejects.
 */
export function trimHistory<T extends { role: string }>(
  messages: readonly T[],
  limit: number = MAX_HISTORY_MESSAGES,
): T[] {
  let start = Math.max(messages.length - limit, 0)
  while (start < messages.length && messages[start].role !== 'user') start++
  return messages.slice(start)
}

/** True when a parsed value looks like a message we can safely hand back to the chat. */
function isStoredMessage(value: unknown): value is StoredMessage {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && typeof candidate.role === 'string'
}

/**
 * Reads saved messages. Storage is untrusted (old versions, hand edits, other code), so
 * anything malformed yields an empty history instead of an error.
 */
export function loadHistory(storage: Pick<Storage, 'getItem'> | undefined): StoredMessage[] {
  try {
    const raw = storage?.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStoredMessage) : []
  } catch {
    return []
  }
}

/** Saves messages; failures (private mode, quota) are ignored because history is a convenience. */
export function saveHistory(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined,
  messages: readonly unknown[],
): void {
  try {
    if (messages.length === 0) storage?.removeItem(CHAT_STORAGE_KEY)
    else storage?.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // Storage unavailable or full: the chat keeps working, it just will not survive a reload.
  }
}

/** Returns window.localStorage, or undefined where even reading the property throws. */
export function getStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
