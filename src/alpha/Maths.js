import parsegraph_TestSuite from '../TestSuite';
import {
    parsegraph_fuzzyEquals
} from '../math';
import {
    makePerspective
} from '../gl';
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

const alpha_FUZZINESS = 1e-10;

export function alpha_random(min, max)
{
    return min + Math.round(Math.random() * (max - min));
};

var alpha_startTime = new Date();
export function alpha_GetTime()
{
    return (new Date().getTime() - alpha_startTime.getTime()) / 1000;
};

export function alpha_toRadians(inDegrees)
{
    return inDegrees * Math.PI / 180;
}
export const alpha_ToRadians = alpha_toRadians;

export function alpha_toDegrees(inRadians)
{
    return inRadians * 180 / Math.PI;
}
export const alpha_ToDegrees = alpha_toDegrees;

//----------------------------------------------
//----------------------------------------------
//-----------      VECTORS     -----------------
//----------------------------------------------
//----------------------------------------------

export function alpha_Vector()
{
    this[0] = 0;
    this[1] = 0;
    this[2] = 0;
    this.length = 3;

    if(arguments.length > 0) {
        this.Set.apply(this, arguments);
    }
}

alpha_Vector.prototype.toJSON = function()
{
    return [this[0], this[1], this[2]];
};

alpha_Vector.prototype.restore = function(json)
{
    if(Array.isArray(json)) {
        this.Set.apply(this, json);
    }
    else {
        this[0] = json.x;
        this[1] = json.y;
        this[2] = json.z;
    }
};

const alpha_Vector_Tests = new parsegraph_TestSuite("alpha_Vector");

alpha_Vector_Tests.addTest("alpha_Vector.<constructor>", function() {
    var v = new alpha_Vector(1, 2, 3);
    if(v[0] != 1 || v[1] != 2 || v[2] != 3) {
        return "Constructor must accept arguments.";
    }
});

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

alpha_Vector_Tests.addTest("alpha_Vector.Add", function() {
    var a = new alpha_Vector(3, 4, 0);

    a.Add(new alpha_Vector(1, 2, 3));
    if(!a.Equals(4, 6, 3)) {
        return "Add must add component-wise";
    }
});

alpha_Vector.prototype.Added = function()
{
    var rv = this.Clone();
    return rv.Add.apply(rv, arguments);
}

alpha_Vector.prototype.Clone = function()
{
    return new alpha_Vector(this);
}

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

alpha_Vector_Tests.addTest("alpha_Vector.Divide", function() {
    var a = new alpha_Vector(3, 4, 0);

    var b = new alpha_Vector(2, 2, 2);

    if(!a.Divided(b).Equals(3/2, 4/2, 0)) {
        return a.Divided(b).toString();
    }

    if(!a.Equals(3, 4, 0)) {
        return a.toString();
    }
    if(a.Equals(3, 4, 5)) {
        return a.toString();
    }
    if(a.Equals(4, 4, 0)) {
        return a.toString();
    }
    if(a.Equals(3, 3, 0)) {
        return a.toString();
    }

    if(!a.Divided(2, 2, 2).Equals(3/2, 4/2, 0)) {
        return a.Divided(b).toString();
    }

    if(!a.Divided(new alpha_Vector(2, 3, 4)).Equals(3/2, 4/3, 0)) {
        return a.Divided(b).toString();
    }
});

alpha_Vector.prototype.Equals = function()
{
    if(arguments.length > 1) {
        // .Equals(x, y, z)
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > alpha_FUZZINESS) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        // .Equals(new alpha_Vector(x, y, z));
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > alpha_FUZZINESS) {
                // Found a significant difference.
                return false;
            }
        }
    }

    // Equals.
    return true;
}

