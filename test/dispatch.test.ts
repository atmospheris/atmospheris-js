import { describe, it, expect } from 'vitest'
import { getAltitudeFromProperty, PROPERTY_DEFS } from '../src/getAltitudeFromProperty.js'
import type { PropertyName } from '../src/getAltitudeFromProperty.js'

describe('PROPERTY_DEFS', () => {
  it('has an entry for every PropertyName', () => {
    const keys: PropertyName[] = [
      'geopotential_altitude_m', 'geopotential_altitude_ft',
      'geometric_altitude_m', 'geometric_altitude_ft',
      'temperature_k', 'temperature_c', 'temperature_f', 'temperature_r',
      'temperature_ratio', 'lapse_rate',
      'pressure_pa', 'pressure_mbar', 'pressure_mmhg', 'pressure_ratio',
      'density_kgm3', 'density_ratio', 'sqrt_density_ratio',
      'gravity_ms2', 'gravity_ratio',
      'speed_of_sound_ms', 'speed_of_sound_ratio',
      'dynamic_viscosity', 'dynamic_viscosity_ratio',
      'kinematic_viscosity', 'kinematic_viscosity_ratio',
      'thermal_conductivity', 'thermal_conductivity_ratio',
      'pressure_scale_height', 'specific_weight',
      'air_number_density', 'mean_particle_speed',
      'collision_frequency', 'mean_free_path',
      'mole_volume', 'molecular_temperature',
    ]

    for (const key of keys) {
      expect(PROPERTY_DEFS[key]).toBeDefined()
      expect(PROPERTY_DEFS[key].label).toBeTruthy()
      expect(PROPERTY_DEFS[key].unit).toBeDefined()
    }
  })

  it('each entry has label, unit, symbol, group', () => {
    for (const [key, def] of Object.entries(PROPERTY_DEFS)) {
      expect(def.label.length, `label for ${key}`).toBeGreaterThan(0)
      expect(def.symbol.length, `symbol for ${key}`).toBeGreaterThan(0)
      expect(def.group.length, `group for ${key}`).toBeGreaterThan(0)
    }
  })
})

describe('getAltitudeFromProperty dispatch', () => {
  it('geopotential_altitude_m=10000 returns correct result', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'geopotential_altitude_m', value: 10000 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 10000)).toBeLessThan(1)
  })

  it('temperature_k=288.15 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'temperature_k', value: 288.15 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('temperature_c=15 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'temperature_c', value: 15 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('temperature_f=59 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'temperature_f', value: 59 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(10)
  })

  it('pressure_pa=101325 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'pressure_pa', value: 101325 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('pressure_mbar=1013.25 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'pressure_mbar', value: 1013.25 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('density_kgm3=1.225 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'density_kgm3', value: 1.225 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('gravity_ms2=9.80665 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'gravity_ms2', value: 9.80665 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(1)
  })

  it('speed_of_sound_ms=340.294 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'speed_of_sound_ms', value: 340.294 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(10)
  })

  it('returns all properties for resolved altitude', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'pressure_pa', value: 101325 })
    expect(result).toBeDefined()
    expect(result!.temperature).toBeDefined()
    expect(result!.pressure).toBeDefined()
    expect(result!.density).toBeDefined()
    expect(result!.speedOfSound).toBeDefined()
    expect(result!.gravity).toBeDefined()
  })
})

describe('getAltitudeFromProperty unit conversions', () => {
  it('geopotential_altitude_ft=32808.4 returns H≈10000m', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'geopotential_altitude_ft', value: 32808.4 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 10000)).toBeLessThan(1)
  })

  it('pressure_mmhg=760 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'pressure_mmhg', value: 760 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(10)
  })

  it('temperature_r=518.67 returns H≈0', () => {
    const result = getAltitudeFromProperty({ mode: 'property', property: 'temperature_r', value: 518.67 })
    expect(result).toBeDefined()
    expect(Math.abs(result!.geopotentialAltitude.meters - 0)).toBeLessThan(10)
  })
})
