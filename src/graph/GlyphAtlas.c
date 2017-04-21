#include "GlyphAtlas.h"

parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(apr_pool_t* pool, int fontSize, const char* fontName, const char* fontStyle)
{
    parsegraph_GlyphAtlas* atlas;
    if(pool) {
        atlas = apr_palloc(pool, sizeof(*atlas));
    }
    else {
        atlas = malloc(sizeof(*atlas));
    }
    atlas->pool = pool;

    return atlas;
}
