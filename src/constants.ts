// ISO 2533 Standard Atmosphere — Fundamental constants

export interface TemperatureLayer {
  H: number  // Base geopotential altitude (m)
  T: number  // Base temperature (K)
  B: number  // Vertical temperature gradient (K/m)
}

export const CONSTANTS = {
  g_n: 9.80665,        // Standard gravitational acceleration (m/s²)
  N_A: 6.02257e26,     // Avogadro constant (mol⁻¹)
  p_n: 101325,         // Standard pressure (Pa)
  rho_n: 1.225,        // Standard density (kg/m³)
  T_n: 288.15,         // Standard temperature (K)
  R_star: 8.31432,     // Universal gas constant (J/(mol·K))
  radius: 6356766,     // Nominal Earth radius (m)
  kappa: 1.4,          // Adiabatic index (cp/cv) for air
} as const

// Derived constants
const M = CONSTANTS.rho_n * CONSTANTS.R_star * CONSTANTS.T_n / CONSTANTS.p_n
const R = CONSTANTS.R_star / M

export const DERIVED_CONSTANTS = {
  M,   // Molar mass of air (kg/kmol)
  R,   // Specific gas constant (J/(kg·K))
} as const

// Temperature layers from ISO 2533
export const TEMPERATURE_LAYERS: TemperatureLayer[] = [
  { H: -2000, T: 301.15,  B: -0.0065 },
  { H: 0,     T: 288.15,  B: -0.0065 },
  { H: 11000, T: 216.65,  B: 0 },
  { H: 20000, T: 216.65,  B: 0.001 },
  { H: 32000, T: 228.65,  B: 0.0028 },
  { H: 47000, T: 270.65,  B: 0 },
  { H: 51000, T: 270.65,  B: -0.0028 },
  { H: 71000, T: 214.65,  B: -0.002 },
  { H: 80000, T: 196.65,  B: -0.002 },
]
