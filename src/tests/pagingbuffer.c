#include "unity.h"
#include <stdio.h>
#include <httpd.h>

#include <pagingbuffer.h>

static apr_pool_t* pool = NULL;

void test_BufferPage_new()
{
    //struct parsegraph_BufferPage* page = parsegraph_BufferPage_new();
}

void test_parsegraph_PagingBuffer_renderPages()
{
    struct parsegraph_pagingbuffer* buffer = parsegraph_pagingbuffer_new(
        pool, 0
    );
}

void test_parsegraph_pagingbuffer()
{
    RUN_TEST(test_BufferPage_new);
    RUN_TEST(test_parsegraph_PagingBuffer_renderPages);
//parsegraph_PagingBuffer.prototype.clear = function()
//parsegraph_PagingBuffer.prototype.appendData = function(...)
//parsegraph_PagingBuffer.prototype.appendRGBA = function(...)
//parsegraph_PagingBuffer.prototype.appendRGB = function(/**/)
//parsegraph_PagingBuffer.prototype.defineAttrib = function(name, numComponents, drawMode)
//parsegraph_PagingBuffer.prototype.getWorkingPage = function()
//parsegraph_PagingBuffer.prototype.addPage = function(renderFunc, renderFuncThisArg)
//parsegraph_PagingBuffer.prototype.isEmpty = function()
//parsegraph_BufferPage.prototype.appendRGBA = function(attribIndex, color)
//parsegraph_BufferPage.prototype.appendRGB = function(attribIndex, color)
//parsegraph_BufferPage.prototype.appendData = function(attribIndex/*, ... */)
//parsegraph_BufferPage.prototype.isEmpty = function()
}
