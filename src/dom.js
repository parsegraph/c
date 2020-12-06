/* eslint-disable require-jsdoc */

import TestSuite from 'parsegraph-testsuite';

export default function focusElement(element) {
  return window.setTimeout(function() {
    element.focus();
  });
}

export default function findSelected(selectElement) {
  let c = selectElement.firstChild;
  while (c != null) {
    if (c.selected) {
      return c;
    }
    c = c.nextSibling;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
export default function fixedCharAt(str, idx) {
  let ret = '';
  str += '';
  const end = str.length;

  const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  while (surrogatePairs.exec(str) != null) {
    const li = surrogatePairs.lastIndex;
    if (li - 2 < idx) {
      idx++;
    } else {
      break;
    }
  }

  if (idx >= end || idx < 0) {
    return null;
  }

  ret += str.charAt(idx);

  if (
    /[\uD800-\uDBFF]/.test(ret) &&
    /[\uDC00-\uDFFF]/.test(str.charAt(idx + 1))
  ) {
    // Go one further, since one of the "characters" is part of a surrogate pair
    ret += str.charAt(idx + 1);
  }
  return ret;
}

browserTests = new TestSuite('Browser');

browserTests.addTest(
    'arguments referenced from other closures',
    function() {
      const foo = function(...args) {
        return function(...args) {
          return args[0];
        };
      };

      const c = foo(1)(2);
      if (c !== 1) {
        return 'Closures cannot reference external arguments.';
      }
    },
);
