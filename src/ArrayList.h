#ifndef parsegraph_ArrayList_INCLUDED
#define parsegraph_ArrayList_INCLUDED

#include <apr_pools.h>

struct parsegraph_ArrayList {
void** data;
size_t _length;
size_t _capacity;
};
typedef struct parsegraph_ArrayList parsegraph_ArrayList;

parsegraph_ArrayList* parsegraph_ArrayList_new(apr_pool_t* pool);
void parsegraph_ArrayList_destroy(parsegraph_ArrayList* al);
void parsegraph_ArrayList_clear(parsegraph_ArrayList* al);
size_t parsegraph_ArrayList_length(parsegraph_ArrayList* al);
void** parsegraph_ArrayList_slice(parsegraph_ArrayList* al);
void parsegraph_ArrayList_push(parsegraph_ArrayList* al, void* val);
void parsegraph_ArrayList_pushAll(parsegraph_ArrayList* al, ...);
void* parsegraph_ArrayList_at(parsegraph_ArrayList* al, int i);
void parsegraph_ArrayList_replace(parsegraph_ArrayList* al, int i, void* d);
void parsegraph_ArrayList_splice(parsegraph_ArrayList* al, int index, int count);
int parsegraph_ArrayList_remove(parsegraph_ArrayList* al, void* data);
void parsegraph_ArrayList_concat(parsegraph_ArrayList* dest, parsegraph_ArrayList* src);
void* parsegraph_ArrayList_pop(parsegraph_ArrayList* al);
void parsegraph_ArrayList_insertAll(parsegraph_ArrayList* al, int pos, parsegraph_ArrayList* src);
void parsegraph_ArrayList_insert(parsegraph_ArrayList* al, int pos, void* val);

#endif // parsegraph_ArrayList_INCLUDED
