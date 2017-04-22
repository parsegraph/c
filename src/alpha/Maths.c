#include "Maths.h"
#include <math.h>
#include <stdlib.h>
#include <apr_time.h>
#include <stdio.h>
#include "../graph/log.h"

float alpha_FUZZINESS = 1e-10;

float alpha_RMatrix4_Identity[] = {
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
};

void alpha_RMatrix4_SetIdentity(float* m)
{
    alpha_RMatrix4_Copy(m, alpha_RMatrix4_Identity);
}

long int alpha_random(long int min, long int max)
{
    return min + random() * (max - min);
};

apr_time_t alpha_startTime = 0;
float alpha_GetTime()
{
    if(alpha_startTime == 0) {
        alpha_startTime = apr_time_now();
    }
    return (apr_time_now() - alpha_startTime) / 1000;
};

float alpha_toRadians(float inDegrees)
{
    return inDegrees * M_PI / 180.0;
}

float alpha_toDegrees(float inRadians)
{
    return inRadians * 180.0 / M_PI;
}

//----------------------------------------------
//----------------------------------------------
//-----------      VECTORS     -----------------
//----------------------------------------------
//----------------------------------------------

float* alpha_Vector_new(apr_pool_t* pool)
{
    float* v;
    if(pool) {
        v = apr_palloc(pool, sizeof(float)*3);
    }
    else {
        v = malloc(sizeof(float)*3);
    }

    alpha_Vector_SetIdentity(v);

    return v;
}

void alpha_Vector_SetIdentity(float* vec)
{
    vec[0] = 0;
    vec[1] = 0;
    vec[2] = 0;
}

float* alpha_Vector_create(apr_pool_t* pool, float x, float y, float z)
{
    float* vec = alpha_Vector_new(pool);
    alpha_Vector_Set(vec, x, y, z);
    return vec;
}

void alpha_Vector_destroy(apr_pool_t* pool, float* vec)
{
    if(!pool) {
        free(vec);
    }
}

/**
 * Creates a clone of this Vector and adds the given vector to it.
 */
float* alpha_Vector_Added(apr_pool_t* pool, float* v, float* toAdd)
{
    float* rv = alpha_Vector_Clone(pool, v);
    alpha_Vector_Add(rv, toAdd);
    return rv;
}

float* alpha_Vector_AddedEach(apr_pool_t* pool, float* v, float x, float y, float z)
{
    float* rv = alpha_Vector_Clone(pool, v);
    alpha_Vector_AddEach(rv, x, y, z);
    return rv;
}

/**
 * Adds the given vector to this vector.
 *
 * The vector may be given component-wise.
 */
void alpha_Vector_Add(float* v, float* toAdd)
{
    v[0] += toAdd[0];
    v[1] += toAdd[1];
    v[2] += toAdd[2];
}

void alpha_Vector_AddEach(float* v, float x, float y, float z)
{
    v[0] += x;
    v[1] += y;
    v[2] += z;
}

void alpha_Vector_Copy(float* dest, float* src)
{
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
}

/**
 * Copies each component into a new vector and returns it.
 */
float* alpha_Vector_Clone(apr_pool_t* pool, float* src)
{
    float* rv = alpha_Vector_new(pool);
    alpha_Vector_Copy(rv, src);
    return rv;
}

void alpha_Vector_Multiply(float* vec, float* other)
{
    vec[0] *= other[0];
    vec[1] *= other[1];
    vec[2] *= other[2];
}

void alpha_Vector_MultiplyEach(float* vec, float x, float y, float z)
{
    vec[0] *= x;
    vec[1] *= y;
    vec[2] *= z;
}

float* alpha_Vector_Multiplied(apr_pool_t* pool, float* vec, float* other)
{
    float* rv = alpha_Vector_Clone(pool, vec);
    alpha_Vector_Multiply(rv, other);
    return rv;
}

float* alpha_Vector_MultipliedEach(apr_pool_t* pool, float* vec, float x, float y, float z)
{
    float* rv = alpha_Vector_Clone(pool, vec);
    alpha_Vector_MultiplyEach(rv, x, y, z);
    return rv;
}

void alpha_Vector_Divide(float* vec, float* denom)
{
    vec[0] /= denom[0];
    vec[1] /= denom[1];
    vec[2] /= denom[2];
}

void alpha_Vector_DivideAll(float* vec, float val)
{
    vec[0] /= val;
    vec[1] /= val;
    vec[2] /= val;
}

