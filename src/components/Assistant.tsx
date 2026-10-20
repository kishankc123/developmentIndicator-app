import {
  CopilotKitProvider,
  CopilotSidebar,
  useAgentContext,
  useFrontendTool,
} from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { useEffect } from 'react'
import { z } from 'zod'
import type { IndicatorDefinition } from '../config/indicators'
import type { Country, Observation } from '../types/worldBank'
import { findCountry } from '../utils/countryLookup'

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
      description: 'Change the indicator shown on the maps and used by the comparison chart.',
      parameters: z.object({
        indicatorId: z
          .enum(indicators.map((i) => i.id) as [string, ...string[]])
          .describe('Id of the indicator to show'),
      }),
      handler: async ({ indicatorId }) => {
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
        if (!match || !selectedCodes.includes(match.code)) {
          return `"${country}" is not in the current comparison.`
        }
        onRemoveCountry(match.code)
        return `Removed ${match.name} from the comparison.`
      },
    },
    [countries, selectedCodes, onRemoveCountry],
  )

  return <CopilotSidebar defaultOpen={false} />
}

/** Chat assistant: a CopilotKit sidebar that can read and drive the dashboard. */
export function Assistant(props: AssistantProps) {
  return (
    <CopilotKitProvider runtimeUrl={RUNTIME_URL} useSingleEndpoint={false}>
      <AssistantBridge {...props} />
    </CopilotKitProvider>
  )
}
