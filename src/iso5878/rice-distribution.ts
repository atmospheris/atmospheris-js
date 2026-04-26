// ISO 5878 — Rice (circular normal) distribution OOP wrapper
// Wraps the functional API from iso5878.ts into an instance-based interface

import {
  ricePdf, riceCdf, riceInvCdf, riceMean,
} from '../iso5878.js'

export interface PercentilePair {
  low: number
  high: number
}

export type PercentileBounds = Record<1 | 10 | 20, PercentilePair>

/**
 * Encapsulates a Rice (circular normal) distribution with fixed parameters.
 *
 * The Rice distribution models scalar wind speed from the vector components
 * (Vx, Vy) and their standard deviation sigma_r per ISO 5878 Section 5.4.
 *
 * @example
 * const dist = new RiceDistribution(4.08, 5.9)
 * dist.mean()                // Vsc ≈ 6.03 m/s
 * dist.percentileBounds()[1] // { low: ~1.0, high: ~14.7 }
 */
export class RiceDistribution {
  /** Per-component standard deviation (sigma_r / √2) */
  readonly sigma: number

  constructor(
    public readonly vr: number,
    public readonly sigmaR: number
  ) {
    this.sigma = sigmaR / Math.SQRT2
  }

  /** Rice PDF at wind speed nu (ISO 5878 Eq. 3) */
  pdf(nu: number): number {
    return ricePdf(nu, this.vr, this.sigmaR)
  }

  /** Rice CDF at wind speed x */
  cdf(x: number): number {
    return riceCdf(x, this.vr, this.sigmaR)
  }

  /** Rice inverse CDF (quantile function) */
  quantile(p: number): number {
    return riceInvCdf(p, this.vr, this.sigmaR)
  }

  private _mean: number | null = null

  /** Rice distribution mean = scalar mean wind speed Vsc (ISO 5878 Eq. 4) */
  mean(): number {
    if (this._mean === null) {
      this._mean = riceMean(this.vr, this.sigmaR)
    }
    return this._mean
  }

  private _percentileBounds: PercentileBounds | null = null

  /** Percentile bounds as defined in ISO 5878 Wind Table 1 */
  percentileBounds(): PercentileBounds {
    if (!this._percentileBounds) {
      this._percentileBounds = {
        1:  { low: this.quantile(0.01), high: this.quantile(0.99) },
        10: { low: this.quantile(0.10), high: this.quantile(0.90) },
        20: { low: this.quantile(0.20), high: this.quantile(0.80) },
      }
    }
    return this._percentileBounds
  }
}
