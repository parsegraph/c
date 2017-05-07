#include "../unity.h"
#include "../testpool.h"
#include <stdio.h>
#include <httpd.h>

#include <alpha/BlockStuff.h>

void test_alpha_Color_Set()
{
    float v[3];
    alpha_Color_Set(v, .1, .2, .3);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.1, v[0], "Red is .1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.2, v[1], "Green is .2");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.3, v[2], "Blue is .3");
}

void test_alpha_Face_new()
{
    alpha_Face* face = alpha_Face_new(pool, alpha_TRIANGLES);
    alpha_Face_destroy(face);
}

void test_alpha_Skin_new()
{
    alpha_Skin* skin = alpha_Skin_new(pool);
    alpha_Skin_destroy(skin);
}

void test_alpha_Skin_addFace()
{
    // skins
    float* dbrown = alpha_ColorFromStr(pool, "#3b2921");
    float* lbrown = alpha_ColorFromStr(pool, "#604b42");
    float* ggreen = alpha_ColorFromStr(pool, "#0b9615");

    alpha_Skin* grass = alpha_createSkin(pool,
        alpha_createFace(pool, alpha_QUADS, ggreen, ggreen, ggreen, ggreen, 0), // top
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // front
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // left
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // back
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // right
        alpha_createFace(pool, alpha_QUADS, dbrown, dbrown, dbrown, dbrown, 0), //bottom
        0
    );
    alpha_Skin_destroy(grass);
}

void test_alpha_Skin_removeAt()
{
}

void test_alpha_Color_SetAll()
{
    float v[3];
    alpha_Color_SetAll(v, .4);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.4, v[0], "Red is .4");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.4, v[1], "Green is .4");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.4, v[2], "Blue is .4");
}

void test_alpha_Color_Copy()
{
    float a[3];
    alpha_Color_Set(a, .1, .2, .3);
    float b[3];
    alpha_Color_Copy(b, a);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.1, b[0], "Red is copied");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.2, b[1], "Green is copied");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(.3, b[2], "Blue is copied");
}

void test_alpha_Color_SetInt()
{
    float v[3];
    alpha_Color_SetInt(v, 127, 56, 23);
    TEST_ASSERT_MESSAGE(v[0] != 0.0, "Red is present");
    TEST_ASSERT_MESSAGE(v[1] != 0.0, "Green is present");
    TEST_ASSERT_MESSAGE(v[2] != 0.0, "Blue is present");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(127.0/255, v[0], "Red is 127/255");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(56.0/255, v[1], "Green is 56/255");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(23.0/255, v[2], "Blue is 23/255");
}

void test_alpha_Color_Equals()
{
    float a[3];
    alpha_Color_SetInt(a, 127, 56, 23);

    float b[3];
    alpha_Color_SetInt(b, 127, 56, 23);

    TEST_ASSERT_MESSAGE(alpha_Color_Equals(a, b), "Equals is equals");
    alpha_Color_SetInt(b, 127, 56, 24);
    TEST_ASSERT_MESSAGE(!alpha_Color_Equals(a, b), "Blue diff is detected");
    alpha_Color_SetInt(b, 127, 56, 23);
    TEST_ASSERT_MESSAGE(alpha_Color_Equals(a, b), "Reset");
    alpha_Color_SetInt(b, 127, 55, 23);
    TEST_ASSERT_MESSAGE(!alpha_Color_Equals(a, b), "Green diff is detected");
    alpha_Color_SetInt(b, 127, 56, 23);
    TEST_ASSERT_MESSAGE(alpha_Color_Equals(a, b), "Reset");
    alpha_Color_SetInt(b, 126, 56, 23);
    TEST_ASSERT_MESSAGE(!alpha_Color_Equals(a, b), "Red diff is detected");
    alpha_Color_SetInt(b, 127, 56, 23);
    TEST_ASSERT_MESSAGE(alpha_Color_Equals(a, b), "Reset");
}

void test_alpha_Color_EqualsValue()
{
    float a[3];
    alpha_Color_SetAll(a, .3);
    TEST_ASSERT(alpha_Color_EqualsValue(a, .3));
}

void test_alpha_Color_EqualsValues()
{
    float a[3];
    alpha_Color_SetInt(a, 127, 56, 23);
    TEST_ASSERT(alpha_Color_EqualsValues(a, 127.0/255, 56.0/255, 23.0/255));
}

void test_alpha_Color_EqualsInt()
{
    float a[3];
    alpha_Color_SetInt(a, 127, 56, 23);
    TEST_ASSERT(alpha_Color_EqualsInt(a, 127, 56, 23));
}

void test_alpha_Color_SetAllInt()
{
    float a[3];
    alpha_Color_SetAllInt(a, 127);
    TEST_ASSERT(alpha_Color_EqualsInt(a, 127, 127, 127));
}

void test_alpha_Color_Parse()
{
    float a[3];
    alpha_Color_Parse(a, "#fff00f");
    //fprintf(stderr, "%f %f %f %s", a[0], a[1], a[2], alpha_Color_asRGB(pool, a));
    TEST_ASSERT_MESSAGE(a[0] == (float)0xff/255, "R");
    TEST_ASSERT_MESSAGE(a[1] == (float)0xf0/255, "G");
    TEST_ASSERT_MESSAGE(a[2] == (float)0x0f/255, "B");
    //fprintf(stderr, "%s", alpha_Color_asRGB(pool, a));
    TEST_ASSERT_MESSAGE(alpha_Color_EqualsInt(a, 255, 240, 15), "EqualsInt");
}

void test_alpha_Color()
{
    RUN_TEST(test_alpha_Color_Set);
    RUN_TEST(test_alpha_Color_SetAll);
    RUN_TEST(test_alpha_Color_Copy);
    RUN_TEST(test_alpha_Color_SetInt);
    RUN_TEST(test_alpha_Color_SetAllInt);
    RUN_TEST(test_alpha_Color_Equals);
    RUN_TEST(test_alpha_Color_EqualsValue);
    RUN_TEST(test_alpha_Color_EqualsInt);
    RUN_TEST(test_alpha_Color_EqualsValues);
    RUN_TEST(test_alpha_Color_Parse);
}
