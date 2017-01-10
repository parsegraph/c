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

function alpha_random(min, max)
{
    return min + Math.round(Math.random() * (max - min));
};

//----------------------------------------------
//----------------------------------------------
//-----------      VECTORS     -----------------
//----------------------------------------------
//----------------------------------------------

/**
 * Represents a mathematical vector with 3 components.
 *
 * The constructor calls alpha_Vector.Set with the provided arguments.
 *
 * @constructor
 */
function alpha_Vector()
{
    this[0] = 0;
    this[1] = 0;
    this[2] = 0;
    this.length = 3;

    if(arguments.length > 0) {
        this.Set.apply(this, arguments);
    }
}

/**
 * Adds the given vector to this vector.
 *
 * The vector may be given component-wise.
 */
alpha_Vector.prototype.Add = function()
{
    if(arguments.length > 1) {
        this[0] += arguments[0];
        this[1] += arguments[1];
        this[2] += arguments[2];
    }
    else {
        this[0] += arguments[0][0];
        this[1] += arguments[0][1];
        this[2] += arguments[0][2];
    }
    return this;
}

/**
 * Creates a clone of this Vector and adds the given vector to it.
 */
alpha_Vector.prototype.Added = function()
{
    var rv = this.Clone();
    return rv.Add.apply(rv, arguments);
}

/**
 * Copies each component into a new vector and returns it.
 */
alpha_Vector.prototype.Clone = function()
{
    return new alpha_Vector(this);
}

/**
 * Multiplies in-place this vector by the given vector.
 *
 * The vector may be given component-wise.
 */
alpha_Vector.prototype.Multiply = function()
{
    if(arguments.length > 1) {
        this[0] *= arguments[0];
        this[1] *= arguments[1];
        this[2] *= arguments[2];
    }
    else if(typeof arguments[0] == "number") {
        this[0] *= arguments[0];
        this[1] *= arguments[0];
        this[2] *= arguments[0];
    }
    else {
        this[0] *= arguments[0][0];
        this[1] *= arguments[0][1];
        this[2] *= arguments[0][2];
    }
    return this;
}

alpha_Vector.prototype.Multiplied = function()
{
    var rv = this.Clone();
    return rv.Multiply.apply(rv, arguments);
}

alpha_Vector.prototype.Divide = function()
{
    if(arguments.length > 1) {
        this[0] /= arguments[0];
        this[1] /= arguments[1];
        this[2] /= arguments[2];
    }
    else if(typeof arguments[0] == "number") {
        this[0] /= arguments[0];
        this[1] /= arguments[0];
        this[2] /= arguments[0];
    }
    else {
        this[0] /= arguments[0][0];
        this[1] /= arguments[0][1];
        this[2] /= arguments[0][2];
    }
    return this;
}

alpha_Vector.prototype.Divided = function()
{
    var rv = this.Clone();
    return rv.Divide.apply(rv, arguments);
}

alpha_Vector.prototype.Equals = function()
{
    var fuzziness = 1e-10;
    if(arguments.length > 1) {
        // .Equals(x, y, z)
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        // .Equals(new alpha_Vector(x, y, z));
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }

    // Equals.
    return true;
}

alpha_Vector.prototype.Set = function()
{
    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[i];
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[0][i];
        }
    }
    if(typeof this[0] != "number") {
        throw new Error("All components must be numbers");
    }
    if(typeof this[1] != "number") {
        throw new Error("All components must be numbers");
    }
    if(typeof this[2] != "number") {
        throw new Error("All components must be numbers");
    }
    return this;
}

alpha_Vector.prototype.Normalize = function()
{
    var x = this[0];
    var y = this[1];
    var z = this[2];

    var magnitude = this.Magnitude();
    if(magnitude != 0) {
        this.Divide(magnitude);
    }

    return this;
}

alpha_Vector.prototype.Normalized = function()
{
    return this.Clone().Normalize();
}

