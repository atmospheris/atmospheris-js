// ISO 2533 Standard Atmosphere — IsaAlgorithms class
// Implements all standard atmosphere calculations per ISO 2533:1975
// Includes bidirectional solver: any property → altitude → all properties

import { CONSTANTS, DERIVED_CONSTANTS, TEMPERATURE_LAYERS } from './constants.js'

export { TEMPERATURE_LAYERS } from './constants.js'
export { CONSTANTS, DERIVED_CONSTANTS } from './constants.js'

export class IsaAlgorithms {
  readonly sqrt2 = Math.SQRT2
  readonly pi = Math.PI
  private _pressureLayers: number[] | null = null

  // Sea-level reference values for ratio calculations
  private readonly _mu0 = 1.4607e-5    // Dynamic viscosity at sea level
  private readonly _a0 = 340.294       // Speed of sound at sea level

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

  temperatureRatio(geopotentialAlt: number): number {
    return this.temperatureFromGeopotential(geopotentialAlt) / CONSTANTS.T_n
  }

  lapseRate(geopotentialAlt: number): number {
    const layerIndex = this.locateLowerLayer(geopotentialAlt)
    return TEMPERATURE_LAYERS[layerIndex].B ?? 0
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

  speedOfSoundRatio(geopotentialAlt: number): number {
    return this.speedOfSound(geopotentialAlt) / this._a0
  }

  dynamicViscosity(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return (1458e-9 * Math.pow(T, 1.5)) / (T + 110.4)
  }

  dynamicViscosityRatio(geopotentialAlt: number): number {
    return this.dynamicViscosity(geopotentialAlt) / this._mu0
  }

  kinematicViscosity(geopotentialAlt: number): number {
    return this.dynamicViscosity(geopotentialAlt) / this.densityFromGeopotential(geopotentialAlt)
  }

  kinematicViscosityRatio(geopotentialAlt: number): number {
    return this.kinematicViscosity(geopotentialAlt) / (this._mu0 / CONSTANTS.rho_n)
  }

  thermalConductivity(geopotentialAlt: number): number {
    const T = this.temperatureFromGeopotential(geopotentialAlt)
    return (0.002648151 * Math.pow(T, 1.5)) / (T + 245.4 * Math.pow(10, -12 / T))
  }

  thermalConductivityRatio(geopotentialAlt: number): number {
    return this.thermalConductivity(geopotentialAlt) / this.thermalConductivity(0)
  }

  gravityRatio(geopotentialAlt: number): number {
    return this.gravityAtGeopotential(geopotentialAlt) / CONSTANTS.g_n
  }

  meanMolecularWeight(geopotentialAlt: number): number {
    // In ISO 2533 range (−2000 to 80000 m), composition is constant
    return DERIVED_CONSTANTS.M
  }

  meanMolecularWeightRatio(geopotentialAlt: number): number {
    return 1.0 // Constant in ISA range
  }

  molecularTemperature(geopotentialAlt: number): number {
    return this.temperatureFromGeopotential(geopotentialAlt) * this.meanMolecularWeightRatio(geopotentialAlt)
  }

  moleVolume(geopotentialAlt: number): number {
    const T_mol = this.molecularTemperature(geopotentialAlt)
    const p = this.pressureFromGeopotential(geopotentialAlt)
    return CONSTANTS.R_star * T_mol / p
  }

  // =========================================================
  // INVERSE SOLVERS — property value → geopotential altitude
  // =========================================================

  // --- Generic bisection solver ---

  private bisect(
    fn: (H: number) => number,
    target: number,
    lo: number,
    hi: number,
    tolerance: number = 1e-7,
    maxIter: number = 200
  ): number {
    let a = lo
    let b = hi
    let mid = a
    // Detect monotonic direction
    const fLo = fn(lo)
    const fHi = fn(hi)
    const increasing = fLo < fHi
    for (let i = 0; i <= maxIter; i++) {
      mid = (a + b) / 2
      const val = fn(mid)
      if (isNaN(val)) {
        // Narrow toward the side that produced a valid value
        if (Math.abs(val - fn(a)) < Math.abs(val - fn(b))) b = mid
        else a = mid
        continue
      }
      const diff = Math.abs(target - val)
      if (diff <= tolerance) return mid
      // target < val: if increasing, go left (b=mid); if decreasing, go right (a=mid)
      if (target < val) {
        if (increasing) b = mid; else a = mid
      } else {
        if (increasing) a = mid; else b = mid
      }
    }
    return mid
  }

  // For non-monotonic properties, search multiple altitude ranges
  // Returns the LOWEST geopotential altitude that matches
  private bisectMultiRange(
    fn: (H: number) => number,
    target: number,
    ranges: [number, number][], // [lo, hi] per range
    tolerance: number = 1e-7,
    maxIter: number = 100
  ): number | undefined {
    for (const [lo, hi] of ranges) {
      const valLo = fn(lo)
      const valHi = fn(hi)
      if (isNaN(valLo) || isNaN(valHi)) continue
      // Check if target is in this range (with epsilon for floating-point tolerance)
      const eps = Math.abs(target) * 1e-10 + 1e-14
      const minVal = Math.min(valLo, valHi)
      const maxVal = Math.max(valLo, valHi)
      if (target < minVal - eps || target > maxVal + eps) continue
      const result = this.bisect(fn, target, lo, hi, tolerance, maxIter)
      if (!isNaN(result)) return result
    }
    return undefined
  }

  // --- Algebraic inverses ---

  /** Temperature (K) → geopotential altitude. Returns lowest altitude for non-unique T. */
  geopotentialFromTemperature(T: number): number | undefined {
    // Temperature is non-monotonic across the full range. Search all monotonic segments.
    // Each segment must be strictly monotonic for bisection to work.
    const ranges: [number, number][] = [
      [-2000, 11000],   // Troposphere: T decreasing (301.15 → 216.65)
      [11000, 20000],   // Tropopause: T constant (216.65)
      [20000, 32000],   // Lower stratosphere: T increasing (216.65 → 228.65)
      [32000, 47000],   // Upper stratosphere: T increasing (228.65 → 270.65)
      [47000, 51000],   // Stratopause: T constant (270.65)
      [51000, 71000],   // Mesosphere: T decreasing (270.65 → 214.65)
      [71000, 80000],   // Upper mesosphere: T decreasing (214.65 → 196.65)
    ]
    return this.bisectMultiRange(H => this.temperatureFromGeopotential(H), T, ranges)
  }

  /** Temperature ratio θ → geopotential altitude */
  geopotentialFromTemperatureRatio(theta: number): number | undefined {
    return this.geopotentialFromTemperature(theta * CONSTANTS.T_n)
  }

  /** Pressure ratio δ → geopotential altitude. Monotonically decreasing. */
  geopotentialFromPressureRatio(delta: number): number | undefined {
    // Use relative tolerance for small pressure ratios at high altitude
    const tol = Math.max(1e-12, Math.abs(delta) * 1e-10)
    return this.bisect(
      H => this.pressureRatio(H),
      delta,
      -2000, 80000,
      tol, 300
    )
  }

  /** Pressure (Pa) → geopotential altitude */
  geopotentialFromPressure(pressure: number): number | undefined {
    return this.geopotentialFromPressureRatio(pressure / CONSTANTS.p_n)
  }

  /** Density ratio σ → geopotential altitude */
  geopotentialFromDensityRatio(sigma: number): number | undefined {
    // Density decreases monotonically with altitude
    const tol = Math.max(1e-12, Math.abs(sigma) * 1e-10)
    return this.bisect(
      H => this.densityRatio(H),
      sigma,
      -2000, 80000,
      tol, 300
    )
  }

  /** Density (kg/m³) → geopotential altitude */
  geopotentialFromDensity(density: number): number | undefined {
    return this.geopotentialFromDensityRatio(density / CONSTANTS.rho_n)
  }

  /** Gravity → geopotential altitude. Direct algebraic inverse. */
  geopotentialFromGravity(g: number): number | undefined {
    // g = g_n * (r₀/(r₀+z))²  where z = geometric altitude
    // Solve for z: z = r₀ * (1/√(g/g_n) - 1)
    // Then convert z to H
    if (g <= 0) return undefined
    const z = CONSTANTS.radius * (1 / Math.sqrt(g / CONSTANTS.g_n) - 1)
    const H = this.geopotentialAltitudeFromGeometric(z)
    // Check if within ISA range
    if (H < -2000 || H > 80000) return undefined
    return H
  }

  /** Gravity ratio (g/g₀) → geopotential altitude */
  geopotentialFromGravityRatio(ratio: number): number | undefined {
    return this.geopotentialFromGravity(ratio * CONSTANTS.g_n)
  }

  /** Speed of sound → geopotential altitude. Non-monotonic (follows T). */
  geopotentialFromSpeedOfSound(a: number): number | undefined {
    // a = √(κRT), so T = a²/(κR), then solve T → H
    const T = (a * a) / (CONSTANTS.kappa * DERIVED_CONSTANTS.R)
    return this.geopotentialFromTemperature(T)
  }

  /** Speed of sound ratio → geopotential altitude */
  geopotentialFromSpeedOfSoundRatio(ratio: number): number | undefined {
    return this.geopotentialFromSpeedOfSound(ratio * this._a0)
  }

  /** Mean particle speed → geopotential altitude. Via temperature. */
  geopotentialFromMeanParticleSpeed(v: number): number | undefined {
    // v = 1.595769 * √(RT), so T = v²/(1.595769² * R)
    const T = (v * v) / (1.595769 * 1.595769 * DERIVED_CONSTANTS.R)
    return this.geopotentialFromTemperature(T)
  }

  // --- Bisection-based inverses ---

  /** Dynamic viscosity → geopotential altitude. Non-monotonic (follows T). */
  geopotentialFromDynamicViscosity(mu: number): number | undefined {
    const ranges: [number, number][] = [
      [-2000, 11000],
      [11000, 20000],
      [20000, 32000],
      [32000, 47000],
      [47000, 51000],
      [51000, 71000],
      [71000, 80000],
    ]
    return this.bisectMultiRange(H => this.dynamicViscosity(H), mu, ranges, 1e-14)
  }

  /** Dynamic viscosity ratio → geopotential altitude */
  geopotentialFromDynamicViscosityRatio(ratio: number): number | undefined {
    return this.geopotentialFromDynamicViscosity(ratio * this._mu0)
  }

  /** Kinematic viscosity → geopotential altitude. Monotonically increasing. */
  geopotentialFromKinematicViscosity(nu: number): number | undefined {
    return this.bisect(H => this.kinematicViscosity(H), nu, -2000, 80000, 1e-13, 300)
  }

  /** Kinematic viscosity ratio → geopotential altitude */
  geopotentialFromKinematicViscosityRatio(ratio: number): number | undefined {
    const nu0 = this._mu0 / CONSTANTS.rho_n
    return this.geopotentialFromKinematicViscosity(ratio * nu0)
  }

  /** Thermal conductivity → geopotential altitude. Non-monotonic (follows T). */
  geopotentialFromThermalConductivity(k: number): number | undefined {
    const ranges: [number, number][] = [
      [-2000, 11000],
      [11000, 20000],
      [20000, 32000],
      [32000, 47000],
      [47000, 51000],
      [51000, 71000],
      [71000, 80000],
    ]
    return this.bisectMultiRange(H => this.thermalConductivity(H), k, ranges, 1e-13)
  }

  /** Thermal conductivity ratio → geopotential altitude */
  geopotentialFromThermalConductivityRatio(ratio: number): number | undefined {
    return this.geopotentialFromThermalConductivity(ratio * this.thermalConductivity(0))
  }

  /** Pressure scale height → geopotential altitude. Non-monotonic. */
  geopotentialFromPressureScaleHeight(Hp: number): number | undefined {
    const ranges: [number, number][] = [
      [-2000, 11000],
      [11000, 20000],
      [20000, 32000],
      [32000, 47000],
      [47000, 51000],
      [51000, 71000],
      [71000, 80000],
    ]
    return this.bisectMultiRange(H => this.pressureScaleHeight(H), Hp, ranges, 1e-7)
  }

  /** Air number density → geopotential altitude. Monotonically decreasing. */
  geopotentialFromNumberDensity(n: number): number | undefined {
    return this.bisect(H => this.airNumberDensity(H), n, -2000, 80000, 1e-11, 100)
  }

  /** Mean free path → geopotential altitude. Monotonically increasing. */
  geopotentialFromMeanFreePath(l: number): number | undefined {
    const tol = Math.max(1e-22, Math.abs(l) * 1e-10)
    return this.bisect(H => this.meanFreePath(H), l, -2000, 80000, tol, 300)
  }

  /** Collision frequency → geopotential altitude. Monotonically decreasing. */
  geopotentialFromCollisionFrequency(f: number): number | undefined {
    return this.bisect(H => this.collisionFrequency(H), f, -2000, 80000, 1e-8, 300)
  }

  /** Mole volume → geopotential altitude */
  geopotentialFromMoleVolume(Vm: number): number | undefined {
    return this.bisect(H => this.moleVolume(H), Vm, -2000, 80000, 1e-8, 300)
  }

  /** Molecular temperature → geopotential altitude */
  geopotentialFromMolecularTemperature(Tm: number): number | undefined {
    // In ISA range, molecular temperature = temperature (constant M)
    return this.geopotentialFromTemperature(Tm)
  }

  /** Mean molecular weight → geopotential altitude (constant in ISA range) */
  geopotentialFromMeanMolecularWeight(M: number): number | undefined {
    if (Math.abs(M - DERIVED_CONSTANTS.M) < 1e-6) return 0
    return undefined // Only one value in ISA range
  }

  /** Lapse rate → geopotential altitude. Not unique (same β spans full layer). Returns layer midpoint. */
  geopotentialFromLapseRate(beta: number): number | undefined {
    // Find the first layer with this lapse rate
    for (let i = 0; i < TEMPERATURE_LAYERS.length - 1; i++) {
      const layerBeta = TEMPERATURE_LAYERS[i].B ?? 0
      if (Math.abs(layerBeta - beta) < 1e-10) {
        return TEMPERATURE_LAYERS[i].H
      }
    }
    return undefined
  }

  /** Specific weight → geopotential altitude */
  geopotentialFromSpecificWeight(gamma: number): number | undefined {
    const tol = Math.max(1e-12, Math.abs(gamma) * 1e-10)
    return this.bisect(H => this.specificWeight(H), gamma, -2000, 80000, tol, 300)
  }

  // --- Convenience pressure inverses (backward compat) ---

  geopotentialFromPressureMbar(pressureMbar: number): number | undefined {
    return this.geopotentialFromPressure(pressureMbar * 100)
  }

  geopotentialFromPressureMmhg(pressureMmhg: number): number | undefined {
    return this.geopotentialFromPressure(pressureMmhg / 0.007500616827)
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