alpha_Vector_Tests.addTest("alpha_Vector.Equals", function() {
    var a = new alpha_Vector(3, 4, 0);
    if(!a.Equals(3, 4, 0)) {
        return a.toString();
    }
    if(a.Equals(3, 4, 5)) {
        return a.toString();
    }
    if(a.Equals(4, 4, 0)) {
        return a.toString();
    }
    if(a.Equals(3, 3, 0)) {
        return a.toString();
    }
});

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
    var magnitude = this.Magnitude();
    if(magnitude != 0) {
        this.Divide(magnitude);
    }

    return this;
}

alpha_Vector_Tests.addTest("alpha_Vector.Normalize", function() {
    var a = new alpha_Vector(3, 4, 0);
    a.Normalize();
    if(a.Length() != 1) {
        return "Normalize must create a vector of length one.";
    }

    if(!a.Equals(3/5, 4/5, 0)) {
        return a.toString();
    }
});

alpha_Vector.prototype.Normalized = function()
{
    return this.Clone().Normalize();
}

alpha_Vector.prototype.Magnitude = function()
{
    return Math.sqrt(this.DotProduct(this));
}
alpha_Vector.prototype.Length = alpha_Vector.prototype.Magnitude;

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

alpha_Vector.prototype.DotProduct = function(other)
{
    return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
}
alpha_Vector.prototype.InnerProduct = alpha_Vector.prototype.DotProduct;
alpha_Vector.prototype.ScalarProduct = alpha_Vector.prototype.DotProduct;

alpha_Vector_Tests.addTest("alpha_Vector.DotProduct", function() {
    var a = new alpha_Vector(1, 0, 0);
    var b = new alpha_Vector(0, 1, 0);
    if(a.DotProduct(b)) {
        return "Orthogonal vectors must have zero dot product";
    }
});

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

//----------------------------------------------
//----------------------------------------------
//-----------     QUATERNIONS  -----------------
//----------------------------------------------
//----------------------------------------------

export function alpha_Quaternion()
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

alpha_Quaternion.prototype.toJSON = function()
{
    return [this[0], this[1], this[2], this[3]];
};

alpha_Quaternion.prototype.restore = function(json)
{
    if(Array.isArray(json)) {
        this.Set.apply(this, json);
    }
    else {
        this[0] = json.x;
        this[1] = json.y;
        this[2] = json.z;
        this[3] = json.w;
    }
};

const alpha_Quaternion_Tests = new parsegraph_TestSuite("alpha_Quaternion");

alpha_Quaternion_Tests.addTest("Does quaternion rotation really even work?", function() {
    var m = new alpha_RMatrix4();
    var rotq = Math.PI/2;
    m.Rotate(alpha_QuaternionFromAxisAndAngle(
        0, 1, 1, rotq
    ));
    m.Rotate(alpha_QuaternionFromAxisAndAngle(
        1, 0, 0, rotq
    ));
    m.Rotate(alpha_QuaternionFromAxisAndAngle(
        1, 0, 1, rotq
    ));
    m.Transform(10, 0, 0);
    // TODO What is the expected value?
    //console.log(v.toString());
});