alpha_Vector.prototype.Magnitude = function()
{
    return Math.sqrt(this.DotProduct(this));
}
alpha_Vector.prototype.Length = alpha_Vector.prototype.Magnitude;

alpha_Vector.prototype.DotProduct = function(other)
{
    return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
}
alpha_Vector.prototype.InnerProduct = alpha_Vector.prototype.DotProduct;
alpha_Vector.prototype.ScalarProduct = alpha_Vector.prototype.DotProduct;

alpha_Vector.prototype.AngleBetween = function(other)
{
    var dot = this.DotProduct(other);
    return Math.acos(dot / (this.Magnitude() * other.Magnitude()));
}

alpha_Vector.prototype.toString = function()
{
    if(typeof this[0] != "number") {
        throw new Error("All components must be numbers");
    }
    if(typeof this[1] != "number") {
        throw new Error("All components must be numbers");
    }
    if(typeof this[2] != "number") {
        throw new Error("All components must be numbers");
    }
    return "[" + this[0] + ", " + this[1] + ", " + this[2] + "]";
};

alpha_Vector_Tests = new parsegraph_TestSuite("alpha_Vector");
parsegraph_AllTests.addTest(alpha_Vector_Tests);

alpha_Vector_Tests.addTest("alpha_Vector.<constructor>", function() {
    var v = new alpha_Vector(1, 2, 3);
    if(v[0] != 1 || v[1] != 2 || v[2] != 3) {
        return "Constructor must accept arguments.";
    }
});

alpha_Vector_Tests.addTest("alpha_Vector.Magnitude", function() {
    var v = new alpha_Vector();
    if(v.Magnitude() != 0) {
        return "Empty vector must have zero magnitude.";
    }

    v = new alpha_Vector(1, 0, 0);
    if(v.Magnitude() != 1) {
        return "Vector magnitude does not match.";
    }

    v = new alpha_Vector(3, 4, 0);
    if(v.Magnitude() != 5) {
        return "Vector magnitude does not match.";
    }
});

alpha_Vector_Tests.addTest("alpha_Vector.DotProduct", function() {
    var a = new alpha_Vector(1, 0, 0);
    var b = new alpha_Vector(0, 1, 0);
    if(a.DotProduct(b)) {
        return "Orthogonal vectors must have zero dot product";
    }
});

alpha_Vector_Tests.addTest("alpha_Vector.Normalize", function() {
    var a = new alpha_Vector(3, 4, 0);
    a.Normalize();
    if(a.Length() != 1) {
        return "Normalize must create a vector of length one.";
    }
});

alpha_Vector_Tests.addTest("alpha_Vector.Add", function() {
    var a = new alpha_Vector(3, 4, 0);

    a.Add(new alpha_Vector(1, 2, 3));
    if(!a.Equals(4, 6, 3)) {
        return "Add must add component-wise";
    }
});

//----------------------------------------------
//----------------------------------------------
//-----------     QUATERNIONS  -----------------
//----------------------------------------------
//----------------------------------------------

/**
 * Represents a quaternion, a 4-component vector with special operations.
 *
 * @constructor
 */
function alpha_Quaternion()
{
    this[0] = 0;
    this[1] = 0;
    this[2] = 0;
    this[3] = 1;
    this.length = 4;

    if(arguments.length > 0) {
        this.Set.apply(this, arguments);
    }
}

alpha_Quaternion_Tests = new parsegraph_TestSuite("alpha_Quaternion");
parsegraph_AllTests.addTest(alpha_Quaternion_Tests);

alpha_Quaternion.prototype.Clone = function()
{
    return new alpha_Quaternion(this);
}