void alpha_Vector_DivideEach(float* vec, float x, float y, float z)
{
    vec[0] /= x;
    vec[1] /= y;
    vec[2] /= z;
}

float* alpha_Vector_Divided(apr_pool_t* pool, float* vec, float* denom)
{
    float* rv = alpha_Vector_Clone(pool, vec);
    alpha_Vector_Divide(rv, denom);
    return rv;
}

float* alpha_Vector_DividedEach(apr_pool_t* pool, float* vec, float x, float y, float z)
{
    float* rv = alpha_Vector_Clone(pool, vec);
    alpha_Vector_DivideEach(rv, x, y, z);
    return rv;
}

int alpha_Vector_Equals(float* m, float* other)
{
    // .Equals(new alpha_Vector(x, y, z));
    for(int i = 0; i < 3; ++i) {
        if(fabsf(m[i] - other[i]) > alpha_FUZZINESS) {
            // Found a significant difference.
            return 0;
        }
    }
    // Equals.
    return 1;
}

int alpha_Vector_EqualsEach(float* m, float x, float y, float z)
{
    float other[3];
    alpha_Vector_Set(other, x, y, z);
    return alpha_Vector_Equals(m, other);
}

void alpha_Vector_Set(float* m, float x, float y, float z)
{
    m[0] = x;
    m[1] = y;
    m[2] = z;
}

void alpha_Vector_Normalize(float* vec)
{
    float magnitude = alpha_Vector_Magnitude(vec);
    if(magnitude != 0) {
        alpha_Vector_DivideAll(vec, magnitude);
    }
}

float* alpha_Vector_Normalized(apr_pool_t* pool, float* vec)
{
    float* cloned = alpha_Vector_Clone(pool, vec);
    alpha_Vector_Normalize(cloned);
    return cloned;
}

float alpha_Vector_Magnitude(float* vec)
{
    return sqrtf(alpha_Vector_DotProduct(vec, vec));
}

float alpha_Vector_Length(float* vec)
{
    return alpha_Vector_Magnitude(vec);
}

float alpha_Vector_DotProduct(float* vec, float* other)
{
    return vec[0] * other[0] + vec[1] * other[1] + vec[2] * other[2];
}

float alpha_Vector_AngleBetween(float* vec, float* other)
{
    float dot = alpha_Vector_DotProduct(vec, other);
    return acosf(dot / (alpha_Vector_Magnitude(vec) * alpha_Vector_Magnitude(other)));
}

//----------------------------------------------
//----------------------------------------------
//-----------     QUATERNIONS  -----------------
//----------------------------------------------
//----------------------------------------------

float* alpha_Quaternion_new(apr_pool_t* pool)
{
    float* quat;
    if(pool) {
        quat = apr_palloc(pool, sizeof(float)*4);
    }
    else {
        quat = malloc(sizeof(float)*4);
    }

    alpha_Quaternion_SetIdentity(quat);

    return quat;
}

void alpha_Quaternion_SetIdentity(float* quat)
{
    quat[0] = 0;
    quat[1] = 0;
    quat[2] = 0;
    quat[3] = 1;
}

float* alpha_Quaternion_Create(apr_pool_t* pool, float angle, float x, float y, float z)
{
    float* quat = alpha_Quaternion_new(pool);
    alpha_Quaternion_Set(quat, angle, x, y, z);
    return quat;
}

void alpha_Quaternion_destroy(apr_pool_t* pool, float* quat)
{
    if(!pool) {
        free(quat);
    }
}

void alpha_Quaternion_Copy(float* quat, float* other)
{
    for(int i = 0; i < 4; ++i) {
        quat[i] = other[i];
    }
}

float* alpha_Quaternion_Clone(apr_pool_t* pool, float* quat)
{
    float* rv = alpha_Quaternion_new(pool);
    alpha_Quaternion_Copy(rv, quat);
    return rv;
}

void alpha_Quaternion_MultiplyAll(float* quat, float val)
{
    quat[0] = val;
    quat[1] = val;
    quat[2] = val;
    quat[3] = val;
}

void alpha_Quaternion_MultiplyEach(float* quat, float bx, float by, float bz, float bw)
{
    float ax = quat[0];
    float ay = quat[1];
    float az = quat[2];
    float aw = quat[3];
    quat[0] = (aw * bx + ax * bw + ay * bz - az * by);
    quat[1] = (aw * by - ax * bz + ay * bw + az * bx);
    quat[2] = (aw * bz + ax * by - ay * bx + az * bw);
    quat[3] = (aw * bw - ax * bx - ay * by - az * bz);
}