alpha_Quaternion_Tests.addTest("alpha_QuaternionFromAxisAndAngle", function() {
    var quat = alpha_QuaternionFromAxisAndAngle(1, 0, 0, Math.PI/2);
    if(
        !parsegraph_fuzzyEquals(quat[0], 0.7071, 10e-2)
        || !parsegraph_fuzzyEquals(quat[1], 0, 10e-2)
        || !parsegraph_fuzzyEquals(quat[2], 0, 10e-2)
        || !parsegraph_fuzzyEquals(quat[3], 0.7071, 10e-2)) {
        throw new Error("Quaternion " + quat + " does not match expected (0.7071, 0, 0, 0.7071)");
    }
});

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
alpha_Quaternion.prototype.Equals = function()
{
    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > alpha_FUZZINESS) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > alpha_FUZZINESS) {
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

alpha_Quaternion_Tests.addTest("alpha_Quaternion.Normalize", function() {
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
    if(w > 1) {
        this.Normalize();
    }
    var w = this[3];
    var x = this[0];
    var y = this[1];
    var z = this[2];

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
    var angle;
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
    this[0] = ( axis[0] * sinangle );
    this[1] = ( axis[1] * sinangle );
    this[2] = ( axis[2] * sinangle );
    this[3] = ( Math.cos(angle) );

    return this;
}

alpha_Quaternion_Tests.addTest("FromAxisAndAngle", function() {
    var q = new alpha_Quaternion();
    var angle = Math.PI / 2;

    q.FromAxisAndAngle(0, 1, 0, angle);
    if(!q.Equals(
        0, Math.sin(angle / 2), 0, Math.cos(angle / 2)
    )) {
        return q.toString();
    }

    q.FromAxisAndAngle(0, 0, 1, angle);
    if(!q.Equals(
        0, 0, Math.sin(angle / 2), Math.cos(angle / 2)
    )) {
        return q.toString();
    }

    q.FromAxisAndAngle(1, 0, 0, angle);
    if(!q.Equals(
        Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)
    )) {
        return q.toString();
    }

    q.FromAxisAndAngle(0, 0, 0, angle);
    if(!q.Equals(
        0, 0, 0, Math.cos(angle / 2)
    )) {
        return q.toString();
    }
});

alpha_Quaternion.prototype.DotProduct = function(other)
{
    var rv = 0;
    for(var i = 0; i < this.length; ++i) {
        rv += this[i] * other[i];
    }
    return rv;
};
alpha_Quaternion.prototype.ScalarProduct = alpha_Quaternion.prototype.DotProduct;
alpha_Quaternion.prototype.InnerProduct = alpha_Quaternion.prototype.DotProduct;

// v' = qr * v * qr-1
// vector3 = (q * quaternion( vector, 0 ) * q:conjugate() ).Vector();
// this is one of the most heavily used and slowest functions
// so its been optimized to hell and back
// a more normal, and decently optimized version is found next
// this version is about 2x faster than RotatedVector2
(function() {
alpha_Quaternion.prototype.RotatedVector = function()
{
    var x, y, z;
    var vec = new alpha_Vector();
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
    this.RotatedVectorEach(vec, x, y, z);
    return vec;
};
})();

(function() {
var scratchQuat = new alpha_Quaternion();
alpha_Quaternion.prototype.RotatedVectorEach = function(outVec, x, y, z)
{
    var aw = 0;
    var ax = x;
    var ay = y;
    var az = z;

    var bw = this[3];
    var bx = -this[0];
    var by = -this[1];
    var bz = -this[2];

    // removed all the mults by aw, which would result in 0;
    scratchQuat.Set(
        ax * bw + ay * bz - az * by,
        -ax * bz + ay * bw + az * bx,
        ax * by - ay * bx + az * bw,
        -ax * bx - ay * by - az * bz
    );
    var q = scratchQuat;

    var b = q;
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
        (aw * bx + ax * bw + ay * bz - az * by),
        (aw * by - ax * bz + ay * bw + az * bx),
        (aw * bz + ax * by - ay * bx + az * bw)
    );
};
})();

