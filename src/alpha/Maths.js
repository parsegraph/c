import TestSuite from '../TestSuite';
import {fuzzyEquals} from '../math';
import {makePerspective} from '../gl';
/* eslint-disable require-jsdoc, prefer-spread, new-cap */
// Maths VERSION: 1.8.130828

// usage:

// Vectors:
// vector[0], vector[1], vector[2], vector.length == 3
// vector.Normalize() // normalizes the vector passed and returns it
// vector.Magnitude() or Length()
// Vector.DotProduct( vector , othervector) or ScalarProduct or InnerProduct
// Vector.AngleBetween( vector, othervector )

// Quaternions:

// Matrices:

const FUZZINESS = 1e-10;

export function alphaRandom(min, max) {
  return min + Math.round(Math.random() * (max - min));
}

const alphastartTime = new Date();
export function alphaGetTime() {
  return (new Date().getTime() - alphastartTime.getTime()) / 1000;
}

export function alphatoRadians(inDegrees) {
  return (inDegrees * Math.PI) / 180;
}
export const alphaToRadians = alphatoRadians;

export function alphatoDegrees(inRadians) {
  return (inRadians * 180) / Math.PI;
}
export const alphaToDegrees = alphatoDegrees;

// ----------------------------------------------
// ----------------------------------------------
// -----------      VECTORS     -----------------
// ----------------------------------------------
// ----------------------------------------------

export function AlphaVector(...args) {
  this[0] = 0;
  this[1] = 0;
  this[2] = 0;
  this.length = 3;

  if (args.length > 0) {
    this.Set.apply(this, args);
  }
}

AlphaVector.prototype.toJSON = function() {
  return [this[0], this[1], this[2]];
};

AlphaVector.prototype.restore = function(json) {
  if (Array.isArray(json)) {
    this.Set.apply(this, json);
  } else {
    this[0] = json.x;
    this[1] = json.y;
    this[2] = json.z;
  }
};

const alphaVectorTests = new TestSuite('AlphaVector');

alphaVectorTests.addTest('AlphaVector.<constructor>', function() {
  const v = new alphaVector(1, 2, 3);
  if (v[0] != 1 || v[1] != 2 || v[2] != 3) {
    return 'Constructor must accept arguments.';
  }
});

AlphaVector.prototype.Add = function(...args) {
  if (args.length > 1) {
    this[0] += args[0];
    this[1] += args[1];
    this[2] += args[2];
  } else {
    this[0] += args[0][0];
    this[1] += args[0][1];
    this[2] += args[0][2];
  }
  return this;
};

alphaVectorTests.addTest('AlphaVector.Add', function() {
  const a = new AlphaVector(3, 4, 0);

  a.Add(new alphaVector(1, 2, 3));
  if (!a.Equals(4, 6, 3)) {
    return 'Add must add component-wise';
  }
});

AlphaVector.prototype.Added = function(...args) {
  const rv = this.Clone();
  return rv.Add.apply(rv, args);
};

AlphaVector.prototype.Clone = function() {
  return new AlphaVector(this);
};

AlphaVector.prototype.Multiply = function(...args) {
  if (args.length > 1) {
    this[0] *= args[0];
    this[1] *= args[1];
    this[2] *= args[2];
  } else if (typeof args[0] == 'number') {
    this[0] *= args[0];
    this[1] *= args[0];
    this[2] *= args[0];
  } else {
    this[0] *= args[0][0];
    this[1] *= args[0][1];
    this[2] *= args[0][2];
  }
  return this;
};

AlphaVector.prototype.Multiplied = function(...args) {
  const rv = this.Clone();
  return rv.Multiply.apply(rv, args);
};

AlphaVector.prototype.Divide = function(...args) {
  if (args.length > 1) {
    this[0] /= args[0];
    this[1] /= args[1];
    this[2] /= args[2];
  } else if (typeof args[0] == 'number') {
    this[0] /= args[0];
    this[1] /= args[0];
    this[2] /= args[0];
  } else {
    this[0] /= args[0][0];
    this[1] /= args[0][1];
    this[2] /= args[0][2];
  }
  return this;
};

AlphaVector.prototype.Divided = function(...args) {
  const rv = this.Clone();
  return rv.Divide.apply(rv, args);
};

AlphaVectorTests.addTest('AlphaVector.Divide', function() {
  const a = new AlphaVector(3, 4, 0);

  const b = new AlphaVector(2, 2, 2);

  if (!a.Divided(b).Equals(3 / 2, 4 / 2, 0)) {
    return a.Divided(b).toString();
  }

  if (!a.Equals(3, 4, 0)) {
    return a.toString();
  }
  if (a.Equals(3, 4, 5)) {
    return a.toString();
  }
  if (a.Equals(4, 4, 0)) {
    return a.toString();
  }
  if (a.Equals(3, 3, 0)) {
    return a.toString();
  }

  if (!a.Divided(2, 2, 2).Equals(3 / 2, 4 / 2, 0)) {
    return a.Divided(b).toString();
  }

  if (!a.Divided(new AlphaVector(2, 3, 4)).Equals(3 / 2, 4 / 3, 0)) {
    return a.Divided(b).toString();
  }
});

