function parsegraph_request(guid, reqBody, cb, cbThisArg)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onerror = function(e) {
        alert(e.error);
    };
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200) {
                // Success.
                if(cb) {
                    cb.call(cbThisArg);
                }
            }
            else {
                alert(resp.status);//console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex);
        }
    };
    xhr.send(JSON.stringify(reqBody));
}
