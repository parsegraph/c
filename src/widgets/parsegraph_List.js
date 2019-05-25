function parsegraph_pushListItem(guid, id, type, value, cb, cbThisArg)
{
    parsegraph_request(guid, {
        command:"pushListItem",
        list_id:id,
        type:type,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
}

function parsegraph_editItem(guid, id, value, cb, cbThisArg)
{
    parsegraph_request(guid, {
        command:"editItem",
        item_id:id,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
}

function parsegraph_destroyListItem(guid, id, cb, cbThisArg)
{
    parsegraph_request(guid, {
        command:"destroyListItem",
        item_id:id
    }, cb, cbThisArg);
}
