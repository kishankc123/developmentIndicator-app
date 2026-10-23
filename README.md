# Development Indicator

A dashboard of world development indicators (economy, prosperity and people), built from World Bank open data.

## Stack
React 19, TypeScript, Vite (with React Compiler), Recharts, Mapbox GL JS, Vitest + React Testing Library.

## Setup
1. `npm install`
2. Create a public Mapbox token (starts with `pk.`) at https://account.mapbox.com/access-tokens/
3. `cp .env.example .env.local` and set `VITE_MAPBOX_PUBLIC_ACCESS` (`.env.local` is git-ignored)
4. `npm run dev` (restart it after changing env vars)

Without a token the map panel shows a setup message; the rest of the dashboard still works.

## Scripts
- `npm run dev`: start the dev server
- `npm run build`: typecheck and build
- `npm run lint`: ESLint
- `npm test`: run unit and component tests

## Structure
```
src/
├── api/         World Bank requests (typed, no React)
├── types/       API and domain types
├── config/      Indicator list and theme constants
├── hooks/       Data hooks (useCountries, useIndicator, useTrend, usePairedIndicators, useAsyncData)
├── components/  Small presentational components with co-located CSS
├── utils/       Pure helpers (formatting, colour scale, stats, chart rows, pair join and trend fit)
└── App.tsx      Owns selection state and wires data to components
```

## Data
Source: World Bank API v2 (no key needed). Indicators in `src/config/indicators.ts`:
GDP per capita, GDP growth, inflation, unemployment, GNI per capita, Gini, life expectancy, population. A new indicator needs only an entry there (plus a `ValueFormat` in `utils/format.ts` if it is a new kind of number); the selector, maps, chart and assistant all read that list.

- The map uses each country's **most recent available value** (`mrnev=1`), so the year differs per country.
- The map is Mapbox GL JS drawing the free `mapbox.country-boundaries-v1` vector tileset (source layer `country_boundaries`). Countries are joined to World Bank data on `iso_3166_1_alpha_3`; Kosovo is `XKS` in Mapbox but `XKX` in the World Bank API, translated in `utils/countryCode.ts`. Disputed/alternate-worldview polygons are filtered out.
- `WorldMap` is lazy-loaded so the ~1.9 MB Mapbox chunk does not block first paint.
- Aggregates ("World", "Arab World", ...) are filtered out using the country list's region id `NA`.

## Notes
- TypeScript is pinned to 6.0.x because `typescript-eslint` 8.72 does not yet accept TypeScript 7. Revisit when it does.
- Not yet done: keyboard access to map countries (the country dropdown is the keyboard route); live verification of the Mapbox layers needs a token.
- Mapbox GL needs a token, and usage is billed by Mapbox beyond its free tier. Use a public token restricted to your domains.

## Compare two indicators
- The "Compare two indicators" panel (`ComparisonView`) relates two indicators for every country: a `WorldMap` and a `ScatterPlot` (log x axis, trend line) side by side. Hovering or clicking a country in either outlines it in the other; a country picker is the keyboard route. The chart's expand button opens it in a larger dialog (`ChartDialog`, a native `<dialog>`: closes with the cross, Escape or a click outside) that shares the same hover and selection state.
- The scatter's hover callout is drawn from that shared state, not by Recharts' own tooltip, which picks the nearest point by x alone and can name a neighbouring country. The log x axis spans whole powers of ten (`utils/logAxis.ts`) so every tick label sits at its true position.
- Categories live in `config/comparisons.ts`: health spending per person vs life expectancy, and GDP per capita vs women in the labour force. Both indicators are fetched for one fixed year (2021, `fetchIndicatorForYear`) so countries are compared like for like, unlike the `mrnev` map where years differ. 2021 is the latest year with ~190 countries of health-spending data (checked 2026-10-23).
- Map toggle: colour by the outcome, or by the **residual** (outcome minus what the trend line predicts, diverging palette). `utils/pairs.ts` does the join, the least-squares fit of the outcome on `log10(driver)` and the residuals.
- Known limits: the fit is a straight line in log space. It explains ~68% of life expectancy but only ~1% of women's labour participation (the relationship is U-shaped), so the residual map for the gender pair mostly shows distance from the average. A curved fit would suit it better.
- This panel is a second Mapbox map on the page, so it adds one more map load.

