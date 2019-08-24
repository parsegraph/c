#ifndef parsegraph_NodePainter_INCLUDED
#define parsegraph_NodePainter_INCLUDED

#include "BlockPainter.h"
#include "GlyphPainter.h"
#include "ArrayList.h"
#include "Node.h"

struct parsegraph_NodePainterCounts {
int numBlocks;
int numExtents;
parsegraph_ArrayList* numGlyphs;
};
typedef struct parsegraph_NodePainterCounts parsegraph_NodePainterCounts;

struct parsegraph_NodePainter {
apr_pool_t* pool;
float _backgroundColor[4];
parsegraph_BlockPainter* _blockPainter;
int _renderBlocks;
parsegraph_BlockPainter* _extentPainter;
int _renderExtents;
parsegraph_GlyphPainter* _glyphPainter;
int _renderText;
parsegraph_ArrayList* _textures;
int _renderLines;
int _renderScenes;
int _pagesPerGlyphTexture;
parsegraph_NodePainterCounts _counts;
};
typedef struct parsegraph_NodePainter parsegraph_NodePainter;

void parsegraph_NodePainterCounts_reset(parsegraph_NodePainterCounts* npc);

parsegraph_NodePainter* parsegraph_NodePainter_new(apr_pool_t* ppool, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
float* parsegraph_NodePainter_bounds(parsegraph_NodePainter* painter);
parsegraph_GlyphPainter* parsegraph_NodePainter_glyphPainter(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_setBackground(parsegraph_NodePainter* painter, float* color);
float* parsegraph_NodePainter_backgroundColor(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_render(parsegraph_NodePainter* painter, float* world, float scale);
void parsegraph_NodePainter_enableExtentRendering(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_disableExtentRendering(parsegraph_NodePainter* painter);
int parsegraph_NodePainter_isExtentRenderingEnabled(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_enableBlockRendering(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_disableBlockRendering(parsegraph_NodePainter* painter);
int parsegraph_NodePainter_isBlockRenderingEnabled(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_enableLineRendering(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_disableLineRendering(parsegraph_NodePainter* painter);
int parsegraph_NodePainter_isLineRenderingEnabled(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_enableTextRendering(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_disableTextRendering(parsegraph_NodePainter* painter);
int parsegraph_NodePainter_isTextRenderingEnabled(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_enableSceneRendering(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_disableSceneRendering(parsegraph_NodePainter* painter);
int parsegraph_NodePainter_isSceneRenderingEnabled(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_resetCounts(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_clear(parsegraph_NodePainter* painter);
void parsegraph_NodePainter_drawSlider(parsegraph_NodePainter* painter, parsegraph_Node* node);
void parsegraph_NodePainter_drawScene(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, apr_hash_t* shaders);
void parsegraph_NodePainterCounts_reset(parsegraph_NodePainterCounts* counts);
void parsegraph_NodePainter_initBlockBuffer(parsegraph_NodePainter* nodePainter, parsegraph_NodePainterCounts* counts);
void parsegraph_NodePainter_countNode(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, parsegraph_NodePainterCounts* counts);
void parsegraph_NodePainter_drawNode(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, apr_hash_t* shaders);
void parsegraph_NodePainter_paintLines(parsegraph_NodePainter* nodePainter, parsegraph_Node* node);
void parsegraph_NodePainter_paintExtent(parsegraph_NodePainter* nodePainter, parsegraph_Node* node);
void parsegraph_NodePainter_paintBlock(parsegraph_NodePainter* nodePainter, parsegraph_Node* node);
void parsegraph_NodePainter_destroy(parsegraph_NodePainter* nodePainter);

#endif // parsegraph_NodePainter_INCLUDED
