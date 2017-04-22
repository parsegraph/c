#include "NodeType.h"
#include "log.h"
#include <string.h>
#include <ctype.h>

const char* parsegraph_nameNodeType(int given)
{
    switch(given) {
        case parsegraph_NULL_NODE_TYPE:
            return "NULL_NODE_TYPE";
        case parsegraph_SLOT:
            return "SLOT";
        case parsegraph_BLOCK:
            return "BLOCK";
        case parsegraph_BUD:
            return "BUD";
        case parsegraph_SLIDER:
            return "SLIDER";
        case parsegraph_SCENE:
            return "SCENE";
    }
    parsegraph_log("Bad node type: %d", given);
    return "NULL_NODE_TYPE";
}

int parsegraph_readNodeType(const char* given)
{
    switch(strlen(given)) {
    case 0:
        goto unrecognized;
    case 1:
        switch(tolower(given[0])) {
        case 'b':
            return parsegraph_BLOCK;
        case 'u':
            return parsegraph_BUD;
        case 's':
            return parsegraph_SLOT;
        }
        goto unrecognized;
    case 2:
        switch(tolower(given[0])) {
        case 'b':
            switch(tolower(given[1])) {
            case 'u':
                return parsegraph_BUD;
            case 'l':
                return parsegraph_BLOCK;
            }
            goto unrecognized;
        case 'u':
            return parsegraph_BUD;
        case 's':
            switch(tolower(given[1])) {
            case 'c':
                return parsegraph_SCENE;
            case 'l':
                return parsegraph_SLOT;
            }
        }
        goto unrecognized;
    case 3:
    default:
        switch(tolower(given[0])) {
        case 'b':
            switch(tolower(given[1])) {
            case 'u':
                return parsegraph_BUD;
            case 'l':
                return parsegraph_BLOCK;
            }
            goto unrecognized;
        case 'u':
            return parsegraph_BUD;
        case 's':
            switch(tolower(given[1])) {
            case 'c':
                return parsegraph_SCENE;
            case 'l':
                switch(tolower(given[2])) {
                case 'o':
                    return parsegraph_SLOT;
                case 'i':
                    return parsegraph_SLIDER;
                }
            }
        }
        goto unrecognized;
    }
unrecognized:
    parsegraph_log("Unknown node type: %s", given);
    return parsegraph_NULL_NODE_TYPE;
}
