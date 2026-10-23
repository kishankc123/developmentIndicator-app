/** Converts a 6-digit hex colour such as "#1b707e" to an [r, g, b] triple (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Expected a 6-digit hex colour like "#1b707e", got "${hex}"`)
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}
