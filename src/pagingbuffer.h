#ifndef parsegraph_pagingbuffer_INCLUDED
#define parsegraph_pagingbuffer_INCLUDED

#include <apr_pools.h>
#include <GL/gl.h>

struct parsegraph_pagingbuffer {
    void* gl;
    void* attribs;
    void* pages;
    GLuint program;
};

struct parsegraph_BufferPage{
    void* buffers;
    void* glBuffers;
    int needsUpdate;
    void(*renderFunc)();
    void*renderFuncThisArg;
};

struct parsegraph_BufferPage* parsegraph_BufferPage_new(
    struct parsegraph_pagingbuffer* pagingBuffer,
    void(*renderFunc)(),
    void* renderFuncThisArg);

struct parsegraph_pagingbuffer* parsegraph_pagingbuffer_new(apr_pool_t* pool, GLuint program);

#endif // parsegraph_pagingbuffer_INCLUDED
