#include "../unity.h"
#include "../testpool.h"
#include <alpha/Cam.h>

void test_alpha_Cam_new()
{
    alpha_Camera* cam = alpha_Camera_new(pool);
    alpha_Camera_destroy(cam);
}

void test_alpha_Cam()
{
    RUN_TEST(test_alpha_Cam_new);
}
