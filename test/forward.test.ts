import { describe, it, expect } from 'vitest'
import { IsaAlgorithms } from '../src/isa.js'
import { CONSTANTS } from '../src/constants.js'

const isa = new IsaAlgorithms()

// Tolerance for floating-point comparisons
const close = (actual: number, expected: number, decimals: number = 2) =>
  expect(actual).toBeCloseTo(expected, decimals)

describe('Forward: Altitude conversions', () => {
  it('geometricAltitudeFromGeopotential at H=0 gives z=0', () => {
    expect(isa.geometricAltitudeFromGeopotential(0)).toBe(0)
  })

  it('geopotentialAltitudeFromGeometric at z=0 gives H=0', () => {
    expect(isa.geopotentialAltitudeFromGeometric(0)).toBe(0)
  })

  it('round-trip: H→z→H at 10000m', () => {
    const z = isa.geometricAltitudeFromGeopotential(10000)
    const H = isa.geopotentialAltitudeFromGeometric(z)
    close(H, 10000, 4)
  })

  it('round-trip: z→H→z at 10000m', () => {
    const H = isa.geopotentialAltitudeFromGeometric(10000)
    const z = isa.geometricAltitudeFromGeopotential(H)
    close(z, 10000, 4)
  })
})

describe('Forward: Temperature', () => {
  it('sea level T=288.15K', () => {
    close(isa.temperatureFromGeopotential(0), 288.15, 4)
  })

  it('tropopause T=216.65K at H=11000', () => {
    close(isa.temperatureFromGeopotential(11000), 216.65, 4)
  })

  it('H=20000 T=216.65K (isothermal layer)', () => {
    close(isa.temperatureFromGeopotential(20000), 216.65, 4)
  })

  it('H=32000 T=228.65K', () => {
    close(isa.temperatureFromGeopotential(32000), 228.65, 4)
  })

  it('H=47000 T=270.65K (stratopause)', () => {
    close(isa.temperatureFromGeopotential(47000), 270.65, 4)
  })

  it('H=80000 T=196.65K', () => {
    close(isa.temperatureFromGeopotential(80000), 196.65, 4)
  })

  it('H=-2000 T=301.15K (below sea level)', () => {
    close(isa.temperatureFromGeopotential(-2000), 301.15, 4)
  })

  it('temperature ratio at H=0 is 1.0', () => {
    close(isa.temperatureRatio(0), 1.0, 10)
  })

  it('temperature in Celsius at H=0 is 15°C', () => {
    close(isa.temperatureCelsiusFromGeopotential(0), 15, 4)
  })

  it('lapse rate at H=0 is -0.0065 K/m', () => {
    close(isa.lapseRate(0), -0.0065, 8)
  })

  it('lapse rate at H=11000 is 0 (isothermal)', () => {
    close(isa.lapseRate(11000), 0, 10)
  })
})

describe('Forward: Pressure', () => {
  it('sea level p=101325 Pa', () => {
    close(isa.pressureFromGeopotential(0), 101325, 1)
  })

  it('tropopause p≈22632 Pa at H=11000', () => {
    close(isa.pressureFromGeopotential(11000), 22632, 0)
  })

  it('pressure ratio at H=0 is 1.0', () => {
    close(isa.pressureRatio(0), 1.0, 10)
  })

  it('pressure decreases with altitude', () => {
    const p0 = isa.pressureFromGeopotential(0)
    const p11 = isa.pressureFromGeopotential(11000)
    expect(p11).toBeLessThan(p0)
  })

  it('pressure at H=-2000 is above sea level pressure', () => {
    const p = isa.pressureFromGeopotential(-2000)
    expect(p).toBeGreaterThan(CONSTANTS.p_n)
  })

  it('pressure mbar conversion', () => {
    const pa = isa.pressureFromGeopotential(0)
    const mbar = isa.pressureMbarFromGeopotential(0)
    close(mbar, pa / 100, 4)
  })
})

describe('Forward: Density', () => {
  it('sea level rho=1.225 kg/m³', () => {
    close(isa.densityFromGeopotential(0), 1.225, 3)
  })

  it('density ratio at H=0 is 1.0', () => {
    close(isa.densityRatio(0), 1.0, 10)
  })

  it('sqrt density ratio at H=0 is 1.0', () => {
    close(isa.sqrtDensityRatio(0), 1.0, 10)
  })

  it('density decreases with altitude', () => {
    const rho0 = isa.densityFromGeopotential(0)
    const rho11 = isa.densityFromGeopotential(11000)
    expect(rho11).toBeLessThan(rho0)
  })
})

