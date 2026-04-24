// ISO 2533 Standard Atmosphere — IsaAlgorithms class
// Implements all standard atmosphere calculations per ISO 2533:1975

import { CONSTANTS, DERIVED_CONSTANTS, TEMPERATURE_LAYERS } from './constants.js'

export { TEMPERATURE_LAYERS } from './constants.js'
export { CONSTANTS, DERIVED_CONSTANTS } from './constants.js'

export class IsaAlgorithms {
  readonly sqrt2 = Math.SQRT2
  readonly pi = Math.PI
  private _pressureLayers: number[] | null = null

  // --- Altitude conversions ---

  geometricAltitudeFromGeopotential(geopotentialAlt: number): number {
    return (CONSTANTS.radius * geopotentialAlt) / (CONSTANTS.radius - geopotentialAlt)
  }

  geopotentialAltitudeFromGeometric(geometricAlt: number): number {
    return (CONSTANTS.radius * geometricAlt) / (CONSTANTS.radius + geometricAlt)
  }

  gravityAtGeometric(geometricAlt: number): number {
    const r = CONSTANTS.radius / (CONSTANTS.radius + geometricAlt)
    return CONSTANTS.g_n * r * r
  }

  gravityAtGeopotential(geopotentialAlt: number): number {
    const geo = this.geometricAltitudeFromGeopotential(geopotentialAlt)
    return this.gravityAtGeometric(geo)
  }

  // --- Layer lookup ---