void alpha_Quaternion_Multiply(float* quat, float* other)
{
    alpha_Quaternion_MultiplyEach(quat, other[0], other[1], other[2], other[3]);
}

float* alpha_Quaternion_Multiplied(apr_pool_t* pool, float* quat, float* other)
{
    float* rv = alpha_Quaternion_Clone(pool, quat);
    alpha_Quaternion_Multiply(rv, other);
    return rv;
}

float* alpha_Quaternion_MultipliedEach(apr_pool_t* pool, float* quat, float x, float y, float z, float w)
{
    float* rv = alpha_Quaternion_Clone(pool, quat);
    alpha_Quaternion_MultiplyEach(rv, x, y, z, w);
    return rv;
}

// really this could use a few tweaks
// negatives can be the same rotation
// (different paths)
int alpha_Quaternion_Equals(float* quat, float* other)
{
    return alpha_Quaternion_EqualsEach(quat, other[0], other[1], other[2], other[3]);
}

int alpha_Quaternion_EqualsEach(float* quat, float x, float y, float z, float w)
{
    return quat[0] == x && quat[1] == y && quat[2] == z && quat[3] == w;
}

float alpha_Quaternion_Magnitude(float* quat)
{
    float w = quat[3];
    float x = quat[0];
    float y = quat[1];
    float z = quat[2];
    return sqrtf(w*w + x*x + y*y + z*z);
}

void alpha_Quaternion_Normalize(float* quat)
{
    float magnitude = alpha_Quaternion_Magnitude(quat);
    if(magnitude != 0) {
        alpha_Quaternion_MultiplyAll(quat, 1/magnitude);
    }
}

void alpha_Quaternion_Set(float* quat, float x, float y, float z, float w)
{
    quat[0] = x;
    quat[1] = y;
    quat[2] = z;
    quat[3] = w;
}

float* alpha_Quaternion_Conjugate(float* quat, apr_pool_t* pool)
{
    return alpha_Quaternion_Create(pool,
        -quat[0],
        -quat[1],
        -quat[2],
        quat[3]
    );
};

float* alpha_Quaternion_Inverse(apr_pool_t* pool, float* quat)
{
    // actual inverse is q.Conjugate() / Math.pow(Math.abs(q.Magnitude()), 2)
    // but as we only deal with unit quaternions we can just force a normalization
    // q.Conjugate() / 1 == q.Conjugate();

    alpha_Quaternion_Normalize(quat);
    return alpha_Quaternion_Conjugate(quat, pool);
};

float* alpha_Quaternion_ToAxisAndAngle(float* quat, apr_pool_t* pool)
{
    if(quat[3] > 1) {
        alpha_Quaternion_Normalize(quat);
    }
    float w = quat[3];
    float x = quat[0];
    float y = quat[1];
    float z = quat[2];

    float angle = 2 * acosf(w);
    float s = sqrtf(1 - w*w);

    if(s > .001) {
        x = x / s;
        y = x / s;
        z = x / s;
    }

    float* axisAndAngle;
    if(pool) {
        axisAndAngle = apr_palloc(pool, sizeof(float)*4);
    }
    else {
        axisAndAngle = malloc(sizeof(float)*4);
    }
    axisAndAngle[0] = x;
    axisAndAngle[1] = y;
    axisAndAngle[2] = z;
    axisAndAngle[3] = angle;
    return axisAndAngle;
}

float* alpha_QuaternionFromAxisAndAngle(apr_pool_t* pool, float* vec, float angle)
{
    float* quat = alpha_Quaternion_Create(pool, 0, 0, 0, 1);
    alpha_Quaternion_FromAxisAndAngle(quat, vec, angle);
    return quat;
}

float* alpha_QuaternionFromAxisAndAngleEach(apr_pool_t* pool, float x, float y, float z, float angle)
{
    float* quat = alpha_Quaternion_Create(pool, 0, 0, 0, 1);
    alpha_Quaternion_FromAxisAndAngleEach(quat, x, y, z, angle);
    return quat;
}

void alpha_Quaternion_FromAxisAndAngle(float* quat, float* vec, float angle)
{
    float axis[3];
    alpha_Vector_Copy(axis, vec);
    alpha_Vector_Normalize(axis);
    angle = angle / 2;
    float sinangle = sinf(angle);
    // accessing an vector by [X] will not be correct
    quat[0] = ( axis[0] * sinangle );
    quat[1] = ( axis[1] * sinangle );
    quat[2] = ( axis[2] * sinangle );
    quat[3] = ( cosf(angle) );
}

