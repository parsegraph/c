#include "../unity.h"
#include "../testpool.h"
#include <stdio.h>
#include <httpd.h>

#include <alpha/Physical.h>

void test_alpha_Physical_new()
{
    struct alpha_Physical* p = alpha_Physical_new(pool);
    TEST_ASSERT(p != 0);
}

void test_alpha_Physical()
{
    RUN_TEST(test_alpha_Physical_new);
}
