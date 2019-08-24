#include "pagingbuffer.h"
#include "graph/log.h"
#include "die.h"
#include <stdarg.h>
#include <math.h>
#include <stdlib.h>
#include <stdio.h>

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
    pg->_currentPage = 0;
    pg->num_pages = 0;
    pg->first_attrib = 0;
    pg->last_attrib = 0;
    pg->num_attribs = 0;
    return pg;
}

void parsegraph_pagingbuffer_destroy(struct parsegraph_pagingbuffer* pg)
{
    for(struct parsegraph_BufferPage* page = pg->first_page; page;) {
        struct parsegraph_BufferPage* next = page->next_page;
        for(int i = 0; i < pg->num_attribs; ++i) {
            struct parsegraph_BufferPageContent* content = page->buffers + i;
            if(content->glBuffer >= 0) {
                glDeleteBuffers(1, &content->glBuffer);
            }
            free(content->data);
        }
        free(page->buffers);
        page = next;
    }
    for(struct parsegraph_BufferPageAttribute* attrib = pg->first_attrib; attrib;) {
        struct parsegraph_BufferPageAttribute* next = attrib->next_attrib;
        free(attrib);
        attrib = next;
    }
    apr_pool_destroy(pg->pool);
}

static void drawArrays(void* userdata, GLsizei numIndices)
{
    glDrawArrays(GL_TRIANGLES, 0, numIndices);
}

static int parsegraph_BUFFER_PAGE_COUNT = 0;

struct parsegraph_BufferPage* parsegraph_BufferPage_new(
    struct parsegraph_pagingbuffer* pg,
    void(*renderFunc)(void*, int),
    void* renderFuncThisArg)
{
    if(!renderFunc) {
        renderFunc = drawArrays;
    }

    struct parsegraph_BufferPage* page = apr_palloc(pg->pool, sizeof(*page));
    page->id = parsegraph_BUFFER_PAGE_COUNT++;
    page->buffers = 0;
    page->needsUpdate = 1;
    page->renderFunc = renderFunc;
    page->renderFuncThisArg = renderFuncThisArg;
    page->pg = pg;
    page->next_page = 0;

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

struct parsegraph_BufferPage* parsegraph_pagingbuffer_addDefaultPage(struct parsegraph_pagingbuffer* pg)
{
    return parsegraph_PagingBuffer_addDefaultPage(pg);
}

struct parsegraph_BufferPage* parsegraph_PagingBuffer_addPage(struct parsegraph_pagingbuffer* pg, void(*renderFunc)(void*, int), void* renderFuncThisArg)
{
    if(!pg->_currentPage) {
        pg->_currentPage = pg->first_page;
        if(pg->_currentPage) {
            // Reuse the page.
            return;
        }
    }
    else if(pg->_currentPage->next_page) {
        // Reuse the page.
        pg->_currentPage = pg->_currentPage->next_page;
    }

    // Create a new page.
    struct parsegraph_BufferPage* page = parsegraph_BufferPage_new(pg, renderFunc, renderFuncThisArg);
    if(!page) {
        return 0;
    }

    page->buffers = malloc(sizeof(struct parsegraph_BufferPageContent)*pg->num_attribs);
    for(int i = 0; i < pg->num_attribs; ++i) {
        parsegraph_BufferPageContent* bpc = page->buffers + i;
        parsegraph_BufferPage_initContent(bpc);
    }

    // Add the page.
    if(pg->last_page) {
        pg->last_page->next_page = page;
        pg->last_page = page;
    }
    else {
        pg->first_page = page;
        pg->last_page = page;
    }
    ++pg->num_pages;
    page->id = pg->num_pages -1;

    // Return the working page.
    pg->_currentPage = page;
    return page;
}

struct parsegraph_BufferPage* parsegraph_PagingBuffer_getWorkingPage(struct parsegraph_pagingbuffer* pg)
{
    if(pg->_currentPage) {
        return pg->_currentPage;
    }
    parsegraph_die("Refusing to create a new page; call pagingbuffer.addPage() first.\n");
}

int parsegraph_pagingbuffer_defineAttrib(struct parsegraph_pagingbuffer* pg, const char* name, int numComponents, GLenum drawMode)
{
    if(drawMode == 0) {
        drawMode = GL_STATIC_DRAW;
    }

    struct parsegraph_BufferPageAttribute* attrib = malloc(sizeof *attrib);
    strncpy(attrib->name, name, sizeof(attrib->name) - 1);
    attrib->numComponents = numComponents;
    attrib->drawMode = drawMode;
    attrib->location = glGetAttribLocation(pg->program, attrib->name);
    attrib->next_attrib = 0;

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
        page->buffers = realloc(page->buffers, sizeof(struct parsegraph_BufferPageContent)*pg->num_attribs);
        parsegraph_BufferPage_initContent(&page->buffers[pg->num_attribs - 1]);
    }

    return pg->num_attribs - 1;
}

