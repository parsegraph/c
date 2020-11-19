const getNumberPartsFArray = new Float64Array(1);
const getNumberPartsUArray = new Uint8Array(getNumberParts_FARRAY.buffer);
// http://stackoverflow.com/questions/9383593/extracting-the-exponent-and-mantissa-of-a-javascript-number
// eslint-disable-next-line require-jsdoc
export function getNumberParts(x) {
  const float = getNumberPartsFArray;
  const bytes = getNumberPartsUArray;
  float[0] = x;

  const sign = bytes[7] >> 7;
  const exponent = (((bytes[7] & 0x7f) << 4) | (bytes[6] >> 4)) - 0x3ff;
  bytes[7] = 0x3f;
  bytes[6] |= 0xf0;
  return {
    sign: sign,
    exponent: exponent,
    mantissa: float[0],
  };
}
// eslint-disable-next-line require-jsdoc
export function fuzzyEquals(a, b, fuzziness) {
  if (!fuzziness) {
    return (isNaN(a) && isNaN(b)) || a === b;
  }
  if (a < b) {
    return Math.abs(b / a) - 1 <= fuzziness;
  }
  if (Math.abs(b) <= fuzziness) {
    return a - b <= fuzziness;
  }
  return Math.abs(a / b) - 1 <= fuzziness;
}
