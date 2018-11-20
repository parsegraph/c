#include "Float32List.h"
#include <stdarg.h>
#include <stdlib.h>

parsegraph_Float32List* parsegraph_Float32List_new(apr_pool_t* pool)
{
    parsegraph_Float32List* list = apr_palloc(pool, sizeof(*list));

    list->_capacity = 8;
    list->_length = 0;
    list->data = malloc(sizeof(float)*list->_capacity);

    return list;
}

void parsegraph_Float32List_push(parsegraph_Float32List* list, size_t count, ...)
{
    va_list ap;

    va_start(ap, count);
    for(int i = 0; i < count; ++i) {
        double ptr = va_arg(ap, double);
        while(list->_length >= list->_capacity) {
            list->_capacity *= 2;
            list->data = realloc(list->data, sizeof(float)*list->_capacity);
        }
        list->data[list->_length++] = ptr;
    }
    va_end(ap);
}

void parsegraph_Float32List_clear(parsegraph_Float32List* list)
{
    list->_length = 0;
}

size_t parsegraph_Float32List_length(parsegraph_Float32List* list)
{
    return list->_length;
}

size_t parsegraph_Float32List_capacity(parsegraph_Float32List* list)
{
    return list->_capacity;
}

float* parsegraph_Float32List_slice(parsegraph_Float32List* list)
{
    float* copy = malloc(sizeof(float)*list->_length);
    memcpy(copy, list->data, sizeof(float)*list->_length);
    return copy;
}
