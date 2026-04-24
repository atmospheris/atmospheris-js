import { describe, it, expect } from 'vitest'
import { CONSTANTS, DERIVED_CONSTANTS, TEMPERATURE_LAYERS } from '../src/constants.js'

describe('CONSTANTS', () => {
  it('has correct fundamental constants', () => {
    expect(CONSTANTS.g_n).toBeCloseTo(9.80665, 10)
    expect(CONSTANTS.p_n).toBe(101325)
    expect(CONSTANTS.rho_n).toBe(1.225)
    expect(CONSTANTS.T_n).toBe(288.15)
    expect(CONSTANTS.kappa).toBe(1.4)
    expect(CONSTANTS.radius).toBe(6356766)
  })

  it('has correct universal constants', () => {
    expect(CONSTANTS.R_star).toBeCloseTo(8.31432, 4)
    expect(CONSTANTS.N_A).toBeCloseTo(6.02257e26, 20)
  })
})

describe('DERIVED_CONSTANTS', () => {
  it('computes molar mass M ~0.029 (kg/mol)', () => {
    expect(DERIVED_CONSTANTS.M).toBeCloseTo(0.028964, 4)
  })

  it('computes specific gas constant R ~287.05', () => {
    expect(DERIVED_CONSTANTS.R).toBeCloseTo(287.05287, 2)
  })

  it('M = rho_n * R_star * T_n / p_n', () => {
    const expectedM = CONSTANTS.rho_n * CONSTANTS.R_star * CONSTANTS.T_n / CONSTANTS.p_n
    expect(DERIVED_CONSTANTS.M).toBeCloseTo(expectedM, 10)
  })

  it('R = R_star / M', () => {
    expect(DERIVED_CONSTANTS.R).toBeCloseTo(CONSTANTS.R_star / DERIVED_CONSTANTS.M, 10)
  })
})

describe('TEMPERATURE_LAYERS', () => {
  it('has 9 entries (8 layers + top boundary)', () => {
    expect(TEMPERATURE_LAYERS.length).toBe(9)
  })

  it('each layer has H, T, and B', () => {
    for (const layer of TEMPERATURE_LAYERS) {
      expect(layer).toHaveProperty('H')
      expect(layer).toHaveProperty('T')
      expect(layer).toHaveProperty('B')
      expect(typeof layer.H).toBe('number')
      expect(typeof layer.T).toBe('number')
      expect(typeof layer.B).toBe('number')
    }
  })

  it('first layer starts at H=-2000', () => {
    expect(TEMPERATURE_LAYERS[0].H).toBe(-2000)
  })

  it('sea level is H=0, T=288.15, B=-0.0065', () => {
    const sl = TEMPERATURE_LAYERS[1]
    expect(sl.H).toBe(0)
    expect(sl.T).toBe(288.15)
    expect(sl.B).toBe(-0.0065)
  })

  it('tropopause at H=11000 is isothermal (B=0)', () => {
    expect(TEMPERATURE_LAYERS[2].H).toBe(11000)
    expect(TEMPERATURE_LAYERS[2].B).toBe(0)
  })

  it('last boundary at H=80000', () => {
    expect(TEMPERATURE_LAYERS[8].H).toBe(80000)
  })
})
