import './AppHeader.css'

/** Page header: the product name and a short paragraph on what the dashboard shows. */
export function AppHeader() {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Development Indicator</h1>
      <p className="app-header__intro">
        Compare how countries are doing on the economy and on prosperity, using open data from the
        World Bank. Choose an indicator to colour the world map by each country&rsquo;s latest value,
        then click countries to follow them over the last 25 years. The Explore map shows the same
        data as sized dots, and the assistant can answer questions or draw charts.
      </p>
    </header>
  )
}