AlphaVector.prototype.Equals = function(...args) {
  if (args.length > 1) {
    // .Equals(x, y, z)
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  } else {
    // .Equals(new AlphaVector(x, y, z));
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[0][i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  }

  // Equals.
  return true;
};

AlphaVectorTests.addTest('AlphaVector.Equals', function() {
  const a = new AlphaVector(3, 4, 0);
  if (!a.Equals(3, 4, 0)) {
    return a.toString();
  }
  if (a.Equals(3, 4, 5)) {
    return a.toString();
  }
  if (a.Equals(4, 4, 0)) {
    return a.toString();
  }
  if (a.Equals(3, 3, 0)) {
    return a.toString();
  }
});

AlphaVector.prototype.Set = function(...args) {
  if (args.length > 1) {
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[i];
    }
  } else {
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[0][i];
    }
  }
  if (typeof this[0] != 'number') {
    throw new Error('All components must be numbers');
  }
  if (typeof this[1] != 'number') {
    throw new Error('All components must be numbers');
  }
  if (typeof this[2] != 'number') {
    throw new Error('All components must be numbers');
  }
  return this;
};

AlphaVector.prototype.Normalize = function() {
  const magnitude = this.Magnitude();
  if (magnitude != 0) {
    this.Divide(magnitude);
  }

  return this;
};

AlphaVectorTests.addTest('AlphaVector.Normalize', function() {
  const a = new AlphaVector(3, 4, 0);
  a.Normalize();
  if (a.Length() != 1) {
    return 'Normalize must create a vector of length one.';
  }

  if (!a.Equals(3 / 5, 4 / 5, 0)) {
    return a.toString();
  }
});

AlphaVector.prototype.Normalized = function() {
  return this.Clone().Normalize();
};

AlphaVector.prototype.Magnitude = function() {
  return Math.sqrt(this.DotProduct(this));
};
AlphaVector.prototype.Length = AlphaVector.prototype.Magnitude;

AlphaVectorTests.addTest('AlphaVector.Magnitude', function() {
  let v = new AlphaVector();
  if (v.Magnitude() != 0) {
    return 'Empty vector must have zero magnitude.';
  }

  v = new AlphaVector(1, 0, 0);
  if (v.Magnitude() != 1) {
    return 'Vector magnitude does not match.';
  }

  v = new AlphaVector(3, 4, 0);
  if (v.Magnitude() != 5) {
    return 'Vector magnitude does not match.';
  }
});

AlphaVector.prototype.DotProduct = function(other) {
  return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
};
AlphaVector.prototype.InnerProduct = AlphaVector.prototype.DotProduct;
AlphaVector.prototype.ScalarProduct = AlphaVector.prototype.DotProduct;

AlphaVectorTests.addTest('AlphaVector.DotProduct', function() {
  const a = new AlphaVector(1, 0, 0);
  const b = new AlphaVector(0, 1, 0);
  if (a.DotProduct(b)) {
    return 'Orthogonal vectors must have zero dot product';
  }
});

AlphaVector.prototype.AngleBetween = function(other) {
  const dot = this.DotProduct(other);
  return Math.acos(dot / (this.Magnitude() * other.Magnitude()));
};

AlphaVector.prototype.toString = function() {
  if (typeof this[0] != 'number') {
    throw new Error('All components must be numbers');
  }
  if (typeof this[1] != 'number') {
    throw new Error('All components must be numbers');
  }
  if (typeof this[2] != 'number') {
    throw new Error('All components must be numbers');
  }
  return '[' + this[0] + ', ' + this[1] + ', ' + this[2] + ']';
};

// ----------------------------------------------
// ----------------------------------------------
// -----------     QUATERNIONS  -----------------
// ----------------------------------------------
// ----------------------------------------------

export function AlphaQuaternion(...args) {
  this[0] = 0;
  this[1] = 0;
  this[2] = 0;
  this[3] = 1;
  this.length = 4;

  if (args.length > 0) {
    this.Set.apply(this, args);
  }
}

AlphaQuaternion.prototype.toJSON = function() {
  return [this[0], this[1], this[2], this[3]];
};

AlphaQuaternion.prototype.restore = function(json) {
  if (Array.isArray(json)) {
    this.Set.apply(this, json);
  } else {
    this[0] = json.x;
    this[1] = json.y;
    this[2] = json.z;
    this[3] = json.w;
  }
};

const alphaQuaternionTests = new TestSuite('AlphaQuaternion');

alphaQuaternionTests.addTest(
    'Does quaternion rotation really even work?',
    function() {
      const m = new alphaRMatrix4();
      const rotq = Math.PI / 2;
      m.Rotate(alphaQuaternionFromAxisAndAngle(0, 1, 1, rotq));
      m.Rotate(alphaQuaternionFromAxisAndAngle(1, 0, 0, rotq));
      m.Rotate(alphaQuaternionFromAxisAndAngle(1, 0, 1, rotq));
      m.Transform(10, 0, 0);
    // TODO What is the expected value?
    // console.log(v.toString());
    },
);

alphaQuaternionTests.addTest('alphaQuaternionFromAxisAndAngle', function() {
  const quat = alphaQuaternionFromAxisAndAngle(1, 0, 0, Math.PI / 2);
  if (
    !parsegraph_fuzzyEquals(quat[0], 0.7071, 10e-2) ||
    !parsegraph_fuzzyEquals(quat[1], 0, 10e-2) ||
    !parsegraph_fuzzyEquals(quat[2], 0, 10e-2) ||
    !parsegraph_fuzzyEquals(quat[3], 0.7071, 10e-2)
  ) {
    throw new Error(
        'Quaternion ' +
        quat +
        ' does not match expected (0.7071, 0, 0, 0.7071)',
    );
  }
});

AlphaQuaternion.prototype.Clone = function() {
  return new AlphaQuaternion(this);
};