void alpha_Quaternion_FromAxisAndAngleEach(float* quat, float x, float y, float z, float angle)
{
    float vec[3];
    alpha_Vector_Set(vec, x, y, z);
    alpha_Quaternion_FromAxisAndAngle(quat, vec, angle);
}

float alpha_Quaternion_DotProduct(float* quat, float* other)
{
    float rv = 0;
    for(int i = 0; i < 4; ++i) {
        rv += quat[i] * other[i];
    }
    return rv;
}

// v' = qr * v * qr-1
// vector3 = (q * quaternion( vector, 0 ) * q:conjugate() ).Vector();
// this is one of the most heavily used and slowest functions
// so its been optimized to hell and back
// a more normal, and decently optimized version is found next
// this version is about 2x faster than RotatedVector2
float* alpha_Quaternion_RotatedVector(float* quat, apr_pool_t* pool, float* vec)
{
    return alpha_Quaternion_RotatedVectorEach(quat, pool, vec[0], vec[1], vec[2]);
}

float* alpha_Quaternion_RotatedVectorEach(float* quat, apr_pool_t* pool, float x, float y, float z)
{
    // vector to quat
    float* a = alpha_Quaternion_Create(pool, x, y, z, 0);
    float* b = alpha_Quaternion_Conjugate(quat, pool);

    // var r = this * v * conjugate;
    // var q = v * c;
    float aw = 0;
    float ax = a[0];
    float ay = a[1];
    float az = a[2];

    float bw = b[3];
    float bx = b[0];
    float by = b[1];
    float bz = b[2];
    // removed all the mults by aw, which would result in 0;

    float* q = alpha_Quaternion_Create(
        pool,
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

    a = quat;
    b = q;
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
    return alpha_Vector_create(pool,
        (aw * bx + ax * bw + ay * bz - az * by),
        (aw * by - ax * bz + ay * bw + az * bx),
        (aw * bz + ax * by - ay * bx + az * bw)
    );
}

// this is a decently optimized version; about twice as slow as version 1
float* alpha_Quaternion_RotatedVector2(float* quat, apr_pool_t* pool, float* vec)
{
    float* conjugate = alpha_Quaternion_Conjugate(quat, pool);
    float* v = alpha_Quaternion_Create(pool, vec[0], vec[1], vec[2], 0);
    float* r = alpha_Quaternion_Multiplied(pool, quat, v);
    alpha_Quaternion_Multiply(r, conjugate);
    return alpha_Vector_create(pool, r[0], r[1], r[2]);
}

float* alpha_Quaternion_RotatedVector2Each(float* quat, apr_pool_t* pool, float x, float y, float z)
{
    float vec[3];
    alpha_Vector_Set(vec, x, y, z);
    return alpha_Quaternion_RotatedVector2(quat, pool, vec);
}

float alpha_Quaternion_AngleBetween(float* quat, float* other)
{
    alpha_Quaternion_Normalize(quat);
    alpha_Quaternion_Normalize(other);
    float dot = alpha_Quaternion_DotProduct(quat, other);
    return 2 * acosf(dot / (alpha_Quaternion_Magnitude(quat) * alpha_Quaternion_Magnitude(other)));
}

//----------------------------------------------
//----------------------------------------------
//-----------      MATRICES    -----------------
//----------------------------------------------
//----------------------------------------------

float* alpha_RMatrix4_new(apr_pool_t* pool)
{
    float* m;
    if(pool) {
        m = apr_palloc(pool, sizeof(float)*16);
    }
    else {
        m = malloc(sizeof(float)*16);
    }

    alpha_RMatrix4_Copy(m, alpha_RMatrix4_Identity);

    return m;
}

void alpha_RMatrix4_destroy(apr_pool_t* pool, float* m)
{
    if(!pool) {
        free(m);
    }
}

float* alpha_RMatrix4_Create(apr_pool_t* pool, ...)
{
    float* m = alpha_RMatrix4_new(pool);

    float toVal[16];

    va_list ap;
    va_start(ap, pool);
    for(int i = 0; i < 16; ++i) {
        float v = (float)va_arg(ap, double);
        toVal[i] = v;
    }
    alpha_RMatrix4_Copy(m, toVal);
    va_end(ap);
    return m;
}

void alpha_RMatrix4_Copy(float* dest, float* src)
{
    memcpy(dest, src, sizeof(float)*16);
}

void alpha_RMatrix4_SetEach(float* dest, float a0, float a1, float a2, float a3, float b0, float b1, float b2, float b3, float c0, float c1, float c2, float c3, float d0, float d1, float d2, float d3)
{
    dest[0] = a0; dest[1] = a1; dest[2] = a2; dest[3] = a3;
    dest[4] = b0; dest[5] = b1; dest[6] = b2; dest[7] = b3;
    dest[8] = c0; dest[9] = c1; dest[10] = c2; dest[11] = c3;
    dest[12] = d0; dest[13] = d1; dest[14] = d2; dest[15] = d3;
}

int alpha_RMatrix4_Equals(float* m, float* other)
{
    for(int i = 0; i < 16; ++i) {
        if(fabsf(m[i] - other[i]) > alpha_FUZZINESS) {
            return 0;
        }
    }
    return 1;
}

int alpha_RMatrix4_EqualsEach(float* m, ...)
{
    va_list ap;
    va_start(ap, m);
    for(int i = 0; i < 16; ++i) {
        float v = (float)va_arg(ap, double);
        if(fabsf(m[i] - v) > alpha_FUZZINESS) {
            return 0;
        }
    }
    va_end(ap);
    return 1;
}

float* alpha_RMatrix4_Clone(apr_pool_t* pool, float* m)
{
    float* cloned  = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_Copy(cloned, m);
    return cloned;
}

void alpha_RMatrix4_MultiplyAll(float* m, float s)
{
    // Multiply by the scalar value.
    return alpha_RMatrix4_SetEach(m,
        s*m[0], s*m[1], s*m[2], s*m[3],
        s*m[4], s*m[5], s*m[6], s*m[7],
        s*m[8], s*m[9], s*m[10], s*m[11],
        s*m[12], s*m[13], s*m[14], s*m[15]
    );
}

void alpha_RMatrix4_Multiply(float* m, float* other)
{
    // using quaternions for a Vector4
    float* r1 = &m[0];
    float* r2 = &m[4];
    float* r3 = &m[8];
    float* r4 = &m[12];
    float c1[4];
    float c2[4];
    float c3[4];
    float c4[4];
    alpha_Quaternion_Set(c1, other[0], other[4], other[8], other[12]);
    alpha_Quaternion_Set(c2, other[1], other[5], other[9], other[13]);
    alpha_Quaternion_Set(c3, other[2], other[6], other[10], other[14]);
    alpha_Quaternion_Set(c4, other[3], other[7], other[11], other[15]);
    alpha_RMatrix4_SetEach(m,
        alpha_Quaternion_DotProduct(r1, c1), alpha_Quaternion_DotProduct(r1, c2), alpha_Quaternion_DotProduct(r1, c3), alpha_Quaternion_DotProduct(r1, c4),
        alpha_Quaternion_DotProduct(r2, c1), alpha_Quaternion_DotProduct(r2, c2), alpha_Quaternion_DotProduct(r2, c3), alpha_Quaternion_DotProduct(r2, c4),
        alpha_Quaternion_DotProduct(r3, c1), alpha_Quaternion_DotProduct(r3, c2), alpha_Quaternion_DotProduct(r3, c3), alpha_Quaternion_DotProduct(r3, c4),
        alpha_Quaternion_DotProduct(r4, c1), alpha_Quaternion_DotProduct(r4, c2), alpha_Quaternion_DotProduct(r4, c3), alpha_Quaternion_DotProduct(r4, c4)
    );
}

void alpha_RMatrix4_TranslateEach(float* dest, float x, float y, float z)
{
    // Create the matrix.
    float m[16];
    alpha_RMatrix4_SetIdentity(m);
    m[12] = x;
    m[13] = y;
    m[14] = z;

    alpha_RMatrix4_Multiply(m, dest);
    alpha_RMatrix4_Copy(dest, m);
}

void alpha_RMatrix4_Translate(float* m, float* position)
{
    alpha_RMatrix4_TranslateEach(m, position[0], position[1], position[2]);
}

void alpha_RMatrix4_RotateEach(float* m, float x, float y, float z, float w)
{
    // Create the matrix.
    float r[16];
    alpha_RMatrix4_SetIdentity(r);
    float x2 = x * x;
    float y2 = y * y;
    float z2 = z * z;
    float xy = x * y;
    float xz = x * z;
    float yz = y * z;
    float wx = w * x;
    float wy = w * y;
    float wz = w * z;
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
    alpha_RMatrix4_Multiply(r, m);
    alpha_RMatrix4_Copy(m, r);
}

void alpha_RMatrix4_Rotate(float* m, float* orientation)
{
    alpha_RMatrix4_RotateEach(m, orientation[0], orientation[1], orientation[2], orientation[3]);
}

void alpha_RMatrix4_ScaleEach(float* m, float x, float y, float z)
{
    // Create the matrix.
    float cop[16];
    alpha_RMatrix4_SetIdentity(cop);
    cop[0] = x;
    cop[5] = y;
    cop[10] = z;

    // Multiply in this order.
    alpha_RMatrix4_Multiply(cop, m);
    alpha_RMatrix4_Copy(m, cop);
}

void alpha_RMatrix4_Scale(float* m, float* scale)
{
    alpha_RMatrix4_ScaleEach(m, scale[0], scale[1], scale[2]);
}

float* alpha_RMatrix4_Multiplied(apr_pool_t* pool, float* m, float* other)
{
    float* rv = alpha_RMatrix4_Clone(pool, m);
    alpha_RMatrix4_Multiply(rv, other);
    return rv;
}

float* alpha_RMatrix4_MultipliedEach(apr_pool_t* pool, float* m, ...)
{
    float* rv = alpha_RMatrix4_Clone(pool, m);
    float other[16];
    va_list ap;
    va_start(ap, m);
    for(int i = 0; i < 16; ++i) {
        other[i] = (float)va_arg(ap, double);
    }
    va_end(ap);
    alpha_RMatrix4_Multiply(rv, other);
    return rv;
}

float* alpha_RMatrix4_Inversed(apr_pool_t* pool, float* m)
{
    float* inv = alpha_RMatrix4_new(pool);

  // code was lifted from MESA 3D
  inv[0] = m[5] * m[10] * m[15] -
            m[5]  * m[11] * m[14] -
            m[9]  * m[6]  * m[15] +
            m[9]  * m[7]  * m[14] +
            m[13] * m[6]  * m[11] -
            m[13] * m[7]  * m[10];

  inv[4] = -m[4] * m[10] * m[15] +
           m[4] * m[11] * m[14] +
           m[8] * m[6] * m[15] -
           m[8] * m[7] * m[14] -
           m[12] * m[6] * m[11] +
           m[12] * m[7] * m[10];

  inv[8] = m[4] * m[9] * m[15] -
          m[4] * m[11] * m[13] -
          m[8] * m[5] * m[15] +
          m[8] * m[7] * m[13] +
          m[12] * m[5] * m[11] -
          m[12] * m[7] * m[9];

  inv[12] = -m[4] * m[9] * m[14] +
            m[4] * m[10] * m[13] +
            m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] -
            m[12] * m[5] * m[10] +
            m[12] * m[6] * m[9];

  inv[1] = -m[1] * m[10] * m[15] +
           m[1] * m[11] * m[14] +
           m[9] * m[2] * m[15] -
           m[9]  * m[3] * m[14] -
           m[13] * m[2] * m[11] +
           m[13] * m[3] * m[10];

  inv[5] = m[0] * m[10] * m[15] -
          m[0] * m[11] * m[14] -
          m[8] * m[2] * m[15] +
          m[8] * m[3] * m[14] +
          m[12] * m[2] * m[11] -
          m[12] * m[3] * m[10];

  inv[9] = -m[0] * m[9] * m[15] +
           m[0] * m[11] * m[13] +
           m[8] * m[1] * m[15] -
           m[8] * m[3] * m[13] -
           m[12] * m[1] * m[11] +
           m[12] * m[3] * m[9];

  inv[13] = m[0] * m[9] * m[14] -
           m[0] * m[10] * m[13] -
           m[8] * m[1] * m[14] +
           m[8] * m[2] * m[13] +
           m[12] * m[1] * m[10] -
           m[12] * m[2] * m[9];

  inv[2] = m[1] * m[6] * m[15] -
          m[1] * m[7] * m[14] -
          m[5] * m[2] * m[15] +
          m[5] * m[3] * m[14] +
          m[13] * m[2] * m[7] -
          m[13] * m[3] * m[6];

  inv[6] = -m[0] * m[6] * m[15] +
           m[0] * m[7] * m[14] +
           m[4] * m[2] * m[15] -
           m[4] * m[3] * m[14] -
           m[12] * m[2] * m[7] +
           m[12] * m[3] * m[6];

  inv[10] = m[0] * m[5] * m[15] -
           m[0] * m[7] * m[13] -
           m[4] * m[1] * m[15] +
           m[4] * m[3] * m[13] +
           m[12] * m[1] * m[7] -
           m[12] * m[3] * m[5];

  inv[14] = -m[0] * m[5] * m[14] +
            m[0] * m[6] * m[13] +
            m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] -
            m[12] * m[1] * m[6] +
            m[12] * m[2] * m[5];

  inv[3] = -m[1] * m[6] * m[11] +
           m[1] * m[7] * m[10] +
           m[5] * m[2] * m[11] -
           m[5] * m[3] * m[10] -
           m[9] * m[2] * m[7] +
           m[9] * m[3] * m[6];

  inv[7] = m[0] * m[6] * m[11] -
          m[0] * m[7] * m[10] -
          m[4] * m[2] * m[11] +
          m[4] * m[3] * m[10] +
          m[8] * m[2] * m[7] -
          m[8] * m[3] * m[6];

  inv[11] = -m[0] * m[5] * m[11] +
            m[0] * m[7] * m[9] +
            m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] -
            m[8] * m[1] * m[7] +
            m[8] * m[3] * m[5];

  inv[15] = m[0] * m[5] * m[10] -
           m[0] * m[6] * m[9] -
           m[4] * m[1] * m[10] +
           m[4] * m[2] * m[9] +
           m[8] * m[1] * m[6] -
           m[8] * m[2] * m[5];

    float det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    if(det == 0) {
      parsegraph_log("Determinate in Matrix.Inverse cannot be 0");
      alpha_RMatrix4_destroy(pool, inv);
      return 0;
    }
    det = 1.0 / det;

    for(int i = 0; i < 16; ++i) {
        inv[i] = inv[i] * det;
    }
    return inv;
}

