#ifndef parsegraph_Caret_INCLUDED
#define parsegraph_Caret_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>
#include <unicode/ustring.h>
#include "Node.h"
#include "ArrayList.h"
#include "Surface.h"

struct parsegraph_SavedCaret {
char id[255];
parsegraph_Node* node;
};
typedef struct parsegraph_SavedCaret parsegraph_SavedCaret;

struct parsegraph_Caret {
apr_pool_t* pool;
parsegraph_Surface* surface;
parsegraph_ArrayList* _nodes;
parsegraph_ArrayList* _labels;
parsegraph_ArrayList* _savedNodes;
parsegraph_GlyphAtlas* _glyphAtlas;
parsegraph_Node* _nodeRoot;
};
typedef struct parsegraph_Caret parsegraph_Caret;

void parsegraph_Caret_select(parsegraph_Caret* caret, const char* inDir);
int parsegraph_Caret_selected(parsegraph_Caret* caret, const char* inDir);
void parsegraph_Caret_deselect(parsegraph_Caret* caret, const char* inDir);
parsegraph_Caret* parsegraph_Caret_new(parsegraph_Surface* surface, parsegraph_Node* nodeRoot);
void parsegraph_Caret_setGlyphAtlas(parsegraph_Caret* caret, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Caret_label(parsegraph_Caret* caret, const char* text, parsegraph_GlyphAtlas* glyphAtlas, const char* inDir);
parsegraph_Node* parsegraph_Caret_spawnMove(parsegraph_Caret* caret, const char* inDirection, const char* newContent, const char* newAlignmentMode);
void parsegraph_Caret_push(parsegraph_Caret* caret);
void parsegraph_Caret_pop(parsegraph_Caret* caret);
parsegraph_Node* parsegraph_Caret_root(parsegraph_Caret* caret);
void parsegraph_Caret_move(parsegraph_Caret* caret, const char* toDirection);
void parsegraph_Caret_onKey(parsegraph_Caret* caret, int(*keyListener)(parsegraph_Node*, const char*, void*), void* thisArg);
void parsegraph_Caret_onChange(parsegraph_Caret* caret, void(*changeListener)(void*, parsegraph_Node*), void* thisArg);
void parsegraph_Caret_onClick(parsegraph_Caret* caret, int(*clickListener)(parsegraph_Node*, const char*, void*), void* thisArg);
void parsegraph_Caret_erase(parsegraph_Caret* caret, const char* inDirection);
void parsegraph_Caret_crease(parsegraph_Caret* caret, const char* inDirection);
void parsegraph_Caret_uncrease(parsegraph_Caret* caret, const char* inDirection);
int parsegraph_Caret_isCreased(parsegraph_Caret* caret, const char* inDirection);
int parsegraph_Caret_creased(parsegraph_Caret* caret, const char* inDirection);
parsegraph_Node* parsegraph_Caret_disconnect(parsegraph_Caret* caret, const char* inDirection);
parsegraph_Node* parsegraph_Caret_connect(parsegraph_Caret* caret, const char* inDirection, parsegraph_Node* node);
void parsegraph_Caret_spawn(parsegraph_Caret* caret, const char* inDirection, const char* newType, const char* newAlignmentMode);
int parsegraph_Caret_has(parsegraph_Caret* caret, const char* inDirection);
parsegraph_Node* parsegraph_Caret_node(parsegraph_Caret* caret);
parsegraph_GlyphAtlas* parsegraph_Caret_glyphAtlas(parsegraph_Caret* caret);
void parsegraph_Caret_restore(parsegraph_Caret* caret, const char* id);
void parsegraph_Caret_clearSave(parsegraph_Caret* caret, const char* id);
const char* parsegraph_Caret_save(parsegraph_Caret* caret, const char* id);
void parsegraph_Caret_moveTo(parsegraph_Caret* caret, const char* id);
void parsegraph_Caret_moveToRoot(parsegraph_Caret* caret);
void parsegraph_Caret_replace(parsegraph_Caret* caret, const char* arg1, const char* arg2);
int parsegraph_Caret_at(parsegraph_Caret* caret, const char* inDirection);
void parsegraph_Caret_align(parsegraph_Caret* caret, const char* inDirection, const char* newAlignmentMode);
void parsegraph_Caret_pull(parsegraph_Caret* caret, const char* given);
void parsegraph_Caret_grow(parsegraph_Caret* caret, const char* inDir);
void parsegraph_Caret_shrink(parsegraph_Caret* caret, const char* inDir);
void parsegraph_Caret_fitExact(parsegraph_Caret* caret, const char* inDir);
void parsegraph_Caret_fitLoose(parsegraph_Caret* caret, const char* inDir);
void parsegraph_Caret_destroy(parsegraph_Caret* caret);

#endif // parsegraph_Caret_INCLUDED