AlphaQuaternion.prototype.Multiply = function(...args) {
  if (arguments.length == 1 && typeof args[0] === 'number') {
    this[0] *= args[0];
    this[1] *= args[0];
    this[2] *= args[0];
    this[3] *= args[0];
    return;
  }
  // q = a * b
  const aw = this[3];
  const ax = this[0];
  const ay = this[1];
  const az = this[2];

  let bw;
  let bx;
  let by;
  let bz;
  if (args.length > 1) {
    bw = args[3];
    bx = args[0];
    by = args[1];
    bz = args[2];
  } else {
    bw = args[0][3];
    bx = args[0][0];
    by = args[0][1];
    bz = args[0][2];
  }

  this[0] = aw * bx + ax * bw + ay * bz - az * by;
  this[1] = aw * by - ax * bz + ay * bw + az * bx;
  this[2] = aw * bz + ax * by - ay * bx + az * bw;
  this[3] = aw * bw - ax * bx - ay * by - az * bz;

  return this;
};

AlphaQuaternion.prototype.Multiplied = function(...args) {
  const rv = this.Clone();
  return rv.Multiply.apply(rv, args);
};

// really this could use a few tweaks
// negatives can be the same rotation
// (different paths)
AlphaQuaternion.prototype.Equals = function(...args) {
  if (args.length > 1) {
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  } else {
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[0][i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  }

  // Equals.
  return true;
};

AlphaQuaternion.prototype.Magnitude = function() {
  const w = this[3];
  const x = this[0];
  const y = this[1];
  const z = this[2];
  return Math.sqrt(w * w + x * x + y * y + z * z);
};
AlphaQuaternion.prototype.Length = AlphaQuaternion.prototype.Magnitude;
AlphaQuaternion.prototype.Norm = AlphaQuaternion.prototype.Magnitude;

AlphaQuaternion.prototype.Normalize = function() {
  const magnitude = this.Magnitude();
  if (magnitude != 0) {
    this.Multiply(1 / magnitude);
  }
  return this;
};

AlphaQuaternion_Tests.addTest('AlphaQuaternion.Normalize', function() {
  const q = new AlphaQuaternion();
  q.Normalize();
  if (!q.Equals(new AlphaQuaternion())) {
    console.log(q.toString());
    return q;
  }
});

AlphaQuaternion.prototype.Set = function(...args) {
  const w = this[3];

  if (args.length > 1) {
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[i];
    }
  } else {
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[0][i];
    }
  }

  if (this[3] === undefined) {
    this[3] = w;
  }
  return this;
};

/*
 * Returns a new quaternion that represents the conjugate of this quaternion.
 */
AlphaQuaternion.prototype.Conjugate = function() {
  return new AlphaQuaternion(-this[0], -this[1], -this[2], this[3]);
};

AlphaQuaternion.prototype.Inverse = function() {
  // actual inverse is q.Conjugate() / Math.pow(Math.abs(q.Magnitude()), 2)
  // but as we only deal with unit quaternions we can just force a normalization
  // q.Conjugate() / 1 == q.Conjugate();

  this.Normalize();
  return this.Conjugate();
};

AlphaQuaternion.prototype.ToAxisAndAngle = function() {
  if (w > 1) {
    this.Normalize();
  }
  const w = this[3];
  let x = this[0];
  let y = this[1];
  let z = this[2];

  const angle = 2 * Math.acos(w);
  const s = Math.sqrt(1 - w * w);

  if (s > 0.001) {
    x = x / s;
    y = x / s;
    z = x / s;
  }
  return [new alphaVector(x, y, z), angle];
};

export function alphaQuaternionFromAxisAndAngle(...args) {
  const quat = new AlphaQuaternion(0, 0, 0, 1);
  return quat.FromAxisAndAngle.apply(quat, args);
}

AlphaQuaternion.prototype.FromAxisAndAngle = function(...args) {
  let angle;
  const axis = new alphaVector();
  if (args.length == 2) {
    // passed as ({vector}, angle)
    // creates or copies the vector or Vector
    axis.Set(args[0][0], args[0][1], args[0][2]);
    angle = args[1];
  } else {
    // passed as ( x, y, z, angle) -- (rough check)
    axis.Set(args[0], args[1], args[2]);
    angle = args[3];
  }

  axis.Normalize();
  angle = angle / 2;
  const sinangle = Math.sin(angle);
  // accessing an vector by [X] will not be correct
  this[0] = axis[0] * sinangle;
  this[1] = axis[1] * sinangle;
  this[2] = axis[2] * sinangle;
  this[3] = Math.cos(angle);

  return this;
};

AlphaQuaternion_Tests.addTest('FromAxisAndAngle', function() {
  const q = new AlphaQuaternion();
  const angle = Math.PI / 2;

  q.FromAxisAndAngle(0, 1, 0, angle);
  if (!q.Equals(0, Math.sin(angle / 2), 0, Math.cos(angle / 2))) {
    return q.toString();
  }

  q.FromAxisAndAngle(0, 0, 1, angle);
  if (!q.Equals(0, 0, Math.sin(angle / 2), Math.cos(angle / 2))) {
    return q.toString();
  }

  q.FromAxisAndAngle(1, 0, 0, angle);
  if (!q.Equals(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2))) {
    return q.toString();
  }

  q.FromAxisAndAngle(0, 0, 0, angle);
  if (!q.Equals(0, 0, 0, Math.cos(angle / 2))) {
    return q.toString();
  }
});

AlphaQuaternion.prototype.DotProduct = function(other) {
  let rv = 0;
  for (let i = 0; i < this.length; ++i) {
    rv += this[i] * other[i];
  }
  return rv;
};
AlphaQuaternion.prototype.ScalarProduct =
  AlphaQuaternion.prototype.DotProduct;
AlphaQuaternion.prototype.InnerProduct = AlphaQuaternion.prototype.DotProduct;