## Kepler.gl panel
- "Explore" panel: `KeplerMap` plots one point per country capital (World Bank capital coordinates), sized and coloured by the selected indicator. Countries with no value or no coordinates are skipped (`utils/keplerData.ts`). Layer styling lives in `config/keplerConfig.ts`.
- **Trend metrics:** the panel shows the latest value or how it changed over the last 5/10/20 years (`MetricSelector`). Metrics are defined in `config/keplerMetrics.ts`: change, % change, yearly growth (CAGR) and volatility, computed per country in `utils/changeMetrics.ts` from one bulk request (`fetchHistoryAll`, `useIndicatorHistory`). The ends of each series are the country's own first and last readings in the window, so countries reporting different years still compare.
  - Rates (inflation, unemployment, growth, shares) have `kind: 'rate'` in `config/indicators.ts` and get no % change or CAGR (a percentage of a percentage misleads). A metric that cannot be computed (too few readings, zero or negative base) is an empty cell, never 0.
  - Change metrics use a diverging palette centred on zero: Kepler's quantize scale spans the data's min to max, so `keplerDivergingColorRange` gives equal bands over `[-extent, extent]` as a custom colour map. Size uses `Size: |…|` columns so a big fall draws as large as a big rise.
  - Switching metric restyles the existing layer in place (`layerVisualChannelConfigChange`), keeping the user's pan/zoom/tweaks.
- Kepler is an **alpha** (3.3.0-alpha.16, the npm `latest` tag) and weighs ~7 MB in its own lazy chunk; `node_modules` grew by ~1.3 GB.
- It has its own Redux store, created inside `KeplerMap`, so the rest of the app does not use Redux.
- Workarounds in `vite.config.ts` / `package.json`, to revisit on every Kepler upgrade:
  - `resolve.alias.assert` + `define['process.env.NODE_DEBUG']`: Kepler calls Node's `assert`, which Vite stubs out in the browser.
  - `overrides` pins all `@deck.gl/*` to 9.3.11: Kepler's own ranges let `widgets` float to 9.4.0, which needs a newer core and breaks the production build.
- The instance is registered (`registerEntry`) before data is dispatched because Kepler silently drops actions sent before its component mounts.

