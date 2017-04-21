#include "../unity.h"
#include "../testpool.h"
#include <stdio.h>
#include <httpd.h>

#include <graph/Extent.h>

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

void forEach_sumLength(void* data, float length, float size, int i)
{
    *((float*)data) += length;
}

void forEach_sumSize(void* data, float length, float size, int i)
{
    *((float*)data) += size;
}

void test_Extent_forEach()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 15, 40);
    parsegraph_Extent_appendLS(extent, 5, 30);

    float d = 0;
    parsegraph_Extent_forEach(extent, forEach_sumSize, &d);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        90, d, "Size sum"
    );
    d = 0;
    parsegraph_Extent_forEach(extent, forEach_sumLength, &d);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        30, d, "Length sum"
    );
}

void test_Extent_simplify()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);

    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 5, 20);
    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_numBounds(extent),
        "Simplify is automatically done for appends."
    );
    parsegraph_Extent_simplify(extent);

    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_numBounds(extent),
        "Simplify must merge bounds with equal sizes."
    );
}

void test_Extent_clone()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 5, 20);

    struct parsegraph_Extent* b = parsegraph_Extent_clone(extent);
    parsegraph_Extent_simplify(b);

    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_numBounds(b),
        "Clone copies exactly"
    );
}

void test_Extent_clear()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 5, 20);
    parsegraph_Extent_clear(extent);

    TEST_ASSERT_EQUAL_INT_MESSAGE(
        0, parsegraph_Extent_numBounds(extent),
        "clear must clear numBounds"
    );
}

void test_Extent_hasBounds()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 5, 20);
    TEST_ASSERT_EQUAL_INT_MESSAGE(
        1, parsegraph_Extent_hasBounds(extent),
        "hasBounds must return true"
    );
    parsegraph_Extent_clear(extent);

    TEST_ASSERT_EQUAL_INT_MESSAGE(
        0, parsegraph_Extent_hasBounds(extent),
        "clear must show hasBounds"
    );
}

void test_Extent_boundLengthAt()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 15, 20);
    parsegraph_Extent_appendLS(extent, 5, 30);

    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        25,
        parsegraph_Extent_boundLengthAt(extent, 0),
        "boundLengthAt 0 must be 25"
    );

    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        5,
        parsegraph_Extent_boundLengthAt(extent, 1),
        "boundLengthAt 1 must be 5"
    );
}

void test_Extent_boundSizeAt()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 15, 20);
    parsegraph_Extent_appendLS(extent, 5, 30);

    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        20,
        parsegraph_Extent_boundSizeAt(extent, 0),
        "boundSizeAt 0 must be 25"
    );

    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        30,
        parsegraph_Extent_boundSizeAt(extent, 1),
        "boundSizeAt 1 must be 30"
    );
}

void test_Extent_prependLS()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_prependLS(extent, 15, 20);

    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        25,
        parsegraph_Extent_boundLengthAt(extent, 0),
        "boundLengthAt 0 must be 25"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        20,
        parsegraph_Extent_boundSizeAt(extent, 0),
        "boundSizeAt 0 must be 20"
    );

    parsegraph_Extent_prependLS(extent, 15, 25);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        15,
        parsegraph_Extent_boundLengthAt(extent, 0),
        "boundLengthAt 0 must be 15"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        25,
        parsegraph_Extent_boundSizeAt(extent, 0),
        "boundSizeAt 0 must be 25"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        25,
        parsegraph_Extent_boundLengthAt(extent, 1),
        "boundLengthAt 1 must be 25"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        20,
        parsegraph_Extent_boundSizeAt(extent, 1),
        "boundSizeAt 1 must be 20"
    );
}

