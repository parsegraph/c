#ifndef parsegraph_Context_INCLUDED
#define parsegraph_Context_INCLUDED

struct parsegraph_Context {
apr_pool_t* pool;

};

parsegraph_Context* parsegraph_initialize(int mathMode);

#endif // parsegraph_Context_INCLUDED
