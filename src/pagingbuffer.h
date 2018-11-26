#ifndef parsegraph_pagingbuffer_INCLUDED
#define parsegraph_pagingbuffer_INCLUDED

#define GL_GLEXT_PROTOTYPES
#include <GL/glcorearb.h>
#include <apr_pools.h>
#include <stdarg.h>

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
typedef struct parsegraph_pagingbuffer parsegraph_pagingbuffer;

struct parsegraph_BufferPageContent {
    float* data;
    int datasize;
    int index;
    int has_glBuffer;
    GLuint glBuffer;
};
typedef struct parsegraph_BufferPageContent parsegraph_BufferPageContent;
void parsegraph_BufferPage_initContent(struct parsegraph_BufferPageContent* bpc);

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
typedef struct parsegraph_BufferPage parsegraph_BufferPage;

#define parsegraph_MAX_ATTRIBUTE_NAME_LENGTH 64

struct parsegraph_BufferPageAttribute {
    char name[parsegraph_MAX_ATTRIBUTE_NAME_LENGTH];
    int numComponents;
    int drawMode;
    int location;
    struct parsegraph_BufferPageAttribute* next_attrib;
};
typedef struct parsegraph_BufferPageAttribute parsegraph_BufferPageAttribute;

parsegraph_BufferPage* parsegraph_BufferPage_new(
    parsegraph_pagingbuffer* pagingBuffer,
    void(*renderFunc)(void*, int),
    void* renderFuncThisArg);

parsegraph_BufferPage* parsegraph_PagingBuffer_addPage(parsegraph_pagingbuffer* pg, void(*renderFunc)(void*, int), void* renderFuncThisArg);
parsegraph_BufferPage* parsegraph_PagingBuffer_addDefaultPage(parsegraph_pagingbuffer* pg);
parsegraph_pagingbuffer* parsegraph_pagingbuffer_new(apr_pool_t* pool, GLuint program);
void parsegraph_pagingbuffer_destroy(parsegraph_pagingbuffer* pg);

parsegraph_BufferPage* parsegraph_PagingBuffer_getWorkingPage(parsegraph_pagingbuffer* pg);
int parsegraph_pagingbuffer_defineAttrib(parsegraph_pagingbuffer* pg, const char* name, int numComponents, GLenum drawMode);
int parsegraph_PagingBuffer_appendRGB(parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b);
int parsegraph_PagingBuffer_appendRGBA(parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b, float a);
int parsegraph_PagingBuffer_appendData(parsegraph_pagingbuffer* pg, int attribIndex, int numValues, ...);
void parsegraph_pagingbuffer_clear(parsegraph_pagingbuffer* pg);
int parsegraph_BufferPage_appendData(parsegraph_BufferPage* page, int attribIndex, int numValues, ...);
int parsegraph_BufferPage_appendVarargs(parsegraph_BufferPage* page, int attribIndex, int numValues, va_list ap);

int parsegraph_pagingbuffer_isEmpty(parsegraph_pagingbuffer* pg);
int parsegraph_BufferPage_isEmpty(parsegraph_BufferPage* page);
int parsegraph_pagingbuffer_renderPages(parsegraph_pagingbuffer* pg);
struct parsegraph_BufferPage* parsegraph_pagingbuffer_addDefaultPage(struct parsegraph_pagingbuffer* pg);
int parsegraph_BufferPage_appendArray(parsegraph_BufferPage* page, int attribIndex, int numValues, float* arr);
int parsegraph_pagingbuffer_appendArray(parsegraph_pagingbuffer* pg, int attribIndex, int numValues, float* arr);

#endif // parsegraph_pagingbuffer_INCLUDED
