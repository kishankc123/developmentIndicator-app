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
