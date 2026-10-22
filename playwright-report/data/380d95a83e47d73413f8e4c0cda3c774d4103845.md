# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.ts >> page has no horizontal overflow at common widths
- Location: e2e/responsive.spec.ts:4:1

# Error details

```
Error: horizontal overflow at 320px

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    823
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - heading "Development Indicator" [level=1] [ref=e5]
      - paragraph [ref=e6]: Compare how countries are doing on the economy and on prosperity, using open data from the World Bank. Choose an indicator to colour the world map by each country’s latest value, then click countries to follow them over the last 25 years. The Explore map shows the same data as sized dots, and the assistant can answer questions or draw charts.
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Economy
        - radiogroup "Economy" [ref=e10]:
          - radio "GDP per capita" [checked] [ref=e11] [cursor=pointer]
          - radio "GDP growth" [ref=e12] [cursor=pointer]
          - radio "Inflation" [ref=e13] [cursor=pointer]
          - radio "Unemployment" [ref=e14] [cursor=pointer]
      - generic [ref=e15]:
        - generic [ref=e16]: Prosperity
        - radiogroup "Prosperity" [ref=e17]:
          - radio "GNI per capita" [ref=e18] [cursor=pointer]
          - radio "Income inequality (Gini)" [ref=e19] [cursor=pointer]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: India
        - generic [ref=e23]: $2,500
        - generic [ref=e24]: "Latest: 2023"
      - generic [ref=e25]:
        - generic [ref=e26]: Highest
        - generic [ref=e27]: $85,000
        - generic [ref=e28]: United States, 2023
      - generic [ref=e29]:
        - generic [ref=e30]: Median country
        - generic [ref=e31]: $7,550
        - generic [ref=e32]: Across 4 countries
    - generic [ref=e33]:
      - generic [ref=e35]:
        - heading "GDP per capita" [level=2] [ref=e36]
        - paragraph [ref=e37]: Economic output per person, in current US dollars.
      - status [ref=e38]: Loading map…
      - paragraph [ref=e40]: Each country shows its most recent available year, so years differ between countries.
    - generic [ref=e41]:
      - generic [ref=e43]:
        - 'heading "Explore: GDP per capita" [level=2] [ref=e44]'
        - paragraph [ref=e45]: "Kepler.gl: country capitals sized and coloured by value. Open the side panel to filter and restyle."
      - status [ref=e46]: Loading Kepler.gl…
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - heading "Compare over time" [level=2] [ref=e51]
          - paragraph [ref=e52]: GDP per capita, last 25 years
        - generic [ref=e54]:
          - list [ref=e55]:
            - listitem [ref=e56]:
              - text: United States
              - button "Remove United States" [ref=e58] [cursor=pointer]: ×
            - listitem [ref=e59]:
              - text: China
              - button "Remove China" [ref=e61] [cursor=pointer]: ×
            - listitem [ref=e62]:
              - text: India
              - button "Remove India" [ref=e64] [cursor=pointer]: ×
          - generic [ref=e65]:
            - generic [ref=e66]: Add a country to compare
            - combobox "Add a country to compare" [ref=e67]:
              - option "Add a country…" [selected]
              - option "Nepal"
      - generic [ref=e70]:
        - list [ref=e72]:
          - listitem [ref=e73]:
            - img "China legend icon" [ref=e74]
            - text: China
          - listitem [ref=e76]:
            - img "India legend icon" [ref=e77]
            - text: India
          - listitem [ref=e79]:
            - img "United States legend icon" [ref=e80]
            - text: United States
        - application [ref=e82]:
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: "2001"
              - generic [ref=e100]: "2006"
              - generic [ref=e102]: "2011"
              - generic [ref=e104]: "2016"
              - generic [ref=e106]: "2021"
              - generic [ref=e108]: "2026"
            - generic [ref=e110]:
              - generic [ref=e111]: $0
              - generic [ref=e113]: $25K
              - generic [ref=e115]: $50K
              - generic [ref=e117]: $75K
              - generic [ref=e119]: $100K
    - contentinfo [ref=e121]: "Source: World Bank Open Data (World Development Indicators)."
  - generic [aria-hidden] [ref=e122]: $0
```

# Test source

```ts
  1  | import { expect, log, test } from './fixtures.ts'
  2  | import { mockWorldBank } from './worldBankMock.ts'
  3  | 
  4  | test('page has no horizontal overflow at common widths', async ({ page }) => {
  5  |   await mockWorldBank(page)
  6  |   await page.goto('/')
  7  |   await expect(page.locator('.country-selector__chip')).toHaveCount(3)
  8  | 
  9  |   for (const width of [320, 375, 768, 1280]) {
  10 |     await page.setViewportSize({ width, height: 800 })
  11 |     // Overflow = how much wider the content is than the visible area (0 or less is fine).
  12 |     const overflow = await page.evaluate(
  13 |       () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  14 |     )
  15 |     log(`${width}px wide → overflow ${overflow}px`)
> 16 |     expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
     |                                                           ^ Error: horizontal overflow at 320px
  17 |   }
  18 | })
  19 | 
```