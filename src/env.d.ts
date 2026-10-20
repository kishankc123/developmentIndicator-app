/** Typed environment variables exposed by Vite (only `VITE_`-prefixed ones reach the browser). */
interface ImportMetaEnv {
  /** Public Mapbox access token (pk.*). Optional so the app can show a setup message without it. */
  readonly VITE_MAPBOX_PUBLIC_ACCESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