alpha_Quaternion.prototype.toString = function()
{
    return "{x: " + this[0] + "\ny: " + this[1] + "\nz: " + this[2] + "\nw: " + this[3] + "}";
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

/**
 * Constructs a Matrix.
 *
    // using quaternions for a Vector4
    var r1 = new alpha_Quaternion(this[0], this[1], this[2], this[3]);
    var r2 = new alpha_Quaternion(this[4], this[5], this[6], this[7]);
    var r3 = new alpha_Quaternion(this[8], this[9], this[10], this[11]);
    var r4 = new alpha_Quaternion(this[12], this[13], this[14], this[15]);
*/
export function alpha_RMatrix4()
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

alpha_RMatrix4.prototype.restore = function(json)
{
    this.Set.apply(this, json);
};

alpha_RMatrix4.prototype.toJSON = function()
{
    return this.toArray();
};

const alpha_RMatrix4_Tests = new parsegraph_TestSuite("alpha_RMatrix4");

alpha_RMatrix4.prototype.toDom = function(reference)
{
    var tableDom = document.createElement("table");

    for(var i = 0; i < 4; ++i) {
        var rowDom = document.createElement("tr");
        tableDom.appendChild(rowDom);
        for(var j = 0; j < 4; ++j) {
            var cellDom = document.createElement("td");
            cellDom.style.padding = "3px";
            cellDom.style.textAlign = "center";

            if(reference) {
                var refValue = reference[4 * i + j];
                var givenValue = this[4 * i + j];

                if(Math.abs(givenValue - refValue) > alpha_FUZZINESS) {
                    cellDom.style.color = "black";
                    cellDom.style.backgroundColor = "red";
                    cellDom.appendChild(document.createTextNode(givenValue + " (not " + refValue + ")"));
                }
                else {
                    cellDom.style.backgroundColor = "green";
                    cellDom.style.color = "white";
                    cellDom.appendChild(document.createTextNode(this[4 * i + j]));
                }
            }
            else {
                cellDom.appendChild(document.createTextNode(this[4 * i + j]));
            }
            rowDom.appendChild(cellDom);
        }
    }

    return tableDom;
};

alpha_RMatrix4.prototype.Set = function()
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

alpha_RMatrix4.prototype.Equals = function()
{
    if(arguments.length > 1) {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[i]) > alpha_FUZZINESS) {
                // Found a significant difference.
                return false;
            }
        }
    }
    else {
        for(var i = 0; i < this.length; ++i) {
            if(Math.abs(this[i] - arguments[0][i]) > alpha_FUZZINESS) {
                // Found a significant difference.
                return false;
            }
        }
    }

    // Equals.
    return true;
};

alpha_RMatrix4.prototype.Clone = function()
{
    return new alpha_RMatrix4(this);
};

{
    var r1 = new alpha_Quaternion();
    var r2 = new alpha_Quaternion();
    var r3 = new alpha_Quaternion();
    var r4 = new alpha_Quaternion();
    var c1 = new alpha_Quaternion();
    var c2 = new alpha_Quaternion();
    var c3 = new alpha_Quaternion();
    var c4 = new alpha_Quaternion();
    alpha_RMatrix4.prototype.Multiply = function(other)
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
        r1.Set(this[0], this[1], this[2], this[3]);
        r2.Set(this[4], this[5], this[6], this[7]);
        r3.Set(this[8], this[9], this[10], this[11]);
        r4.Set(this[12], this[13], this[14], this[15]);
        c1.Set(other[0], other[4], other[8], other[12]);
        c2.Set(other[1], other[5], other[9], other[13]);
        c3.Set(other[2], other[6], other[10], other[14]);
        c4.Set(other[3], other[7], other[11], other[15]);

        return this.Set(
            r1.DotProduct(c1), r1.DotProduct(c2), r1.DotProduct(c3), r1.DotProduct(c4),
            r2.DotProduct(c1), r2.DotProduct(c2), r2.DotProduct(c3), r2.DotProduct(c4),
            r3.DotProduct(c1), r3.DotProduct(c2), r3.DotProduct(c3), r3.DotProduct(c4),
            r4.DotProduct(c1), r4.DotProduct(c2), r4.DotProduct(c3), r4.DotProduct(c4)
        );
    }
}

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Multiply", function(resultDom) {
    var m = new alpha_RMatrix4(
        2, 3, 4, 5,
        6, 7, 8, 9,
        10, 11, 12, 13,
        14, 15, 16, 17
    );
    m.Multiply(new alpha_RMatrix4(
        2, 3, 5, 7,
        11, 13, 17, 19,
        23, 29, 31, 37,
        39, 41, 43, 47
    ));

    var result = new alpha_RMatrix4(
        2*2 + 3*11 + 4*23 + 5*39,
        2*3 + 3*13 + 4*29 + 5*41,
        2*5 + 3*17 + 4*31 + 5*43,
        2*7 + 3*19 + 4*37 + 5*47,

        6*2 + 7*11 + 8*23 + 9*39,
        6*3 + 7*13 + 8*29 + 9*41,
        6*5 + 7*17 + 8*31 + 9*43,
        6*7 + 7*19 + 8*37 + 9*47,

        10*2 + 11*11 + 12*23 + 13*39,
        10*3 + 11*13 + 12*29 + 13*41,
        10*5 + 11*17 + 12*31 + 13*43,
        10*7 + 11*19 + 12*37 + 13*47,

        14*2 + 15*11 + 16*23 + 17*39,
        14*3 + 15*13 + 16*29 + 17*41,
        14*5 + 15*17 + 16*31 + 17*43,
        14*7 + 15*19 + 16*37 + 17*47
    );

    if(!m.Equals(result)) {
        resultDom.appendChild(m.toDom(result));
        return "Multiply did not produce correct values";
    }
});