// v' = qr * v * qr-1
// vector3 = (q * quaternion( vector, 0 ) * q:conjugate() ).Vector();
// this is one of the most heavily used and slowest functions
// so its been optimized to hell and back
// a more normal, and decently optimized version is found next
// this version is about 2x faster than RotatedVector2
(function() {
  AlphaQuaternion.prototype.RotatedVector = function(...args) {
    let x;
    let y;
    let z;
    const vec = new alphaVector();
    if (args.length > 1) {
      x = args[0];
      y = args[1];
      z = args[2];
    } else {
      x = args[0][0];
      y = args[0][1];
      z = args[0][2];
    }
    this.RotatedVectorEach(vec, x, y, z);
    return vec;
  };
})();

(function() {
  const scratchQuat = new AlphaQuaternion();
  AlphaQuaternion.prototype.RotatedVectorEach = function(outVec, x, y, z) {
    let aw = 0;
    let ax = x;
    let ay = y;
    let az = z;

    let bw = this[3];
    let bx = -this[0];
    let by = -this[1];
    let bz = -this[2];

    // removed all the mults by aw, which would result in 0;
    scratchQuat.Set(
        ax * bw + ay * bz - az * by,
        -ax * bz + ay * bw + az * bx,
        ax * by - ay * bx + az * bw,
        -ax * bx - ay * by - az * bz,
    );
    const q = scratchQuat;

    const b = q;
    aw = this[3];
    ax = this[0];
    ay = this[1];
    az = this[2];

    bw = b[3];
    bx = b[0];
    by = b[1];
    bz = b[2];

    // and we strip the w component from this
    // which makes it a vector
    outVec.Set(
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
    );
  };
})();

AlphaQuaternion.prototype.toString = function() {
  return (
    '{x: ' +
    this[0] +
    '\ny: ' +
    this[1] +
    '\nz: ' +
    this[2] +
    '\nw: ' +
    this[3] +
    '}'
  );
};

AlphaQuaternion.prototype.AngleBetween = function(other) {
  this.Normalize();
  other.Normalize();
  const dot = this.DotProduct(other);
  return 2 * Math.acos(dot / (this.Magnitude() * other.Magnitude()));
};

// ----------------------------------------------
// ----------------------------------------------
// -----------      MATRICES    -----------------
// ----------------------------------------------
// ----------------------------------------------

/*
 * Constructs a Matrix.
 *
    // using quaternions for a Vector4
    let r1 = new AlphaQuaternion(this[0], this[1], this[2], this[3]);
    let r2 = new AlphaQuaternion(this[4], this[5], this[6], this[7]);
    let r3 = new AlphaQuaternion(this[8], this[9], this[10], this[11]);
    let r4 = new AlphaQuaternion(this[12], this[13], this[14], this[15]);
*/
export function AlphaRMatrix4(...args) {
  this.length = 16;
  if (args.length == 0) {
    this.Set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  } else {
    this.Set.apply(this, args);
  }
}

AlphaRMatrix4.prototype.restore = function(json) {
  this.Set.apply(this, json);
};

AlphaRMatrix4.prototype.toJSON = function() {
  return this.toArray();
};

const alphaRMatrix4Tests = new TestSuite('AlphaRMatrix4');

AlphaRMatrix4.prototype.toDom = function(reference) {
  const tableDom = document.createElement('table');

  for (let i = 0; i < 4; ++i) {
    const rowDom = document.createElement('tr');
    tableDom.appendChild(rowDom);
    for (let j = 0; j < 4; ++j) {
      const cellDom = document.createElement('td');
      cellDom.style.padding = '3px';
      cellDom.style.textAlign = 'center';

      if (reference) {
        const refValue = reference[4 * i + j];
        const givenValue = this[4 * i + j];

        if (Math.abs(givenValue - refValue) > FUZZINESS) {
          cellDom.style.color = 'black';
          cellDom.style.backgroundColor = 'red';
          cellDom.appendChild(
              document.createTextNode(givenValue + ' (not ' + refValue + ')'),
          );
        } else {
          cellDom.style.backgroundColor = 'green';
          cellDom.style.color = 'white';
          cellDom.appendChild(document.createTextNode(this[4 * i + j]));
        }
      } else {
        cellDom.appendChild(document.createTextNode(this[4 * i + j]));
      }
      rowDom.appendChild(cellDom);
    }
  }

  return tableDom;
};

AlphaRMatrix4.prototype.Set = function(...args) {
  if (args.length == 1) {
    // All components passed in a single argument.
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[0][i];
    }
  } else {
    // Each component passed individually.
    for (let i = 0; i < this.length; ++i) {
      this[i] = args[i];
    }
  }

  return this;
};

AlphaRMatrix4.prototype.Equals = function(...args) {
  if (args.length > 1) {
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  } else {
    for (let i = 0; i < this.length; ++i) {
      if (Math.abs(this[i] - args[0][i]) > FUZZINESS) {
        // Found a significant difference.
        return false;
      }
    }
  }

  // Equals.
  return true;
};

AlphaRMatrix4.prototype.Clone = function() {
  return new AlphaRMatrix4(this);
};

