#include "unity.h"
#include "testpool.h"
#include <stdio.h>
#include <httpd.h>

apr_pool_t* pool = NULL;

void test_Extent();
void test_alpha_Color();
void test_alpha_Maths();
void test_alpha_Physical();
void test_parsegraph_pagingbuffer();

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
    test_Extent();
    test_alpha_Maths();
    test_alpha_Color();
    test_alpha_Physical();

    // Destroy the pool for cleanliness.
    apr_pool_destroy(pool);
    pool = NULL;

    apr_terminate();

    return UNITY_END();
}
