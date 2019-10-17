function parsegraph_nameAxisOverlap(given)
{
    switch(given) {
    case parsegraph_NULL_AXIS_OVERLAP:    return "NULL_AXIS_OVERLAP";
    case parsegraph_ALLOW_AXIS_OVERLAP:   return "ALLOW_AXIS_OVERLAP";
    case parsegraph_PREVENT_AXIS_OVERLAP: return "PREVENT_AXIS_OVERLAP";
    case parsegraph_DEFAULT_AXIS_OVERLAP: return "DEFAULT_AXIS_OVERLAP";
    }
    throw new Error("A valid node axis overlap must be given: " + given);
}

function parsegraph_readAxisOverlap(given)
{
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        given = given.toLowerCase();
        switch(given) {
        case 'a':
        case 'allow':
            return parsegraph_ALLOW_AXIS_OVERLAP;
        case 'p':
        case 'prevent':
            return parsegraph_PREVENT_AXIS_OVERLAP;
        case 'd':
        case 'def':
        case 'default':
            return parsegraph_DEFAULT_AXIS_OVERLAP;
        }
    }
    return parsegraph_NULL_AXIS_OVERLAP;
}