void alpha_RMatrix4_Inverse(float* m)
{
    float* inv = alpha_RMatrix4_Inversed(0, m);
    alpha_RMatrix4_Copy(m, inv);
    alpha_RMatrix4_destroy(0, inv);
}

float* alpha_RMatrix4_Transform(apr_pool_t* pool, float* m, float* quat)
{
    return alpha_RMatrix4_TransformVec(pool, m, quat, quat[3]);
}

float* alpha_RMatrix4_TransformVec(apr_pool_t* pool, float* m, float* vec, float w)
{
    return alpha_RMatrix4_TransformEach(pool, m, vec[0], vec[1], vec[2], w);
}

float* alpha_RMatrix4_TransformEach(apr_pool_t* pool, float* m, float x, float y, float z, float w)
{
    return alpha_Quaternion_Create(pool,
        m[0] * x + m[1] * y + m[2] * z + m[3] * w,
        m[4] * x + m[5] * y + m[6] * z + m[7] * w,
        m[8] * x + m[9] * y + m[10] * z + m[11] * w,
        m[12] * x + m[13] * y + m[14] * z + m[15] * w
    );
};

void alpha_RMatrix4_Transpose(float* m)
{
    alpha_RMatrix4_SetEach(m,
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    );
}

void alpha_RMatrix4FromEuler(apr_pool_t* pool, float* m, float* vec)
{
    alpha_RMatrix4_FromEulerEach(pool, m, vec[0], vec[1], vec[2]);
}

