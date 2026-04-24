// ISO 2533 Standard Atmosphere — Significant figures rounding

export function roundToSigFigs(value: number, sigFigs: number): number {
  if (value === 0) return 0
  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  const factor = Math.pow(10, sigFigs - 1 - magnitude)
  return Math.round(value * factor) / factor
}
