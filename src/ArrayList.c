#include "ArrayList.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include "die.h"

parsegraph_ArrayList* parsegraph_ArrayList_new(apr_pool_t* pool)
{
    parsegraph_ArrayList* al = apr_palloc(pool, sizeof(*al));
    al->_length = 0;
    al->_capacity = 4;
    al->data = malloc(sizeof(void*)*al->_capacity);
    return al;
}

void parsegraph_ArrayList_destroy(parsegraph_ArrayList* al)
{
    free(al->data);
}

void parsegraph_ArrayList_clear(parsegraph_ArrayList* al)
{
    al->_length = 0;
}

size_t parsegraph_ArrayList_length(parsegraph_ArrayList* al)
{
    return al->_length;
}

void** parsegraph_ArrayList_slice(parsegraph_ArrayList* al)
{
    void** copy = malloc(sizeof(void*)*al->_length);
    memcpy(copy, al->data, sizeof(void*)*al->_length);
    return copy;
}

int parsegraph_ArrayList_remove(parsegraph_ArrayList* al, void* data)
{
    for(int i = 0; i < al->_length; ++i) {
        if(al->data[i] != data) {
            continue;
        }

        memcpy(al->data + i, al->data + i + 1, sizeof(void*)*(al->_length-i));
        al->_length -= 1;
        return i;
    }
    return -1;
}

void parsegraph_ArrayList_splice(parsegraph_ArrayList* al, int i, int count)
{
    if(count > al->_length - i) {
        count = al->_length - i;
    }
    if(i < al->_length - count) {
        memcpy(al->data + i, al->data + i + count, sizeof(void*)*(al->_length - count - i));
    }
    al->_length -= count;
}

void parsegraph_ArrayList_push(parsegraph_ArrayList* al, void* ptr)
{
    while(al->_length >= al->_capacity) {
        al->_capacity *= 2;
        al->data = realloc(al->data, sizeof(void*)*al->_capacity);
    }
    al->data[al->_length++] = ptr;
}

void parsegraph_ArrayList_pushAll(parsegraph_ArrayList* al, ...)
{
    va_list ap;

    va_start(ap, al);
    for(;;) {
        void* ptr = va_arg(ap, void*);
        if(!ptr) {
            break;
        }
        while(al->_length >= al->_capacity) {
            al->_capacity *= 2;
            al->data = realloc(al->data, sizeof(void*)*al->_capacity);
        }
        al->data[al->_length++] = ptr;
    }
    va_end(ap);
}

void* parsegraph_ArrayList_pop(parsegraph_ArrayList* al)
{
    if(al->_length == 0) {
        parsegraph_die("parsegraph_ArrayList must not be empty when popped.");
    }
    void* removed = al->data[al->_length - 1];
    --al->_length;
    return removed;
}

void parsegraph_ArrayList_concat(parsegraph_ArrayList* al, parsegraph_ArrayList* src)
{
    size_t srcLen = parsegraph_ArrayList_length(src);
    while(al->_length + srcLen > al->_capacity) {
        al->_capacity *= 2;
        al->data = realloc(al->data, sizeof(void*)*al->_capacity);
    }
    memcpy(al->data + al->_length, src->data, sizeof(void*)*srcLen);
    al->_length += srcLen;
}

void parsegraph_ArrayList_swap(parsegraph_ArrayList* al, int a, int b)
{
    void* tmp = al->data[a];
    al->data[a] = al->data[b];
    al->data[b] = tmp;
}

void parsegraph_ArrayList_sort(parsegraph_ArrayList* al, int(*comparator)(void*, void*, void*), void* thisArg)
{
    for(int i = 0; i < al->_length; ++i) {
        int lowest = i;
        for(int j = i + 1; j < al->_length; ++j) {
            if(comparator(thisArg, al->data[lowest], al->data[j]) > 0) {
                lowest = j;
            }
        }
        if(i != lowest) {
            parsegraph_ArrayList_swap(al, i, lowest);
        }
    }
}

void parsegraph_ArrayList_insert(parsegraph_ArrayList* al, int pos, void* val)
{
    while(al->_length >= al->_capacity) {
        al->_capacity *= 2;
        al->data = realloc(al->data, sizeof(void*)*al->_capacity);
    }
    // Copy the tail of the list to its new location
    if(pos < al->_length) {
        memmove(al->data + pos + 1, al->data + pos, sizeof(void*)*(al->_length - pos));
    }
    // Copy the source data.
    al->data[pos] = val;
    ++al->_length;
}

void parsegraph_ArrayList_insertAll(parsegraph_ArrayList* al, int pos, parsegraph_ArrayList* src)
{
    size_t srcLen = parsegraph_ArrayList_length(src);
    while(al->_length + srcLen > al->_capacity) {
        al->_capacity *= 2;
        al->data = realloc(al->data, sizeof(void*)*al->_capacity);
    }
    // Copy the tail of the list to its new location
    if(srcLen - pos > 0) {
        memcpy(al->data + pos + srcLen, al->data + pos, al->_length - pos);
    }
    // Copy the source data.
    memcpy(al->data + pos, src->data, sizeof(void*)*srcLen);
    al->_length += srcLen;
}

void* parsegraph_ArrayList_at(parsegraph_ArrayList* al, int i)
{
    if(i >= al->_length || i < 0) {
        parsegraph_die("ArrayList index out of bounds: %d\n", i);
    }
    return al->data[i];
}

void parsegraph_ArrayList_replace(parsegraph_ArrayList* al, int i, void* d)
{
    if(i >= al->_length || i < 0) {
        parsegraph_die("ArrayList index out of bounds: %d\n", i);
    }
    al->data[i] = d;
}
