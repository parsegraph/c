#include "NodeFit.h"
#include "log.h"

const char* parsegraph_nameNodeFit(int given)
{
    switch(given) {
        case parsegraph_NULL_NODE_FIT:
            return "NULL_NODE_FIT";
        case parsegraph_NODE_FIT_EXACT:
            return "NODE_FIT_EXACT";
        case parsegraph_NODE_FIT_LOOSE:
            return "NODE_FIT_LOOSE";
    }
    parsegraph_log("Unknown node fit: %d", given);
    return 0;
}
