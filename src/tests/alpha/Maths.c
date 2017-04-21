#include "../unity.h"
#include "../testpool.h"
#include <stdio.h>
#include <httpd.h>

#include <alpha/Maths.h>

void test_alpha_RMatrix4_new()
{
    float* m = alpha_RMatrix4_new(pool);
    TEST_ASSERT(m != 0);
}

void test_alpha_Maths()
{
    RUN_TEST(test_alpha_RMatrix4_new);
}
