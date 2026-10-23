import {
  CopilotKitProvider,
  CopilotSidebar,
  useAgentContext,
  useFrontendTool,
} from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { fetchLatestByCountry, fetchSeries } from '../api/worldBank'
import { usePersistedChat } from '../hooks/usePersistedChat'
import type { IndicatorDefinition } from '../config/indicators'
import { SERIES_COLORS, TREND_YEARS } from '../config/theme'
import type { Country, Observation } from '../types/worldBank'
import { buildBarRows, parseToolResult, toCountryObservations, type BarRow } from '../utils/chartData'
import { findCountry } from '../utils/countryLookup'
import type { ValueFormat } from '../utils/format'
import { ComparisonBarChart } from './ComparisonBarChart'
import { TrendChart, type TrendSeries } from './TrendChart'
import './Assistant.css'

/** Props for {@link Assistant}. */
interface AssistantProps {
  /** All indicators the dashboard can show. */
  indicators: IndicatorDefinition[]
  /** The indicator currently shown. */
  indicator: IndicatorDefinition
  /** Real countries (no aggregates). */
  countries: Country[]
  /** ISO3 codes currently compared. */
  selectedCodes: string[]
  /** Latest reading per country for the current indicator, keyed by ISO3 code. */
  observations: Map<string, Observation>
  /** Switches the dashboard to another indicator by id. */
  onSelectIndicator: (id: string) => void
  /** Adds a country to the comparison. */
  onAddCountry: (code: string) => void
  /** Removes a country from the comparison. */
  onRemoveCountry: (code: string) => void
}

/** Chat endpoint on the same origin; the docs require an absolute URL in a non-Next app. */
const RUNTIME_URL = `${window.location.origin}/api/copilotkit`

/** How long the "too many requests" notice stays up; matches the 1-minute firewall window. */
const RATE_LIMIT_NOTICE_MS = 60_000

/** True when a chat error came from the firewall's per-IP rate limit (HTTP 429). */
function isRateLimitError(error: Error): boolean {
  return /\b429\b|too many requests|rate.?limit/i.test(error.message)
}

/** Shows a dismissible notice for a minute after the server says we are sending too fast. */
function useRateLimitNotice() {
  const [limited, setLimited] = useState(false)

  useEffect(() => {
    if (!limited) return
    const timer = window.setTimeout(() => setLimited(false), RATE_LIMIT_NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [limited])

  const handleError = useCallback((event: { error: Error }) => {
    if (isRateLimitError(event.error)) setLimited(true)
  }, [])

  return { limited, dismiss: () => setLimited(false), handleError }
}

/**
 * CopilotKit themes itself with a `.dark` class, while this app follows the OS setting.
 * Mirror the OS setting onto <html> so the chat is dark when the dashboard is (otherwise
 * its text inherits our light text colour on a white panel and becomes unreadable).
 */
function useDarkClassFromOs() {
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => {
      query.removeEventListener('change', apply)
      document.documentElement.classList.remove('dark')
    }
  }, [])
}

/** What `show_bar_chart` returns to the chart renderer (and to the model). */
interface BarPayload {
  title: string
  indicatorLabel: string
  format: ValueFormat
  rows: BarRow[]
  unresolved: string[]
}

/** What `show_trend_chart` returns to the chart renderer (and to the model). */
interface TrendPayload {
  title: string
  indicatorLabel: string
  format: ValueFormat
  series: TrendSeries[]
  observations: Observation[]
  unresolved: string[]
}

/** Title and body of a chart shown inside the chat. */
function ChatChart({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <figure className="chat-chart">
      <figcaption className="chat-chart__title">{title}</figcaption>
      {children}
      {note && <p className="chat-chart__note">{note}</p>}
    </figure>
  )
}

/** Describes the optional `indicatorId` shared by both chart tools. */
const INDICATOR_PARAM_HELP =
  'Indicator to chart. Omit for the one on the dashboard. Pass another id to answer about a different indicator WITHOUT changing the dashboard.'

