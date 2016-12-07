function parsegraph_nameNodeType(given)
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
    }
    throw parsegraph_createException(parsegraph_BAD_NODE_TYPE, given);
}

function parsegraph_readNodeType(given)
{
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        given = given.toLowerCase().substring(0, 2);

        switch(given) {
        // 'b' is ambiguous, but blocks are more common, so assume that.
        case 'b':
        case 'bl':
            return parsegraph_BLOCK;
        case 'u':
        case 'bu':
            return parsegraph_BUD;
        case 's':
        case 'sl':
            return parsegraph_SLOT;
        }
    }

    console.log("Unknown node type: " + given);
    return parsegraph_NULL_NODE_TYPE;
}

