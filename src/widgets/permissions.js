function parsegraph_setListOwner(guid, id, ownerName, cb, cbThisArg)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid + "/" + id + "/changeowner", true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200 && resp.result == "Success.") {
                if(cb) {
                    cb.call(cbThisArg);
                }
                return;
            }
            else {
                alert(resp.status);//console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex + " " + xhr.responseText);
        }
    };
    xhr.send("username=" + ownerName);
}

function parsegraph_setListGroup(guid, id, group, cb, cbThisArg)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid + "/" + id + "/changegroup", true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200 && resp.result == "Success.") {
                if(cb) {
                    cb.call(cbThisArg);
                }
                return;
            }
            else {
                alert(resp.status);//console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex + " " + xhr.responseText);
        }
    };
    xhr.send("group=" + group);
}

function parsegraph_setListPermissions(guid, id, perms, cb, cbThisArg)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid + "/" + id + "/permissions", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200 && resp.result == "Success.") {
                if(cb) {
                    cb.call(cbThisArg);
                }
                return;
            }
            else {
                alert(resp.status);//console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex + " " + xhr.responseText);
        }
    };
    xhr.send(JSON.stringify(perms));
}

function parsegraph_PermissionsForm(guid, id)
{
    this.guid = guid;
    this.id = id;

    var container = document.createElement('span');

    var ownerForm = document.createElement("form");
    ownerForm.className = "standard";
    ownerForm.method = "post";
    ownerForm.action = '/@' + guid + "/" + id + '/changeowner';
    this.ownerForm = ownerForm;
    ownerForm.innerHTML = '<h3>Owner</h3><div><label for="owner">Owner:</label><input type="text" name="owner"><input type="submit" value="Change owner"></div>';
    container.appendChild(ownerForm);
    var sub = ownerForm.childNodes[1].childNodes[2];
    var that = this;
    parsegraph_addEventListener(sub, "click", function(e) {
        parsegraph_setListOwner(guid, that.id, ownerForm.childNodes[1].childNodes[1].value, function() {
            alert("OWNER CHANGED");
        });
    });

    var groupForm = document.createElement("form");
    groupForm.className = "standard";
    groupForm.method = "post";
    groupForm.action = '/@' + guid + "/" + id + '/changegroup';
    this.groupForm = groupForm;
    groupForm.innerHTML = '<h3>Group</h3><div><label for="group">Group:</label><input type="text" name="group"><input type="submit" value="Change group"></div>';
    container.appendChild(groupForm);
    sub = groupForm.childNodes[1].childNodes[2];
    parsegraph_addEventListener(sub, "click", function(e) {
        parsegraph_setListGroup(guid, that.id, groupForm.childNodes[1].childNodes[1].value, function() {
            alert("GROUP CBHANGED");
        });
    });

    var permissionForm = document.createElement("form");
    permissionForm.className = "standard";
    permissionForm.method = "post";
    permissionForm.action = '/@' + guid + "/" + id + '/permissions';
    permissionForm.innerHTML = '<h3>Permissions</h3><table style="margin:auto"><tr><td><td>Access<td>Change</tr><tr><td>User</td><td><input type="checkbox" name="user_access"><td><input type="checkbox" name="user_change"></tr>' +
        '<tr><td>Group</td><td><input type="checkbox" name="group_access"><td><input type="checkbox" name="group_change"></tr>' +
        '<tr><td>Global</td><td><input type="checkbox" name="global_access"><td><input type="checkbox" name="global_change"></tr></table><input type="submit" value="Update permissions">';
    container.appendChild(permissionForm);
    sub = permissionForm.childNodes[2];
    this.permForm = permissionForm;

    this.ownerField = ownerForm.childNodes[1].childNodes[1];
    this.groupField = groupForm.childNodes[1].childNodes[1];
    var tbody = permissionForm.childNodes[1].childNodes[0];
    var perms = {
        user_access:tbody.childNodes[1].childNodes[1].childNodes[0],
        user_change:tbody.childNodes[1].childNodes[2].childNodes[0],
        group_access:tbody.childNodes[2].childNodes[1].childNodes[0],
        group_change:tbody.childNodes[2].childNodes[2].childNodes[0],
        global_access:tbody.childNodes[3].childNodes[1].childNodes[0],
        global_change:tbody.childNodes[3].childNodes[2].childNodes[0]
    };
    perms.user_access.checked = true;
    perms.user_change.checked = true;
    perms.group_access.checked = true;
    perms.group_change.checked = true;
    perms.global_access.checked = true;
    perms.global_change.checked = false;
    this.perms = perms;
    parsegraph_addEventListener(sub, "click", function(e) {
        parsegraph_setListPermissions(guid, that.id, {
            user_access:perms.user_access.checked ? "on" : "off",
            user_change:perms.user_change.checked ? "on" : "off",
            group_access:perms.group_access.checked ? "on" : "off",
            group_change:perms.group_change.checked ? "on" : "off",
            global_access:perms.global_access.checked ? "on" : "off",
            global_change:perms.global_change.checked ? "on" : "off"
        }, function() {
            alert("PERMS UPDATED");
        });
    });

    this.form = container;
}

parsegraph_PermissionsForm.prototype.container = function() {
    return this.form;
};

parsegraph_PermissionsForm.prototype.refresh = function() {
    if(arguments.length > 0) {
        this.id = arguments[0];
        this.permForm.action = '/@' + this.guid + "/" + this.id + '/permissions';
        this.groupForm.action = '/@' + this.guid + "/" + this.id + '/changegroup';
        this.ownerForm.action = '/@' + this.guid + "/" + this.id + '/changeowner';
    }
    for(var n in this.perms) {
        this.perms[n].enabled = false;
        this.perms[n].checked = false;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/@" + this.guid + "/" + this.id + "/permissions", true);
    xhr.setRequestHeader("Accept", "application/json");

    var perms = this.perms;
    var ownerField = this.ownerField;
    var groupField = this.groupField;
    ownerField.value = "";
    ownerField.enabled = false;
    groupField.value = "";
    groupField.enabled = false;
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200) {
                for(var n in this.perms) {
                    this.perms[n].enabled = true;
                }
                perms.user_access.checked = resp.user_access;
                perms.user_change.checked = resp.user_change;
                perms.group_access.checked = resp.group_access;
                perms.group_change.checked = resp.group_change;
                perms.global_access.checked = resp.global_access;
                perms.global_change.checked = resp.global_change;
                ownerField.value = resp.owner;
                groupField.value = resp.group;
            }
            else {
                alert(resp.status);//console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex + " " + xhr.responseText);
        }
    };
    xhr.send();
};
