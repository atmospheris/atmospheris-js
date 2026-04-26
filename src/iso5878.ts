// ISO 5878 — Reference atmospheres for aerospace use
// Wind characteristics: circular normal (Rice) distribution
// Implements Section 5.4 calculation methods

// --- Bessel functions (Abramowitz & Stegun polynomial approximations) ---
// Relative error < 1.6×10⁻⁷

/**
 * Modified Bessel function of the first kind, order zero (I₀).
 * Polynomial approximation from Abramowitz & Stegun 9.8.1/9.8.2.
 */
export function besselI0(x: number): number {
  const ax = Math.abs(x)
  if (ax <= 3.75) {
    const y = (x / 3.75) * (x / 3.75)
    return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492
      + y * (0.2659732 + y * (0.0360768 + y * 0.0045813)))))
  }
  const y = 3.75 / ax
  return (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + y * (0.01328592
    + y * (0.00225319 + y * (-0.00157565 + y * (0.00916281
    + y * (-0.02057706 + y * (0.02635537 + y * (-0.01647633
    + y * 0.00392377))))))))
}

/**
 * Modified Bessel function of the first kind, order one (I₁).
 * Polynomial approximation from Abramowitz & Stegun 9.8.3/9.8.4.
 */
export function besselI1(x: number): number {
  const ax = Math.abs(x)
  if (ax <= 3.75) {
    const y = (x / 3.75) * (x / 3.75)
    const value = ax * (0.5 + y * (0.87890594 + y * (0.51498869
      + y * (0.15084934 + y * (0.02658733 + y * (0.00301532
      + y * 0.00032411))))))
    return x < 0 ? -value : value
  }
  const y = 3.75 / ax
  const value = (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + y * (-0.03988024
    + y * (-0.00362018 + y * (0.00163801 + y * (-0.01031555
    + y * (0.02282967 + y * (-0.02895312 + y * (0.01787654
    + y * -0.00420059))))))))
  return x < 0 ? -value : value
}

// --- Rice (circular normal) distribution ---
// ISO 5878 Eq. 3 PDF: f(ν) = (2ν/σ_r²) exp(-(ν² + V_r²)/σ_r²) I₀(2νV_r/σ_r²)
// This is equivalent to Rice(ν̂ = V_r, σ = σ_r/√2)

/**
 * Rice distribution PDF per ISO 5878 Eq. 3.
 * @param nu - Wind speed (m/s)
 * @param Vr - Magnitude of vector mean wind (m/s)
 * @param sigmaR - Standard deviation of vector mean wind (m/s)
 */
export function ricePdf(nu: number, Vr: number, sigmaR: number): number {
  if (nu <= 0) return 0
  const sr2 = sigmaR * sigmaR
  const ratio = 2 * nu * Vr / sr2
  return (2 * nu / sr2) * Math.exp(-(nu * nu + Vr * Vr) / sr2) * besselI0(ratio)
}

/**
 * Rice distribution CDF: CDF(x) = ∫₀^x f(t) dt
 *
 * Computed via adaptive Simpson quadrature on the Rice PDF (ISO 5878 Eq. 3).
 * This avoids numerical instability in the Marcum Q forward recurrence for
 * small product arguments.
 */
export function riceCdf(x: number, Vr: number, sigmaR: number): number {
  if (x <= 0) return 0
  const sigma = sigmaR / Math.SQRT2

  // Rayleigh limit for very small Vr
  if (Vr < sigma * 1e-6) {
    return 1 - Math.exp(-x * x / (2 * sigma * sigma))
  }

  return adaptiveSimpson(
    (t: number) => ricePdf(t, Vr, sigmaR),
    0, x, 1e-10, 30
  )
}

/** Adaptive Simpson quadrature (iterative, avoids stack overflow). */
function adaptiveSimpson(
  f: (t: number) => number,
  a: number, b: number,
  tol: number, maxDepth: number
): number {
  const fa = f(a), fb = f(b)
  const m = (a + b) / 2
  const fm = f(m)
  const whole = (b - a) / 6 * (fa + 4 * fm + fb)

  const stack: Array<[number, number, number, number, number, number, number, number]> = []
  let total = 0

  stack.push([a, b, fa, fb, fm, whole, tol, 0])

  while (stack.length > 0) {
    const [la, lb, lfa, lfb, lfm, sWhole, lTol, depth] = stack.pop()!
    const lm = (la + lb) / 2
    const h = lb - la

    const lm1 = (la + lm) / 2
    const lm2 = (lm + lb) / 2
    const fm1 = f(lm1)
    const fm2 = f(lm2)
    const sLeft = h / 12 * (lfa + 4 * fm1 + lfm)
    const sRight = h / 12 * (lfm + 4 * fm2 + lfb)
    const sRefined = sLeft + sRight

    if (depth >= maxDepth || Math.abs(sRefined - sWhole) <= 15 * lTol) {
      total += sRefined + (sRefined - sWhole) / 15
    } else {
      // Push right first so left is processed first
      stack.push([lm, lb, lfm, lfb, fm2, sRight, lTol / 2, depth + 1])
      stack.push([la, lm, lfa, lfm, fm1, sLeft, lTol / 2, depth + 1])
    }
  }

  return Math.min(1, Math.max(0, total))
}

