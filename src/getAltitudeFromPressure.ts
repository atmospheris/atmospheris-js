// ISO 2533 Standard Atmosphere — getAltitudeFromPressure

import { getIsaInstance } from './isa.js'
import { mToFeet } from './units.js'
import { roundToSigFigs } from './sigfigs.js'

export interface PressureInput {
  mode: 'pressure'
  value: number
  unit: 'mbar' | 'mmHg'
  precision?: 'normal' | 'reduced'
}

interface PressureProperties {
  geopotentialAltitude: { meters: number; feet: number }
  geometricAltitude: { meters: number; feet: number }
  pressure: { mbar: number; mmHg: number }
}

function applyPrecision(value: number, precision: string, sigFigs: number): number {
  return precision === 'reduced'
    ? (sigFigs <= 1 ? Math.round(value) : roundToSigFigs(value, sigFigs))
    : value
}

export function getAltitudeFromPressure(input: PressureInput): PressureProperties | undefined {
  const isa = getIsaInstance()
  const precision = input.precision ?? 'normal'

  const geoAlt = input.unit === 'mbar'
    ? isa.geopotentialFromPressureMbar(input.value)
    : isa.geopotentialFromPressureMmhg(input.value)

  if (geoAlt === undefined) return undefined

  const geometricAlt = isa.geometricAltitudeFromGeopotential(geoAlt)

  return {
    geopotentialAltitude: {
      meters: applyPrecision(geoAlt, precision, 1),
      feet: applyPrecision(mToFeet(geoAlt), precision, 0),
    },
    geometricAltitude: {
      meters: applyPrecision(geometricAlt, precision, 1),
      feet: applyPrecision(mToFeet(geometricAlt), precision, 0),
    },
    pressure: {
      mbar: input.unit === 'mbar' ? input.value : isa.mmhgToMbar(input.value),
      mmHg: input.unit === 'mmHg' ? input.value : isa.mbarToMmhg(input.value),
    },
  }
}
