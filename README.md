# atmospheris

ISO 2533 Standard Atmosphere & ISO 5878 Reference Atmospheres for TypeScript/JavaScript.

A complete, open-source reference implementation of the International Standard Atmosphere (ISA) model and ISO 5878 wind/humidity models — from sea level to 80 km.

## Installation

```sh
npm install atmospheris
```

Works with Node.js, browser bundlers (Vite, Webpack), and Deno. Full TypeScript type definitions included.

## Quick Start

### Atmospheric properties at altitude

```ts
import { getAllProperties } from "atmospheris"

// Get all 19 properties at 10,000 m geopotential altitude
const result = getAllProperties({
  value: 10000,
  unit: "meters",
  type: "geopotential",
  precision: "normal"
})

console.log(result.temperature.celsius)    // -49.898 °C
console.log(result.pressure.mbar)          // 264.36 mbar
console.log(result.density)                // 0.4135 kg/m³
console.log(result.speedOfSound)           // 299.46 m/s
console.log(result.dynamicViscosity)       // 1.458e-5 Pa·s
```

### Reverse lookup: pressure to altitude

```ts
import { getAltitudeFromPressure } from "atmospheris"

const alt = getAltitudeFromPressure({
  value: 264.36,
  unit: "mbar"
})
console.log(alt.geopotentialAltitude.meters) // ~10000
```

### Bidirectional solver: any property to altitude

```ts
import { getAltitudeFromProperty } from "atmospheris"

// At what altitude is temperature -56.5 °C?
const result = getAltitudeFromProperty({
  mode: "property",
  property: "temperature_c",
  value: -56.5
})
// result.geopotentialAltitude.meters => ~11000 (tropopause)
```

### Wind distribution (ISO 5878)

```ts
import { computeWindDerived } from "atmospheris"

// Compute wind characteristics from observed parameters
const wind = computeWindDerived(-3.9, -1.2, 5.9)

console.log(wind.Vr)                         // 4.08 — vector mean wind magnitude
console.log(wind.Vsc)                        // 6.03 — scalar mean wind speed
console.log(wind.sigma)                      // 4.17 — per-component std deviation
console.log(wind.percentiles["1"].high)      // ~14.7 m/s (not exceeded on 99%)
console.log(wind.percentiles["10"])          // { low: ~0.5, high: ~12.0 }
console.log(wind.percentiles["20"])          // { low: ~1.2, high: ~10.5 }
```

## API Reference

### `getAllProperties(input)`

Calculates all 19 atmospheric properties at a given altitude per ISO 2533.

```ts
interface AltitudeInput {
  value: number
  unit: "meters" | "feet"
  type: "geopotential" | "geometric"
  precision?: "normal" | "reduced"  // default: "normal"
}
```