void alpha_RMatrix4_FromEuler(apr_pool_t* pool, float* m, float* vec)
{
    alpha_RMatrix4_FromEulerEach(pool, m, vec[0], vec[1], vec[2]);
}

void alpha_RMatrix4_FromEulerEach(apr_pool_t* pool, float* m, float x, float y, float z)
{
    float sx = sinf(x);
    float cx = cosf(x);
    float sy = cosf(y);
    float sz = sinf(z);
    float cz = cosf(z);

    alpha_RMatrix4_SetEach(m,
        sy * cx, sx, -sy * cx, 0,
        -sy*sx*cz + sy*sz, cx*cz, sy*sx*cz + sy*sz, 0,
        sy*sx*sz + sy*cz, -cx*sz, -sy*sx*sz + sy*cz, 0,
        0, 0, 0, 1
    );
}

float* alpha_RMatrix4FromQuaternion(apr_pool_t* pool, float* quat)
{
    float* m = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_FromQuaternion(m, quat);
    return m;
};

float* alpha_RMatrix4FromQuaternionEach(apr_pool_t* pool, float x, float y, float z, float w)
{
    float* m = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_FromQuaternionEach(m, x, y, z, w);
    return m;
};

void alpha_RMatrix4_FromQuaternion(float* m, float* quat)
{
    alpha_RMatrix4_FromQuaternionEach(m, quat[0], quat[1], quat[2], quat[3]);
}

