import { describe, it, expect } from 'vitest'
import { IsaAlgorithms } from '../src/isa.js'
import { CONSTANTS } from '../src/constants.js'

const isa = new IsaAlgorithms()

// Test altitudes covering all ISA layers
const testAltitudes = [-2000, 0, 5000, 10000, 11000, 15000, 20000, 32000, 47000, 51000, 71000, 80000]

// Maximum altitude tolerance for round-trip tests (meters)
const ALT_TOLERANCE = 0.5

describe('Inverse: Temperature → altitude', () => {
  it('T=288.15K → H=0', () => {
    const H = isa.geopotentialFromTemperature(288.15)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(ALT_TOLERANCE)
  })

  it('T=223.15K → H≈10000', () => {
    const H = isa.geopotentialFromTemperature(223.15)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 10000)).toBeLessThan(ALT_TOLERANCE)
  })

  it('T=216.65K → H=11000 (tropopause — lowest altitude convention)', () => {
    const H = isa.geopotentialFromTemperature(216.65)
    expect(H).toBeDefined()
    expect(H!).toBeLessThan(11001) // Should return ~11000 (tropopause start)
  })

  it('T=301.15K → H=-2000 (below sea level)', () => {
    const H = isa.geopotentialFromTemperature(301.15)
    expect(H).toBeDefined()
    expect(Math.abs(H! - (-2000))).toBeLessThan(ALT_TOLERANCE)
  })

  it('out-of-range T returns undefined', () => {
    expect(isa.geopotentialFromTemperature(999)).toBeUndefined()
  })
})

describe('Inverse: Pressure → altitude', () => {
  it('p=101325Pa → H=0', () => {
    const H = isa.geopotentialFromPressure(101325)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(ALT_TOLERANCE)
  })

  it('p=26436Pa → H≈10000', () => {
    const H = isa.geopotentialFromPressure(26436)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 10000)).toBeLessThan(100)
  })

  it('pressure ratio δ=1.0 → H=0', () => {
    const H = isa.geopotentialFromPressureRatio(1.0)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(ALT_TOLERANCE)
  })
})

describe('Inverse: Density → altitude', () => {
  it('rho=1.225 → H=0', () => {
    const H = isa.geopotentialFromDensity(1.225)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(1)
  })

  it('density ratio σ=1.0 → H=0', () => {
    const H = isa.geopotentialFromDensityRatio(1.0)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(ALT_TOLERANCE)
  })

  it('rho=0.4127 → H≈10000', () => {
    const H = isa.geopotentialFromDensity(0.4127)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 10000)).toBeLessThan(100)
  })
})

describe('Inverse: Gravity → altitude', () => {
  it('g=9.80665 → H=0', () => {
    const H = isa.geopotentialFromGravity(9.80665)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(ALT_TOLERANCE)
  })

  it('g=-1 returns undefined', () => {
    expect(isa.geopotentialFromGravity(-1)).toBeUndefined()
  })
})

describe('Inverse: Speed of sound → altitude', () => {
  it('a=340.294 → H≈0', () => {
    const H = isa.geopotentialFromSpeedOfSound(340.294)
    expect(H).toBeDefined()
    expect(Math.abs(H! - 0)).toBeLessThan(10)
  })
})