void test_Extent_realloc()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 1, 2);
    parsegraph_Extent_appendLS(extent, 2, 3);
    parsegraph_Extent_appendLS(extent, 3, 4);

    TEST_ASSERT_EQUAL_INT_MESSAGE(4, parsegraph_Extent_boundCapacity(extent), "Capacity is what's expected");
    parsegraph_Extent_prependLS(extent, .5, 1);

    parsegraph_Extent_appendLS(extent, 4, 5);
    TEST_ASSERT_EQUAL_INT_MESSAGE(8, parsegraph_Extent_boundCapacity(extent), "Capacity is what's expected");

    TEST_ASSERT_EQUAL_FLOAT(.5, parsegraph_Extent_boundLengthAt(extent, 0));
    TEST_ASSERT_EQUAL_FLOAT(1, parsegraph_Extent_boundLengthAt(extent, 1));
    TEST_ASSERT_EQUAL_FLOAT(2, parsegraph_Extent_boundLengthAt(extent, 2));
    TEST_ASSERT_EQUAL_FLOAT(3, parsegraph_Extent_boundLengthAt(extent, 3));
    TEST_ASSERT_EQUAL_FLOAT(4, parsegraph_Extent_boundLengthAt(extent, 4));

    TEST_ASSERT_EQUAL_FLOAT(1, parsegraph_Extent_boundSizeAt(extent, 0));
    TEST_ASSERT_EQUAL_FLOAT(2, parsegraph_Extent_boundSizeAt(extent, 1));
    TEST_ASSERT_EQUAL_FLOAT(3, parsegraph_Extent_boundSizeAt(extent, 2));
    TEST_ASSERT_EQUAL_FLOAT(4, parsegraph_Extent_boundSizeAt(extent, 3));
    TEST_ASSERT_EQUAL_FLOAT(5, parsegraph_Extent_boundSizeAt(extent, 4));
}

void test_Extent_adjustSize()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_prependLS(extent, 15, 20);
    parsegraph_Extent_prependLS(extent, 15, 25);
    parsegraph_Extent_adjustSize(extent, 2);
    //parsegraph_Extent_dump(extent);
    //fprintf(stderr, "%f", parsegraph_Extent_boundLengthAt(extent, 0));
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        15,
        parsegraph_Extent_boundLengthAt(extent, 0),
        "boundLengthAt 0 must be 15"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        27,
        parsegraph_Extent_boundSizeAt(extent, 0),
        "boundSizeAt 0 must be 27"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        25,
        parsegraph_Extent_boundLengthAt(extent, 1),
        "boundLengthAt 1 must be 25"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        22,
        parsegraph_Extent_boundSizeAt(extent, 1),
        "boundSizeAt 1 must be 22"
    );
}

void test_Extent_sizeAt()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);
    parsegraph_Extent_appendLS(extent, 10, 20);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(NAN, parsegraph_Extent_sizeAt(extent, -1), "Size at -1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 0), "Size at 0");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(50, parsegraph_Extent_sizeAt(extent, 21), "Size at 21");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 41), "Size at 41");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(NAN, parsegraph_Extent_sizeAt(extent, 51), "Size at 51");
}

void test_Extent_scale()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 25, 20);
    parsegraph_Extent_appendLS(extent, 10, NAN);
    parsegraph_Extent_appendLS(extent, 15, 25);
    parsegraph_Extent_scale(extent, 2);
    //parsegraph_Extent_dump(extent);
    //fprintf(stderr, "%f", parsegraph_Extent_boundLengthAt(extent, 0));
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        50,
        parsegraph_Extent_boundLengthAt(extent, 0),
        "boundLengthAt 0 must be 50"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        40,
        parsegraph_Extent_boundSizeAt(extent, 0),
        "boundSizeAt 0 must be 40"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        20,
        parsegraph_Extent_boundLengthAt(extent, 1),
        "boundLengthAt 1 must be 20"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        NAN,
        parsegraph_Extent_boundSizeAt(extent, 1),
        "boundSizeAt 1 must be NAN"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        30,
        parsegraph_Extent_boundLengthAt(extent, 2),
        "boundLengthAt 2 must be 30"
    );
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(
        50,
        parsegraph_Extent_boundSizeAt(extent, 2),
        "boundSizeAt 2 must be 50"
    );
}

void test_Extent_combinedExtent()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);
    parsegraph_Extent_appendLS(extent, 10, 20);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(NAN, parsegraph_Extent_sizeAt(extent, -1), "Size at -1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 0), "Size at 0");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(50, parsegraph_Extent_sizeAt(extent, 21), "Size at 21");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 41), "Size at 41");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(NAN, parsegraph_Extent_sizeAt(extent, 51), "Size at 51");
}

void test_Extent_combineExtent()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    struct parsegraph_Extent* given = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(given, 5, NAN);
    parsegraph_Extent_appendLS(given, 10, 25);

    parsegraph_Extent_combineExtent(extent, given, 0, 0, 1.0);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 1), "Size at 1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(25, parsegraph_Extent_sizeAt(extent, 6), "Size at 6");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(50, parsegraph_Extent_sizeAt(extent, 16), "Size at 16");
}


