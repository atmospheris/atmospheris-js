// ISO 2533 Standard Atmosphere — Unit conversion utilities

export function paToMbar(pa: number): number {
  return pa / 100
}

export function mbarToPa(mbar: number): number {
  return mbar * 100
}

export function paToMmhg(pa: number): number {
  return pa * 0.007500616827
}

export function mmhgToPa(mmhg: number): number {
  return mmhg / 0.007500616827
}

export function mToFeet(meters: number): number {
  return meters * 3.280839895
}

export function feetToM(feet: number): number {
  return feet / 3.280839895
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15
}
