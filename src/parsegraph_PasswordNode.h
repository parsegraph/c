#ifndef parsegraph_PasswordNode_INCLUDED
#define parsegraph_PasswordNode_INCLUDED

#include "graph/Node.h"
#include "graph/GlyphAtlas.h"

struct parsegraph_PasswordNode {
int(*listener)(void*, const char*);
void* listenerThisArg;
int pos;
unsigned char* password;
int maxLength;
parsegraph_Node* node;
parsegraph_Node* inner;
parsegraph_Node* last;
parsegraph_GlyphAtlas* atlas;
};
typedef struct parsegraph_PasswordNode parsegraph_PasswordNode;

parsegraph_Node* parsegraph_PasswordNode_new(apr_pool_t* pool, int maxLength, parsegraph_GlyphAtlas* atlas, int(*listener)(void*, const char*), void* listenerThisArg);

#endif // parsegraph_PasswordNode_INCLUDED
