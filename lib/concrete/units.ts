// Unit conventions used throughout lib/concrete:
//   length     : in
//   stress     : ksi (f'c, fy, Es, Ec, fr)
//   force      : kip
//   moment     : kip-ft on the API surface, kip-in internally
//   strain     : dimensionless
//
// Public API uses the units declared in the wire types. Conversion
// happens at the boundary; the math kernel stays in one consistent set.

export const E_S_KSI = 29_000;        // steel modulus, ACI 20.2.2.2
export const EPS_CU = 0.003;          // concrete crushing strain, ACI 22.2.2.1
export const LAMBDA_NORMAL = 1.0;     // normal-weight concrete
export const PHI_FLEXURE_TC = 0.9;    // tension-controlled
export const PHI_FLEXURE_CC = 0.65;   // compression-controlled (tied)
export const PHI_SHEAR = 0.75;        // ACI 21.2.1

export const ksiToPsi = (ksi: number) => ksi * 1000;
export const kipinToKipft = (kipin: number) => kipin / 12;
export const kipftToKipin = (kipft: number) => kipft * 12;
