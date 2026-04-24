// ISO 2533 Standard Atmosphere — getAllProperties

import { IsaAlgorithms, getIsaInstance } from './isa.js'
import { mToFeet, kelvinToCelsius, paToMbar, paToMmhg } from './units.js'
import { roundToSigFigs } from './sigfigs.js'

export interface AltitudeInput {
  mode: 'altitude'
  value: number
  unit: 'meters' | 'feet'
  type: 'geopotential' | 'geometric'
  precision?: 'normal' | 'reduced'
  tempOffset?: number
}

export interface AltitudeProperties {
  geometricAltitude: { meters: number; feet: number }
  geopotentialAltitude: { meters: number; feet: number }
  temperature: { kelvin: number; celsius: number; rankine: number; fahrenheit: number }
  pressure: { pascal: number; mbar: number; mmHg: number }
  pressureRatio: number
  density: number
  densityRatio: number
  sqrtDensityRatio: number
  gravity: number
  gravityRatio: number
  speedOfSound: number
  speedOfSoundRatio: number
  temperatureRatio: number
  molecularTemperature: number
  dynamicViscosity: number
  dynamicViscosityRatio: number
  kinematicViscosity: number
  kinematicViscosityRatio: number
  thermalConductivity: number
  thermalConductivityRatio: number
  pressureScaleHeight: number
  specificWeight: number
  airNumberDensity: number
  meanParticleSpeed: number
  collisionFrequency: number
  meanFreePath: number
  lapseRate: number
  moleVolume: number
}

function applyPrecision(value: number, precision: string, sigFigs: number): number {
  return precision === 'reduced'
    ? (sigFigs <= 1 ? Math.round(value) : roundToSigFigs(value, sigFigs))
    : value
}

export function getAllProperties(input: AltitudeInput): AltitudeProperties {
  const isa = getIsaInstance()

  // Resolve geopotential altitude
  let geoAlt: number
  if (input.unit === 'feet') {
    const meters = input.value / 3.280839895
    geoAlt = input.type === 'geometric' ? isa.geopotentialAltitudeFromGeometric(meters) : meters
  } else {
    geoAlt = input.type === 'geometric' ? isa.geopotentialAltitudeFromGeometric(input.value) : input.value
  }

  const geoAltMeters = geoAlt
  const precision = input.precision ?? 'normal'

  // Calculate all properties
  const geoAltFt = mToFeet(geoAltMeters)
  const geometricAlt = isa.geometricAltitudeFromGeopotential(geoAltMeters)
  const temperature = isa.temperatureFromGeopotential(geoAltMeters)
  const pressure = isa.pressureFromGeopotential(geoAltMeters)

  return {
    geometricAltitude: {
      meters: applyPrecision(geometricAlt, precision, 0),
      feet: applyPrecision(mToFeet(geometricAlt), precision, 0),
    },
    geopotentialAltitude: {
      meters: applyPrecision(geoAltMeters, precision, 0),
      feet: applyPrecision(geoAltFt, precision, 0),
    },
    temperature: {
      kelvin: applyPrecision(temperature, precision, 6),
      celsius: applyPrecision(kelvinToCelsius(temperature), precision, 6),
      rankine: applyPrecision(temperature * 1.8, precision, 6),
      fahrenheit: applyPrecision(temperature * 1.8 - 459.67, precision, 6),
    },
    pressure: {
      pascal: applyPrecision(pressure, precision, 6),
      mbar: applyPrecision(paToMbar(pressure), precision, 6),
      mmHg: applyPrecision(paToMmhg(pressure), precision, 6),
    },
    pressureRatio: applyPrecision(isa.pressureRatio(geoAltMeters), precision, 6),
    density: applyPrecision(isa.densityFromGeopotential(geoAltMeters), precision, 6),
    densityRatio: applyPrecision(isa.densityRatio(geoAltMeters), precision, 6),
    sqrtDensityRatio: applyPrecision(isa.sqrtDensityRatio(geoAltMeters), precision, 6),
    gravity: applyPrecision(isa.gravityAtGeopotential(geoAltMeters), precision, 4),
    gravityRatio: applyPrecision(isa.gravityRatio(geoAltMeters), precision, 6),
    speedOfSound: applyPrecision(isa.speedOfSound(geoAltMeters), precision, 6),
    speedOfSoundRatio: applyPrecision(isa.speedOfSoundRatio(geoAltMeters), precision, 6),
    temperatureRatio: applyPrecision(isa.temperatureRatio(geoAltMeters), precision, 6),
    molecularTemperature: applyPrecision(isa.molecularTemperature(geoAltMeters), precision, 6),
    dynamicViscosity: applyPrecision(isa.dynamicViscosity(geoAltMeters), precision, 5),
    dynamicViscosityRatio: applyPrecision(isa.dynamicViscosityRatio(geoAltMeters), precision, 6),
    kinematicViscosity: applyPrecision(isa.kinematicViscosity(geoAltMeters), precision, 5),
    kinematicViscosityRatio: applyPrecision(isa.kinematicViscosityRatio(geoAltMeters), precision, 6),
    thermalConductivity: applyPrecision(isa.thermalConductivity(geoAltMeters), precision, 5),
    thermalConductivityRatio: applyPrecision(isa.thermalConductivityRatio(geoAltMeters), precision, 6),
    pressureScaleHeight: applyPrecision(isa.pressureScaleHeight(geoAltMeters), precision, 1),
    specificWeight: applyPrecision(isa.specificWeight(geoAltMeters), precision, 5),
    airNumberDensity: applyPrecision(isa.airNumberDensity(geoAltMeters), precision, 5),
    meanParticleSpeed: applyPrecision(isa.meanParticleSpeed(geoAltMeters), precision, 2),
    collisionFrequency: applyPrecision(isa.collisionFrequency(geoAltMeters), precision, 5),
    meanFreePath: applyPrecision(isa.meanFreePath(geoAltMeters), precision, 5),
    lapseRate: applyPrecision(isa.lapseRate(geoAltMeters), precision, 6),
    moleVolume: applyPrecision(isa.moleVolume(geoAltMeters), precision, 5),
  }
}
