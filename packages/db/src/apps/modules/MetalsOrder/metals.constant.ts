const METAL_UNITS = {
  LBS: 'LBS',
  PCS: 'PCS',
}

export const metalUnitValues = Object.values(METAL_UNITS)

export type TMetalUnitType = keyof typeof METAL_UNITS
