import { describe, it, expect } from 'vitest'
import { besselI0, besselI1 } from '../../src/iso5878.js'
import { RiceDistribution } from '../../src/iso5878/rice-distribution.js'
import { WindObservation } from '../../src/iso5878/wind-observation.js'
import * as fs from 'fs'
import * as path from 'path'
import * as jsYaml from 'js-yaml'

describe('Bessel function accuracy', () => {
  describe('I₀ (besselI0)', () => {
    it('returns 1.0 at x=0', () => {
      expect(besselI0(0)).toBeCloseTo(1.0, 10)
    })

    it('matches known values', () => {
      expect(besselI0(1)).toBeCloseTo(1.266065877, 6)
      expect(besselI0(2)).toBeCloseTo(2.279585302, 6)
      expect(besselI0(3)).toBeCloseTo(4.880792586, 5)
      expect(besselI0(5)).toBeCloseTo(27.23987182, 4)
    })

    it('is symmetric (even function)', () => {
      ;[0.5, 1.0, 2.5, 3.75, 7.0].forEach(x => {
        expect(besselI0(x)).toBeCloseTo(besselI0(-x), 10)
      })
    })
  })

  describe('I₁ (besselI1)', () => {
    it('returns 0.0 at x=0', () => {
      expect(besselI1(0)).toBeCloseTo(0.0, 10)
    })

    it('matches known values', () => {
      expect(besselI1(1)).toBeCloseTo(0.565159104, 6)
      expect(besselI1(2)).toBeCloseTo(1.590636855, 6)
    })

    it('is odd (antisymmetric)', () => {
      ;[0.5, 1.0, 2.5, 3.75, 7.0].forEach(x => {
        expect(besselI1(-x)).toBeCloseTo(-besselI1(x), 10)
      })
    })
  })
})

describe('RiceDistribution', () => {
  describe('Rayleigh limit (Vr=0)', () => {
    const dist = new RiceDistribution(0, 6.0)

    it('mean equals sigma*sqrt(pi/2)', () => {
      const expected = dist.sigma * Math.sqrt(Math.PI / 2)
      expect(dist.mean()).toBeCloseTo(expected, 2)
    })

    it('CDF matches Rayleigh formula', () => {
      ;[1.0, 3.0, 5.0, 10.0, 15.0].forEach(x => {
        const rayleigh = 1 - Math.exp(-x * x / (2 * dist.sigma * dist.sigma))
        expect(dist.cdf(x)).toBeCloseTo(rayleigh, 6)
      })
    })
  })

  describe('large Vr/sigma limit', () => {
    const dist = new RiceDistribution(50, 2.0)

    it('mean approaches Vr', () => {
      expect(dist.mean()).toBeCloseTo(50, 0)
    })
  })

  describe('CDF properties', () => {
    const dist = new RiceDistribution(4, 5.9)

    it('is 0 at x=0', () => {
      expect(dist.cdf(0)).toBe(0)
    })

    it('approaches 1 for large x', () => {
      expect(dist.cdf(100)).toBeCloseTo(1, 6)
    })

    it('is monotonically increasing', () => {
      const values = Array.from({ length: 30 }, (_, i) => dist.cdf(i + 1))
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
      }
    })
  })

  describe('quantile function', () => {
    const dist = new RiceDistribution(4, 5.9)

    it('returns 0 for p=0', () => {
      expect(dist.quantile(0)).toBe(0)
    })

    it('CDF(quantile(p)) ≈ p', () => {
      ;[0.01, 0.10, 0.20, 0.50, 0.80, 0.90, 0.99].forEach(p => {
        const q = dist.quantile(p)
        expect(dist.cdf(q)).toBeCloseTo(p, 6)
      })
    })

    it('percentiles are ordered', () => {
      const bounds = dist.percentileBounds()
      expect(bounds[1].low).toBeLessThan(bounds[10].low)
      expect(bounds[10].low).toBeLessThan(bounds[20].low)
      expect(bounds[20].low).toBeLessThan(dist.mean())
      expect(dist.mean()).toBeLessThan(bounds[20].high)
      expect(bounds[20].high).toBeLessThan(bounds[10].high)
      expect(bounds[10].high).toBeLessThan(bounds[1].high)
    })
  })

  describe('mean accuracy', () => {
    it('matches numerical integration of PDF', () => {
      const dist = new RiceDistribution(3.9, 5.9)
      const nSteps = 10000
      const dx = 30.0 / nSteps
      let integral = 0
      for (let i = 1; i < nSteps; i++) {
        const x = i * dx
        integral += x * dist.pdf(x) * dx
      }
      expect(dist.mean()).toBeCloseTo(integral, 1)
    })
  })
})