alpha_Quaternion.prototype.Multiply = function()
{
    if(arguments.length == 1 && typeof arguments[0] === "number") {
        this[0] *= arguments[0];
        this[1] *= arguments[0];
        this[2] *= arguments[0];
        this[3] *= arguments[0];
        return;
    }
    // q = a * b
    var aw = this[3];
    var ax = this[0];
    var ay = this[1];
    var az = this[2];

    var bw, bx, by, bz;
    if(arguments.length > 1) {
        bw = arguments[3];
        bx = arguments[0];
        by = arguments[1];
        bz = arguments[2];
    }
    else {
        bw = arguments[0][3];
        bx = arguments[0][0];
        by = arguments[0][1];
        bz = arguments[0][2];
    }

    this[0] = (aw * bx + ax * bw + ay * bz - az * by);
    this[1] = (aw * by - ax * bz + ay * bw + az * bx);
    this[2] = (aw * bz + ax * by - ay * bx + az * bw);
    this[3] = (aw * bw - ax * bx - ay * by - az * bz);

    return this;
}

alpha_Quaternion.prototype.Multiplied = function()
{
    var rv = this.Clone();
    return rv.Multiply.apply(rv, arguments);
}

// really this could use a few tweaks
// negatives can be the same rotation
// (different paths)
alpha_Quaternion.prototype.Equals = function(other)
{
    var fuzziness = 1e-10;
    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }

    // Equals.
    return true;
}

alpha_Quaternion.prototype.Magnitude = function()
{
    var w = this[3];
    var x = this[0];
    var y = this[1];
    var z = this[2];
    return Math.sqrt(w*w + x*x + y*y + z*z);
}
alpha_Quaternion.prototype.Length = alpha_Quaternion.prototype.Magnitude;
alpha_Quaternion.prototype.Norm = alpha_Quaternion.prototype.Magnitude;

alpha_Quaternion.prototype.Normalize = function()
{
    var magnitude = this.Magnitude();
    if(magnitude != 0) {
        this.Multiply(1 / magnitude);
    }
    return this;
}

alpha_Quaternion_Tests.addTest("alpha_Quaternion.Normalize", function(resultDom) {
    var q = new alpha_Quaternion();
    q.Normalize();
    if(!q.Equals(new alpha_Quaternion())) {
        console.log(q.toString());
        return q;
    }
});

alpha_Quaternion.prototype.Set = function()
{
    var w = this[3];

    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[i];
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[0][i];
        }
    }

    if(this[3] === undefined) {
        this[3] = w;
    }
    return this;
};

/**
 * Returns a new quaternion that represents the conjugate of this quaternion.
 */
alpha_Quaternion.prototype.Conjugate = function()
{
    return new alpha_Quaternion(
        -this[0],
        -this[1],
        -this[2],
        this[3]
    );
};

alpha_Quaternion.prototype.Inverse = function()
{
    // actual inverse is q.Conjugate() / Math.pow(Math.abs(q.Magnitude()), 2)
    // but as we only deal with unit quaternions we can just force a normalization
    // q.Conjugate() / 1 == q.Conjugate();

    this.Normalize();
    return this.Conjugate();
};

alpha_Quaternion.prototype.ToAxisAndAngle = function()
{
    var w = this[3];
    var x = this[0];
    var y = this[1];
    var z = this[2];
    if(w > 1) {
        this.Normalize();
    }

    var angle = 2 * Math.acos(w);
    var s = Math.sqrt(1 - w*w);

    if(s > .001) {
        x = x / s;
        y = x / s;
        z = x / s;
    }
    return [new alpha_Vector(x, y, z), angle];
};

function alpha_QuaternionFromAxisAndAngle()
{
    var quat = new alpha_Quaternion(0, 0, 0, 1);
    return quat.FromAxisAndAngle.apply(quat, arguments);
}

alpha_Quaternion.prototype.FromAxisAndAngle = function()
{
    var x, y, z, angle;
    var axis = new alpha_Vector();
    if(arguments.length == 2) {
        // passed as ({vector}, angle)
        // creates or copies the vector or Vector
        axis.Set(arguments[0][0], arguments[0][1], arguments[0][2]);
        angle = arguments[1];
    }
    else  {
        // passed as ( x, y, z, angle) -- (rough check)
        axis.Set(arguments[0], arguments[1], arguments[2]);
        angle = arguments[3];
    }

    axis.Normalize();
    angle = angle / 2;
    var sinangle = Math.sin(angle);
    // accessing an vector by [X] will not be correct
    this.x = ( axis[0] * sinangle );
    this.y = ( axis[1] * sinangle );
    this.z = ( axis[2] * sinangle );
    this.w = ( Math.cos(angle) );

    return this;
}

