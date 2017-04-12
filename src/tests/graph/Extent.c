#include "../unity.h"
#include <stdio.h>
#include <httpd.h>

#include <graph/Extent.h>

static apr_pool_t* pool = NULL;

void test_Extent_numBounds()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    TEST_ASSERT_EQUAL_INT_MESSAGE(
        0, parsegraph_Extent_numBounds(extent),
        "Extent must initially be empty."
    );
    parsegraph_Extent_appendLS(extent, 10, 20);
    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_numBounds(extent),
        "Extent must grow when appended."
    );
    parsegraph_Extent_clear(extent);
    TEST_ASSERT_EQUAL_INT_MESSAGE(
        0, parsegraph_Extent_numBounds(extent),
        "Extent must be emptied when cleared."
    );
}

void test_Extent_simplify()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);

    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 5, 20);
    parsegraph_Extent_simplify(extent);

    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_numBounds(extent),
        "Simplify must merge bounds with equal sizes."
    );
}

int main(int argc, const char* const* argv)
{
    UNITY_BEGIN();

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed initializing APR. APR status of %d.\n", rv);
        return -1;
    }
    rv = apr_pool_create(&pool, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed creating memory pool. APR status of %d.\n", rv);
        return -1;
    }

    // Run the tests.
    RUN_TEST(test_Extent_numBounds);
    RUN_TEST(test_Extent_simplify);

    // Destroy the pool for cleanliness.
    apr_pool_destroy(pool);
    pool = NULL;

    apr_terminate();

    return UNITY_END();
}