void alpha_RMatrix4_FromQuaternionEach(float* m, float x, float y, float z, float w)
{
    float x2 = x * x;
    float y2 = y * y;
    float z2 = z * z;
    float xy = x * y;
    float xz = x * z;
    float yz = y * z;
    float wx = w * x;
    float wy = w * y;
    float wz = w * z;

    alpha_RMatrix4_SetEach(m,
        1 - 2 * (y2 + z2), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (x2 + z2), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (x2 + y2), 0,
        0, 0, 0, 1
    );
}

float* alpha_RMatrix4FromQuaternionAtVector(apr_pool_t* pool, float* quat, float* vector)
{
    float* m = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_FromQuaternionAtVector(m, quat, vector);
    return m;
};

// equivalent to rotationMatrix * translationMatrix;
void alpha_RMatrix4_FromQuaternionAtVector(float* m, float* quat, float* vector)
{
    alpha_RMatrix4_FromQuaternion(m, quat);
    m[12] = vector[0];
    m[13] = vector[1];
    m[14] = vector[2];
};

float* alpha_RMatrix4FromVectorAroundQuaternion(apr_pool_t* pool, float* vector, float* quat)
{
    float* m = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_FromVectorAroundQuaternion(m, vector, quat);
    return m;
};

// equivalent to
// translationMatrix * rotationMatrix
// the 4th value in this matrix multplication always end up as 0
void alpha_RMatrix4_FromVectorAroundQuaternion(float* m, float* vector, float* quat)
{
    // set our 3x3 rotation matrix
    alpha_RMatrix4_FromQuaternion(m, quat);

    // set our critical rows and columns
    float r4[4];
    float c1[4];
    float c2[4];
    float c3[4];
    alpha_Quaternion_Set(r4, vector[0], vector[1], vector[2], 0);
    alpha_Quaternion_Set(c1, m[0], m[4], m[8], 1);
    alpha_Quaternion_Set(c2, m[1], m[5], m[9], 1);
    alpha_Quaternion_Set(c3, m[2], m[6], m[10], 1);

    m[12] = alpha_Quaternion_DotProduct(r4, c1);
    m[13] = alpha_Quaternion_DotProduct(r4, c2);
    m[14] = alpha_Quaternion_DotProduct(r4, c3);
}