alpha_Quaternion.prototype.DotProduct = function(other)
{
    var rv = 0;
    for(var i = 0; i < this.length; ++i) {
        rv += this[i] * other[i];
    }
    return rv;
}
alpha_Quaternion.prototype.ScalarProduct = alpha_Quaternion.prototype.DotProduct;
alpha_Quaternion.prototype.InnerProduct = alpha_Quaternion.prototype.DotProduct;

// v' = qr * v * qr-1
// vector3 = (q * quaternion( vector, 0 ) * q:conjugate() ).Vector();
// this is one of the most heavily used and slowest functions
// so its been optimized to hell and back
// a more normal, and decently optimized version is found next
// this version is about 2x faster than RotatedVector2
alpha_Quaternion.prototype.RotatedVector = function()
{
    var x, y, z;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
    }

    // vector to quat
    var a = new alpha_Quaternion(x, y, z, 0);
    var b = this.Conjugate();

    // var r = this * v * conjugate;
    // var q = v * c;
    var aw = 0;
    var ax = a[0];
    var ay = a[1]
    var az = a[2];

    var bw = b[3];
    var bx = b[0];
    var by = b[1];
    var bz = b[2];
    // removed all the mults by aw, which would result in 0;

    var q = new alpha_Quaternion(
        ax * bw + ay * bz - az * by,
        -ax * bz + ay * bw + az * bx,
        ax * by - ay * bx + az * bw,
        -ax * bx - ay * by - az * bz
    );
    /*
    var q = [
        (aw * bx + ax * bw + ay * bz - az * by),
        (aw * by - ax * bz + ay * bw + az * bx),
        (aw * bz + ax * by - ay * bx + az * bw),
        (aw * bw - ax * bx - ay * by - az * bz)
    ];
    */

    // var r = this.Multiplied(q);

    var a = this;
    var b = q;
    aw = a[3];
    ax = a[0];
    ay = a[1];
    az = a[2];

    bw = b[3];
    bx = b[0];
    by = b[1];
    bz = b[2];

    // and we strip the w component from this
    // which makes it a vector
    return new alpha_Vector(
        (aw * bx + ax * bw + ay * bz - az * by),
        (aw * by - ax * bz + ay * bw + az * bx),
        (aw * bz + ax * by - ay * bx + az * bw)
    );
};

// this is a decently optimized version; about twice as slow as version 1
alpha_Quaternion.prototype.RotatedVector2 = function(x, y, z)
{
    if(!z) {
        // {x,y,z}
        x = x[0];
        y = x[1];
        z = x[2];
    }
    var conjugate = this.Conjugate();
    var v = new alpha_Quaternion(x, y, z, 0);
    var r = this.Multiplied(v).Multiply(confugate);
    return new alpha_Vector(r[0], r[1], r[2]);
};

alpha_Quaternion.prototype.toString = function()
{
    return "{x: " + this[0] + " y: " + this[1] + " z: " + this[2] + " w: " + this[3] + "}";
};

alpha_Quaternion.prototype.AngleBetween = function(other)
{
    this.Normalize();
    other.Normalize();
    var dot = this.DotProduct(other);
    return 2 * Math.acos(dot / (this.Magnitude() * other.Magnitude()));
}

//----------------------------------------------
//----------------------------------------------
//-----------      MATRICES    -----------------
//----------------------------------------------
//----------------------------------------------

function alpha_Matrix()
{
    this.length = 16;
    if(arguments.length == 0) {
        this.Set(
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1
        );
    }
    else {
        this.Set.apply(this, arguments);
    }
};