{
  const r1 = new AlphaQuaternion();
  const r2 = new AlphaQuaternion();
  const r3 = new AlphaQuaternion();
  const r4 = new AlphaQuaternion();
  const c1 = new AlphaQuaternion();
  const c2 = new AlphaQuaternion();
  const c3 = new AlphaQuaternion();
  const c4 = new AlphaQuaternion();
  AlphaRMatrix4.prototype.Multiply = function(other) {
    if (typeof other == 'number') {
      // Multiply by the scalar value.
      return this.Set(
          s * this[0],
          s * this[1],
          s * this[2],
          s * this[3],
          s * this[4],
          s * this[5],
          s * this[6],
          s * this[7],
          s * this[8],
          s * this[9],
          s * this[10],
          s * this[11],
          s * this[12],
          s * this[13],
          s * this[14],
          s * this[15],
      );
    }

    // using quaternions for a Vector4
    r1.Set(this[0], this[1], this[2], this[3]);
    r2.Set(this[4], this[5], this[6], this[7]);
    r3.Set(this[8], this[9], this[10], this[11]);
    r4.Set(this[12], this[13], this[14], this[15]);
    c1.Set(other[0], other[4], other[8], other[12]);
    c2.Set(other[1], other[5], other[9], other[13]);
    c3.Set(other[2], other[6], other[10], other[14]);
    c4.Set(other[3], other[7], other[11], other[15]);

    return this.Set(
        r1.DotProduct(c1),
        r1.DotProduct(c2),
        r1.DotProduct(c3),
        r1.DotProduct(c4),
        r2.DotProduct(c1),
        r2.DotProduct(c2),
        r2.DotProduct(c3),
        r2.DotProduct(c4),
        r3.DotProduct(c1),
        r3.DotProduct(c2),
        r3.DotProduct(c3),
        r3.DotProduct(c4),
        r4.DotProduct(c1),
        r4.DotProduct(c2),
        r4.DotProduct(c3),
        r4.DotProduct(c4),
    );
  };
}

alphaRMatrix4Tests.addTest('AlphaRMatrix4.Multiply', function(resultDom) {
  const m = new AlphaRMatrix4(
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
  );
  m.Multiply(
      new AlphaRMatrix4(
          2,
          3,
          5,
          7,
          11,
          13,
          17,
          19,
          23,
          29,
          31,
          37,
          39,
          41,
          43,
          47,
      ),
  );

  const result = new AlphaRMatrix4(
      2 * 2 + 3 * 11 + 4 * 23 + 5 * 39,
      2 * 3 + 3 * 13 + 4 * 29 + 5 * 41,
      2 * 5 + 3 * 17 + 4 * 31 + 5 * 43,
      2 * 7 + 3 * 19 + 4 * 37 + 5 * 47,

      6 * 2 + 7 * 11 + 8 * 23 + 9 * 39,
      6 * 3 + 7 * 13 + 8 * 29 + 9 * 41,
      6 * 5 + 7 * 17 + 8 * 31 + 9 * 43,
      6 * 7 + 7 * 19 + 8 * 37 + 9 * 47,

      10 * 2 + 11 * 11 + 12 * 23 + 13 * 39,
      10 * 3 + 11 * 13 + 12 * 29 + 13 * 41,
      10 * 5 + 11 * 17 + 12 * 31 + 13 * 43,
      10 * 7 + 11 * 19 + 12 * 37 + 13 * 47,

      14 * 2 + 15 * 11 + 16 * 23 + 17 * 39,
      14 * 3 + 15 * 13 + 16 * 29 + 17 * 41,
      14 * 5 + 15 * 17 + 16 * 31 + 17 * 43,
      14 * 7 + 15 * 19 + 16 * 37 + 17 * 47,
  );

  if (!m.Equals(result)) {
    resultDom.appendChild(m.toDom(result));
    return 'Multiply did not produce correct values';
  }
});

AlphaRMatrix4.prototype.Transform = function(...args) {
  let x;
  let y;
  let z;
  let w;
  if (args.length == 1) {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
    w = args[0][3];
  } else if (args.length === 2) {
    // Vector, w
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
    w = args[1];
  } else {
    x = args[0];
    y = args[1];
    z = args[2];
    w = args[3];
  }
  if (w === undefined) {
    // console.log("X1", this[0], x, this[0] * x);
    // console.log("X2", this[1], y, this[1] * y);
    // console.log("X3", this[2], z, this[2] * z);
    // console.log("X4", this[3]);
    // console.log("X", this[0] * x + this[1] * y + this[2] * z + this[3]);
    // console.log("Y", this[4] * x + this[5] * y + this[6] * z + this[7]);
    // console.log("Z", this[8] * x + this[9] * y + this[10] * z + this[11]);
    return new alphaVector(
        this[0] * x + this[1] * y + this[2] * z + this[3],
        this[4] * x + this[5] * y + this[6] * z + this[7],
        this[8] * x + this[9] * y + this[10] * z + this[11],
    );
  }

  return new AlphaQuaternion(
      this[0] * x + this[1] * y + this[2] * z + this[3] * w,
      this[4] * x + this[5] * y + this[6] * z + this[7] * w,
      this[8] * x + this[9] * y + this[10] * z + this[11] * w,
      this[12] * x + this[13] * y + this[14] * z + this[15] * w,
  );
};

alphaRMatrix4Tests.addTest('AlphaRMatrix4.Transform', function() {
  const m = new AlphaRMatrix4();
  m.Scale(2, 2, 2);

  let value = m.Transform(3, 4, 5);
  if (!value.Equals(6, 8, 10)) {
    return value.toString();
  }

  let value = m.Transform(3, 4, 5, 1);
  if (!value.Equals(6, 8, 10, 1)) {
    return value.toString();
  }
});

