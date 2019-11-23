#ifndef parsegraph_LayoutList_INCLUDED
#define parsegraph_LayoutList_INCLUDED

#include <apr_pools.h>
#include "../ArrayList.h"

struct parsegraph_Component;
typedef struct parsegraph_Component parsegraph_Component;

struct parsegraph_LayoutList {
apr_pool_t* pool;
int _type;
struct parsegraph_LayoutList* _parent;
parsegraph_ArrayList* _entries;
};
typedef struct parsegraph_LayoutList parsegraph_LayoutList;

parsegraph_LayoutList* parsegraph_LayoutList_new(apr_pool_t* pool, int layoutType, parsegraph_LayoutList* parent);
void parsegraph_LayoutList_setEntry(parsegraph_LayoutList* list, parsegraph_Component* comp);
parsegraph_Component* parsegraph_LayoutList_component(parsegraph_LayoutList* list);
int parsegraph_LayoutList_type(parsegraph_LayoutList* list);
void parsegraph_LayoutList_addWithType(parsegraph_LayoutList* list, parsegraph_Component* comp, int layoutType);
int parsegraph_LayoutList_forEach(parsegraph_LayoutList* list, int(*func)(void*, parsegraph_Component*, float*), void* funcThisArg, float* compSize);
int parsegraph_LayoutList_isEmpty(parsegraph_LayoutList* list);
parsegraph_Component* parsegraph_LayoutList_getPrevious(parsegraph_LayoutList* list, parsegraph_Component* target);
parsegraph_Component* parsegraph_LayoutList_getNext(parsegraph_LayoutList* list, parsegraph_Component* target);
int parsegraph_LayoutList_remove(parsegraph_LayoutList* list, parsegraph_Component* comp);
parsegraph_LayoutList* parsegraph_LayoutList_contains(parsegraph_LayoutList* list, parsegraph_Component* comp);

#endif // parsegraph_LayoutList_INCLUDED
