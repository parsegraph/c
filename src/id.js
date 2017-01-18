{
    var count = 0;
    function parsegraph_generateID(prefix)
    {
        if(!prefix) {
            prefix = "parsegraph-unique";
        }
        return prefix + "-" + (++count);
    }
}
