#ifndef alpha_Maths_INCLUDED
#define alpha_Maths_INCLUDED

#include <apr_pools.h>
#include <stdarg.h>
#include <apr_time.h>

extern float alpha_FUZZINESS;
extern float alpha_RMatrix4_Identity[];
void alpha_RMatrix4_SetIdentity(float* m);
void alpha_RMatrix4_Copy(float* dest, float* src);
void alpha_RMatrix4_SetEach(float* dest, float a0, float a1, float a2, float a3, float b0, float b1, float b2, float b3, float c0, float c1, float c2, float c3, float d0, float d1, float d2, float d3);
float* alpha_RMatrix4_Create(apr_pool_t* pool, ...);
float* alpha_RMatrix4_new(apr_pool_t* pool);
long int alpha_random(long int min, long int max);
float* alpha_Vector_new(apr_pool_t* pool);
float* alpha_Vector_create(apr_pool_t* pool, float x, float y, float z);
void alpha_Vector_Add(float* v, float* toAdd);
void alpha_Vector_AddEach(float* v, float x, float y, float z);
float* alpha_Vector_Added(apr_pool_t* pool, float* v, float* toAdd);
float* alpha_Vector_AddedEach(apr_pool_t* pool, float* v, float x, float y, float z);
void alpha_Vector_Copy(float* dest, float* src);
float* alpha_Vector_Clone(apr_pool_t* pool, float* src);
void alpha_Vector_Multiply(float* vec, float* other);
void alpha_Vector_MultiplyEach(float* vec, float x, float y, float z);
float* alpha_Vector_Multiplied(apr_pool_t* pool, float* vec, float* other);
float* alpha_Vector_MultipliedEach(apr_pool_t* pool, float* vec, float x, float y, float z);
void alpha_Vector_Divide(float* vec, float* denom);
void alpha_Vector_DivideAll(float* vec, float val);
void alpha_Vector_DivideEach(float* vec, float x, float y, float z);
int alpha_Vector_Equals(float* m, float* other);
int alpha_Vector_EqualsEach(float* m, float x, float y, float z);
void alpha_Vector_Set(float*, float, float, float);
void alpha_Vector_Normalize(float* vec);
float* alpha_Vector_Normalized(apr_pool_t* pool, float* vec);
float alpha_Vector_Magnitude(float* vec);
float alpha_Vector_Length(float* vec);
float alpha_Vector_DotProduct(float* vec, float* other);
float alpha_Vector_AngleBetween(float* vec, float* other);
float* alpha_Quaternion_new(apr_pool_t* pool);
void alpha_Quaternion_Set(float* quat, float angle, float x, float y, float z);
int alpha_Quaternion_Equals(float* quat, float* other);
int alpha_Quaternion_EqualsEach(float* quat, float x, float y, float z, float w);
float alpha_toRadians(float inDegrees);
float alpha_toDegrees(float inRadians);
void alpha_Quaternion_Copy(float* dest, float* src);
void alpha_Quaternion_destroy(apr_pool_t* pool, float* quat);
float* alpha_Quaternion_Multiplied(apr_pool_t* pool, float* quat, float* other);
void alpha_Vector_destroy(apr_pool_t* pool, float* v);
float* alpha_RMatrix4_Inversed(apr_pool_t* pool, float* m);
void alpha_RMatrix4_destroy(apr_pool_t* pool, float* m);
float* alpha_QuaternionFromAxisAndAngle(apr_pool_t* pool, float* vec, float angle);
float* alpha_QuaternionFromAxisAndAngleEach(apr_pool_t* pool, float x, float y, float z, float angle);
void alpha_Quaternion_Multiply(float* quat, float* other);
void alpha_Quaternion_Normalize(float* quat);
float* alpha_Quaternion_RotatedVectorEach(float* quat, apr_pool_t* pool, float x, float y, float z);
float* alpha_Quaternion_RotatedVector(float* quat, apr_pool_t* pool, float* vec);
float* alpha_Quaternion_Inverse(apr_pool_t* pool, float* quat);
void alpha_Quaternion_FromAxisAndAngle(float* quat, float* vec, float angle);
void alpha_Quaternion_FromAxisAndAngleEach(float* quat, float x, float y, float z, float angle);
float* alpha_Quaternion_RotatedVector2(float* quat, apr_pool_t* pool, float* vec);
float* alpha_Quaternion_RotatedVector2Each(float* quat, apr_pool_t* pool, float x, float y, float z);
void alpha_Vector_SetIdentity(float* vec);
float alpha_Quaternion_AngleBetween(float* quat, float* other);
void alpha_Quaternion_SetIdentity(float* quat);
void alpha_RMatrix4_Translate(float* m, float* position);
void alpha_RMatrix4_Rotate(float* m, float* orientation);
void alpha_RMatrix4_RotateEach(float* m, float x, float y, float z, float w);
void alpha_RMatrix4_Scale(float* m, float* scale);
float* alpha_RMatrix4_Multiplied(apr_pool_t* pool, float* m, float* position);
void alpha_RMatrix4_Multiply(float* m, float* other);
void alpha_RMatrix4_Inverse(float* m);
void alpha_RMatrix4_FromVectorAroundQuaternionAtVector(float* dest, float* pos, float* rot, float* offset);
int alpha_RMatrix4_Equals(float* m, float* other);
int alpha_RMatrix4_EqualsEach(float* m, ...);
float* alpha_RMatrix4_Transform(apr_pool_t* pool, float* m, float* quat);
float* alpha_RMatrix4_TransformVec(apr_pool_t* pool, float* m, float* vec, float w);
float* alpha_RMatrix4_TransformEach(apr_pool_t* pool, float* m, float x, float y, float z, float w);
void alpha_RMatrix4_Transpose(float* m);
float* alpha_RMatrix4FromQuaternion(apr_pool_t* pool, float* quat);
float* alpha_RMatrix4FromQuaternionEach(apr_pool_t* pool, float x, float y, float z, float w);
void alpha_RMatrix4_FromQuaternion(float* m, float* quat);
void alpha_RMatrix4_FromQuaternionEach(float* m, float x, float y, float z, float w);
void alpha_RMatrix4_FromEulerEach(apr_pool_t* pool, float* m, float x, float y, float z);
void alpha_RMatrix4_FromEuler(apr_pool_t* pool, float* m, float* vec);
void alpha_RMatrix4FromEuler(apr_pool_t* pool, float* m, float* vec);
float* alpha_RMatrix4FromQuaternionAtVector(apr_pool_t* pool, float* quat, float* vector);
void alpha_RMatrix4_FromQuaternionAtVector(float* m, float* quat, float* vector);
float* alpha_RMatrix4FromVectorAroundQuaternion(apr_pool_t* pool, float* vector, float* quat);
void alpha_RMatrix4_FromVectorAroundQuaternion(float* m, float* vector, float* quat);
float* alpha_RMatrix4FromVectorAroundQuaternionAtVector(apr_pool_t* pool, float* vec1, float* quat, float* vec2);
void alpha_RMatrix4_FromVectorAroundQuaternionAtVector(float* m, float* vec1, float* quat, float* vec2);
void alpha_dumpMatrix(const char* prefix, float* m);
float alpha_GetTime();

#endif // alpha_Maths_INCLUDED
