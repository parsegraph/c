#ifndef parsegraph_GlyphAtlas_INCLUDED
#define parsegraph_GlyphAtlas_INCLUDED

#include <apr_pools.h>

struct parsegraph_GlyphAtlas {
    apr_pool_t* pool;
};

typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(apr_pool_t* pool, int fontSize, const char* fontName, const char* fontStyle);

#endif // parsegraph_GlyphAtlas_INCLUDED