alpha_Matrix_Tests = new parsegraph_TestSuite("alpha_Matrix");
parsegraph_AllTests.addTest(alpha_Matrix_Tests);

alpha_Matrix.prototype.Set = function()
{
    if(arguments.length == 1) {
        // All components passed in a single argument.
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[0][i];
        }
    }
    else {
        // Each component passed individually.
        for(var i = 0; i < this.length; ++i) {
            this[i] = arguments[i];
        }
    }

    return this;
};

alpha_Matrix.prototype.Equals = function()
{
    var fuzziness = 1e-10;
    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > fuzziness) {
                // Found a significant difference.
                return false;
            }
        }
    }

    // Equals.
    return true;
};

alpha_Matrix.prototype.Clone = function()
{
    return new alpha_Matrix(this);
};

alpha_Matrix.prototype.Multiply = function(other)
{
    if(typeof other == "number") {
        // Multiply by the scalar value.
        return this.Set(
            s*this[0], s*this[1], s*this[2], s*this[3],
            s*this[4], s*this[5], s*this[6], s*this[7],
            s*this[8], s*this[9], s*this[10], s*this[11],
            s*this[12], s*this[13], s*this[14], s*this[15]
        );
    }

    // using quaternions for a Vector4
    var r1 = new alpha_Quaternion(this[0], this[1], this[2], this[3]);
    var r2 = new alpha_Quaternion(this[4], this[5], this[6], this[7]);
    var r3 = new alpha_Quaternion(this[8], this[9], this[10], this[11]);
    var r4 = new alpha_Quaternion(this[12], this[13], this[14], this[15]);

    var c1 = new alpha_Quaternion(other[0], other[1], other[2], other[3]);
    var c2 = new alpha_Quaternion(other[4], other[5], other[6], other[7]);
    var c3 = new alpha_Quaternion(other[8], other[9], other[10], other[11]);
    var c4 = new alpha_Quaternion(other[12], other[13], other[14], other[15]);

    var dot = alpha_Quaternion.DotProduct;
    return this.Set(
        r1.DotProduct(c1), r1.DotProduct(c2), r1.DotProduct(c3), r1.DotProduct(c4),
        r2.DotProduct(c1), r2.DotProduct(c2), r2.DotProduct(c3), r2.DotProduct(c4),
        r3.DotProduct(c1), r3.DotProduct(c2), r3.DotProduct(c3), r3.DotProduct(c4),
        r4.DotProduct(c1), r4.DotProduct(c2), r4.DotProduct(c3), r4.DotProduct(c4)
    );
}

alpha_Matrix.prototype.Multiplied = function()
{
    var rv = this.Clone();
    return rv.Multiply.apply(rv, arguments);
};

alpha_Matrix.prototype.Identity = function()
{
    return this.Set(new alpha_Matrix());
};

alpha_Matrix.prototype.Scale = function()
{
    // Retrieve arguments.
    var x, y, z;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
    }

    // Create the matrix.
    var m = new alpha_Matrix();
    m[0] = x;
    m[5] = y;
    m[10] = z;

    // Multiply in this order.
    m.Multiply(this);
    this.Set(m);

    return this;
};

alpha_Matrix_Tests.addTest("alpha_Matrix.Scale", function(resultDom) {
    var m = new alpha_Matrix();

    //console.log(m.toString());
    m.Scale(2, 3, 4);

    if(!m.Equals(new alpha_Matrix(
        2, 0, 0, 0,
        0, 3, 0, 0,
        0, 0, 4, 0,
        0, 0, 0, 1
    ))) {
        return m.toString();
    }
});

alpha_Matrix.prototype.Translate = function()
{
    // Retrieve arguments.
    var x, y, z;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
    }

    // Create the matrix.
    var m = new alpha_Matrix();
    m[12] = x;
    m[13] = y;
    m[14] = z;

    m.Multiply(this);
    this.Set(m);

    return this;
};

