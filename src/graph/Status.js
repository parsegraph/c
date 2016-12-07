parsegraph_NULL_STATUS = 0;
parsegraph_OK = 1;
parsegraph_BAD_STATUS = 2;
parsegraph_NO_NODE_FOUND = 3;
parsegraph_ALREADY_OCCUPIED = 4;
parsegraph_BAD_NODE_DIRECTION = 5;
parsegraph_BAD_NODE_CONTENT = 6;
parsegraph_BAD_AXIS = 7;
parsegraph_BAD_LAYOUT_STATE = 8;
parsegraph_BAD_NODE_ALIGNMENT = 9;
parsegraph_CANNOT_AFFECT_PARENT = 10;
parsegraph_OFFSET_IS_NEGATIVE = 11;
parsegraph_NODE_IS_ROOT = 12;
parsegraph_BAD_LAYOUT_PREFERENCE = 13;

function parsegraph_nameStatus(given)
{
    switch(given) {
        case parsegraph_NULL_STATUS:
            return "NULL_STATUS";
        case parsegraph_OK:
            return "OK";
        case parsegraph_NO_NODE_FOUND:
            return "NO_NODE_FOUND";
        case parsegraph_ALREADY_OCCUPIED:
            return "ALREADY_OCCUPIED";
        case parsegraph_BAD_NODE_DIRECTION:
            return "BAD_NODE_DIRECTION";
        case parsegraph_BAD_NODE_CONTENT:
            return "BAD_NODE_CONTENT";
        case parsegraph_BAD_AXIS:
            return "BAD_AXIS";
        case parsegraph_BAD_LAYOUT_STATE:
            return "BAD_LAYOUT_STATE";
        case parsegraph_BAD_NODE_ALIGNMENT:
            return "BAD_NODE_ALIGNMENT";
        case parsegraph_NODE_IS_ROOT:
            return "NODE_IS_ROOT";
        case parsegraph_BAD_STATUS:
            return "BAD_STATUS";
        case parsegraph_CANNOT_AFFECT_PARENT:
            return "CANNOT_AFFECT_PARENT";
        case parsegraph_OFFSET_IS_NEGATIVE:
            return "OFFSET_IS_NEGATIVE";
        case parsegraph_BAD_LAYOUT_PREFERENCE:
            return "BAD_LAYOUT_PREFERENCE";
    }
    throw parsegraph_createException(parsegraph_BAD_STATUS, given);
}
