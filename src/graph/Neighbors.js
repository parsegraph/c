function parsegraph_createNeighbors()
{
    var object = [];
    for(var i = parsegraph_FORWARD; i <= parsegraph_OUTWARD; ++i) {
        object.push(parsegraph_createDirectionData());
    }

    return object;
}