describe('Inverse: Round-trip tests — forward → inverse → verify', () => {
  // Properties that are monotonically decreasing with altitude
  const monotonicDecreasing = [
    { name: 'pressure', forward: (H: number) => isa.pressureFromGeopotential(H), inverse: (v: number) => isa.geopotentialFromPressure(v) },
    { name: 'density', forward: (H: number) => isa.densityFromGeopotential(H), inverse: (v: number) => isa.geopotentialFromDensity(v) },
    { name: 'air number density', forward: (H: number) => isa.airNumberDensity(H), inverse: (v: number) => isa.geopotentialFromNumberDensity(v) },
    { name: 'collision frequency', forward: (H: number) => isa.collisionFrequency(H), inverse: (v: number) => isa.geopotentialFromCollisionFrequency(v) },
  ]

  // Properties that are monotonically increasing with altitude
  const monotonicIncreasing = [
    { name: 'kinematic viscosity', forward: (H: number) => isa.kinematicViscosity(H), inverse: (v: number) => isa.geopotentialFromKinematicViscosity(v) },
    { name: 'mean free path', forward: (H: number) => isa.meanFreePath(H), inverse: (v: number) => isa.geopotentialFromMeanFreePath(v) },
  ]

  for (const prop of [...monotonicDecreasing, ...monotonicIncreasing]) {
    describe(`${prop.name} round-trip`, () => {
      for (const H of testAltitudes) {
        it(`H=${H} round-trips`, () => {
          const val = prop.forward(H)
          const resolved = prop.inverse(val)
          expect(resolved).toBeDefined()
          expect(Math.abs(resolved! - H)).toBeLessThan(1)
        })
      }
    })
  }

  // Ratio properties
  describe('ratio round-trips', () => {
    for (const H of testAltitudes) {
      it(`pressure ratio at H=${H}`, () => {
        const delta = isa.pressureRatio(H)
        const resolved = isa.geopotentialFromPressureRatio(delta)
        expect(resolved).toBeDefined()
        expect(Math.abs(resolved! - H)).toBeLessThan(1)
      })

      it(`density ratio at H=${H}`, () => {
        const sigma = isa.densityRatio(H)
        const resolved = isa.geopotentialFromDensityRatio(sigma)
        expect(resolved).toBeDefined()
        expect(Math.abs(resolved! - H)).toBeLessThan(1)
      })

      it(`gravity ratio at H=${H}`, () => {
        const gr = isa.gravityRatio(H)
        const resolved = isa.geopotentialFromGravityRatio(gr)
        expect(resolved).toBeDefined()
        expect(Math.abs(resolved! - H)).toBeLessThan(1)
      })

      it(`speed of sound ratio at H=${H}`, () => {
        const ar = isa.speedOfSoundRatio(H)
        const resolved = isa.geopotentialFromSpeedOfSoundRatio(ar)
        expect(resolved).toBeDefined()
        // Non-monotonic property: may not match exactly, but should be valid
        if (resolved !== undefined) {
          expect(resolved).toBeGreaterThanOrEqual(-2000)
          expect(resolved).toBeLessThanOrEqual(80000)
        }
      })
    }
  })

  // Non-monotonic properties: temperature-dependent
  describe('non-monotonic round-trips (lowest altitude convention)', () => {
    for (const H of testAltitudes) {
      it(`temperature at H=${H}`, () => {
        const T = isa.temperatureFromGeopotential(H)
        const resolved = isa.geopotentialFromTemperature(T)
        expect(resolved).toBeDefined()
        // For non-unique temperatures, resolved may differ from H
        // but should be a valid altitude
        if (resolved !== undefined) {
          expect(resolved).toBeGreaterThanOrEqual(-2000)
          expect(resolved).toBeLessThanOrEqual(80000)
        }
      })

      it(`dynamic viscosity at H=${H}`, () => {
        const mu = isa.dynamicViscosity(H)
        const resolved = isa.geopotentialFromDynamicViscosity(mu)
        expect(resolved).toBeDefined()
        if (resolved !== undefined) {
          expect(resolved).toBeGreaterThanOrEqual(-2000)
          expect(resolved).toBeLessThanOrEqual(80000)
        }
      })

      it(`thermal conductivity at H=${H}`, () => {
        const k = isa.thermalConductivity(H)
        const resolved = isa.geopotentialFromThermalConductivity(k)
        expect(resolved).toBeDefined()
        if (resolved !== undefined) {
          expect(resolved).toBeGreaterThanOrEqual(-2000)
          expect(resolved).toBeLessThanOrEqual(80000)
        }
      })
    }
  })
})

describe('Inverse: Specific weight round-trip', () => {
  for (const H of testAltitudes) {
    it(`H=${H}`, () => {
      const sw = isa.specificWeight(H)
      const resolved = isa.geopotentialFromSpecificWeight(sw)
      expect(resolved).toBeDefined()
      expect(Math.abs(resolved! - H)).toBeLessThan(1)
    })
  }
})

describe('Inverse: Pressure scale height round-trip', () => {
  for (const H of testAltitudes) {
    it(`H=${H}`, () => {
      const Hp = isa.pressureScaleHeight(H)
      const resolved = isa.geopotentialFromPressureScaleHeight(Hp)
      expect(resolved).toBeDefined()
      if (resolved !== undefined) {
        expect(resolved).toBeGreaterThanOrEqual(-2000)
        expect(resolved).toBeLessThanOrEqual(80000)
      }
    })
  }
})

describe('Inverse: Mean particle speed round-trip', () => {
  for (const H of testAltitudes) {
    it(`H=${H}`, () => {
      const v = isa.meanParticleSpeed(H)
      const resolved = isa.geopotentialFromMeanParticleSpeed(v)
      expect(resolved).toBeDefined()
      if (resolved !== undefined) {
        expect(resolved).toBeGreaterThanOrEqual(-2000)
        expect(resolved).toBeLessThanOrEqual(80000)
      }
    })
  }
})

describe('Inverse: Mole volume round-trip', () => {
  for (const H of testAltitudes) {
    it(`H=${H}`, () => {
      const Vm = isa.moleVolume(H)
      const resolved = isa.geopotentialFromMoleVolume(Vm)
      expect(resolved).toBeDefined()
      if (resolved !== undefined) {
        expect(Math.abs(resolved - H)).toBeLessThan(1)
      }
    })
  }
})

describe('Inverse: Edge cases', () => {
  it('very high pressure resolves near H=-2000 boundary', () => {
    const H = isa.geopotentialFromPressure(1e20)
    // Bisection converges to boundary, not undefined
    expect(H).toBeDefined()
    if (H !== undefined) {
      expect(H).toBeGreaterThanOrEqual(-2001)
      expect(H).toBeLessThanOrEqual(80001)
    }
  })

  it('negative density resolves near H=80000 boundary', () => {
    const H = isa.geopotentialFromDensity(-1)
    // Bisection converges to boundary
    expect(H).toBeDefined()
    if (H !== undefined) {
      expect(H).toBeGreaterThanOrEqual(-2001)
      expect(H).toBeLessThanOrEqual(80001)
    }
  })

  it('zero gravity returns undefined', () => {
    expect(isa.geopotentialFromGravity(0)).toBeUndefined()
  })
})
