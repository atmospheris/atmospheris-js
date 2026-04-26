// ISO 5878 — Atmosphere model registry
// Maps model IDs to their configuration and constructs ReferenceAtmosphere instances

import { SurfaceParameters } from './surface-parameters.js'
import { ReferenceAtmosphere, TemperatureLayerBreakpoint, SurfaceConditions } from './reference-atmosphere.js'

export interface ModelConfig {
  latitude: number
  season: 'annual' | 'winter' | 'summer'
  layersKey: string
}

export const MODELS: Record<string, ModelConfig> = {
  '15-annual': { latitude: 15, season: 'annual', layersKey: 'rows-15' },
  '30-winter': { latitude: 30, season: 'winter', layersKey: 'rows-30-w' },
  '30-summer': { latitude: 30, season: 'summer', layersKey: 'rows-30-s' },
  '45-winter': { latitude: 45, season: 'winter', layersKey: 'rows-45-w' },
  '45-summer': { latitude: 45, season: 'summer', layersKey: 'rows-45-s' },
  '60-winter': { latitude: 60, season: 'winter', layersKey: 'rows-60-w' },
  '60-summer': { latitude: 60, season: 'summer', layersKey: 'rows-60-s' },
  '60-warm':   { latitude: 60, season: 'winter', layersKey: 'rows-60-warm' },
  '60-cold':   { latitude: 60, season: 'winter', layersKey: 'rows-60-cold' },
  '80-winter': { latitude: 80, season: 'winter', layersKey: 'rows-80-w' },
  '80-summer': { latitude: 80, season: 'summer', layersKey: 'rows-80-s' },
  '80-warm':   { latitude: 80, season: 'winter', layersKey: 'rows-80-warm' },
  '80-cold':   { latitude: 80, season: 'winter', layersKey: 'rows-80-cold' },
}

export const SURFACE_CONDITIONS: Record<number, Record<string, SurfaceConditions>> = {
  15: { annual:  { temperature: 299.650, pressure: 101325.0 } },
  30: {
    winter:  { temperature: 283.150, pressure: 102050.0 },
    summer:  { temperature: 297.150, pressure: 101400.0 },
  },
  45: {
    winter:  { temperature: 272.650, pressure: 101800.0 },
    summer:  { temperature: 291.150, pressure: 101350.0 },
  },
  60: {
    winter:  { temperature: 256.150, pressure: 101300.0 },
    summer:  { temperature: 282.150, pressure: 101020.0 },
  },
  80: {
    winter:  { temperature: 248.950, pressure: 101380.0 },
    summer:  { temperature: 276.650, pressure: 101200.0 },
  },
}

/**
 * Build temperature layers from YAML breakpoint rows.
 * Gradients are computed from consecutive temperature/altitude pairs.
 */
export function buildLayersFromRows(
  rows: Array<{ 'geopotential-altitude': number; 'temperature-K': number }>
): TemperatureLayerBreakpoint[] {
  const layers: TemperatureLayerBreakpoint[] = []
  for (let i = 0; i < rows.length; i++) {
    const hM = rows[i]['geopotential-altitude'] * 1000  // km → m
    const tK = rows[i]['temperature-K']
    if (i < rows.length - 1) {
      const nextH = rows[i + 1]['geopotential-altitude'] * 1000
      const nextT = rows[i + 1]['temperature-K']
      const dh = nextH - hM
      const beta = Math.abs(dh) < 1e-12 ? 0 : (nextT - tK) / dh
      layers.push({ H: hM, T: tK, B: beta })
    } else {
      layers.push({ H: hM, T: tK })
    }
  }
  return layers
}

/**
 * Construct a ReferenceAtmosphere for the given model ID.
 *
 * @param modelId - e.g. '15-annual', '60-warm'
 * @param layersData - YAML data from table16.yaml or table19.yaml
 * @returns ReferenceAtmosphere instance
 */
export function createReferenceAtmosphere(
  modelId: string,
  layersData: Record<string, unknown>
): ReferenceAtmosphere {
  const config = MODELS[modelId]
  if (!config) {
    throw new Error(`Unknown ISO 5878 model: ${modelId}. Available: ${Object.keys(MODELS).join(', ')}`)
  }

  const surfaceConditions = SURFACE_CONDITIONS[config.latitude]?.[config.season]
  if (!surfaceConditions) {
    throw new Error(`No surface conditions for ${config.latitude}° ${config.season}`)
  }

  const rawRows = layersData[config.layersKey] as Array<{ 'geopotential-altitude': number; 'temperature-K': number }> | undefined
  if (!rawRows) {
    throw new Error(`Layer data key '${config.layersKey}' not found in provided data`)
  }

  const layers = buildLayersFromRows(rawRows)
  const surfaceParams = new SurfaceParameters(config.latitude)

  return new ReferenceAtmosphere(surfaceParams, surfaceConditions, layers)
}

/** List all available model IDs */
export function modelIds(): string[] {
  return Object.keys(MODELS)
}
