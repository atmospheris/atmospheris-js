// ISO 5878 — Wind observation with lazy-derived Rice distribution statistics

import { RiceDistribution, type PercentileBounds } from './rice-distribution.js'

/**
 * Encapsulates a single altitude-level wind observation with its
 * empirically measured parameters and lazily computed derived statistics.
 *
 * Empirical inputs: Vx, Vy, sigmaR, vsa (optional), nuMax (optional)
 * Derived outputs: vr, theta, Vsc, percentile bounds
 *
 * @example
 * const obs = new WindObservation({
 *   geopotentialAltitude: 1000,
 *   vx: -3.9, vy: -1.2, sigmaR: 5.9,
 *   vsa: 7.6
 * })
 * obs.vsc   // ≈ 6.03 (calculated)
 * obs.percentileBounds()[1].high  // ≈ 14.7
 */
export class WindObservation {
  private _vr?: number
  private _theta?: number
  private _distribution?: RiceDistribution

  constructor(
    public readonly geopotentialAltitude: number,
    public readonly vx: number,
    public readonly vy: number,
    public readonly sigmaR: number,
    public readonly vsa?: number,
    public readonly nuMax?: number,
    private readonly useAbsoluteVx: boolean = false
  ) {}

  /** Magnitude of the vector mean wind. For zones > 20°N, uses |Vx|. */
  get vr(): number {
    if (this._vr === undefined) {
      this._vr = this.useAbsoluteVx
        ? Math.abs(this.vx)
        : Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    }
    return this._vr
  }

  /** Direction of the vector mean wind (radians from east) */
  get theta(): number {
    if (this._theta === undefined) {
      this._theta = Math.atan2(this.vy, this.vx)
    }
    return this._theta
  }

  /** The Rice distribution for this observation level (lazily constructed) */
  get distribution(): RiceDistribution {
    if (!this._distribution) {
      this._distribution = new RiceDistribution(this.vr, this.sigmaR)
    }
    return this._distribution
  }

  /** Calculated scalar mean wind speed (Vsc) */
  get vsc(): number {
    return this.distribution.mean()
  }

  /** Calculated percentile bounds */
  get percentileBounds(): PercentileBounds {
    return this.distribution.percentileBounds()
  }
}
