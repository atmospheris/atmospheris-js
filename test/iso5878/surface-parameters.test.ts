import { describe, it, expect } from 'vitest'
import { SurfaceParameters } from '../../src/iso5878/surface-parameters.js'

describe('SurfaceParameters', () => {
  const tolerances = {
    g0: 0.00005,   // m/s²
    radius: 100,   // m
  }

  // Table 2 verification data
  const table2 = [
    { lat: 15, g0: 9.78381, radius: 6337840 },
    { lat: 30, g0: 9.79324, radius: 6345650 },
    { lat: 45, g0: 9.80616, radius: 6356364 },  // Lambert output (not ISA 9.80665)
    { lat: 60, g0: 9.81911, radius: 6367100 },
    { lat: 80, g0: 9.83051, radius: 6376560 },
  ]

  describe('gravityAtSeaLevel (Eq. 0 — Lambert)', () => {
    table2.forEach(({ lat, g0 }) => {
      it(`g₀(${lat}°) = ${g0}`, () => {
        const sp = new SurfaceParameters(lat)
        expect(sp.gravityAtSeaLevel()).toBeCloseTo(g0, 5)
      })
    })

    it('is symmetric about the equator', () => {
      const north = new SurfaceParameters(30)
      const south = new SurfaceParameters(-30)
      expect(north.gravityAtSeaLevel()).toBeCloseTo(south.gravityAtSeaLevel(), 10)
    })
  })

  describe('nominalEarthRadius (Eq. 13)', () => {
    table2.forEach(({ lat, radius }) => {
      it(`r_φ(${lat}°) ≈ ${radius}m`, () => {
        const sp = new SurfaceParameters(lat)
        expect(sp.nominalEarthRadius()).toBeCloseTo(radius, -2)
      })
    })
  })

  describe('gravityAtGeometric (Eq. 7)', () => {
    it('equals g0 at h=0', () => {
      const sp = new SurfaceParameters(45)
      expect(sp.gravityAtGeometric(0)).toBeCloseTo(sp.gravityAtSeaLevel(), 10)
    })

    it('decreases with altitude', () => {
      const sp = new SurfaceParameters(45)
      expect(sp.gravityAtGeometric(10000)).toBeLessThan(sp.gravityAtSeaLevel())
    })
  })

  describe('altitude conversions (Eqs. 8, 9)', () => {
    it('round-trip: H → h → H', () => {
      ;[15, 30, 45, 60, 80].forEach(lat => {
        const sp = new SurfaceParameters(lat)
        ;[0, 5000, 10000, 30000, 80000].forEach(H => {
          const h = sp.geometricFromGeopotential(H)
          const H2 = sp.geopotentialFromGeometric(h)
          expect(H2).toBeCloseTo(H, 6)
        })
      })
    })

    it('round-trip: h → H → h', () => {
      ;[15, 45, 80].forEach(lat => {
        const sp = new SurfaceParameters(lat)
        ;[0, 5000, 20000, 50000].forEach(h => {
          const H = sp.geopotentialFromGeometric(h)
          const h2 = sp.geometricFromGeopotential(H)
          expect(h2).toBeCloseTo(h, 6)
        })
      })
    })

    it('H < h for positive altitudes', () => {
      const sp = new SurfaceParameters(15)
      expect(sp.geopotentialFromGeometric(10000)).toBeLessThan(10000)
    })

    it('H = 0 when h = 0', () => {
      const sp = new SurfaceParameters(45)
      expect(sp.geopotentialFromGeometric(0)).toBe(0)
    })
  })
})