  private locateLowerLayer(geopotentialAlt: number): number {
    const layers = TEMPERATURE_LAYERS
    if (geopotentialAlt < layers[0].H) return 0
    const last = layers.length - 1
    if (geopotentialAlt >= layers[last].H) return last - 1
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].H > geopotentialAlt) return i - 1
    }
    return 0
  }

  // --- Temperature ---

  temperatureFromGeopotential(geopotentialAlt: number): number {
    const layerIndex = this.locateLowerLayer(geopotentialAlt)
    const layer = TEMPERATURE_LAYERS[layerIndex]
    const beta = layer.B ?? 0
    return layer.T + beta * (geopotentialAlt - layer.H)
  }

  temperatureCelsiusFromGeopotential(geopotentialAlt: number): number {
    return this.temperatureFromGeopotential(geopotentialAlt) - 273.15
  }

  // --- Pressure (internal formulas) ---

  private pressureFormulaBetaNonzero(
    pressureBase: number,
    beta: number,
    temperatureBase: number,
    deltaH: number
  ): number {
    const exponent = -CONSTANTS.g_n / (beta * DERIVED_CONSTANTS.R)
    return pressureBase * Math.pow(1 + (beta * deltaH) / temperatureBase, exponent)
  }

  private pressureFormulaBetaZero(
    pressureBase: number,
    temperatureBase: number,
    deltaH: number
  ): number {
    const exponent = -(CONSTANTS.g_n * deltaH) / (DERIVED_CONSTANTS.R * temperatureBase)
    return pressureBase * Math.exp(exponent)
  }

  private computePressureLayers(): number[] {
    if (this._pressureLayers) return this._pressureLayers
    const layers: number[] = []
    for (let e = 0; e < TEMPERATURE_LAYERS.length; e++) {
      const prevIndex = e === 0 ? 0 : e - 1
      const prevLayer = TEMPERATURE_LAYERS[prevIndex]
      const beta = prevLayer.B ?? 0
      let pressureBase: number
      let heightBase: number
      let temperatureBase: number
      if (prevLayer.H <= 0) {
        pressureBase = CONSTANTS.p_n
        heightBase = 0
        temperatureBase = CONSTANTS.T_n
      } else {
        pressureBase = layers[prevIndex]
        heightBase = prevLayer.H
        temperatureBase = prevLayer.T
      }
      const currentLayer = TEMPERATURE_LAYERS[e]
      const M = currentLayer.H - heightBase
      const T = currentLayer.T
      if (beta === 0) {
        layers[e] = this.pressureFormulaBetaZero(pressureBase, T, M)
      } else {
        layers[e] = this.pressureFormulaBetaNonzero(pressureBase, beta, temperatureBase, M)
      }
    }
    this._pressureLayers = layers
    return layers
  }

  get pressureLayers(): number[] {
    return this.computePressureLayers()
  }

  // --- Pressure (public) ---

  pressureFromGeopotential(geopotentialAlt: number): number {
    const layerIndex = this.locateLowerLayer(geopotentialAlt)
    const layer = TEMPERATURE_LAYERS[layerIndex]
    const beta = layer.B ?? 0
    const H_b = layer.H
    const T_b = layer.T
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    const p_b = this.pressureLayers[layerIndex]
    const deltaH = geopotentialAlt - H_b
    return beta === 0
      ? this.pressureFormulaBetaZero(p_b, T_b, deltaH)
      : this.pressureFormulaBetaNonzero(p_b, beta, T_b, deltaH)
  }

  pressureMbarFromGeopotential(geopotentialAlt: number): number {
    return this.pressureFromGeopotential(geopotentialAlt) / 100
  }

  pressureMmhgFromGeopotential(geopotentialAlt: number): number {
    return this.pressureFromGeopotential(geopotentialAlt) * 0.007500616827
  }

  pressureRatio(geopotentialAlt: number): number {
    return this.pressureFromGeopotential(geopotentialAlt) / CONSTANTS.p_n
  }

  // --- Density ---

  densityFromGeopotential(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    const p = this.pressureFromGeopotential(geopotentialAlt)
    return p / (DERIVED_CONSTANTS.R * T)
  }

  densityRatio(geopotentialAlt: number): number {
    return this.densityFromGeopotential(geopotentialAlt) / CONSTANTS.rho_n
  }

  sqrtDensityRatio(geopotentialAlt: number): number {
    return Math.sqrt(this.densityRatio(geopotentialAlt))
  }

  // --- Derived properties ---

  specificWeight(geopotentialAlt: number): number {
    return this.densityFromGeopotential(geopotentialAlt) * this.gravityAtGeopotential(geopotentialAlt)
  }

  pressureScaleHeight(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return (DERIVED_CONSTANTS.R * T) / this.gravityAtGeopotential(geopotentialAlt)
  }

  airNumberDensity(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    const p = this.pressureFromGeopotential(geopotentialAlt)
    return (CONSTANTS.N_A * p) / (CONSTANTS.R_star * T)
  }

  meanParticleSpeed(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return 1.595769 * Math.sqrt(DERIVED_CONSTANTS.R * T)
  }

  meanFreePath(geopotentialAlt: number): number {
    const n = this.airNumberDensity(geopotentialAlt)
    return 1 / (this.sqrt2 * this.pi * 1.33225e-14 * n)
  }

  collisionFrequency(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    const n = this.airNumberDensity(geopotentialAlt)
    return (
      4 *
      1.33225e-14 *
      Math.pow(this.pi / (CONSTANTS.R_star * DERIVED_CONSTANTS.M), 0.5) *
      n *
      CONSTANTS.R_star *
      Math.pow(T, 0.5)
    )
  }

  speedOfSound(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return Math.sqrt(CONSTANTS.kappa * DERIVED_CONSTANTS.R * T)
  }

  dynamicViscosity(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return (1458e-9 * Math.pow(T, 1.5)) / (T + 110.4)
  }

  kinematicViscosity(geopotentialAlt: number): number {
    return this.dynamicViscosity(geopotentialAlt) / this.densityFromGeopotential(geopotentialAlt)
  }

  thermalConductivity(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return (0.002648151 * Math.pow(T, 1.5)) / (T + 245.4 * Math.pow(10, -12 / T))
  }

  // --- Reverse lookup (pressure → altitude) ---

  geopotentialFromPressureMbar(pressureMbar: number): number | undefined {
    const layers = this.pressureLayers
    // Approximate inversion using polynomial fits for each layer
    // These are simplified — the full implementation uses analytical solutions
    if (pressureMbar >= layers[2] / 100) {
      return (3.731444 - Math.pow(pressureMbar, 0.1902631)) / 8.41728e-5
    }
    if (pressureMbar >= layers[3] / 100) {
      return (3.1080387 - Math.log10(pressureMbar)) / 6.848325e-6
    }
    if (pressureMbar >= layers[4] / 100) {
      const p = Math.pow(pressureMbar, 0.02927125)
      return (1.2386515 - p) / (5.085177e-7 * p)
    }
    if (pressureMbar >= layers[5] / 100) {
      const p = Math.pow(pressureMbar, 0.08195949)
      return (1.9630052 - p) / (2.013664e-6 * p)
    }
    return undefined
  }

  geopotentialFromPressureMmhg(pressureMmhg: number): number | undefined {
    const layers = this.pressureLayers
    if (pressureMmhg >= layers[2] * 0.007500616827) {
      return (3.532747 - Math.pow(pressureMmhg, 0.1902631)) / 7.96906e-5
    }
    if (pressureMmhg >= layers[3] * 0.007500616827) {
      return (2.9831357 - Math.log10(pressureMmhg)) / 6.848325e-6
    }
    if (pressureMmhg >= layers[4] * 0.007500616827) {
      const p = Math.pow(pressureMmhg, 0.02927125)
      return (1.2282678 - p) / (5.085177e-7 * p)
    }
    if (pressureMmhg >= layers[5] * 0.007500616827) {
      const p = Math.pow(pressureMmhg, 0.08195949)
      return (1.9172753 - p) / (2.013664e-6 * p)
    }
    return undefined
  }

  mbarToMmhg(mbar: number): number {
    return (mbar * 100) * 0.007500616827
  }

  mmhgToMbar(mmhg: number): number {
    return mmhg / 0.007500616827 / 100
  }
}

let _instance: IsaAlgorithms | null = null

export function getIsaInstance(): IsaAlgorithms {
  if (!_instance) _instance = new IsaAlgorithms()
  return _instance
}
