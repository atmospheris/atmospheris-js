// ISO 2533 Standard Atmosphere — getAltitudeFromProperty
// Bidirectional solver: input any property value, get altitude + all properties

import { getIsaInstance } from './isa.js'
import { getAllProperties } from './getAllProperties.js'
import { mToFeet, feetToM, mbarToPa, mmhgToPa, kelvinToCelsius } from './units.js'

export type PropertyName =
  | 'geopotential_altitude_m' | 'geopotential_altitude_ft'
  | 'geometric_altitude_m' | 'geometric_altitude_ft'
  | 'temperature_k' | 'temperature_c' | 'temperature_f' | 'temperature_r'
  | 'temperature_ratio'
  | 'lapse_rate'
  | 'pressure_pa' | 'pressure_mbar' | 'pressure_mmhg'
  | 'pressure_ratio'
  | 'density_kgm3'
  | 'density_ratio'
  | 'sqrt_density_ratio'
  | 'gravity_ms2'
  | 'gravity_ratio'
  | 'speed_of_sound_ms'
  | 'speed_of_sound_ratio'
  | 'dynamic_viscosity'
  | 'dynamic_viscosity_ratio'
  | 'kinematic_viscosity'
  | 'kinematic_viscosity_ratio'
  | 'thermal_conductivity'
  | 'thermal_conductivity_ratio'
  | 'pressure_scale_height'
  | 'specific_weight'
  | 'air_number_density'
  | 'mean_particle_speed'
  | 'collision_frequency'
  | 'mean_free_path'
  | 'mole_volume'
  | 'molecular_temperature'

export interface PropertyInput {
  mode: 'property'
  property: PropertyName
  value: number
  precision?: 'normal' | 'reduced'
}

