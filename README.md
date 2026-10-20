# Development Indicator

A dashboard of world development indicators (economy and prosperity first), built from World Bank open data.

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
├── hooks/       Data hooks (useCountries, useIndicator, useTrend, useAsyncData)
├── components/  Small presentational components with co-located CSS
├── utils/       Pure helpers (formatting, colour scale, stats, chart rows)
└── App.tsx      Owns selection state and wires data to components
```

## Data
Source: World Bank API v2 (no key needed). Indicators in `src/config/indicators.ts`:
GDP per capita, GDP growth, inflation, unemployment, GNI per capita, Gini.

- The map uses each country's **most recent available value** (`mrnev=1`), so the year differs per country.
- The map is Mapbox GL JS drawing the free `mapbox.country-boundaries-v1` vector tileset (source layer `country_boundaries`). Countries are joined to World Bank data on `iso_3166_1_alpha_3`; Kosovo is `XKS` in Mapbox but `XKX` in the World Bank API, translated in `utils/countryCode.ts`. Disputed/alternate-worldview polygons are filtered out.
- `WorldMap` is lazy-loaded so the ~1.9 MB Mapbox chunk does not block first paint.
- Aggregates ("World", "Arab World", ...) are filtered out using the country list's region id `NA`.

## Notes
- TypeScript is pinned to 6.0.x because `typescript-eslint` 8.72 does not yet accept TypeScript 7. Revisit when it does.
- Not yet done: Playwright end-to-end tests; keyboard access to map countries (the country dropdown is the keyboard route); live verification of the Mapbox layers needs a token.
- Mapbox GL needs a token, and usage is billed by Mapbox beyond its free tier. Use a public token restricted to your domains.

## Kepler.gl panel
- "Explore" panel: `KeplerMap` plots one point per country capital (World Bank capital coordinates), sized and coloured by the selected indicator. Countries with no value or no coordinates are skipped (`utils/keplerData.ts`). Layer styling lives in `config/keplerConfig.ts`.
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
