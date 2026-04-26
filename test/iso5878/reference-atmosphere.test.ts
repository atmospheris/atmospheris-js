import { describe, it, expect } from 'vitest'
import { SurfaceParameters } from '../../src/iso5878/surface-parameters.js'
import { ReferenceAtmosphere, type TemperatureLayerBreakpoint } from '../../src/iso5878/reference-atmosphere.js'
import { createReferenceAtmosphere, modelIds, buildLayersFromRows } from '../../src/iso5878/model-registry.js'
import * as fs from 'fs'
import * as path from 'path'
import * as jsYaml from 'js-yaml'

// YAML loader for test data
const YAML_BASE = (() => {
  const candidates = [
    path.resolve(__dirname, '../../../../mn/iso-5878/sources/iso-5878-2024/03-yaml'),
    '/Users/mulgogi/src/mn/iso-5878/sources/iso-5878-2024/03-yaml',
  ]
  return candidates.find(p => fs.existsSync(p)) || candidates[0]
})()

function loadYaml(filename: string): any {
  const filePath = path.join(YAML_BASE, filename)
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf-8')
  return jsYaml.load(content) as any
}

// Sample layers for 15-annual model (from table16.yaml)
const SAMPLE_LAYERS: TemperatureLayerBreakpoint[] = [
  { H: 0,     T: 299.65, B: -0.006 },
  { H: 2250,  T: 286.15, B: 0.0032 },
  { H: 2500,  T: 286.95, B: -0.005777777777777778 },
  { H: 16500, T: 193.15, B: 0.0014333333333333333 },
  { H: 22000, T: 215.15, B: 0.0022666666666666666 },
  { H: 30000, T: 231.15, B: 0.0028 },
  { H: 40000, T: 259.15, B: 0.00264 },
  { H: 46000, T: 272.35, B: 0.0 },
  { H: 51000, T: 272.35, B: -0.0024 },
  { H: 60000, T: 247.15, B: -0.0027 },
  { H: 66000, T: 226.15, B: -0.002857142857142857 },
  { H: 73000, T: 205.15, B: -0.001 },
  { H: 80000, T: 198.15 },
]

describe('ReferenceAtmosphere', () => {
  const sp = new SurfaceParameters(15)
  const profile = new ReferenceAtmosphere(
    sp,
    { temperature: 299.65, pressure: 101325.0 },
    SAMPLE_LAYERS
  )

  describe('surface conditions', () => {
    it('g₀(15°) ≈ 9.78381', () => {
      expect(sp.gravityAtSeaLevel()).toBeCloseTo(9.78381, 4)
    })

    it('r_φ(15°) ≈ 6337840m', () => {
      expect(sp.nominalEarthRadius()).toBeCloseTo(6337840, -2)
    })
  })

  describe('temperature', () => {
    it('T(0) = 299.65 K', () => {
      expect(profile.temperatureAtGeopotential(0)).toBeCloseTo(299.65, 2)
    })

    it('T(2250) = 286.15 K', () => {
      expect(profile.temperatureAtGeopotential(2250)).toBeCloseTo(286.15, 2)
    })

    it('T(2500) = 286.95 K', () => {
      expect(profile.temperatureAtGeopotential(2500)).toBeCloseTo(286.95, 2)
    })
  })

  describe('pressure', () => {
    it('P(0) ≈ 101325 Pa → 1013.25 mbar', () => {
      expect(profile.pressureMbarAtGeopotential(0)).toBeCloseTo(1013.25, 1)
    })
  })

  describe('density consistency', () => {
    it('ρ = P / (R × T) at all altitudes', () => {
      const altitudes = [0, 1000, 5000, 11000, 20000, 40000, 60000, 80000]
      altitudes.forEach(H => {
        const T = profile.temperatureAtGeopotential(H)
        const P = profile.pressureAtGeopotential(H)
        const rho = profile.densityAtGeopotential(H)
        expect(rho).toBeCloseTo(P / (287.05287 * T), 6)
      })
    })
  })

  describe('temperature-Celsius conversion', () => {
    it('T_C(0) ≈ 26.50°C', () => {
      expect(profile.temperatureCelsiusAtGeopotential(0)).toBeCloseTo(26.50, 1)
    })
  })
})

