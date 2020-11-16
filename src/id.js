let count = 0;
export default function parsegraph_generateID(prefix) {
  if (!prefix) {
    prefix = "parsegraph-unique";
  }
  return prefix + "-" + ++count;
}