/** Property metadata for the UI dropdown */
export const PROPERTY_DEFS: Record<PropertyName, {
  label: string
  unit: string
  symbol: string
  group: string
}> = {
  geopotential_altitude_m: { label: 'Geopotential Altitude', unit: 'm', symbol: '<math><mi>H</mi></math>', group: 'Altitude' },
  geopotential_altitude_ft: { label: 'Geopotential Altitude', unit: 'ft', symbol: '<math><mi>H</mi></math>', group: 'Altitude' },
  geometric_altitude_m: { label: 'Geometric Altitude', unit: 'm', symbol: '<math><mi>h</mi></math>', group: 'Altitude' },
  geometric_altitude_ft: { label: 'Geometric Altitude', unit: 'ft', symbol: '<math><mi>h</mi></math>', group: 'Altitude' },
  temperature_k: { label: 'Temperature', unit: 'K', symbol: '<math><mi>T</mi></math>', group: 'Temperature' },
  temperature_c: { label: 'Temperature', unit: '°C', symbol: '<math><mi>T</mi></math>', group: 'Temperature' },
  temperature_f: { label: 'Temperature', unit: '°F', symbol: '<math><mi>T</mi></math>', group: 'Temperature' },
  temperature_r: { label: 'Temperature', unit: '°R', symbol: '<math><mi>T</mi></math>', group: 'Temperature' },
  temperature_ratio: { label: 'Temperature Ratio', unit: '', symbol: '<math><mi>θ</mi></math>', group: 'Temperature' },
  lapse_rate: { label: 'Lapse Rate', unit: 'K/m', symbol: '<math><msub><mi>β</mi><mi>s</mi></msub></math>', group: 'Temperature' },
  pressure_pa: { label: 'Pressure', unit: 'Pa', symbol: '<math><mi>p</mi></math>', group: 'Pressure' },
  pressure_mbar: { label: 'Pressure', unit: 'mbar', symbol: '<math><mi>p</mi></math>', group: 'Pressure' },
  pressure_mmhg: { label: 'Pressure', unit: 'mmHg', symbol: '<math><mi>p</mi></math>', group: 'Pressure' },
  pressure_ratio: { label: 'Pressure Ratio', unit: '', symbol: '<math><mi>δ</mi></math>', group: 'Pressure' },
  density_kgm3: { label: 'Density', unit: 'kg/m³', symbol: '<math><mi>ρ</mi></math>', group: 'Density' },
  density_ratio: { label: 'Density Ratio', unit: '', symbol: '<math><mi>σ</mi></math>', group: 'Density' },
  sqrt_density_ratio: { label: '√(Density Ratio)', unit: '', symbol: '<math><msqrt><mi>σ</mi></msqrt></math>', group: 'Density' },
  gravity_ms2: { label: 'Gravity', unit: 'm/s²', symbol: '<math><mi>g</mi></math>', group: 'Motion & Viscosity' },
  gravity_ratio: { label: 'Gravity Ratio', unit: '', symbol: '<math><mi>g</mi><mo>/</mo><msub><mi>g</mi><mi>n</mi></msub></math>', group: 'Motion & Viscosity' },
  speed_of_sound_ms: { label: 'Speed of Sound', unit: 'm/s', symbol: '<math><mi>a</mi></math>', group: 'Motion & Viscosity' },
  speed_of_sound_ratio: { label: 'Speed of Sound Ratio', unit: '', symbol: '<math><mi>a</mi><mo>/</mo><msub><mi>a</mi><mn>0</mn></msub></math>', group: 'Motion & Viscosity' },
  dynamic_viscosity: { label: 'Dynamic Viscosity', unit: 'Pa·s', symbol: '<math><mi>μ</mi></math>', group: 'Motion & Viscosity' },
  dynamic_viscosity_ratio: { label: 'Dynamic Viscosity Ratio', unit: '', symbol: '<math><mi>μ</mi><mo>/</mo><msub><mi>μ</mi><mn>0</mn></msub></math>', group: 'Motion & Viscosity' },
  kinematic_viscosity: { label: 'Kinematic Viscosity', unit: 'm²/s', symbol: '<math><mi>ν</mi></math>', group: 'Motion & Viscosity' },
  kinematic_viscosity_ratio: { label: 'Kinematic Viscosity Ratio', unit: '', symbol: '<math><mi>ν</mi><mo>/</mo><msub><mi>ν</mi><mn>0</mn></msub></math>', group: 'Motion & Viscosity' },
  thermal_conductivity: { label: 'Thermal Conductivity', unit: 'W/(m·K)', symbol: '<math><mi>λ</mi></math>', group: 'Other' },
  thermal_conductivity_ratio: { label: 'Thermal Conductivity Ratio', unit: '', symbol: '<math><mi>λ</mi><mo>/</mo><msub><mi>λ</mi><mn>0</mn></msub></math>', group: 'Other' },
  pressure_scale_height: { label: 'Pressure Scale Height', unit: 'm', symbol: '<math><msub><mi>H</mi><mi>p</mi></msub></math>', group: 'Other' },
  specific_weight: { label: 'Specific Weight', unit: 'N/m³', symbol: '<math><mi>γ</mi></math>', group: 'Other' },
  air_number_density: { label: 'Air Number Density', unit: 'm⁻³', symbol: '<math><mi>n</mi></math>', group: 'Other' },
  mean_particle_speed: { label: 'Mean Particle Speed', unit: 'm/s', symbol: '<math><mover><mi>v</mi><mo>¯</mo></mover></math>', group: 'Other' },
  collision_frequency: { label: 'Collision Frequency', unit: 's⁻¹', symbol: '<math><mi>ω</mi></math>', group: 'Other' },
  mean_free_path: { label: 'Mean Free Path', unit: 'm', symbol: '<math><mi>l</mi></math>', group: 'Other' },
  mole_volume: { label: 'Mole Volume', unit: 'm³/mol', symbol: '<math><msub><mi>V</mi><mi>m</mi></msub></math>', group: 'Other' },
  molecular_temperature: { label: 'Molecular Temperature', unit: 'K', symbol: '<math><msub><mi>T</mi><mi>M</mi></msub></math>', group: 'Other' },
}

/**
 * Given any property name and value, find the corresponding geopotential altitude
 * and return the full set of atmospheric properties.
 */