describe('WindObservation', () => {
  describe('tropical zone (0-20°)', () => {
    const obs = new WindObservation(1000, -3.9, -1.2, 5.9, 7.6)

    it('computes vr from both components', () => {
      const expected = Math.sqrt(3.9 * 3.9 + 1.2 * 1.2)
      expect(obs.vr).toBeCloseTo(expected, 6)
    })

    it('computes vsc from Rice mean', () => {
      expect(obs.vsc).toBeGreaterThan(0)
      expect(obs.vsc).toBeLessThan(20)
    })

    it('computes percentile bounds', () => {
      const bounds = obs.percentileBounds
      expect(bounds[1].low).toBeLessThan(bounds[1].high)
      expect(bounds[10].low).toBeLessThan(bounds[10].high)
      expect(bounds[20].low).toBeLessThan(bounds[20].high)
    })
  })

  describe('mid-latitude zone (20-40°, useAbsoluteVx)', () => {
    const obs = new WindObservation(5000, 8.5, 0, 4.0, undefined, undefined, true)

    it('uses |Vx| for vr', () => {
      expect(obs.vr).toBeCloseTo(8.5, 6)
    })
  })

  describe('caching', () => {
    it('distribution is cached', () => {
      const obs = new WindObservation(1000, -3.9, -1.2, 5.9)
      const dist1 = obs.distribution
      const dist2 = obs.distribution
      expect(dist1).toBe(dist2)
    })
  })
})

describe('cross-validation against Wind Table 1 YAML', () => {
  const yamlPath = (() => {
    const candidates = [
      path.resolve(__dirname, '../../../../mn/iso-5878/sources/iso-5878-2024/04-yaml/table1.yaml'),
      '/Users/mulgogi/src/mn/iso-5878/sources/iso-5878-2024/04-yaml/table1.yaml',
    ]
    return candidates.find(p => fs.existsSync(p))
  })()

  if (!yamlPath) {
    it('skipped — Wind YAML not found', () => { /* skipped */ })
    return
  }

  const windData = jsYaml.load(fs.readFileSync(yamlPath, 'utf-8')) as any

  it('computed Vsc matches tabulated values within ±4.0 m/s', () => {
    const errors: string[] = []
    windData.rows.forEach((zone: any) => {
      const angleLow = parseInt(zone['angle-low'])
      const useAbsVx = angleLow >= 20

      zone.values.forEach((obs: any) => {
        if (obs.Vsc == null || obs['sigma-r'] == null || obs['sigma-r'] === 0) return

        const vx = parseFloat(obs.Vx)
        const vy = parseFloat(obs.Vy || '0')
        const sigmaR = parseFloat(obs['sigma-r'])
        const expectedVsc = parseFloat(obs.Vsc)

        const vr = useAbsVx ? Math.abs(vx) : Math.sqrt(vx * vx + vy * vy)
        const dist = new RiceDistribution(vr, sigmaR)
        const computedVsc = dist.mean()

        if (Math.abs(computedVsc - expectedVsc) >= 4.0) {
          errors.push(`${zone['angle-low']}-${zone['angle-high']}° ${zone.month} ` +
            `alt=${obs['geopotential-altitude']}km: computed=${computedVsc.toFixed(2)}, tabulated=${expectedVsc}`)
        }
      })
    })

    expect(errors, `Vsc mismatches:\n${errors.slice(0, 10).join('\n')}`).toHaveLength(0)
  })

  it('computed percentile bounds match tabulated values within ±6.0 m/s', () => {
    const errors: string[] = []
    windData.rows.forEach((zone: any) => {
      zone.values.forEach((obs: any) => {
        if (obs['Vsc-10-low'] == null || obs['sigma-r'] == null || obs['sigma-r'] === 0) return

        const vx = parseFloat(obs.Vx)
        const vy = parseFloat(obs.Vy || '0')
        const sigmaR = parseFloat(obs['sigma-r'])
        const useAbsVx = parseInt(zone['angle-low']) >= 20

        const vr = useAbsVx ? Math.abs(vx) : Math.sqrt(vx * vx + vy * vy)
        const dist = new RiceDistribution(vr, sigmaR)
        const vscVal = obs.Vsc ? parseFloat(obs.Vsc) : dist.mean()
        const bounds = dist.percentileBounds()

        const comparisons: Array<[string, number]> = [
          ['Vsc-1-low', bounds[1].low],
          ['Vsc-1-high', bounds[1].high],
          ['Vsc-10-low', bounds[10].low],
          ['Vsc-10-high', bounds[10].high],
          ['Vsc-20-low', bounds[20].low],
          ['Vsc-20-high', bounds[20].high],
        ]

        comparisons.forEach(([key, computed]) => {
          if (obs[key] == null) return
          const expected = parseFloat(obs[key])
          // Skip erroneous data: Vsc-X-low > Vsc (impossible for lower percentile)
          if (key.endsWith('-low') && expected > vscVal) return
          if (Math.abs(computed - expected) >= 6.0) {
            errors.push(`${zone['angle-low']}-${zone['angle-high']}° ${zone.month} ` +
              `alt=${obs['geopotential-altitude']}km ${key}: computed=${computed.toFixed(2)}, tabulated=${expected}`)
          }
        })
      })
    })

    expect(errors, `Percentile mismatches:\n${errors.slice(0, 10).join('\n')}`).toHaveLength(0)
  })
})
