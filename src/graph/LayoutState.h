#ifndef parsegraph_LayoutState_INCLUDED
#define parsegraph_LayoutState_INCLUDED

#define parsegraph_NULL_LAYOUT_STATE 0
#define parsegraph_NEEDS_COMMIT 1
#define parsegraph_COMMITTED_LAYOUT 2
#define parsegraph_IN_COMMIT 3

const char* parsegraph_nameLayoutState(int given);

#endif // parsegraph_LayoutState_INCLUDED
