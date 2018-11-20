#ifndef parsegraph_Float32List_INCLUDED
#define parsegraph_Float32List_INCLUDED

#include <apr_pools.h>

struct parsegraph_Float32List {
double* data;
size_t _capacity;
size_t _length;
};
typedef struct parsegraph_Float32List parsegraph_Float32List;

parsegraph_Float32List* parsegraph_Float32List_new(apr_pool_t* pool);
void parsegraph_Float32List_push(parsegraph_Float32List* list, size_t count, ...);
void parsegraph_Float32List_clear(parsegraph_Float32List* list);
size_t parsegraph_Float32List_length(parsegraph_Float32List* list);
size_t parsegraph_Float32List_capacity(parsegraph_Float32List* list);
float* parsegraph_Float32List_slice(parsegraph_Float32List* list);

#endif // parsegraph_Float32List_INCLUDED
