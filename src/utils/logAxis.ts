/**
 * Log-axis domain and ticks on whole powers of ten ($10, $100, $1K...). The domain is widened
 * to the powers around the data so every tick lies inside it: a tick outside the domain is
 * clamped by the chart to the axis edge and labelled with the wrong value.
 */
export function logAxis(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const low = Math.floor(Math.log10(min))
  const high = Math.max(Math.ceil(Math.log10(max)), low + 1)
  const ticks: number[] = []
  for (let p = low; p <= high; p++) ticks.push(10 ** p)
  return { domain: [10 ** low, 10 ** high], ticks }
}
