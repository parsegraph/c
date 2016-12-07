function parsegraph_nameNodeFit(given)
{
    switch(given) {
        case parsegraph_NULL_NODE_FIT:
            return "NULL_NODE_FIT";
        case parsegraph_NODE_FIT_EXACT:
            return "NODE_FIT_EXACT";
        case parsegraph_NODE_FIT_LOOSE:
            return "NODE_FIT_LOOSE";
    }
    throw new Error("Unknown node fit: " + given);
}
