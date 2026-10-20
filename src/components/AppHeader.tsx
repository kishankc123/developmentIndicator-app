import './AppHeader.css'

/** Page header: product name and a one-line description of the data source. */
export function AppHeader() {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Development Indicator</h1>
      <p className="app-header__tagline">
        Economy and prosperity across the world, from World Bank open data.
      </p>
    </header>
  )
}
