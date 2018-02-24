#ifndef parsegraph_pagingbuffer_INCLUDED
#define parsegraph_pagingbuffer_INCLUDED

#define GL_GLEXT_PROTOTYPES
#include <GL/glcorearb.h>
#include <apr_pools.h>

struct parsegraph_BufferPage;

struct parsegraph_pagingbuffer {
    apr_pool_t* pool;
    GLuint program;
    struct parsegraph_BufferPage* first_page;
    struct parsegraph_BufferPage* last_page;
    struct parsegraph_BufferPageAttribute* last_attrib;
    struct parsegraph_BufferPageAttribute* first_attrib;
    int num_pages;
    int num_attribs;
};

struct parsegraph_BufferPageContent {
    float* data;
    int datasize;
    int index;
    unsigned int glBuffer;
};

struct parsegraph_BufferPage {
    int id;
    struct parsegraph_BufferPageContent* buffers;
    int needsUpdate;
    void(*renderFunc)(void*, int);
    void*renderFuncThisArg;
    struct parsegraph_pagingbuffer* pg;
    int offset;
    struct parsegraph_BufferPage* next_page;
};

#define parsegraph_MAX_ATTRIBUTE_NAME_LEGNTH 64

struct parsegraph_BufferPageAttribute {
    char name[parsegraph_MAX_ATTRIBUTE_NAME_LEGNTH];
    int numComponents;
    int drawMode;
    int location;
    struct parsegraph_BufferPageAttribute* next_attrib;
};

struct parsegraph_BufferPage* parsegraph_BufferPage_new(
    struct parsegraph_pagingbuffer* pagingBuffer,
    void(*renderFunc)(void*, int),
    void* renderFuncThisArg);

struct parsegraph_BufferPage* parsegraph_PagingBuffer_addPage(struct parsegraph_pagingbuffer* pg, void(*renderFunc)(void*, int), void* renderFuncThisArg);
struct parsegraph_BufferPage* parsegraph_PagingBuffer_addDefaultPage(struct parsegraph_pagingbuffer* pg);
struct parsegraph_pagingbuffer* parsegraph_pagingbuffer_new(apr_pool_t* pool, GLuint program);
void parsegraph_pagingbuffer_destroy(struct parsegraph_pagingbuffer* pg);

struct parsegraph_BufferPage* parsegraph_PagingBuffer_getWorkingPage(struct parsegraph_pagingbuffer* pg);
int parsegraph_pagingbuffer_defineAttrib(struct parsegraph_pagingbuffer* pg, const char* name, int numComponents, GLenum drawMode);
int parsegraph_PagingBuffer_appendRGB(struct parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b);
int parsegraph_PagingBuffer_appendRGBA(struct parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b, float a);
int parsegraph_PagingBuffer_appendData(struct parsegraph_pagingbuffer* pg, int attribIndex, int numValues, ...);
void parsegraph_PagingBuffer_Clear(struct parsegraph_pagingbuffer* pg);

int parsegraph_pagingbuffer_isEmpty(struct parsegraph_pagingbuffer* pg);
int parsegraph_BufferPage_isEmpty(struct parsegraph_BufferPage* page);
int parsegraph_pagingbuffer_renderPages(struct parsegraph_pagingbuffer* pg);

#endif // parsegraph_pagingbuffer_INCLUDED
