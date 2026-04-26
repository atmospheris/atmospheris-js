// ISO 5878 — Surface parameters for reference atmosphere models
// Computes latitude-dependent gravity (Eq. 0 Lambert) and earth radius (Eq. 13)

const G_STANDARD = 9.80665  // m/s² (standard gravity)

export class SurfaceParameters {
  constructor(public readonly latitudeDeg: number) {}

  /** Eq. 0 — Lambert's equation: gravity at sea level (m/s²) */
  gravityAtSeaLevel(): number {
    const phiRad = this.latitudeDeg * Math.PI / 180
    const cos2phi = Math.cos(2 * phiRad)
    return 9.80616 * (1 - 0.0026373 * cos2phi + 0.0000059 * cos2phi * cos2phi)
  }

  /** Eq. 13 — Nominal earth radius (m) */
  nominalEarthRadius(): number {
    const phiRad = this.latitudeDeg * Math.PI / 180
    const cos2phi = Math.cos(2 * phiRad)
    const g0 = this.gravityAtSeaLevel()
    return g0 * 2 / (3.085462e-6 + 2.27e-9 * cos2phi)
  }

  /** Eq. 7 — gravity at geometric altitude h (m/s²) */
  gravityAtGeometric(hM: number): number {
    const r = this.nominalEarthRadius()
    const g0 = this.gravityAtSeaLevel()
    const ratio = r / (r + hM)
    return g0 * ratio * ratio
  }

  /** Eq. 8 — geopotential altitude from geometric altitude (m) */
  geopotentialFromGeometric(hM: number): number {
    const r = this.nominalEarthRadius()
    const g0 = this.gravityAtSeaLevel()
    return (r * hM / (r + hM)) * (g0 / G_STANDARD)
  }

  /** Eq. 9 — geometric altitude from geopotential altitude (m) */
  geometricFromGeopotential(HM: number): number {
    const r = this.nominalEarthRadius()
    const g0 = this.gravityAtSeaLevel()
    return (r * HM) / ((g0 / G_STANDARD) * r - HM)
  }
}
