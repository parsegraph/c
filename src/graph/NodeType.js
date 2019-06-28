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
        case parsegraph_SLIDER:
            return "SLIDER";
        case parsegraph_SCENE:
            return "SCENE";
    }
    throw parsegraph_createException(parsegraph_BAD_NODE_TYPE, given);
}

function parsegraph_readNodeType(given)
{
    if(typeof(given) === "object") {
        return given;
    }
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        given = given.toLowerCase().substring(0, 3);

        switch(given) {
        // 'b' is ambiguous, but blocks are more common, so assume that.
        case 'b':
        case 'bl':
        case 'blo':
            return parsegraph_BLOCK;
        case 'u':
        case 'bu':
        case 'bud':
            return parsegraph_BUD;
        case 's':
        case 'sl':
        case 'slo':
            return parsegraph_SLOT;
        case 'sli':
            return parsegraph_SLIDER;
        case 'sc':
        case 'sce':
            return parsegraph_SCENE;
        }
    }

    console.log("Unknown node type: " + given);
    console.log(new Error(given));
    return parsegraph_NULL_NODE_TYPE;
}