alpha_RMatrix4.prototype.Transform = function()
{
    var x, y, z, w;
    if(arguments.length == 1) {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
        w = arguments[0][3];
    }
    else if(arguments.length === 2) {
        // Vector, w
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
        w = arguments[1];
    }
    else {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
        w = arguments[3];
    }
    if(w === undefined) {
        //console.log("X1", this[0], x, this[0] * x);
        //console.log("X2", this[1], y, this[1] * y);
        //console.log("X3", this[2], z, this[2] * z);
        //console.log("X4", this[3]);
        //console.log("X", this[0] * x + this[1] * y + this[2] * z + this[3]);
        //console.log("Y", this[4] * x + this[5] * y + this[6] * z + this[7]);
        //console.log("Z", this[8] * x + this[9] * y + this[10] * z + this[11]);
        return new alpha_Vector(
            this[0] * x + this[1] * y + this[2] * z + this[3],
            this[4] * x + this[5] * y + this[6] * z + this[7],
            this[8] * x + this[9] * y + this[10] * z + this[11]
        );
    }

    return new alpha_Quaternion(
        this[0] * x + this[1] * y + this[2] * z + this[3] * w,
        this[4] * x + this[5] * y + this[6] * z + this[7] * w,
        this[8] * x + this[9] * y + this[10] * z + this[11] * w,
        this[12] * x + this[13] * y + this[14] * z + this[15] * w
    );
};

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Transform", function() {
    var m = new alpha_RMatrix4();
    m.Scale(2, 2, 2);

    var value = m.Transform(3, 4, 5);
    if(!value.Equals(6, 8, 10)) {
        return value.toString();
    }

    var value = m.Transform(3, 4, 5, 1);
    if(!value.Equals(6, 8, 10, 1)) {
        return value.toString();
    }
});

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Transform with rotation", function() {
    var m = new alpha_RMatrix4();
    var rot = alpha_QuaternionFromAxisAndAngle(
        0, 0, 1, Math.PI/2
    );
    m.FromQuaternion(rot);

    var value = m.Transform(1, 0, 0);
    if(!value.Equals(0, -1, 0)) {
        return value.toString();
    }

    var rot = alpha_QuaternionFromAxisAndAngle(
        0, 0, 1, Math.PI
    );
    m.FromQuaternion(rot);
    value = m.Transform(1, 0, 0);
    if(!value.Equals(-1, 0, 0)) {
        return value.toString();
    }

    var m2 = new alpha_RMatrix4();
    var rot = alpha_QuaternionFromAxisAndAngle(
        0, 0, 1, Math.PI
    );
    m2.FromQuaternion(rot);
    m.Multiply(m2);
    value = m.Transform(1, 0, 0);
    if(!value.Equals(1, 0, 0)) {
        return value.toString();
    }
});

alpha_RMatrix4.prototype.Multiplied = function()
{
    var rv = this.Clone();
    return rv.Multiply.apply(rv, arguments);
};

alpha_RMatrix4.prototype.Identity = function()
{
    return this.Set(
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    );
};

