function parsegraph_createException(exceptionCode)
{
    if(arguments.length > 1) {
        return new Error(parsegraph_nameStatus(exceptionCode) + "\nArgument: " + arguments[1]);
    }
    return new Error(parsegraph_nameStatus(exceptionCode));
}
