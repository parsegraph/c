#include "pagingbuffer.h"
#include <stdarg.h>
#include <math.h>
#include <stdlib.h>

struct parsegraph_pagingbuffer* parsegraph_pagingbuffer_new(
    apr_pool_t* pool, GLuint program)
{
    apr_pool_t* subpool;
    if(APR_SUCCESS != apr_pool_create(&subpool, pool)) {
        return 0;
    }
    struct parsegraph_pagingbuffer* pg = apr_palloc(subpool, sizeof(*pg));
    if(!pg) {
        return 0;
    }
    pg->pool = subpool;
    pg->program = program;
    pg->first_page = 0;
    pg->last_page = 0;
    pg->num_pages = 0;
    pg->first_attrib = 0;
    pg->last_attrib = 0;
    pg->num_attribs = 0;
    return pg;
}

void parsegraph_pagingbuffer_destroy(struct parsegraph_pagingbuffer* pg)
{
    apr_pool_destroy(pg->pool);
}

static void drawArrays(void* userdata, GLsizei numIndices)
{
    glDrawArrays(GL_TRIANGLES, 0, numIndices);
}

struct parsegraph_BufferPage* parsegraph_BufferPage_new(
    struct parsegraph_pagingbuffer* pg,
    void(*renderFunc)(void*, int),
    void* renderFuncThisArg)
{
    if(!renderFunc) {
        renderFunc = drawArrays;
    }

    struct parsegraph_BufferPage* page = apr_palloc(pg->pool, sizeof(*page));
    page->needsUpdate = 1;
    page->renderFunc = renderFunc;
    page->renderFuncThisArg = renderFuncThisArg;
    page->pg = pg;
    page->offset = 0;

    return page;
}

int parsegraph_pagingbuffer_isEmpty(struct parsegraph_pagingbuffer* pg)
{
    // Check each page's buffer, failing early if possible.
    if(pg->num_pages == 0) {
        return 1;
    }
    for(struct parsegraph_BufferPage* page = pg->first_page; page != 0; page = page->next_page) {
        if(parsegraph_BufferPage_isEmpty(page)) {
            return 1;
        }
    }
    return 0;
}

int parsegraph_BufferPage_isEmpty(struct parsegraph_BufferPage* page)
{
    if(page->pg->num_attribs == 0) {
        return 1;
    }
    for(int i = 0; i < page->pg->num_attribs; ++i) {
        if(page->buffers[i].index == 0) {
            return 1;
        }
    }
    return 0;
}

struct parsegraph_BufferPage* parsegraph_PagingBuffer_addDefaultPage(struct parsegraph_pagingbuffer* pg)
{
    return parsegraph_PagingBuffer_addPage(pg, drawArrays, 0);
}

struct parsegraph_BufferPage* parsegraph_PagingBuffer_addPage(struct parsegraph_pagingbuffer* pg, void(*renderFunc)(void*, int), void* renderFuncThisArg)
{
    // Create a new page.
    struct parsegraph_BufferPage* page = parsegraph_BufferPage_new(pg, renderFunc, renderFuncThisArg);
    if(!page) {
        return 0;
    }

    page->buffers = apr_palloc(pg->pool, sizeof(struct parsegraph_BufferPageContent)*pg->num_attribs);

    // Add the page.
    if(pg->last_page) {
        pg->last_page->next_page = page;
    }
    else {
        pg->first_page = page;
        pg->last_page = page;
    }
    ++pg->num_pages;
    page->id = pg->num_pages -1;

    // Return the working page.
    return page;
}

struct parsegraph_BufferPage* parsegraph_PagingBuffer_getWorkingPage(struct parsegraph_pagingbuffer* pg)
{
    if(pg->last_page) {
        return pg->last_page;
    }
    return 0;
}

int parsegraph_pagingbuffer_defineAttrib(struct parsegraph_pagingbuffer* pg, const char* name, int numComponents, GLenum drawMode)
{
    if(drawMode == 0) {
        drawMode = GL_STATIC_DRAW;
    }

    struct parsegraph_BufferPageAttribute* attrib = malloc(sizeof *attrib);
    strncpy(attrib->name, name, sizeof(attrib->name));
    attrib->numComponents = numComponents;
    attrib->drawMode = drawMode;
    attrib->location = glGetAttribLocation(pg->program, attrib->name);

    if(pg->last_attrib) {
        pg->last_attrib->next_attrib = attrib;
        pg->last_attrib = attrib;
    }
    else {
        pg->first_attrib = attrib;
        pg->last_attrib = attrib;
    }
    ++pg->num_attribs;

    // Add a new buffer entry for this new attribute.
    for(struct parsegraph_BufferPage* page = pg->first_page; page != 0; page = page->next_page) {
        struct parsegraph_BufferPageContent* oldBuffers = page->buffers;
        page->buffers = apr_palloc(pg->pool, sizeof(struct parsegraph_BufferPageContent)*pg->num_attribs);
        memcpy(page->buffers, oldBuffers, sizeof(struct parsegraph_BufferPageContent)*pg->num_attribs-1);
        page->buffers[pg->num_attribs - 1].data = 0;
        page->buffers[pg->num_attribs - 1].datasize = 0;
        page->buffers[pg->num_attribs - 1].index = 0;
        page->buffers[pg->num_attribs - 1].glBuffer = 0;
    }

    return pg->num_attribs;
}