Returns an `AltitudeResult` with: altitude (m/ft), temperature (K/°C/°F/°R), pressure (Pa/mbar/mmHg), density, gravity, speed of sound, dynamic viscosity (Sutherland's formula), kinematic viscosity, thermal conductivity, pressure scale height, specific weight, air number density, mean particle speed, collision frequency, mean free path, and associated ratios.

### `getAltitudeFromPressure(input)`

Reverse lookup — finds altitude corresponding to a given atmospheric pressure. Implements the hypsometrical equation from ISO 2533 Addendum 1:1985.

```ts
interface PressureInput {
  value: number
  unit: "mbar" | "mmHg"
  precision?: "normal" | "reduced"
}
```

### `getAltitudeFromProperty(input)`

Bidirectional solver — given any of 28 supported atmospheric property values, finds the corresponding altitude and returns all properties.

```ts
import { getAltitudeFromProperty } from "atmospheris"

const result = getAltitudeFromProperty({
  mode: "property",
  property: "density_kgm3",  // or "temperature_k", "pressure_mbar", etc.
  value: 0.1
})
```

### `computeWindDerived(vx, vy, sigmaR, options?)`

Computes derived wind characteristics from observed zonal and meridional wind components using the Rice (circular normal) distribution model defined in ISO 5878 Section 5.4.

**Parameters:**
- `vx` — Mean zonal component of the wind (m/s)
- `vy` — Mean meridional component of the wind (m/s)
- `sigmaR` — Standard deviation of the vector mean wind (m/s)
- `options.useAbsoluteVx` — For latitude zones > 20°N where Vy ≈ 0, use |Vx| as Vr

**Returns** `WindDerivedFields`:
- `Vr` — Magnitude of vector mean wind
- `sigma` — Per-component standard deviation (σ_r / √2)
- `Vsc` — Scalar mean wind speed (Rice distribution mean)
- `percentiles` — Wind speeds at 1%/99%, 10%/90%, 20%/80% percentile levels

### Rice Distribution (ISO 5878)

The `RiceDistribution` class encapsulates a Rice distribution with fixed parameters, providing lazy-cached statistics:

```ts
import { RiceDistribution } from "atmospheris"

const dist = new RiceDistribution(4.08, 5.9)
dist.mean()                // Vsc ≈ 6.03 m/s
dist.pdf(5.0)              // PDF at 5 m/s
dist.cdf(10.0)             // P(wind ≤ 10 m/s)
dist.quantile(0.99)        // Wind speed exceeded on 1% of occasions
dist.percentileBounds()    // { 1: {low,high}, 10: {low,high}, 20: {low,high} }
```

### WindObservation

The `WindObservation` class encapsulates a single altitude-level wind observation with empirically measured parameters and lazily computed derived statistics:

```ts
import { WindObservation } from "atmospheris"

const obs = new WindObservation({
  geopotentialAltitude: 1000,
  vx: -3.9, vy: -1.2, sigmaR: 5.9
})
obs.vr                    // => 4.08
obs.vsc                   // => 6.03 (calculated)
obs.percentileBounds[1].high  // => ~14.7
```

### Low-level functions

The library also exports the underlying mathematical functions for advanced use:

```ts
import {
  besselI0, besselI1,      // Modified Bessel functions
  ricePdf, riceCdf,         // Rice distribution PDF and CDF
  riceInvCdf,               // Rice inverse CDF (quantile)
  riceMean,                 // Rice analytical mean
} from "atmospheris"
```

### Constants & Temperature Layers

```ts
import { CONSTANTS, DERIVED_CONSTANTS, TEMPERATURE_LAYERS } from "atmospheris"

CONSTANTS.g_n         // 9.80665 m/s² — standard gravitational acceleration
CONSTANTS.T_n         // 288.15 K — standard temperature
CONSTANTS.p_n         // 101325 Pa — standard pressure
CONSTANTS.rho_n       // 1.225 kg/m³ — standard density
CONSTANTS.R_star      // 8.31432 J/(mol·K) — universal gas constant
CONSTANTS.kappa       // 1.4 — adiabatic index

DERIVED_CONSTANTS.M   // ~0.028964 kg/mol — molar mass of dry air
DERIVED_CONSTANTS.R   // ~287.052 J/(kg·K) — specific gas constant

// 9 temperature layers with base altitude, temperature, and lapse rate
TEMPERATURE_LAYERS.forEach(l => console.log(l.H, l.T, l.B))
```

## Unit Helpers

```ts
import { paToMbar, mbarToPa, paToMmhg, mmhgToPa, mToFeet, feetToM, kelvinToCelsius } from "atmospheris"

paToMbar(101325)       // 1013.25
mToFeet(1000)          // 3280.84
kelvinToCelsius(288.15) // 15.0
```

## Precision Modes

- **Normal precision** — Full significant figures for engineering calculations. Matches ISO 2533 Tables 5–7.
- **Reduced precision** — Fewer significant digits, matching the reduced-precision tables in ISO 2533.

Both modes use the same underlying formulas; only the output rounding differs.

## Standards Coverage

| Standard | Scope | Implementation |
|----------|-------|----------------|
| ISO 2533:1975 | Standard Atmosphere (−2 km to 80 km) | Full property calculations |
| ISO 2533:1975/Add 1:1985 | Hypsometrical tables | `getAltitudeFromPressure` |
| ISO 2533:1975/Add 2:1997 | Extended altitude range (−5 km) and feet | All inputs accept meters or feet |
| ISO 2533:2025 | Revised edition (all addenda merged) | Reference implementation |
| ISO 5878 | Reference atmospheres for aerospace use | Wind distributions (Rice) |
| ICAO Doc 7488/3 | Standard Atmosphere extended to 80 km | Aligned values |

## License

BSD-2-Clause. Copyright Ribose Inc.