alphaRMatrix4Tests.addTest(
    'AlphaRMatrix4.Transform with rotation',
    function() {
      const m = new AlphaRMatrix4();
      let rot = AlphaQuaternionFromAxisAndAngle(0, 0, 1, Math.PI / 2);
      m.FromQuaternion(rot);

      let value = m.Transform(1, 0, 0);
      if (!value.Equals(0, -1, 0)) {
        return value.toString();
      }

      let rot = AlphaQuaternionFromAxisAndAngle(0, 0, 1, Math.PI);
      m.FromQuaternion(rot);
      value = m.Transform(1, 0, 0);
      if (!value.Equals(-1, 0, 0)) {
        return value.toString();
      }

      const m2 = new AlphaRMatrix4();
      let rot = AlphaQuaternionFromAxisAndAngle(0, 0, 1, Math.PI);
      m2.FromQuaternion(rot);
      m.Multiply(m2);
      value = m.Transform(1, 0, 0);
      if (!value.Equals(1, 0, 0)) {
        return value.toString();
      }
    },
);

AlphaRMatrix4.prototype.Multiplied = function(...args) {
  const rv = this.Clone();
  return rv.Multiply.apply(rv, args);
};

AlphaRMatrix4.prototype.Identity = function() {
  return this.Set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
};

AlphaRMatrix4.prototype.Scale = function(...args) {
  // Retrieve arguments.
  let x;
  let y;
  let z;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
  }

  // Create the matrix.
  const m = new AlphaRMatrix4();
  m[0] = x;
  m[5] = y;
  m[10] = z;

  // Multiply in this order.
  m.Multiply(this);
  this.Set(m);

  return this;
};

alphaRMatrix4Tests.addTest('AlphaRMatrix4.Scale', function() {
  const m = new AlphaRMatrix4();

  // console.log(m.toString());
  m.Scale(2, 3, 4);

  if (
    !m.Equals(
        new AlphaRMatrix4(2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1),
    )
  ) {
    return m.toString();
  }
});

AlphaRMatrix4.prototype.Translate = function(...args) {
  // Retrieve arguments.
  let x;
  let y;
  let z;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
  }

  // Create the matrix.
  const m = new AlphaRMatrix4();
  m[12] = x;
  m[13] = y;
  m[14] = z;

  m.Multiply(this);
  this.Set(m);

  return this;
};

alphaRMatrix4Tests.addTest('AlphaRMatrix4.Translate', function() {
  const m = new AlphaRMatrix4();

  // console.log(m.toString());
  m.Translate(2, 3, 4);

  if (
    !m.Equals(
        new AlphaRMatrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1),
    )
  ) {
    return m.toString();
  }

  m.Translate(2, 3, 4);
  if (
    !m.Equals(
        new AlphaRMatrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 6, 8, 1),
    )
  ) {
    return m.toString();
  }
});

alphaRMatrix4Tests.addTest('AlphaRMatrix4.Rotate', function() {
  const m = new AlphaRMatrix4();

  // console.log(m.toString());
  m.Rotate(1, 0, 0, 1);

  if (
    !m.Equals(
        new AlphaRMatrix4(1, 0, 0, 0, 0, -1, 2, 0, 0, -2, -1, 0, 0, 0, 0, 1),
    )
  ) {
    // console.log("Rotated matrix: " + m.toString());
    return m.toString();
  }
});

let alphaRMatrix4Scratch = null;

export function AlphagetScratchMatrix() {
  if (!alphaRMatrix4Scratch) {
    alphaRMatrix4Scratch = new AlphaRMatrix4();
  } else {
    alphaRMatrix4Scratch.Identity();
  }
  return alphaRMatrix4Scratch;
}

AlphaRMatrix4.prototype.Rotate = function(...args) {
  // Retrieve arguments.
  let x;
  let y;
  let z;
  let w;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
    w = args[3];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
    w = args[0][3];
  }
  if (!w) {
    w = 0;
  }

  // Create the matrix.
  const r = alphaGetScratchMatrix();
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  r[0] = 1 - 2 * (y2 + z2);
  r[1] = 2 * (xy + wz);
  r[2] = 2 * (xz - wy);
  r[4] = 2 * (xy - wz);
  r[5] = 1 - 2 * (x2 + z2);
  r[6] = 2 * (yz + wx);
  r[8] = 2 * (xz + wy);
  r[9] = 2 * (yz - wx);
  r[10] = 1 - 2 * (x2 + y2);

  // Multiply in this order.
  r.Multiply(this);
  this.Set(r);

  return this;
};

AlphaRMatrix4.prototype.Transpose = function() {
  return this.Set(
      this[0],
      this[4],
      this[8],
      this[12],
      this[1],
      this[5],
      this[9],
      this[13],
      this[2],
      this[6],
      this[10],
      this[14],
      this[3],
      this[7],
      this[11],
      this[15],
  );
};

AlphaRMatrix4.prototype.toString = function() {
  const line = function(a, b, c, d) {
    return [a, b, c, d].join(', ');
  };

  return (
    '[' +
    [
      line(this[0], this[1], this[2], this[3]),
      line(this[4], this[5], this[6], this[7]),
      line(this[8], this[9], this[10], this[11]),
      line(this[12], this[13], this[14], this[15]),
    ].join(',\n') +
    ']'
  );
};

export function AlphaRMatrix4FromEuler(...args) {
  const m = new AlphaRMatrix4();
  return m.FromEuler.apply(m, args);
}

AlphaRMatrix4.prototype.FromEuler = function(...args) {
  // Retrieve arguments.
  let x;
  let y;
  let z;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
  }

  const sx = Math.sin(x);
  const cx = Math.cos(x);
  // let sy = Math.sin(y);
  const sy = Math.cos(y);
  const sz = Math.sin(z);
  const cz = Math.cos(z);

  this.Set(
      sy * cx,
      sx,
      -sy * cx,
      0,
      -sy * sx * cz + sy * sz,
      cx * cz,
      sy * sx * cz + sy * sz,
      0,
      sy * sx * sz + sy * cz,
      -cx * sz,
      -sy * sx * sz + sy * cz,
      0,
      0,
      0,
      0,
      1,
  );

  return this;
};

