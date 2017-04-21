#ifndef parsegraph_NodeAlignment_INCLUDED
#define parsegraph_NodeAlignment_INCLUDED

extern const int parsegraph_NULL_NODE_ALIGNMENT;
extern const int parsegraph_DO_NOT_ALIGN;
extern const int parsegraph_ALIGN_NEGATIVE;
extern const int parsegraph_ALIGN_CENTER;
extern const int parsegraph_ALIGN_POSITIVE;

// Used to align inward nodes.
extern const int parsegraph_ALIGN_HORIZONTAL;
extern const int parsegraph_ALIGN_VERTICAL;

const char* parsegraph_nameNodeAlignment(int given);
int parsegraph_readNodeAlignment(const char* given);

#endif // parsegraph_NodeAlignment_INCLUDED