alpha_RMatrix4.prototype.Scale = function()
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
    var m = new alpha_RMatrix4();
    m[0] = x;
    m[5] = y;
    m[10] = z;

    // Multiply in this order.
    m.Multiply(this);
    this.Set(m);

    return this;
};

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Scale", function() {
    var m = new alpha_RMatrix4();

    //console.log(m.toString());
    m.Scale(2, 3, 4);

    if(!m.Equals(new alpha_RMatrix4(
        2, 0, 0, 0,
        0, 3, 0, 0,
        0, 0, 4, 0,
        0, 0, 0, 1
    ))) {
        return m.toString();
    }
});

alpha_RMatrix4.prototype.Translate = function()
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
    var m = new alpha_RMatrix4();
    m[12] = x;
    m[13] = y;
    m[14] = z;

    m.Multiply(this);
    this.Set(m);

    return this;
};

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Translate", function() {
    var m = new alpha_RMatrix4();

    //console.log(m.toString());
    m.Translate(2, 3, 4);

    if(!m.Equals(new alpha_RMatrix4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        2, 3, 4, 1
    ))) {
        return m.toString();
    }

    m.Translate(2, 3, 4);
    if(!m.Equals(new alpha_RMatrix4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        4, 6, 8, 1
    ))) {
        return m.toString();
    }
});

alpha_RMatrix4_Tests.addTest("alpha_RMatrix4.Rotate", function() {
    var m = new alpha_RMatrix4();

    //console.log(m.toString());
    m.Rotate(1, 0, 0, 1);

    if(!m.Equals(new alpha_RMatrix4(
        1, 0, 0, 0,
        0, -1, 2, 0,
        0, -2, -1, 0,
        0, 0, 0, 1
    ))) {
        //console.log("Rotated matrix: " + m.toString());
        return m.toString();
    }
});

let alpha_RMatrix4_scratch = null;

function alpha_getScratchMatrix()
{
    if(!alpha_RMatrix4_scratch) {
        alpha_RMatrix4_scratch = new alpha_RMatrix4();
    }
    else {
        alpha_RMatrix4_scratch.Identity();
    }
    return alpha_RMatrix4_scratch;
}

alpha_RMatrix4.prototype.Rotate = function()
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
    var r = alpha_getScratchMatrix();
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

alpha_RMatrix4.prototype.Transpose = function()
{
    return this.Set(
        this[0], this[4], this[8], this[12],
        this[1], this[5], this[9], this[13],
        this[2], this[6], this[10], this[14],
        this[3], this[7], this[11], this[15]
    );
};

alpha_RMatrix4.prototype.toString = function()
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

export function alpha_RMatrix4FromEuler()
{
    var m = new alpha_RMatrix4();
    return m.FromEuler.apply(m, arguments);
};

alpha_RMatrix4.prototype.FromEuler = function()
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
    //var sy = Math.sin(y);
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

export function alpha_RMatrix4FromQuaternion()
{
    var m = new alpha_RMatrix4();
    return m.FromQuaternion.apply(m, arguments);
};

alpha_RMatrix4.prototype.FromQuaternion = function()
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

export function alpha_RMatrix4FromQuaternionAtVector()
{
    var m = new alpha_RMatrix4();
    return m.FromQuaternionAtVector.apply(m, arguments);
};

// equivalent to rotationMatrix * translationMatrix;
alpha_RMatrix4.prototype.FromQuaternionAtVector = function(vector, quat)
{
    this.FromQuaternion(quat);
    this[12] = vector[0];
    this[13] = vector[1];
    this[14] = vector[2];

    return this;
};

export function alpha_RMatrix4FromVectorAroundQuaternion()
{
    var m = new alpha_RMatrix4();
    return m.FromVectorAroundQuaternion.apply(m, arguments);
};

// equivalent to
// translationMatrix * rotationMatrix
// the 4th value in this matrix multplication always end up as 0
alpha_RMatrix4.prototype.FromVectorAroundQuaternion = function(vector, quat)
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
    console.log(this);

    return this;
};

