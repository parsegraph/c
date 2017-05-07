#include "LayoutState.h"
#include "log.h"

const char* parsegraph_nameLayoutState(int given)
{
    switch(given) {
    case parsegraph_NULL_LAYOUT_STATE:
        return "NULL_LAYOUT_STATE";
    case parsegraph_NEEDS_COMMIT:
        return "NEEDS_COMMIT";
    case parsegraph_COMMITTED_LAYOUT:
        return "COMMITTED_LAYOUT";
    case parsegraph_IN_COMMIT:
        return "IN_COMMIT";
    }
    parsegraph_log("BAD_LAYOUT_STATE: %d", given);
    return 0;
}