export function getAltitudeFromProperty(input: PropertyInput) {
  const isa = getIsaInstance()
  const val = input.value

  // Convert to SI / standard units, then solve for geopotential altitude
  let geoAlt: number | undefined

  switch (input.property) {
    case 'geopotential_altitude_m':
      geoAlt = val
      break
    case 'geopotential_altitude_ft':
      geoAlt = feetToM(val)
      break
    case 'geometric_altitude_m':
      geoAlt = isa.geopotentialAltitudeFromGeometric(val)
      break
    case 'geometric_altitude_ft':
      geoAlt = isa.geopotentialAltitudeFromGeometric(feetToM(val))
      break
    case 'temperature_k':
      geoAlt = isa.geopotentialFromTemperature(val)
      break
    case 'temperature_c':
      geoAlt = isa.geopotentialFromTemperature(val + 273.15)
      break
    case 'temperature_f':
      geoAlt = isa.geopotentialFromTemperature((val - 32) * 5 / 9 + 273.15)
      break
    case 'temperature_r':
      geoAlt = isa.geopotentialFromTemperature(val * 5 / 9)
      break
    case 'temperature_ratio':
      geoAlt = isa.geopotentialFromTemperatureRatio(val)
      break
    case 'lapse_rate':
      geoAlt = isa.geopotentialFromLapseRate(val)
      break
    case 'pressure_pa':
      geoAlt = isa.geopotentialFromPressure(val)
      break
    case 'pressure_mbar':
      geoAlt = isa.geopotentialFromPressure(val * 100)
      break
    case 'pressure_mmhg':
      geoAlt = isa.geopotentialFromPressure(val / 0.007500616827)
      break
    case 'pressure_ratio':
      geoAlt = isa.geopotentialFromPressureRatio(val)
      break
    case 'density_kgm3':
      geoAlt = isa.geopotentialFromDensity(val)
      break
    case 'density_ratio':
      geoAlt = isa.geopotentialFromDensityRatio(val)
      break
    case 'sqrt_density_ratio':
      geoAlt = isa.geopotentialFromDensityRatio(val * val)
      break
    case 'gravity_ms2':
      geoAlt = isa.geopotentialFromGravity(val)
      break
    case 'gravity_ratio':
      geoAlt = isa.geopotentialFromGravityRatio(val)
      break
    case 'speed_of_sound_ms':
      geoAlt = isa.geopotentialFromSpeedOfSound(val)
      break
    case 'speed_of_sound_ratio':
      geoAlt = isa.geopotentialFromSpeedOfSoundRatio(val)
      break
    case 'dynamic_viscosity':
      geoAlt = isa.geopotentialFromDynamicViscosity(val)
      break
    case 'dynamic_viscosity_ratio':
      geoAlt = isa.geopotentialFromDynamicViscosityRatio(val)
      break
    case 'kinematic_viscosity':
      geoAlt = isa.geopotentialFromKinematicViscosity(val)
      break
    case 'kinematic_viscosity_ratio':
      geoAlt = isa.geopotentialFromKinematicViscosityRatio(val)
      break
    case 'thermal_conductivity':
      geoAlt = isa.geopotentialFromThermalConductivity(val)
      break
    case 'thermal_conductivity_ratio':
      geoAlt = isa.geopotentialFromThermalConductivityRatio(val)
      break
    case 'pressure_scale_height':
      geoAlt = isa.geopotentialFromPressureScaleHeight(val)
      break
    case 'specific_weight':
      geoAlt = isa.geopotentialFromSpecificWeight(val)
      break
    case 'air_number_density':
      geoAlt = isa.geopotentialFromNumberDensity(val)
      break
    case 'mean_particle_speed':
      geoAlt = isa.geopotentialFromMeanParticleSpeed(val)
      break
    case 'collision_frequency':
      geoAlt = isa.geopotentialFromCollisionFrequency(val)
      break
    case 'mean_free_path':
      geoAlt = isa.geopotentialFromMeanFreePath(val)
      break
    case 'mole_volume':
      geoAlt = isa.geopotentialFromMoleVolume(val)
      break
    case 'molecular_temperature':
      geoAlt = isa.geopotentialFromMolecularTemperature(val)
      break
    default:
      return undefined
  }

  if (geoAlt === undefined || isNaN(geoAlt)) return undefined

  // Now compute all properties at the resolved altitude
  return getAllProperties({
    mode: 'altitude',
    value: geoAlt,
    unit: 'meters',
    type: 'geopotential',
    precision: input.precision ?? 'normal'
  })
}
