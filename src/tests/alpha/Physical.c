#include "../unity.h"
#include "../testpool.h"
#include <stdio.h>
#include <httpd.h>

#include <alpha/Cam.h>
#include <alpha/Physical.h>

void test_alpha_Physical_new()
{
    alpha_Camera* cam = alpha_Camera_new(pool);
    struct alpha_Physical* p = alpha_Physical_new(pool, 0, cam);
    TEST_ASSERT(p != 0);
    alpha_Physical_destroy(p);
    alpha_Camera_destroy(cam);
}

void test_alpha_Physical()
{
    RUN_TEST(test_alpha_Physical_new);
}