alpha_Matrix_Tests.addTest("alpha_Matrix.Translate", function(resultDom) {
    var m = new alpha_Matrix();

    //console.log(m.toString());
    m.Translate(2, 3, 4);

    if(!m.Equals(new alpha_Matrix(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        2, 3, 4, 1
    ))) {
        //console.log("Translated matrix: " + m.toString());
        return m.toString();
    }
});

alpha_Matrix_Tests.addTest("alpha_Matrix.Rotate", function(resultDom) {
    var m = new alpha_Matrix();

    //console.log(m.toString());
    m.Rotate(1, 0, 0, 1);

    if(!m.Equals(new alpha_Matrix(
        [1, 0, 0, 0,
        0, -1, 2, 0,
        0, -2, -1, 0,
        0, 0, 0, 1]
    ))) {
        //console.log("Rotated matrix: " + m.toString());
        return m.toString();
    }
});

alpha_Matrix.prototype.Rotate = function()
{
    // Retrieve arguments.
    var x, y, z, w;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
        w = arguments[3];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
        w = arguments[0][3];
    }
    if(!w) {
        w = 0;
    }

    // Create the matrix.
    var r = new alpha_Matrix();
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var xy = x * y;
    var xz = x * z;
    var yz = y * z;
    var wx = w * x;
    var wy = w * y;
    var wz = w * z;
    r[0]  =  1 - 2 * (y2 + z2);
    r[1]  =  2 * (xy + wz);
    r[2]  =  2 * (xz - wy);
    r[4]  =  2 * (xy - wz);
    r[5]  =  1 - 2 * (x2 + z2);
    r[6]  =  2 * (yz + wx);
    r[8]  =  2 * (xz + wy);
    r[9] =  2 * (yz - wx);
    r[10] =  1 - 2 * (x2 + y2);

    // Multiply in this order.
    r.Multiply(this);
    this.Set(r);

    return this;
};

alpha_Matrix.prototype.Transpose = function()
{
    return this.Set(
        this[0], this[4], this[8], this[12],
        this[1], this[5], this[9], this[13],
        this[2], this[6], this[10], this[14],
        this[3], this[7], this[11], this[15]
    );
};

alpha_Matrix.prototype.toString = function()
{
    var line = function(a, b, c, d) {
        return [a, b, c, d].join(", ");
    };

    return "[" + [
        line(this[0], this[1], this[2], this[3]),
        line(this[4], this[5], this[6], this[7]),
        line(this[8], this[9], this[10], this[11]),
        line(this[12], this[13], this[14], this[15])
    ].join(",\n") + "]";
};

function alpha_MatrixFromEuler()
{
    var m = new alpha_Matrix();
    return m.FromEuler.apply(m, arguments);
};

/**
 * x = pitch, y = yaw, z = roll;
 * applied in YXZ order
 * if you are keeping track at home: Z * X * Y
 */
alpha_Matrix.prototype.FromEuler = function()
{
    // Retrieve arguments.
    var x, y, z;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
    }

    var sx = Math.sin(x);
    var cx = Math.cos(x);
    var sy = Math.sin(y);
    var sy = Math.cos(y);
    var sz = Math.sin(z);
    var cz = Math.cos(z);

    this.Set(
        sy * cx, sx, -sy * cx, 0,
        -sy*sx*cz + sy*sz, cx*cz, sy*sx*cz + sy*sz, 0,
        sy*sx*sz + sy*cz, -cx*sz, -sy*sx*sz + sy*cz, 0,
        0, 0, 0, 1
    );

    return this;
};

function alpha_MatrixFromQuaternion()
{
    var m = new alpha_Matrix();
    return m.FromQuaternion.apply(m, arguments);
};

alpha_Matrix.prototype.FromQuaternion = function()
{
    // Retrieve arguments.
    var x, y, z, w;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
        w = arguments[3];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
        w = arguments[0][3];
    }
    if(!w) {
        w = 0;
    }

    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var xy = x * y;
    var xz = x * z;
    var yz = y * z;
    var wx = w * x;
    var wy = w * y;
    var wz = w * z;

    return this.Set(
        1 - 2 * (y2 + z2), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (x2 + z2), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (x2 + y2), 0,
        0, 0, 0, 1
    );
};

