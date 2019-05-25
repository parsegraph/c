function parsegraph_prepopulate(envGuid, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    parsegraph_request(envGuid, {
        command:"prepopulate"
    }, listener, listenerThisArg);
}
