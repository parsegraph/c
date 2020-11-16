function parsegraph_setListOwner(room, id, ownerName, cb, cbThisArg) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/@" + room.roomId() + "/" + id + "/changeowner", true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    try {
      var resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && resp.result === true) {
        if (cb) {
          cb.call(cbThisArg);
        }
        return;
      } else {
        alert(resp.result);
      }
    } catch (ex) {
      console.log(ex + " " + xhr.responseText);
    }
  };
  xhr.send("username=" + ownerName + "&world_session=" + room.sessionId());
}

function parsegraph_setListGroup(room, id, group, cb, cbThisArg) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/@" + room.roomId() + "/" + id + "/changegroup", true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    try {
      var resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && resp.result === true) {
        if (cb) {
          cb.call(cbThisArg);
        }
        return;
      } else {
        alert(resp.result);
      }
    } catch (ex) {
      console.log(ex + " " + xhr.responseText);
    }
  };
  xhr.send("group=" + group + "&world_session=" + room.sessionId());
}

function parsegraph_setListPermissions(room, id, perms, cb, cbThisArg) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/@" + room.roomId() + "/" + id + "/permissions", true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    try {
      var resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && resp.result === true) {
        if (cb) {
          cb.call(cbThisArg);
        }
        return;
      } else {
        alert(resp.result);
      }
    } catch (ex) {
      console.log(ex + " " + xhr.responseText);
    }
  };
  perms.session = room.sessionId();
  xhr.send(JSON.stringify(perms));
}

function parsegraph_PermissionsForm(room, id) {
  this._room = room;
  this.id = id;

  var container = document.createElement("span");

  var ownerForm = document.createElement("form");
  ownerForm.className = "standard";
  ownerForm.method = "post";
  this.ownerForm = ownerForm;
  ownerForm.innerHTML =
    '<h3>Owner</h3><div><label for="owner">Owner:</label><input type="text" name="owner"><input type="submit" value="Change owner"></div>';
  container.appendChild(ownerForm);
  var sub = ownerForm.childNodes[1].childNodes[2];
  var that = this;
  parsegraph_addEventListener(sub, "click", function (e) {
    if (!that.id) {
      alert("No list item ID associated with this form");
      return;
    }
    parsegraph_setListOwner(
      room,
      that.id,
      ownerForm.childNodes[1].childNodes[1].value,
      function () {
        //alert("OWNER CHANGED");
      }
    );
  });

  var groupForm = document.createElement("form");
  groupForm.className = "standard";
  groupForm.method = "post";
  this.groupForm = groupForm;
  groupForm.innerHTML =
    '<h3>Group</h3><div><label for="group">Group:</label><input type="text" name="group"><input type="submit" value="Change group"></div>';
  container.appendChild(groupForm);
  sub = groupForm.childNodes[1].childNodes[2];
  parsegraph_addEventListener(sub, "click", function (e) {
    if (!that.id) {
      alert("No list item ID associated with this form");
      return;
    }
    parsegraph_setListGroup(
      room,
      that.id,
      groupForm.childNodes[1].childNodes[1].value,
      function () {
        //alert("GROUP CHANGED");
      }
    );
  });

  var permissionForm = document.createElement("form");
  permissionForm.className = "standard";
  permissionForm.method = "post";
  permissionForm.innerHTML =
    '<h3>Permissions</h3><table style="margin:auto"><tr><td><td>Access<td>Change</tr><tr><td>User</td><td><input type="checkbox" name="user_access"><td><input type="checkbox" name="user_change"></tr>' +
    '<tr><td>Group</td><td><input type="checkbox" name="group_access"><td><input type="checkbox" name="group_change"></tr>' +
    '<tr><td>Global</td><td><input type="checkbox" name="global_access"><td><input type="checkbox" name="global_change"></tr></table><input type="submit" value="Update permissions">';
  container.appendChild(permissionForm);
  sub = permissionForm.childNodes[2];
  this.permForm = permissionForm;

  this.ownerField = ownerForm.childNodes[1].childNodes[1];
  this.groupField = groupForm.childNodes[1].childNodes[1];
  var tbody = permissionForm.childNodes[1].childNodes[0];
  var perms = {
    user_access: tbody.childNodes[1].childNodes[1].childNodes[0],
    user_change: tbody.childNodes[1].childNodes[2].childNodes[0],
    group_access: tbody.childNodes[2].childNodes[1].childNodes[0],
    group_change: tbody.childNodes[2].childNodes[2].childNodes[0],
    global_access: tbody.childNodes[3].childNodes[1].childNodes[0],
    global_change: tbody.childNodes[3].childNodes[2].childNodes[0],
  };
  perms.user_access.checked = true;
  perms.user_change.checked = true;
  perms.group_access.checked = true;
  perms.group_change.checked = true;
  perms.global_access.checked = true;
  perms.global_change.checked = false;
  this.perms = perms;
  parsegraph_addEventListener(sub, "click", function (e) {
    if (!that.id) {
      alert("No list item ID associated with this form");
      return;
    }
    parsegraph_setListPermissions(
      room,
      that.id,
      {
        user_access: perms.user_access.checked ? "on" : "off",
        user_change: perms.user_change.checked ? "on" : "off",
        group_access: perms.group_access.checked ? "on" : "off",
        group_change: perms.group_change.checked ? "on" : "off",
        global_access: perms.global_access.checked ? "on" : "off",
        global_change: perms.global_change.checked ? "on" : "off",
      },
      function () {
        //alert("PERMS UPDATED");
      }
    );
  });

  this.form = container;
}

parsegraph_PermissionsForm.prototype.container = function () {
  return this.form;
};

parsegraph_PermissionsForm.prototype.refresh = function () {
  var roomId = this._room.roomId();
  if (arguments.length > 0) {
    this.id = arguments[0];
    this.permForm.action = "/@" + roomId + "/" + this.id + "/permissions";
    this.groupForm.action = "/@" + roomId + "/" + this.id + "/changegroup";
    this.ownerForm.action = "/@" + roomId + "/" + this.id + "/changeowner";
  }
  for (var n in this.perms) {
    this.perms[n].enabled = false;
    this.perms[n].checked = false;
  }

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/@" + roomId + "/" + this.id + "/getpermissions", true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.setRequestHeader("Accept", "application/json");

  var perms = this.perms;
  var ownerField = this.ownerField;
  var groupField = this.groupField;
  ownerField.value = "";
  ownerField.enabled = false;
  groupField.value = "";
  groupField.enabled = false;
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    try {
      var resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && resp.result === true) {
        for (var n in this.perms) {
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
      } else {
        alert(resp.result);
      }
    } catch (ex) {
      console.log(ex + " " + xhr.responseText);
    }
  };
  xhr.send("world_session=" + this._room.sessionId());
};
