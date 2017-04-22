#ifndef parsegraph_NodeType_INCLUDED
#define parsegraph_NodeType_INCLUDED

// Node Type
#define parsegraph_NULL_NODE_TYPE 9
#define parsegraph_BUD 10
#define parsegraph_SLOT 11
#define parsegraph_BLOCK 12
#define parsegraph_SLIDER 13
#define parsegraph_SCENE 14
#define parsegraph_DEFAULT_NODE_TYPE parsegraph_BLOCK

const char* parsegraph_nameNodeType(int given);
int parsegraph_readNodeType(const char* given);

#endif // parsegraph_NodeType_INCLUDED
