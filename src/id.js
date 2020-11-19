let count = 0;
// eslint-disable-next-line require-jsdoc
export default function generateID(prefix) {
  if (!prefix) {
    prefix = 'parsegraph-unique';
  }
  return prefix + '-' + ++count;
}
