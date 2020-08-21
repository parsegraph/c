export const parsegraph_NULL_STATUS = 0;
export const parsegraph_OK = 1;
export const parsegraph_BAD_STATUS = 2;
export const parsegraph_NO_NODE_FOUND = 3;
export const parsegraph_ALREADY_OCCUPIED = 4;
export const parsegraph_BAD_NODE_DIRECTION = 5;
export const parsegraph_BAD_NODE_CONTENT = 6;
export const parsegraph_BAD_AXIS = 7;
export const parsegraph_BAD_LAYOUT_STATE = 8;
export const parsegraph_BAD_NODE_ALIGNMENT = 9;
export const parsegraph_CANNOT_AFFECT_PARENT = 10;
export const parsegraph_OFFSET_IS_NEGATIVE = 11;
export const parsegraph_NODE_IS_ROOT = 12;
export const parsegraph_BAD_LAYOUT_PREFERENCE = 13;

export function parsegraph_nameStatus(given)
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

export function parsegraph_createException(exceptionCode)
{
    if(arguments.length > 1) {
        return new Error(parsegraph_nameStatus(exceptionCode) + "\nArgument: " + arguments[1]);
    }
    return new Error(parsegraph_nameStatus(exceptionCode));
}