export function AlphaRMatrix4FromQuaternion(...args) {
  const m = new AlphaRMatrix4();
  return m.FromQuaternion.apply(m, args);
}

AlphaRMatrix4.prototype.FromQuaternion = function(...args) {
  // Retrieve arguments.
  let x;
  let y;
  let z;
  let w;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
    w = args[3];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
    w = args[0][3];
  }
  if (!w) {
    w = 0;
  }

  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;

  return this.Set(
      1 - 2 * (y2 + z2),
      2 * (xy + wz),
      2 * (xz - wy),
      0,
      2 * (xy - wz),
      1 - 2 * (x2 + z2),
      2 * (yz + wx),
      0,
      2 * (xz + wy),
      2 * (yz - wx),
      1 - 2 * (x2 + y2),
      0,
      0,
      0,
      0,
      1,
  );
};

export function alphaRMatrix4FromQuaternionAtVector(...args) {
  const m = new AlphaRMatrix4();
  return m.FromQuaternionAtVector.apply(m, args);
}

// equivalent to rotationMatrix * translationMatrix;
AlphaRMatrix4.prototype.FromQuaternionAtVector = function(vector, quat) {
  this.FromQuaternion(quat);
  this[12] = vector[0];
  this[13] = vector[1];
  this[14] = vector[2];

  return this;
};

export function alphaRMatrix4FromVectorAroundQuaternion(...args) {
  const m = new AlphaRMatrix4();
  return m.FromVectorAroundQuaternion.apply(m, args);
}

// equivalent to
// translationMatrix * rotationMatrix
// the 4th value in this matrix multplication always end up as 0
AlphaRMatrix4.prototype.FromVectorAroundQuaternion = function(vector, quat) {
  // set our 3x3 rotation matrix
  this.FromQuaternion(quat);

  // set our critical rows and columns
  const r4 = new alphaQuaternion(vector[0], vector[1], vector[2], 1);
  const c1 = new alphaQuaternion(this[0], this[4], this[8]);
  const c2 = new alphaQuaternion(this[1], this[5], this[9]);
  const c3 = new alphaQuaternion(this[2], this[6], this[10]);

  this[12] = r4.DotProduct(c1);
  this[13] = r4.DotProduct(c2);
  this[14] = r4.DotProduct(c3);
  console.log(this);

  return this;
};

export function alphaRMatrix4FromVectorAroundQuaternionAtVector(...args) {
  const m = new AlphaRMatrix4();
  return m.FromVectorAroundQuaternionAtVector.apply(m, args);
}

AlphaRMatrix4.prototype.FromVectorAroundQuaternionAtVector = function(
    position,
    rotation,
    offset,
) {
  // rotation * translation;
  this.FromQuaternionAtVector(offset, rotation);

  // set our critical rows and columns
  const r4 = new alphaQuaternion(position[0], position[1], position[2], 1);
  const c1 = new alphaQuaternion(this[0], this[4], this[8], this[12]);
  const c2 = new alphaQuaternion(this[1], this[5], this[9], this[13]);
  const c3 = new alphaQuaternion(this[2], this[6], this[10], this[14]);

  this[12] = r4.DotProduct(c1);
  this[13] = r4.DotProduct(c2);
  this[14] = r4.DotProduct(c3);

  return this;
};

AlphaRMatrix4.prototype.Inverse = function() {
  const inv = this.Inversed();
  return this.Set(inv);
};