describe('Forward: Speed of Sound', () => {
  it('sea level a≈340.294 m/s', () => {
    close(isa.speedOfSound(0), 340.294, 1)
  })

  it('speed of sound ratio at H=0 is ~1.0', () => {
    close(isa.speedOfSoundRatio(0), 1.0, 6)
  })

  it('speed of sound decreases in troposphere', () => {
    const a0 = isa.speedOfSound(0)
    const a11 = isa.speedOfSound(11000)
    expect(a11).toBeLessThan(a0)
  })
})

describe('Forward: Viscosity', () => {
  it('sea level dynamic viscosity ~1.7894e-5 Pa·s', () => {
    close(isa.dynamicViscosity(0), 1.7894e-5, 6)
  })

  it('dynamic viscosity ratio at H=0 matches mu0 reference', () => {
    // Ratio uses hardcoded _mu0 = 1.4607e-5 as reference
    // Actual mu at sea level ~1.7894e-5, so ratio ~1.225
    close(isa.dynamicViscosityRatio(0), 1.225, 2)
  })

  it('kinematic viscosity at H=0 = mu/rho', () => {
    const mu = isa.dynamicViscosity(0)
    const rho = isa.densityFromGeopotential(0)
    const nu = isa.kinematicViscosity(0)
    close(nu, mu / rho, 8)
  })

  it('kinematic viscosity increases with altitude', () => {
    const nu0 = isa.kinematicViscosity(0)
    const nu11 = isa.kinematicViscosity(11000)
    expect(nu11).toBeGreaterThan(nu0)
  })

  it('kinematic viscosity ratio at H=0 matches mu0/rho0 reference', () => {
    // Ratio uses _mu0/rho_n as reference, which differs from actual sea-level nu
    close(isa.kinematicViscosityRatio(0), 1.225, 2)
  })
})

describe('Forward: Gravity', () => {
  it('sea level g=9.80665 m/s²', () => {
    close(isa.gravityAtGeopotential(0), 9.80665, 5)
  })

  it('gravity ratio at H=0 is 1.0', () => {
    close(isa.gravityRatio(0), 1.0, 10)
  })

  it('gravity decreases with altitude', () => {
    const g0 = isa.gravityAtGeopotential(0)
    const g10 = isa.gravityAtGeopotential(10000)
    expect(g10).toBeLessThan(g0)
  })
})

describe('Forward: Other properties', () => {
  it('specific weight = rho * g', () => {
    const sw = isa.specificWeight(0)
    const rho = isa.densityFromGeopotential(0)
    const g = isa.gravityAtGeopotential(0)
    close(sw, rho * g, 4)
  })

  it('thermal conductivity at H=0 is positive', () => {
    expect(isa.thermalConductivity(0)).toBeGreaterThan(0)
  })

  it('thermal conductivity ratio at H=0 is 1.0', () => {
    close(isa.thermalConductivityRatio(0), 1.0, 10)
  })

  it('pressure scale height at H=0 is positive', () => {
    expect(isa.pressureScaleHeight(0)).toBeGreaterThan(0)
  })

  it('mean free path increases with altitude', () => {
    const l0 = isa.meanFreePath(0)
    const l50 = isa.meanFreePath(50000)
    expect(l50).toBeGreaterThan(l0)
  })

  it('air number density decreases with altitude', () => {
    const n0 = isa.airNumberDensity(0)
    const n50 = isa.airNumberDensity(50000)
    expect(n50).toBeLessThan(n0)
  })

  it('collision frequency decreases with altitude', () => {
    const f0 = isa.collisionFrequency(0)
    const f50 = isa.collisionFrequency(50000)
    expect(f50).toBeLessThan(f0)
  })

  it('mean particle speed at H=0 is positive', () => {
    expect(isa.meanParticleSpeed(0)).toBeGreaterThan(0)
  })

  it('molecular temperature at H=0 equals temperature', () => {
    close(isa.molecularTemperature(0), isa.temperatureFromGeopotential(0), 10)
  })

  it('mole volume at H=0 is positive', () => {
    expect(isa.moleVolume(0)).toBeGreaterThan(0)
  })

  it('mean molecular weight is constant in ISA range', () => {
    close(isa.meanMolecularWeight(0), isa.meanMolecularWeight(50000), 10)
  })
})
