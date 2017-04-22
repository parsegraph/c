#include "NodeAlignment.h"
#include "log.h"

const char* parsegraph_nameNodeAlignment(int given)
{
    switch(given) {
    case parsegraph_NULL_NODE_ALIGNMENT:
        return "NULL_NODE_ALIGNMENT";
    case parsegraph_DO_NOT_ALIGN:
        return "DO_NOT_ALIGN";
    case parsegraph_ALIGN_NEGATIVE:
        return "ALIGN_NEGATIVE";
    case parsegraph_ALIGN_CENTER:
        return "ALIGN_CENTER";
    case parsegraph_ALIGN_POSITIVE:
        return "ALIGN_POSITIVE";
    case parsegraph_ALIGN_HORIZONTAL:
        return "ALIGN_HORIZONTAL";
    case parsegraph_ALIGN_VERTICAL:
        return "ALIGN_VERTICAL";
    }
    parsegraph_log("Unknown node alignment: %d", given);
    return 0;
}

int parsegraph_readNodeAlignment(const char* given)
{
    switch(given[0]) {
        case 'N':
        case 'n':
            switch(given[1]) {
            case 'e':
            case 'E':
                return parsegraph_ALIGN_NEGATIVE;
            case 'o':
            case 'O':
                return parsegraph_DO_NOT_ALIGN;
            }
            break;
        case 'p':
            return parsegraph_ALIGN_POSITIVE;
        case 'c':
            return parsegraph_ALIGN_CENTER;
        case 'v':
            return parsegraph_ALIGN_VERTICAL;
        case 'h':
            return parsegraph_ALIGN_HORIZONTAL;
    }

    return parsegraph_NULL_NODE_ALIGNMENT;
}