void test_Extent_combineBound()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    //parsegraph_Extent_dump(extent);
    parsegraph_Extent_combineBound(extent, 5, 10, 25);
    //parsegraph_Extent_dump(extent);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, parsegraph_Extent_sizeAt(extent, 1), "Size at 1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(25, parsegraph_Extent_sizeAt(extent, 6), "Size at 6");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(50, parsegraph_Extent_sizeAt(extent, 16), "Size at 16");
}

void test_Extent_copyFrom()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    struct parsegraph_Extent* given = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(given, 5, 25);

    parsegraph_Extent_copyFrom(extent, given);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(25, parsegraph_Extent_sizeAt(extent, 1), "Size at 1");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(NAN, parsegraph_Extent_sizeAt(extent, 6), "Size at 6");

    TEST_ASSERT_EQUAL_INT_MESSAGE(1, parsegraph_Extent_hasBounds(extent), "Extent has bounds");
    TEST_ASSERT_EQUAL_INT_MESSAGE(0, parsegraph_Extent_hasBounds(given), "Moved extent has no bounds");
}

void test_Extent_separation()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    struct parsegraph_Extent* given = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(given, 10, 20);

    //fprintf(stderr, "%f", parsegraph_Extent_separation(extent, given, 0, 0, 1.0, 0));
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(40, parsegraph_Extent_separation(extent, given, 0, 0, 1.0, 0), "Separation");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(0, parsegraph_Extent_separation(extent, given, 40, 1, 1.0, 0), "Separation with axis overlap");
}

void test_Extent_boundingValues()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    float totalLength, minSize, maxSize;
    parsegraph_Extent_boundingValues(extent, &totalLength, &minSize, &maxSize);
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(40, totalLength, "totalLength");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(20, minSize, "minSize");
    TEST_ASSERT_EQUAL_FLOAT_MESSAGE(50, maxSize, "maxSize");
}

void test_Extent_equals()
{
    struct parsegraph_Extent* extent = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(extent, 10, 20);
    parsegraph_Extent_appendLS(extent, 30, 50);

    struct parsegraph_Extent* given = parsegraph_Extent_new(pool);
    parsegraph_Extent_appendLS(given, 10, 20);

    TEST_ASSERT_EQUAL_INT(1, parsegraph_Extent_equals(extent, extent));
    TEST_ASSERT_EQUAL_INT(1, parsegraph_Extent_equals(given, given));

    TEST_ASSERT_EQUAL_INT(0, parsegraph_Extent_equals(extent, given));
    TEST_ASSERT_EQUAL_INT(0, parsegraph_Extent_equals(given, extent));

    parsegraph_Extent_appendLS(given, 30, 50);
    TEST_ASSERT_EQUAL_INT(1, parsegraph_Extent_equals(extent, given));
    TEST_ASSERT_EQUAL_INT(1, parsegraph_Extent_equals(given, extent));

    parsegraph_Extent_appendLS(given, 30, 50);
    TEST_ASSERT_EQUAL_INT(0, parsegraph_Extent_equals(extent, given));
    TEST_ASSERT_EQUAL_INT(0, parsegraph_Extent_equals(given, extent));
}

void test_Extent()
{
    // Run the tests.
    RUN_TEST(test_Extent_numBounds);
    RUN_TEST(test_Extent_simplify);
    RUN_TEST(test_Extent_forEach);
    RUN_TEST(test_Extent_clone);
    RUN_TEST(test_Extent_clear);
    RUN_TEST(test_Extent_hasBounds);
    RUN_TEST(test_Extent_boundLengthAt);
    RUN_TEST(test_Extent_boundSizeAt);
    RUN_TEST(test_Extent_prependLS);
    RUN_TEST(test_Extent_realloc);
    RUN_TEST(test_Extent_adjustSize);
    RUN_TEST(test_Extent_sizeAt);
    RUN_TEST(test_Extent_combinedExtent);
    RUN_TEST(test_Extent_scale);
    RUN_TEST(test_Extent_combineBound);
    RUN_TEST(test_Extent_copyFrom);
    RUN_TEST(test_Extent_separation);
    RUN_TEST(test_Extent_boundingValues);
    RUN_TEST(test_Extent_equals);
}
