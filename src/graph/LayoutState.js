parsegraph_NULL_LAYOUT_STATE = 0;
parsegraph_NEEDS_COMMIT = 1;
parsegraph_COMMITTED_LAYOUT = 2;
parsegraph_IN_COMMIT = 3;

function parsegraph_nameLayoutState(given)
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
    throw parsegraph_createException(parsegraph_BAD_LAYOUT_STATE, given);
}