/** Registers what the model may see (context) and do (tools) for the current dashboard. */
function AssistantBridge({
  indicators,
  indicator,
  countries,
  selectedCodes,
  observations,
  onSelectIndicator,
  onAddCountry,
  onRemoveCountry,
}: AssistantProps) {
  useDarkClassFromOs()
  const { hasMessages, clear } = usePersistedChat()
  // Controlled so the "New chat" button can appear only while the sidebar is open.
  const [open, setOpen] = useState(false)

  // Chart handlers run long after registration; read the newest data through a ref so the
  // tools need not be re-registered each time the dashboard rebuilds its country map.
  const latest = useRef({ indicators, indicator, countries, observations })
  useEffect(() => {
    latest.current = { indicators, indicator, countries, observations }
  })

  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code

  useAgentContext({
    description: 'The indicator currently shown on the dashboard',
    value: { id: indicator.id, label: indicator.label, description: indicator.description },
  })
  useAgentContext({
    description: 'All indicators the user can switch between',
    value: indicators.map((i) => ({ id: i.id, label: i.label, topic: i.topic })),
  })
  useAgentContext({
    description: 'Countries currently selected for the comparison chart',
    value: selectedCodes.map((code) => ({ code, name: nameOf(code) })),
  })
  useAgentContext({
    description:
      'Latest value of the current indicator for each country (the year differs per country). Countries missing here have no data.',
    value: [...observations.values()].map((o) => ({
      country: o.countryName,
      code: o.countryCode,
      year: o.year,
      value: o.value === null ? null : Math.round(o.value * 100) / 100,
    })),
  })

  useFrontendTool(
    {
      name: 'switch_indicator',
      description:
        'Change the indicator shown on the dashboard maps and trend chart. Call this ONLY when the user explicitly asks to change what the dashboard shows (for example "show inflation on the map" or "switch to GDP growth"). A question about a topic is NOT such a request: answer it with a chart tool and its indicatorId instead.',
      parameters: z.object({
        indicatorId: z
          .enum(indicators.map((i) => i.id) as [string, ...string[]])
          .describe('Id of the indicator to show'),
      }),
      handler: async ({ indicatorId }) => {
        console.log(`[chat] switch_indicator requested: ${indicatorId as string}`)
        onSelectIndicator(indicatorId as string)
        return `Now showing ${indicators.find((i) => i.id === indicatorId)?.label ?? indicatorId}.`
      },
    },
    [indicators, onSelectIndicator],
  )

  useFrontendTool(
    {
      name: 'add_country_to_comparison',
      description:
        'Add a country to the comparison chart. At most four are kept; the oldest is dropped when full.',
      parameters: z.object({
        country: z.string().describe('Country name or ISO3 code, e.g. "Nepal" or "NPL"'),
      }),
      handler: async ({ country }) => {
        const match = findCountry(country as string, countries)
        console.log(`[chat] add_country_to_comparison "${country}" -> ${match?.code ?? 'no unique match'}`)
        if (!match) return `No unique country matches "${country}". Ask the user to be more specific.`
        onAddCountry(match.code)
        return `Added ${match.name} to the comparison.`
      },
    },
    [countries, onAddCountry],
  )

  useFrontendTool(
    {
      name: 'remove_country_from_comparison',
      description: 'Remove a country from the comparison chart.',
      parameters: z.object({
        country: z.string().describe('Country name or ISO3 code'),
      }),
      handler: async ({ country }) => {
        const match = findCountry(country as string, countries)
        console.log(`[chat] remove_country_from_comparison "${country}" -> ${match?.code ?? 'no unique match'}`)
        if (!match || !selectedCodes.includes(match.code)) {
          return `"${country}" is not in the current comparison.`
        }
        onRemoveCountry(match.code)
        return `Removed ${match.name} from the comparison.`
      },
    },
    [countries, selectedCodes, onRemoveCountry],
  )

  useFrontendTool(
    {
      name: 'show_bar_chart',
      description:
        'Show a horizontal bar chart in the chat comparing an indicator across countries (the dashboard\'s current indicator unless indicatorId is given). Use it for comparisons ("compare X and Y") and rankings ("top 5"). Pass country names, or top/order for a ranking. The chart is drawn from the dashboard data, so do not pass or repeat values.',
      parameters: z.object({
        title: z.string().describe('Short chart title, e.g. "GDP per capita: top 5 countries"'),
        countries: z
          .array(z.string())
          .max(15)
          .optional()
          .describe('Country names or ISO3 codes to compare. Omit for a ranking.'),
        top: z.number().int().min(1).max(15).optional().describe('How many countries to rank (default 5)'),
        order: z.enum(['highest', 'lowest']).optional().describe('Ranking direction (default highest)'),
        indicatorId: z
          .enum(indicators.map((i) => i.id) as [string, ...string[]])
          .optional()
          .describe(INDICATOR_PARAM_HELP),
      }),
      handler: async ({ title, countries: names, top, order, indicatorId }) => {
        const { indicators: allIndicators, indicator: current, countries: all, observations } = latest.current
        // Another indicator is fetched here; the dashboard keeps showing its own.
        const target = allIndicators.find((i) => i.id === indicatorId) ?? current
        console.log(`[chat] show_bar_chart for "${target.label}" (dashboard stays on "${current.label}")`)
        const values =
          target.id === current.id
            ? observations
            : toCountryObservations(await fetchLatestByCountry(target.id), all)
        const { rows, unresolved } = buildBarRows(values, all, {
          names: names as string[] | undefined,
          top: top as number | undefined,
          order: order as 'highest' | 'lowest' | undefined,
        })
        const payload: BarPayload = {
          title: title as string,
          indicatorLabel: target.label,
          format: target.format,
          rows,
          unresolved,
        }
        return JSON.stringify(payload)
      },
      render: ({ result }) => {
        const payload = parseToolResult<BarPayload>(result)
        if (!payload) return <p className="chat-chart__note">Preparing chart…</p>
        return (
          <ChatChart
            title={payload.title}
            note={
              payload.unresolved.length > 0
                ? `No data for: ${payload.unresolved.join(', ')}. Each bar shows the country's latest year.`
                : "Each bar shows the country's latest available year."
            }
          >
            <ComparisonBarChart rows={payload.rows} format={payload.format} />
          </ChatChart>
        )
      },
    },
    [],
  )

  useFrontendTool(
    {
      name: 'show_trend_chart',
      description:
        'Show a line chart in the chat of an indicator over time for 1-4 countries (the dashboard\'s current indicator unless indicatorId is given). Use it when the user asks how something changed, trends, or history.',
      parameters: z.object({
        title: z.string().describe('Short chart title, e.g. "GDP per capita since 2000"'),
        countries: z.array(z.string()).min(1).max(4).describe('Country names or ISO3 codes'),
        years: z.number().int().min(5).max(40).optional().describe(`How many years back (default ${TREND_YEARS})`),
        indicatorId: z
          .enum(indicators.map((i) => i.id) as [string, ...string[]])
          .optional()
          .describe(INDICATOR_PARAM_HELP),
      }),
      handler: async ({ title, countries: names, years, indicatorId }) => {
        const { indicators: allIndicators, indicator: current, countries: all } = latest.current
        const target = allIndicators.find((i) => i.id === indicatorId) ?? current
        console.log(`[chat] show_trend_chart for "${target.label}" (dashboard stays on "${current.label}")`)
        const unresolved: string[] = []
        const matched: Country[] = []
        for (const name of names as string[]) {
          const match = findCountry(name, all)
          if (match && !matched.includes(match)) matched.push(match)
          else if (!match) unresolved.push(name)
        }
        const toYear = new Date().getFullYear()
        const observations = await fetchSeries(
          target.id,
          matched.map((c) => c.code),
          toYear - ((years as number | undefined) ?? TREND_YEARS),
          toYear,
        )
        const payload: TrendPayload = {
          title: title as string,
          indicatorLabel: target.label,
          format: target.format,
          series: matched.map((c, i) => ({ code: c.code, name: c.name, color: SERIES_COLORS[i] })),
          observations,
          unresolved,
        }
        return JSON.stringify(payload)
      },
      render: ({ result }) => {
        const payload = parseToolResult<TrendPayload>(result)
        if (!payload) return <p className="chat-chart__note">Loading yearly data…</p>
        return (
          <ChatChart
            title={payload.title}
            note={payload.unresolved.length > 0 ? `Not found: ${payload.unresolved.join(', ')}.` : undefined}
          >
            <TrendChart observations={payload.observations} series={payload.series} format={payload.format} />
          </ChatChart>
        )
      },
    },
    [],
  )

  return (
    <>
      <CopilotSidebar open={open} onOpenChange={setOpen} />
      {open && hasMessages && (
        <button type="button" className="chat-clear" onClick={clear}>
          New chat
        </button>
      )}
    </>
  )
}

/** Chat assistant: a CopilotKit sidebar that can read and drive the dashboard. */
export function Assistant(props: AssistantProps) {
  const { limited, dismiss, handleError } = useRateLimitNotice()
  return (
    <CopilotKitProvider runtimeUrl={RUNTIME_URL} useSingleEndpoint={false} onError={handleError}>
      <AssistantBridge {...props} />
      {limited && (
        <div className="chat-notice" role="alert">
          You are sending messages too quickly. Please wait a minute and try again.
          <button type="button" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      )}
    </CopilotKitProvider>
  )
}