float* alpha_RMatrix4FromVectorAroundQuaternionAtVector(apr_pool_t* pool, float* vec1, float* quat, float* vec2)
{
    float* m = alpha_RMatrix4_new(pool);
    alpha_RMatrix4_FromVectorAroundQuaternionAtVector(m, vec1, quat, vec2);
    return m;
};

void alpha_dumpMatrix(const char* prefix, float* m)
{
    parsegraph_log("%s[\n%f %f %f %f,\n%f %f %f %f,\n%f %f %f %f,\n%f %f %f %f]\n", 
		    prefix,
		    m[0], m[1], m[2], m[3],
		    m[4], m[5], m[6], m[7],
		    m[8], m[9], m[10], m[11],
		    m[12], m[13], m[14], m[15]
    );
}

/**
 * translation * rotation * translation
 * TranslationMatrix(vec2) * rotationMatrix(quat) * translationMatrix(vec1)
 */
void alpha_RMatrix4_FromVectorAroundQuaternionAtVector(float* m, float* vec1, float* quat, float* vec2)
{
    // rotation * translation;
    alpha_RMatrix4_FromQuaternion(m, quat);
    m[12] = vec2[0];
    m[13] = vec2[1];
    m[14] = vec2[2];

    // set our critical rows and columns
    float r4[4];
    float c1[4];
    float c2[4];
    float c3[4];
    alpha_Quaternion_Set(r4, vec1[0], vec1[1], vec1[2], 0);
    alpha_Quaternion_Set(c1, m[0], m[4], m[8], m[12]);
    alpha_Quaternion_Set(c2, m[1], m[5], m[9], m[13]);
    alpha_Quaternion_Set(c3, m[2], m[6], m[10], m[14]);

    m[12] = alpha_Quaternion_DotProduct(r4, c1);
    m[13] = alpha_Quaternion_DotProduct(r4, c2);
    m[14] = alpha_Quaternion_DotProduct(r4, c3);
};

static float alpha_RMatrix4_scratch[16];

float* alpha_getScratchMatrix()
{
    alpha_RMatrix4_SetIdentity(alpha_RMatrix4_scratch);
    return alpha_RMatrix4_scratch;
}

