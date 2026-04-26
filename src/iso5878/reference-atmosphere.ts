// ISO 5878 — Reference atmosphere profile engine
// Generalized ISA engine with latitude-specific surface conditions and custom temperature layers

import { SurfaceParameters } from './surface-parameters.js'

const R_SPECIFIC = 287.05287  // J/(kg·K)

export interface TemperatureLayerBreakpoint {
  H: number  // Geopotential altitude (m)
  T: number  // Temperature (K)
  B?: number // Temperature gradient (K/m), omitted for last layer
}

export interface SurfaceConditions {
  temperature: number  // K
  pressure: number     // Pa
}

export class ReferenceAtmosphere {
  private readonly layers: TemperatureLayerBreakpoint[]
  private readonly surface: SurfaceParameters
  private readonly conditions: SurfaceConditions
  private readonly g0: number
  private readonly radius: number
  private _pressureLayers: number[] | null = null

  constructor(
    surface: SurfaceParameters,
    conditions: SurfaceConditions,
    layers: TemperatureLayerBreakpoint[]
  ) {
    this.surface = surface
    this.conditions = conditions
    this.layers = layers
    this.g0 = surface.gravityAtSeaLevel()
    this.radius = surface.nominalEarthRadius()
  }

  // --- Altitude conversions (delegated to SurfaceParameters) ---

  geometricFromGeopotential(HM: number): number {
    return this.surface.geometricFromGeopotential(HM)
  }

  geopotentialFromGeometric(hM: number): number {
    return this.surface.geopotentialFromGeometric(hM)
  }

  // --- Layer lookup ---

  private locateLowerLayer(geopotentialAlt: number): number {
    if (geopotentialAlt < this.layers[0].H) return 0
    const last = this.layers.length - 1
    if (geopotentialAlt >= this.layers[last].H) return last - 1
    for (let i = 0; i < this.layers.length; i++) {
      if (this.layers[i].H > geopotentialAlt) return i - 1
    }
    return 0
  }

  // --- Temperature ---

  temperatureAtGeopotential(geopotentialAlt: number): number {
    const idx = this.locateLowerLayer(geopotentialAlt)
    const layer = this.layers[idx]
    const beta = layer.B ?? 0
    return layer.T + beta * (geopotentialAlt - layer.H)
  }

  temperatureCelsiusAtGeopotential(geopotentialAlt: number): number {
    return this.temperatureAtGeopotential(geopotentialAlt) - 273.15
  }

  // --- Pressure (internal formulas) ---

  private pressureFormulaBetaNonzero(
    pressureBase: number,
    beta: number,
    temperatureBase: number,
    deltaH: number
  ): number {
    const exponent = -this.g0 / (beta * R_SPECIFIC)
    return pressureBase * Math.pow(1 + (beta * deltaH) / temperatureBase, exponent)
  }

  private pressureFormulaBetaZero(
    pressureBase: number,
    temperatureBase: number,
    deltaH: number
  ): number {
    const exponent = -(this.g0 * deltaH) / (R_SPECIFIC * temperatureBase)
    return pressureBase * Math.exp(exponent)
  }

  private computePressureLayers(): number[] {
    if (this._pressureLayers) return this._pressureLayers
    const p: number[] = []

    for (let i = 0; i < this.layers.length; i++) {
      const prevIndex = i === 0 ? 0 : i - 1
      const prevLayer = this.layers[prevIndex]
      const beta = prevLayer.B ?? 0

      let pressureBase: number
      let heightBase: number
      let temperatureBase: number

      if (prevLayer.H <= 0) {
        pressureBase = this.conditions.pressure
        heightBase = 0
        temperatureBase = this.conditions.temperature
      } else {
        pressureBase = p[prevIndex]
        heightBase = prevLayer.H
        temperatureBase = prevLayer.T
      }

      const currentLayer = this.layers[i]
      const dh = currentLayer.H - heightBase

      if (beta === 0) {
        p[i] = this.pressureFormulaBetaZero(pressureBase, currentLayer.T, dh)
      } else {
        p[i] = this.pressureFormulaBetaNonzero(pressureBase, beta, temperatureBase, dh)
      }
    }

    this._pressureLayers = p
    return p
  }

  get pressureLayers(): number[] {
    return this.computePressureLayers()
  }

  // --- Pressure (public) ---

  pressureAtGeopotential(geopotentialAlt: number): number {
    const i = this.locateLowerLayer(geopotentialAlt)
    const layer = this.layers[i]
    const beta = layer.B ?? 0
    const H_b = layer.H
    const T_b = layer.T
    const T = this.temperatureAtGeopotential(geopotentialAlt)
    const p_b = this.pressureLayers[i]
    const deltaH = geopotentialAlt - H_b

    return beta === 0
      ? this.pressureFormulaBetaZero(p_b, T_b, deltaH)
      : this.pressureFormulaBetaNonzero(p_b, beta, T_b, deltaH)
  }

  pressureMbarAtGeopotential(geopotentialAlt: number): number {
    return this.pressureAtGeopotential(geopotentialAlt) / 100
  }

  // --- Density ---

  densityAtGeopotential(geopotentialAlt: number): number {
    const T = this.temperatureAtGeopotential(geopotentialAlt)
    const p = this.pressureAtGeopotential(geopotentialAlt)
    return p / (R_SPECIFIC * T)
  }
}