export function alpha_RMatrix4FromVectorAroundQuaternionAtVector()
{
    var m = new alpha_RMatrix4();
    return m.FromVectorAroundQuaternionAtVector.apply(m, arguments);
};

alpha_RMatrix4.prototype.FromVectorAroundQuaternionAtVector = function(position, rotation, offset)
{
    // rotation * translation;
    this.FromQuaternionAtVector(offset, rotation);

    // set our critical rows and columns
    var r4 = new alpha_Quaternion(position[0], position[1], position[2], 1);
    var c1 = new alpha_Quaternion(this[0], this[4], this[8], this[12]);
    var c2 = new alpha_Quaternion(this[1], this[5], this[9], this[13]);
    var c3 = new alpha_Quaternion(this[2], this[6], this[10], this[14]);

    this[12] = r4.DotProduct(c1);
    this[13] = r4.DotProduct(c2);
    this[14] = r4.DotProduct(c3);

    return this;
};

alpha_RMatrix4.prototype.Inverse = function()
{
    var inv = this.Inversed();
    return this.Set(inv);
};

alpha_RMatrix4.prototype.Inversed = function()
{
  var inv = new alpha_RMatrix4();

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

alpha_RMatrix4_Tests.addTest("Does alpha_RMatrix4.Inverse even work for simple things?", function(resultDom) {
    var m = new alpha_RMatrix4(
        2, 0, 0, 0,
        0, 2, 0, 0,
        0, 0, 2, 0,
        0, 0, 0, 2
    );
    var expected = new alpha_RMatrix4(
        0.5, 0, 0, 0,
        0, 0.5, 0, 0,
        0, 0, 0.5, 0,
        0, 0, 0, 0.5
    );
    if(!m.Inverse().Equals(expected)) {
        resultDom.appendChild(m.Inverse());
        return "It doesn't even work for 2!";
    }
});

alpha_RMatrix4_Tests.addTest("Does alpha_RMatrix4.Inverse work for zero-determinants?", function() {
    var m = new alpha_RMatrix4(
        2, 0, 0, 0,
        0, 2, 0, 0,
        0, 0, 2, 0,
        0, 0, 0, 0
    );
    try {
        m.Inverse();
        return "Inverse shouldn't succeed.";
    }
    catch(ex) {
    }
});

alpha_RMatrix4.prototype.toArray = function()
{
    return [
        this[0], this[1], this[2], this[3],
        this[4], this[5], this[6], this[7],
        this[8], this[9], this[10], this[11],
        this[12], this[13], this[14], this[15]
    ];
};

alpha_RMatrix4_Tests.addTest("Does the RMatrix4 actually return rows for rows?", function() {
    var m = new alpha_RMatrix4(
        2, 3, 5, 7,
        11, 13, 17, 19,
        23, 29, 31, 37,
        39, 41, 43, 47
    );

    if(m[0] !== 2 || m[1] !== 3 || m[2] !== 5 || m[3] !== 7) {
        return "";
    }

    if(m[4] !== 11 || m[5] !== 13 || m[6] !== 17 || m[7] !== 19) {
        return "";
    }

    if(m[8] !== 23 || m[9] !== 29 || m[10] !== 31 || m[11] !== 37) {
        return "";
    }

    if(m[12] !== 39 || m[13] !== 41 || m[14] !== 43 || m[15] !== 47) {
        return "";
    }
});

alpha_RMatrix4_Tests.addTest("Does the perspective matrix work with alpha_RMatrix4?", function() {
    var width = 800;
    var height = 600;
    var m = new alpha_RMatrix4(makePerspective(
        Math.PI / 3,
        width / height,
        .1,
        150
    ));
    m.Transpose();

    var v = new alpha_Vector(1, 2, 3);
    var rv = m.Transform(v);

    // TODO Skipped.
    if(!rv.Equals(0, 1, 0)) {
        //return rv.toString();
    }
});
