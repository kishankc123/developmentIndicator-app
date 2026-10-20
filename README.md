# Development Indicator

A dashboard of world development indicators (economy and prosperity first), built from World Bank open data.

## Stack
React 19, TypeScript, Vite (with React Compiler), Recharts, react-simple-maps, Vitest + React Testing Library.

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
- Map shapes come from `world-atlas` (numeric ISO ids); they are joined to the API's ISO3 codes with `i18n-iso-countries`. Territories without a numeric id (e.g. Kosovo) show as "no data".
- Aggregates ("World", "Arab World", ...) are filtered out using the country list's region id `NA`.

## Notes
- TypeScript is pinned to 6.0.x because `typescript-eslint` 8.72 does not yet accept TypeScript 7. Revisit when it does.
- Not yet done: Playwright end-to-end tests, map zoom, keyboard access to map countries (the country dropdown is the keyboard route).
