const getNumberParts_FARRAY = new Float64Array(1);
const getNumberParts_UARRAY = new Uint8Array(getNumberParts_FARRAY.buffer);
// http://stackoverflow.com/questions/9383593/extracting-the-exponent-and-mantissa-of-a-javascript-number
export function getNumberParts(x) {
  var float = getNumberParts_FARRAY;
  var bytes = getNumberParts_UARRAY;
  float[0] = x;

  var sign = bytes[7] >> 7,
    exponent = (((bytes[7] & 0x7f) << 4) | (bytes[6] >> 4)) - 0x3ff;
  bytes[7] = 0x3f;
  bytes[6] |= 0xf0;
  return {
    sign: sign,
    exponent: exponent,
    mantissa: float[0],
  };
}

export function parsegraph_fuzzyEquals(a, b, fuzziness) {
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