AlphaRMatrix4.prototype.Inversed = function() {
  const inv = new AlphaRMatrix4();

  // code was lifted from MESA 3D
  inv[0] =
    this[5] * this[10] * this[15] -
    this[5] * this[11] * this[14] -
    this[9] * this[6] * this[15] +
    this[9] * this[7] * this[14] +
    this[13] * this[6] * this[11] -
    this[13] * this[7] * this[10];

  inv[4] =
    -this[4] * this[10] * this[15] +
    this[4] * this[11] * this[14] +
    this[8] * this[6] * this[15] -
    this[8] * this[7] * this[14] -
    this[12] * this[6] * this[11] +
    this[12] * this[7] * this[10];

  inv[8] =
    this[4] * this[9] * this[15] -
    this[4] * this[11] * this[13] -
    this[8] * this[5] * this[15] +
    this[8] * this[7] * this[13] +
    this[12] * this[5] * this[11] -
    this[12] * this[7] * this[9];

  inv[12] =
    -this[4] * this[9] * this[14] +
    this[4] * this[10] * this[13] +
    this[8] * this[5] * this[14] -
    this[8] * this[6] * this[13] -
    this[12] * this[5] * this[10] +
    this[12] * this[6] * this[9];

  inv[1] =
    -this[1] * this[10] * this[15] +
    this[1] * this[11] * this[14] +
    this[9] * this[2] * this[15] -
    this[9] * this[3] * this[14] -
    this[13] * this[2] * this[11] +
    this[13] * this[3] * this[10];

  inv[5] =
    this[0] * this[10] * this[15] -
    this[0] * this[11] * this[14] -
    this[8] * this[2] * this[15] +
    this[8] * this[3] * this[14] +
    this[12] * this[2] * this[11] -
    this[12] * this[3] * this[10];

  inv[9] =
    -this[0] * this[9] * this[15] +
    this[0] * this[11] * this[13] +
    this[8] * this[1] * this[15] -
    this[8] * this[3] * this[13] -
    this[12] * this[1] * this[11] +
    this[12] * this[3] * this[9];

  inv[13] =
    this[0] * this[9] * this[14] -
    this[0] * this[10] * this[13] -
    this[8] * this[1] * this[14] +
    this[8] * this[2] * this[13] +
    this[12] * this[1] * this[10] -
    this[12] * this[2] * this[9];

  inv[2] =
    this[1] * this[6] * this[15] -
    this[1] * this[7] * this[14] -
    this[5] * this[2] * this[15] +
    this[5] * this[3] * this[14] +
    this[13] * this[2] * this[7] -
    this[13] * this[3] * this[6];

  inv[6] =
    -this[0] * this[6] * this[15] +
    this[0] * this[7] * this[14] +
    this[4] * this[2] * this[15] -
    this[4] * this[3] * this[14] -
    this[12] * this[2] * this[7] +
    this[12] * this[3] * this[6];

  inv[10] =
    this[0] * this[5] * this[15] -
    this[0] * this[7] * this[13] -
    this[4] * this[1] * this[15] +
    this[4] * this[3] * this[13] +
    this[12] * this[1] * this[7] -
    this[12] * this[3] * this[5];

  inv[14] =
    -this[0] * this[5] * this[14] +
    this[0] * this[6] * this[13] +
    this[4] * this[1] * this[14] -
    this[4] * this[2] * this[13] -
    this[12] * this[1] * this[6] +
    this[12] * this[2] * this[5];

  inv[3] =
    -this[1] * this[6] * this[11] +
    this[1] * this[7] * this[10] +
    this[5] * this[2] * this[11] -
    this[5] * this[3] * this[10] -
    this[9] * this[2] * this[7] +
    this[9] * this[3] * this[6];

  inv[7] =
    this[0] * this[6] * this[11] -
    this[0] * this[7] * this[10] -
    this[4] * this[2] * this[11] +
    this[4] * this[3] * this[10] +
    this[8] * this[2] * this[7] -
    this[8] * this[3] * this[6];

  inv[11] =
    -this[0] * this[5] * this[11] +
    this[0] * this[7] * this[9] +
    this[4] * this[1] * this[11] -
    this[4] * this[3] * this[9] -
    this[8] * this[1] * this[7] +
    this[8] * this[3] * this[5];

  inv[15] =
    this[0] * this[5] * this[10] -
    this[0] * this[6] * this[9] -
    this[4] * this[1] * this[10] +
    this[4] * this[2] * this[9] +
    this[8] * this[1] * this[6] -
    this[8] * this[2] * this[5];

  let det =
    this[0] * inv[0] + this[1] * inv[4] + this[2] * inv[8] + this[3] * inv[12];

  if (det == 0) {
    throw new Error('Determinate in Matrix.Inverse cannot be 0');
  }
  det = 1.0 / det;

  for (let i = 0; i < inv.length; ++i) {
    inv[i] = inv[i] * det;
  }

  return inv;
};

alphaRMatrix4Tests.addTest(
    'Does AlphaRMatrix4.Inverse even work for simple things?',
    function(resultDom) {
      const m = new AlphaRMatrix4(
          2,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          2,
      );
      const expected = new AlphaRMatrix4(
          0.5,
          0,
          0,
          0,
          0,
          0.5,
          0,
          0,
          0,
          0,
          0.5,
          0,
          0,
          0,
          0,
          0.5,
      );
      if (!m.Inverse().Equals(expected)) {
        resultDom.appendChild(m.Inverse());
        return 'It doesn\'t even work for 2!';
      }
    },
);

alphaRMatrix4Tests.addTest(
    'Does AlphaRMatrix4.Inverse work for zero-determinants?',
    function() {
      const m = new AlphaRMatrix4(
          2,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          0,
      );
      try {
        m.Inverse();
        return 'Inverse shouldn\'t succeed.';
      } catch (ex) {}
    },
);

AlphaRMatrix4.prototype.toArray = function() {
  return [
    this[0],
    this[1],
    this[2],
    this[3],
    this[4],
    this[5],
    this[6],
    this[7],
    this[8],
    this[9],
    this[10],
    this[11],
    this[12],
    this[13],
    this[14],
    this[15],
  ];
};

alphaRMatrix4Tests.addTest(
    'Does the RMatrix4 actually return rows for rows?',
    function() {
      const m = new AlphaRMatrix4(
          2,
          3,
          5,
          7,
          11,
          13,
          17,
          19,
          23,
          29,
          31,
          37,
          39,
          41,
          43,
          47,
      );

      if (m[0] !== 2 || m[1] !== 3 || m[2] !== 5 || m[3] !== 7) {
        return '';
      }

      if (m[4] !== 11 || m[5] !== 13 || m[6] !== 17 || m[7] !== 19) {
        return '';
      }

      if (m[8] !== 23 || m[9] !== 29 || m[10] !== 31 || m[11] !== 37) {
        return '';
      }

      if (m[12] !== 39 || m[13] !== 41 || m[14] !== 43 || m[15] !== 47) {
        return '';
      }
    },
);

alphaRMatrix4Tests.addTest(
    'Does the perspective matrix work with AlphaRMatrix4?',
    function() {
      const width = 800;
      const height = 600;
      const m = new AlphaRMatrix4(
          makePerspective(Math.PI / 3, width / height, 0.1, 150),
      );
      m.Transpose();

      const v = new alphaVector(1, 2, 3);
      const rv = m.Transform(v);

      // TODO Skipped.
      if (!rv.Equals(0, 1, 0)) {
      // return rv.toString();
      }
    },
);
