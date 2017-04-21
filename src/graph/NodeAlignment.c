#include "NodeAlignment.h"

const int parsegraph_NULL_NODE_ALIGNMENT = 0;
const int parsegraph_DO_NOT_ALIGN = 1;
const int parsegraph_ALIGN_NEGATIVE = 2;
const int parsegraph_ALIGN_CENTER = 3;
const int parsegraph_ALIGN_POSITIVE = 4;

// Used to align inward nodes.
const int parsegraph_ALIGN_HORIZONTAL = 5;
const int parsegraph_ALIGN_VERTICAL = 6;

const char* parsegraph_nameNodeAlignment(int given)
{
    if(given == parsegraph_NULL_NODE_ALIGNMENT) {
        return "NULL_NODE_ALIGNMENT";
    }
    if(given == parsegraph_DO_NOT_ALIGN) {
        return "DO_NOT_ALIGN";
    }
    if(given == parsegraph_ALIGN_NEGATIVE) {
        return "ALIGN_NEGATIVE";
    }
    if(given == parsegraph_ALIGN_CENTER) {
        return "ALIGN_CENTER";
    }
    if(given == parsegraph_ALIGN_POSITIVE) {
        return "ALIGN_POSITIVE";
    }
    if(given == parsegraph_ALIGN_HORIZONTAL) {
        return "ALIGN_HORIZONTAL";
    }
    if(given == parsegraph_ALIGN_VERTICAL) {
        return "ALIGN_VERTICAL";
    }
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