void parsegraph_BufferPage_initContent(struct parsegraph_BufferPageContent* bpc)
{
    bpc->data = 0;
    bpc->datasize = 0;
    bpc->index = 0;
    bpc->glBuffer = -1;
    bpc->has_glBuffer = 0;
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
    va_list ap;
    va_start(ap, numValues);
    int rv = parsegraph_BufferPage_appendVarargs(page, attribIndex, numValues, ap);
    va_end(ap);
    return rv;
}

static void parsegraph_BufferPageContent_ensure(parsegraph_pagingbuffer* pg, parsegraph_BufferPageContent* content)
{
    while(content->datasize - content->index < 1) {
        if(content->datasize == 0) {
            content->datasize = 1;
        }
        content->data = realloc(content->data, sizeof(float)*content->datasize*2);
        content->datasize *= 2;
    }
}

int parsegraph_BufferPage_appendVarargs(parsegraph_BufferPage* page, int attribIndex, int numValues, va_list ap)
{
    struct parsegraph_BufferPageContent* content = page->buffers+attribIndex;
    for(int i = 0; i < numValues; ++i) {
        float v = (float)va_arg(ap, double);
        parsegraph_BufferPageContent_ensure(page->pg, content);
        content->data[content->index++] = v;
        //fprintf(stderr, "index is %d\n", content->index);
    }
    return 0;
}

int parsegraph_BufferPage_appendData(parsegraph_BufferPage* page, int attribIndex, int numValues, ...)
{
    parsegraph_pagingbuffer* pg = page->pg;
    if(attribIndex < 0 || attribIndex >= pg->num_attribs) {
        parsegraph_die("attribIndex %d out of range", attribIndex);
    }
    va_list ap;
    va_start(ap, numValues);
    int rv = parsegraph_BufferPage_appendVarargs(page, attribIndex, numValues, ap);
    va_end(ap);
    return rv;
}

int parsegraph_pagingbuffer_appendArray(parsegraph_pagingbuffer* pg, int attribIndex, int numValues, float* arr)
{
    struct parsegraph_BufferPage* page = parsegraph_PagingBuffer_getWorkingPage(pg);
    if(!page) {
        return -1;
    }
    return parsegraph_BufferPage_appendArray(page, attribIndex, numValues, arr);
}

int parsegraph_BufferPage_appendArray(parsegraph_BufferPage* page, int attribIndex, int numValues, float* arr)
{
    parsegraph_pagingbuffer* pg = page->pg;
    if(attribIndex < 0 || attribIndex >= pg->num_attribs) {
        return -2;
    }
    struct parsegraph_BufferPageContent* content = page->buffers+attribIndex;
    for(int i = 0; i < numValues; ++i) {
        float v = arr[i];
        parsegraph_BufferPageContent_ensure(page->pg, content);
        content->data[content->index++] = v;
    }
    return 0;
}

void parsegraph_pagingbuffer_clear(struct parsegraph_pagingbuffer* pg)
{
    //fprintf(stderr, "Clearing paginger\n");
    // Clear the buffers for all pages.
    for(struct parsegraph_BufferPage* page = pg->first_page; page != 0; page = page->next_page) {
        for(int attribIndex = 0; attribIndex < pg->num_attribs; ++attribIndex) {
            struct parsegraph_BufferPageContent* content = page->buffers + attribIndex;
            content->index = 0;
        }
        page->needsUpdate = 1;
    }
    pg->_currentPage = 0;
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

        //fprintf(stderr, "Rendering buffer page\n");

        // Prepare each vertex attribute.
        int attribIndex = 0;
        for(struct parsegraph_BufferPageAttribute* attrib = pg->first_attrib; attrib != 0; attrib = attrib->next_attrib) {
            if(attrib->location == -1) {
                ++attribIndex;
                continue;
            }

            // Bind the buffer, creating it if necessary.
            if(!page->buffers[attribIndex].has_glBuffer) {
                glGenBuffers(1, &page->buffers[attribIndex].glBuffer);
                page->buffers[attribIndex].has_glBuffer = 1;
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
            //parsegraph_log("This num indices: %d/%d=%f\n", content->index, attrib->numComponents, thisNumIndices);
            if(floor(thisNumIndices) != thisNumIndices) {
                //throw new Error("Odd number of indices for attrib " + attrib.name + ". Wanted " + Math.round(thisNumIndices) + ", but got " + thisNumIndices);
                parsegraph_die("Odd number of indices");
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
            //parsegraph_log("Invoking page's renderFunc\n");
            page->renderFunc(page->renderFuncThisArg, numIndices);
            count += numIndices/3;
        }
        else {
            //parsegraph_log("Page was empty\n");
        }

        page->needsUpdate = 0;
        if(page == pg->_currentPage) {
            // All done.
            break;
        }
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