describe('ModelRegistry', () => {
  it('lists all 13 model IDs', () => {
    expect(modelIds()).toHaveLength(13)
  })

  it('raises for unknown model', () => {
    expect(() => createReferenceAtmosphere('99-annual', {})).toThrow(/Unknown/)
  })

  describe('with YAML data', () => {
    const table16 = loadYaml('table16.yaml')
    const skipIfNoData = table16 ? describe : describe.skip

    skipIfNoData('createReferenceAtmosphere', () => {
      it('creates 15-annual model', () => {
        const profile = createReferenceAtmosphere('15-annual', table16)
        expect(profile).toBeInstanceOf(ReferenceAtmosphere)
        expect(profile.temperatureAtGeopotential(0)).toBeCloseTo(299.65, 2)
      })

      it('creates all standard models', () => {
        const standardModels = [
          '15-annual', '30-winter', '30-summer',
          '45-winter', '45-summer',
          '60-winter', '60-summer',
          '80-winter', '80-summer',
        ]
        standardModels.forEach(id => {
          const profile = createReferenceAtmosphere(id, table16)
          expect(profile).toBeInstanceOf(ReferenceAtmosphere)
        })
      })
    })
  })

  describe('cross-validation against reference tables', () => {
    const table16 = loadYaml('table16.yaml')
    const table19 = loadYaml('table19.yaml')
    if (!table16) {
      it('skipped — YAML data not found', () => { /* skipped */ })
      return
    }

    const tableMap: Record<string, { model: string; layersSource: any; tempTol: number; presTol?: number }> = {
      'table3.yaml':  { model: '15-annual',  layersSource: table16, tempTol: 0.2 },
      'table4.yaml':  { model: '30-winter',  layersSource: table16, tempTol: 0.2 },
      'table5.yaml':  { model: '30-summer',  layersSource: table16, tempTol: 0.2 },
      'table6.yaml':  { model: '45-winter',  layersSource: table16, tempTol: 0.2 },
      'table7.yaml':  { model: '45-summer',  layersSource: table16, tempTol: 0.2 },
      'table8.yaml':  { model: '60-winter',  layersSource: table16, tempTol: 5.0 },
      'table9.yaml':  { model: '60-cold',    layersSource: table19, tempTol: 5.0, presTol: 55 },
      'table10.yaml': { model: '60-warm',    layersSource: table19, tempTol: 0.5 },
      'table11.yaml': { model: '60-summer',  layersSource: table16, tempTol: 5.0, presTol: 55 },
      'table12.yaml': { model: '80-winter',  layersSource: table16, tempTol: 0.2 },
      'table13.yaml': { model: '80-cold',    layersSource: table19, tempTol: 5.0, presTol: 55 },
      'table14.yaml': { model: '80-warm',    layersSource: table19, tempTol: 0.5 },
      'table15.yaml': { model: '80-summer',  layersSource: table16, tempTol: 0.2 },
    }

    Object.entries(tableMap).forEach(([filename, config]) => {
      describe(filename, () => {
        const refData = loadYaml(filename)
        if (!refData || !config.layersSource) {
          it('skipped — data not available', () => { /* skipped */ })
          return
        }

        it(`computed temperature matches within ±${config.tempTol} K`, () => {
          const profile = createReferenceAtmosphere(config.model, config.layersSource)
          const rows = refData['rows-h']
          if (!rows) return

          const errors: string[] = []
          rows.forEach(row => {
            const gpAlt = row['geopotential-altitude']
            const expected = row['temperature-K']
            const computed = profile.temperatureAtGeopotential(gpAlt)
            if (Math.abs(computed - expected) > config.tempTol) {
              errors.push(`H=${gpAlt}m: computed T=${computed.toFixed(3)}, tabulated=${expected}`)
            }
          })
          expect(errors, `Temperature mismatches:\n${errors.slice(0, 5).join('\n')}`).toHaveLength(0)
        })

        it('computed pressure matches tabulated values', () => {
          const profile = createReferenceAtmosphere(config.model, config.layersSource)
          const rows = refData['rows-h']
          if (!rows) return

          const errors: string[] = []
          rows.forEach(row => {
            if (row['p-mbar'] == null) return
            const gpAlt = row['geopotential-altitude']
            const expected = row['p-mbar']
            const computed = profile.pressureMbarAtGeopotential(gpAlt)
            const tol = config.presTol ?? Math.max(Math.abs(expected) * 0.003, 1.0)
            if (Math.abs(computed - expected) > tol) {
              errors.push(`H=${gpAlt}m: computed P=${computed.toFixed(3)}, tabulated=${expected}`)
            }
          })
          expect(errors, `Pressure mismatches:\n${errors.slice(0, 5).join('\n')}`).toHaveLength(0)
        })
      })
    })
  })
})