## Chat assistant (CopilotKit)
- A CopilotKit sidebar (`components/Assistant.tsx`, lazy-loaded, ~1.6 MB chunk) answers questions about the current data and can switch the indicator or add/remove comparison countries. What it sees is shared with `useAgentContext`; what it can do is registered with `useFrontendTool`.
- The runtime (`server/copilotRuntime.ts`, `gpt-4.1-mini`) runs as a Vercel Function at `/api/copilotkit` (`api/copilotkit/[...path].ts`). In `npm run dev` the same runtime is served by `server/copilotDevPlugin.ts`, so no extra process is needed.
- Set `OPENAI_API_KEY` in `.env.local` (and in Vercel). It has no `VITE_` prefix on purpose, so it stays server-side. Without it the chat shows an error; the rest of the dashboard works.
- `openai` is a direct dependency and pinned with `overrides`: CopilotKit's optional peers otherwise pull `openai@4`, which wants zod 3 while Kepler's packages use zod 4.
- CopilotKit styles itself with a `.dark` class, so `Assistant` mirrors the OS colour scheme onto `<html>`.
- Each question sends the visible country data to OpenAI and costs tokens; use a key with a spending limit.
- **A2UI generative UI:** the runtime sets `a2ui: { injectA2UITool: true }`, so the model can answer comparisons with small visual panels (built-in Text, Row, Column, Card, Divider) rendered in the chat; the frontend needs no extra setup. The system prompt lists the allowed components, because the renderer is strict and rejects invented props such as `gap` and data-bound `List` templates (`path`), so the prompt forbids both. The built-in Card hard-codes a white background, so `components/Assistant.css` overrides it in dark mode. Restart the dev server after changing `server/copilotRuntime.ts`: the dev plugin caches the runtime.
- **Charts in the chat:** the model can call `show_bar_chart` (comparisons and top/bottom rankings) and `show_trend_chart` (change over time). The model only names countries; the handlers look the numbers up in the dashboard data (`utils/chartData.ts`) or fetch the series, so charted values always match the rest of the app. Charts render with Recharts (`ComparisonBarChart`, and the dashboard's `TrendChart`) inside the chat. A2UI is no longer used for numeric comparisons: its built-in components have no chart.

### Chat history and rate limiting
- **History:** the conversation is saved in this browser's `localStorage` (`usePersistedChat`, `utils/chatHistory.ts`) and restored on reload, including charts (they are rebuilt from the saved tool results). Only the last `MAX_HISTORY_MESSAGES` (10) are kept, and that same list is what is sent to the model, so it also caps memory and token cost. Trimming always starts on a user message so a tool result is never separated from the assistant message that requested it. The hook subscribes to the agent instead of using an effect on `agent.messages`, because the agent mutates that array in place (React and the React Compiler would never see a change). An empty list never overwrites saved history; only the "New chat" button clears it.
- **Rate limit (set in Vercel, not in code):** a Firewall rule limits each IP to 10 chat requests per minute. Only the two routes that call the model are counted. Create it, staged in log mode first:
  ```
  vercel firewall rules add "Rate limit chat" \
    --condition '{"type":"method","op":"eq","value":"POST"}' \
    --condition '{"type":"path","op":"re","value":"^/api/copilotkit/agent/[^/]+/(run|suggest)$"}' \
    --action rate_limit --rate-limit-window 60 --rate-limit-requests 10 \
    --rate-limit-keys ip --rate-limit-action log --yes
  ```
  Review the traffic, then switch to enforcing with `vercel firewall rules edit "Rate limit chat" --rate-limit-action rate_limit --yes`, and publish with `vercel firewall publish --yes`. A message that makes the model call a chart tool uses two requests (the run, then a follow-up run with the tool result). Counters are per Vercel region. The browser shows a notice when it receives HTTP 429. `npm run dev` has no limiter.
- **Chat questions do not move the maps:** `show_bar_chart` and `show_trend_chart` take an optional `indicatorId`, so asking about another indicator (e.g. inflation while GDP growth is shown) fetches that data for the chart and leaves the dashboard alone. `switch_indicator` and the comparison tools change the dashboard only on an explicit request ("show inflation on the map"); both the tool descriptions and the system prompt say so.

## Themes and colour
- Indicators are grouped into three themes (`TOPIC_ORDER` in `config/indicators.ts`): Economy, Prosperity, and People & quality of life. The selector shows a tab per theme and **only the selected theme's indicators**. The selected theme is derived from the selected indicator (one source of truth), so a change made by the chat assistant updates the tabs too. Choosing a theme selects its first indicator.
- Each theme has its own colour: the accent for chips, tabs and chart bars is set by `data-topic` on the page root (`styles/themes.css`, light and dark), and the map palettes (`THEME_PALETTES` in `config/theme.ts`) are passed to the Mapbox map and the Kepler layer, which cannot read CSS variables. Kepler is recoloured in place (`layerVisConfigChange`), not remounted, so a theme change costs no extra Mapbox map load.
- To add an indicator, add it to `INDICATORS` after checking the code on the live World Bank API. To add a theme, extend `Topic`, `TOPIC_LABELS`, `TOPIC_ORDER`, `THEME_PALETTES` and the rules in `themes.css`; `config/themes.test.ts` fails if any of these is missing.
- Selection and colour changes log to the browser console with `[theme]`, `[indicator]`, `[map]`, `[kepler]` and `[chat]` prefixes.