/**
 * Rice distribution inverse CDF (quantile function).
 * Uses bisection on the CDF.
 */
export function riceInvCdf(p: number, Vr: number, sigmaR: number): number {
  if (p <= 0) return 0
  if (p >= 1) return Infinity
  const sigma = sigmaR / Math.SQRT2

  // Estimate initial bounds from Rayleigh approximation
  // Rayleigh quantile: σ√(-2ln(1-p))
  let lo = 0
  let hi = sigma * Math.sqrt(-2 * Math.log(1 - p)) * 3 + Vr + 4 * sigma

  // Bisection
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const cdf = riceCdf(mid, Vr, sigmaR)
    if (cdf < p) lo = mid
    else hi = mid
    if (hi - lo < 1e-10) break
  }
  return (lo + hi) / 2
}

/**
 * Rice distribution mean (expected scalar wind speed Vsc per ISO 5878 Eq. 4).
 * Uses analytical formula: E[R] = σ√(π/2) exp(-ν̂²/(4σ²)) [(1+ν̂²/(2σ²))I₀(ν̂²/(4σ²)) + (ν̂²/(2σ²))I₁(ν̂²/(4σ²))]
 */
export function riceMean(Vr: number, sigmaR: number): number {
  const sigma = sigmaR / Math.SQRT2
  const lambda = Vr * Vr / (4 * sigma * sigma)  // ν̂²/(4σ²)
  const prefactor = sigma * Math.sqrt(Math.PI / 2) * Math.exp(-lambda)
  const b0 = besselI0(lambda)
  const b1 = besselI1(lambda)
  return prefactor * ((1 + 2 * lambda) * b0 + 2 * lambda * b1)
}

// --- Main API ---

export interface WindDerivedFields {
  /** Magnitude of vector mean wind */
  Vr: number
  /** Per-component standard deviation (σ_r / √2) */
  sigma: number
  /** Scalar mean wind speed (Rice mean) */
  Vsc: number
  /** Percentile pairs: low = value not exceeded on (1-p)% of occasions */
  percentiles: {
    '1':  { low: number; high: number }
    '10': { low: number; high: number }
    '20': { low: number; high: number }
  }
}

/**
 * Compute wind distribution derived fields from observed parameters
 * using the circular normal (Rice) distribution per ISO 5878 Section 5.4.
 *
 * @param Vx - Mean zonal component of the wind (m/s)
 * @param Vy - Mean meridional component of the wind (m/s)
 * @param sigmaR - Standard deviation of the vector mean wind (m/s)
 * @param options - Optional: force Vr for latitude zones > 20°N where Vy ≈ 0
 */
export function computeWindDerived(
  Vx: number,
  Vy: number,
  sigmaR: number,
  options?: { useAbsoluteVx?: boolean }
): WindDerivedFields {
  // For zones > 20°N: V_r = |V̄_x| (Vy ≈ 0 per the standard)
  // For zone 0-20°N: V_r = √(V̄_x² + V̄_y²)
  const Vr = options?.useAbsoluteVx ? Math.abs(Vx) : Math.sqrt(Vx * Vx + Vy * Vy)
  const sigma = sigmaR / Math.SQRT2

  return {
    Vr,
    sigma,
    Vsc: riceMean(Vr, sigmaR),
    percentiles: {
      '1':  { low: riceInvCdf(0.01, Vr, sigmaR), high: riceInvCdf(0.99, Vr, sigmaR) },
      '10': { low: riceInvCdf(0.10, Vr, sigmaR), high: riceInvCdf(0.90, Vr, sigmaR) },
      '20': { low: riceInvCdf(0.20, Vr, sigmaR), high: riceInvCdf(0.80, Vr, sigmaR) },
    },
  }
}