int parsegraph_PagingBuffer_appendRGB(struct parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b)
{
    return parsegraph_PagingBuffer_appendData(pg, attribIndex, 3, r, g, b);
}

int parsegraph_PagingBuffer_appendRGBA(struct parsegraph_pagingbuffer* pg, int attribIndex, float r, float g, float b, float a)
{
    return parsegraph_PagingBuffer_appendData(pg, attribIndex, 4, r, g, b, a);
}

int parsegraph_PagingBuffer_appendData(struct parsegraph_pagingbuffer* pg, int attribIndex, int numValues, ...)
{
    struct parsegraph_BufferPage* page = parsegraph_PagingBuffer_getWorkingPage(pg);
    if(!page) {
        return -1;
    }
    if(attribIndex < 0 || attribIndex >= pg->num_attribs) {
        return -2;
    }
    va_list ap;
    va_start(ap, numValues);
    struct parsegraph_BufferPageContent* content = page->buffers+attribIndex;
    for(int i = 0; i < numValues; ++i) {
        float v = (float)va_arg(ap, double);
        while(content->datasize - content->index < 1) {
            float* oldData = content->data;
            content->data = apr_palloc(pg->pool, content->datasize*2);
            memcpy(content->data, oldData, content->index);
            content->datasize *= 2;
        }
        content->data[content->index++] = v;
    }
    va_end(ap);
    return 0;
}

void parsegraph_pagingbuffer_clear(struct parsegraph_pagingbuffer* pg)
{
    // Clear the buffers for all pages.
    for(struct parsegraph_BufferPage* page = pg->first_page; page != 0; page = page->next_page) {
        for(int attribIndex = 0; attribIndex < pg->num_attribs; ++attribIndex) {
            struct parsegraph_BufferPageContent* content = page->buffers + attribIndex;
            content->index = 0;
        }
        page->needsUpdate = 1;
    }
}

int parsegraph_pagingbuffer_renderPages(struct parsegraph_pagingbuffer* pg)
{
    int count = 0;

    // Enable used vertex attributes.
    for(struct parsegraph_BufferPageAttribute* attrib = pg->first_attrib; attrib != 0; attrib = attrib->next_attrib) {
        if(attrib->location == -1) {
            continue;
        }
        glEnableVertexAttribArray(attrib->location);
    }

    // Draw each page.
    for(struct parsegraph_BufferPage* page = pg->first_page; page != 0; page = page->next_page) {
        int numIndices = -1;

        // Prepare each vertex attribute.
        int attribIndex = 0;
        for(struct parsegraph_BufferPageAttribute* attrib = pg->first_attrib; attrib != 0; attrib = attrib->next_attrib) {
            if(attrib->location == -1) {
                ++attribIndex;
                continue;
            }
            // Bind the buffer, creating it if necessary.
            if(page->buffers[attribIndex].glBuffer == 0) {
                glGenBuffers(1, &page->buffers[attribIndex].glBuffer);
            }
            glBindBuffer(GL_ARRAY_BUFFER, page->buffers[attribIndex].glBuffer);
            struct parsegraph_BufferPageContent* content = page->buffers + attribIndex;

            // Load buffer data if the page needs an update.
            if(page->needsUpdate && content->index > 0) {
                //console.log("Pushing bytes to GL");
                //parsegraph_glBufferData_BYTES += content->index;
                glBufferData(GL_ARRAY_BUFFER, sizeof(float)*content->index, content->data, attrib->drawMode);
            }

            // Set up the vertex attribute pointer.
            glVertexAttribPointer(
                attrib->location,
                attrib->numComponents,
                GL_FLOAT,
                0,
                0,
                0
            );

            float thisNumIndices = content->index / attrib->numComponents;
            if(floor(thisNumIndices) != thisNumIndices) {
                //throw new Error("Odd number of indices for attrib " + attrib.name + ". Wanted " + Math.round(thisNumIndices) + ", but got " + thisNumIndices);
                return -1;
            }
            if(numIndices == -1) {
                numIndices = thisNumIndices;
            }
            else {
                numIndices = numIndices < thisNumIndices ? numIndices : thisNumIndices;
            }

            ++attribIndex;
        }

        // Draw the page's triangles.
        if(numIndices > 0) {
            page->renderFunc(page->renderFuncThisArg, numIndices);
            count += numIndices/3;
        }

        page->needsUpdate = 0;
    }

    // Disable used variables.
    for(struct parsegraph_BufferPageAttribute* attrib = pg->first_attrib; attrib != 0; attrib = attrib->next_attrib) {
        if(attrib->location == -1) {
            continue;
        }
        glDisableVertexAttribArray(attrib->location);
    }

    return count;
}