function alpha_MatrixFromQuaternionAtVector()
{
    var m = new alpha_Matrix();
    return m.FromQuaternionAtVector.apply(m, arguments);
};

// equivalent to rotationMatrix * translationMatrix;
alpha_Matrix.prototype.FromQuaternionAtVector = function(vector, quat)
{
    this.FromQuaternion(quat);
    this[12] = vector[0];
    this[13] = vector[1];
    this[14] = vector[2];

    return this;
};

function alpha_MatrixFromVectorAroundQuaternion()
{
    var m = new alpha_Matrix();
    return m.FromVectorAroundQuaternion.apply(m, arguments);
};

// equivalent to
// translationMatrix * rotationMatrix
// the 4th value in this matrix multplication always end up as 0
alpha_Matrix.prototype.FromVectorAroundQuaternion = function(vector, quat)
{
    // set our 3x3 rotation matrix
    this.FromQuaternion(quat);

    // set our critical rows and columns
    var r4 = new alpha_Quaternion(vector[0], vector[1], vector[2], 1);
    var c1 = new alpha_Quaternion(this[0], this[4], this[8]);
    var c2 = new alpha_Quaternion(this[1], this[5], this[9]);
    var c3 = new alpha_Quaternion(this[2], this[6], this[10]);

    this[12] = r4.DotProduct(c1);
    this[13] = r4.DotProduct(c2);
    this[14] = r4.DotProduct(c3);

    return this;
};

function alpha_MatrixFromVectorAroundQuaternionAtVector()
{
    var m = new alpha_Matrix();
    return m.FromVectorAroundQuaternionAtVector.apply(m, arguments);
};

/**
 * translation * rotation * translation
 * TranslationMatrix(vec2) * rotationMatrix(quat) * translationMatrix(vec1)
 */
alpha_Matrix.prototype.FromVectorAroundQuaternionAtVector = function(vec1, quat, vec2)
{
    // rotation * translation;
    this.FromQuaternionAtVector(quat, vec2);

    // set our critical rows and columns
    var r4 = new alpha_Quaternion(vec1[0], vec1[1], vec1[2], 1);
    var c1 = new alpha_Quaternion(this[0], this[4], this[8], this[12]);
    var c2 = new alpha_Quaternion(this[1], this[5], this[9], this[13]);
    var c3 = new alpha_Quaternion(this[2], this[6], this[10], this[14]);

    this[12] = r4.DotProduct(c1);
    this[13] = r4.DotProduct(c2);
    this[14] = r4.DotProduct(c3);

    return this;
};

/**
 * Returns a new matrix equal to the inverse of this matrix.
 */
