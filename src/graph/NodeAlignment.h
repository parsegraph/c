#ifndef parsegraph_NodeAlignment_INCLUDED
#define parsegraph_NodeAlignment_INCLUDED

#define parsegraph_NULL_NODE_ALIGNMENT 0
#define parsegraph_DO_NOT_ALIGN 1
#define parsegraph_ALIGN_NEGATIVE 2
#define parsegraph_ALIGN_CENTER 3
#define parsegraph_ALIGN_POSITIVE 4

// Used to align inward nodes.
#define parsegraph_ALIGN_HORIZONTAL 5
#define parsegraph_ALIGN_VERTICAL 6

const char* parsegraph_nameNodeAlignment(int given);
int parsegraph_readNodeAlignment(const char* given);

#endif // parsegraph_NodeAlignment_INCLUDED