alpha_Matrix.prototype.Inverse = function()
{
  var inv = new alpha_Matrix();

  // code was lifted from MESA 3D
  inv[0] = this[5] * this[10] * this[15] -
            this[5]  * this[11] * this[14] -
            this[9]  * this[6]  * this[15] +
            this[9]  * this[7]  * this[14] +
            this[13] * this[6]  * this[11] -
            this[13] * this[7]  * this[10];

  inv[4] = -this[4] * this[10] * this[15] +
           this[4] * this[11] * this[14] +
           this[8] * this[6] * this[15] -
           this[8] * this[7] * this[14] -
           this[12] * this[6] * this[11] +
           this[12] * this[7] * this[10];

  inv[8] = this[4] * this[9] * this[15] -
          this[4] * this[11] * this[13] -
          this[8] * this[5] * this[15] +
          this[8] * this[7] * this[13] +
          this[12] * this[5] * this[11] -
          this[12] * this[7] * this[9];

  inv[12] = -this[4] * this[9] * this[14] +
            this[4] * this[10] * this[13] +
            this[8] * this[5] * this[14] -
            this[8] * this[6] * this[13] -
            this[12] * this[5] * this[10] +
            this[12] * this[6] * this[9];

  inv[1] = -this[1] * this[10] * this[15] +
           this[1] * this[11] * this[14] +
           this[9] * this[2] * this[15] -
           this[9]  * this[3] * this[14] -
           this[13] * this[2] * this[11] +
           this[13] * this[3] * this[10];

  inv[5] = this[0] * this[10] * this[15] -
          this[0] * this[11] * this[14] -
          this[8] * this[2] * this[15] +
          this[8] * this[3] * this[14] +
          this[12] * this[2] * this[11] -
          this[12] * this[3] * this[10];

  inv[9] = -this[0] * this[9] * this[15] +
           this[0] * this[11] * this[13] +
           this[8] * this[1] * this[15] -
           this[8] * this[3] * this[13] -
           this[12] * this[1] * this[11] +
           this[12] * this[3] * this[9];

  inv[13] = this[0] * this[9] * this[14] -
           this[0] * this[10] * this[13] -
           this[8] * this[1] * this[14] +
           this[8] * this[2] * this[13] +
           this[12] * this[1] * this[10] -
           this[12] * this[2] * this[9];

  inv[2] = this[1] * this[6] * this[15] -
          this[1] * this[7] * this[14] -
          this[5] * this[2] * this[15] +
          this[5] * this[3] * this[14] +
          this[13] * this[2] * this[7] -
          this[13] * this[3] * this[6];

  inv[6] = -this[0] * this[6] * this[15] +
           this[0] * this[7] * this[14] +
           this[4] * this[2] * this[15] -
           this[4] * this[3] * this[14] -
           this[12] * this[2] * this[7] +
           this[12] * this[3] * this[6];

  inv[10] = this[0] * this[5] * this[15] -
           this[0] * this[7] * this[13] -
           this[4] * this[1] * this[15] +
           this[4] * this[3] * this[13] +
           this[12] * this[1] * this[7] -
           this[12] * this[3] * this[5];

  inv[14] = -this[0] * this[5] * this[14] +
            this[0] * this[6] * this[13] +
            this[4] * this[1] * this[14] -
            this[4] * this[2] * this[13] -
            this[12] * this[1] * this[6] +
            this[12] * this[2] * this[5];

  inv[3] = -this[1] * this[6] * this[11] +
           this[1] * this[7] * this[10] +
           this[5] * this[2] * this[11] -
           this[5] * this[3] * this[10] -
           this[9] * this[2] * this[7] +
           this[9] * this[3] * this[6];

  inv[7] = this[0] * this[6] * this[11] -
          this[0] * this[7] * this[10] -
          this[4] * this[2] * this[11] +
          this[4] * this[3] * this[10] +
          this[8] * this[2] * this[7] -
          this[8] * this[3] * this[6];

  inv[11] = -this[0] * this[5] * this[11] +
            this[0] * this[7] * this[9] +
            this[4] * this[1] * this[11] -
            this[4] * this[3] * this[9] -
            this[8] * this[1] * this[7] +
            this[8] * this[3] * this[5];

  inv[15] = this[0] * this[5] * this[10] -
           this[0] * this[6] * this[9] -
           this[4] * this[1] * this[10] +
           this[4] * this[2] * this[9] +
           this[8] * this[1] * this[6] -
           this[8] * this[2] * this[5];

    var det = this[0] * inv[0] + this[1] * inv[4] + this[2] * inv[8] + this[3] * inv[12];

    if(det == 0) {
      throw new Error("Determinate in Matrix.Inverse cannot be 0");
    }
    det = 1.0 / det;

    for(var i = 0; i < inv.length; ++i) {
        inv[i] = inv[i] * det;
    }

    return inv;
}

alpha_Matrix.prototype.toArray = function()
{
    return [
        this[0], this[1], this[2], this[3],
        this[4], this[5], this[6], this[7],
        this[8], this[9], this[10], this[11],
        this[12], this[13], this[14], this[15]
    ];
};
