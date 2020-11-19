// eslint-disable-next-line require-jsdoc
export default function getUserProfile(username, listener, listenerThisArg) {
  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }

  const xhr = new XMLHttpRequest();
  if (!listenerThisArg) {
    listenerThisArg = xhr;
  }
  xhr.open('GET', '/user');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  if (username) {
    xhr.send('username=' + username);
  } else {
    xhr.send();
  }

  xhr.addEventListener('load', function() {
    try {
      const response = JSON.parse(xhr.responseText);
      let profileText = response.profile.replace(/[+]/g, '%20');
      // console.log("pt1", profileText);
      profileText = decodeURIComponent(profileText);
      // console.log("pt2", response, profileText);
      listener.call(listenerThisArg, response.status === 0, profileText);
    } catch (ex) {
      console.log(ex);
      listener.call(listenerThisArg, ex);
    }
  });

  return xhr;
}
// eslint-disable-next-line require-jsdoc
export default function setUserProfile(
    username,
    profile,
    listener,
    listenerThisArg,
) {
  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }

  const xhr = new XMLHttpRequest();
  if (!listenerThisArg) {
    listenerThisArg = xhr;
  }
  xhr.open('PUT', '/user');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

  let profileText = encodeURIComponent(profile);
  profileText = profileText.replace(/%20/, '+');
  xhr.send('profile=' + profileText);

  xhr.addEventListener('load', function() {
    try {
      const response = JSON.parse(xhr.responseText);
      listener.call(listenerThisArg, response.status === 0, response);
    } catch (ex) {
      listener.call(listenerThisArg, ex);
    }
  });

  return xhr;
}
// eslint-disable-next-line require-jsdoc
export default function ProfileWidget(graph) {
  this._graph = graph;

  this._listener = null;
  this._listenerThisArg = null;

  this._saveTimer = new TimeoutTimer();
  this._saveTimer.setDelay(0);
  this._saveTimer.setListener(this.onSave, this);

  this._containerNode = null;
}

ProfileWidget.prototype.node = function() {
  if (!this._containerNode) {
    this._containerNode = new Node(parsegraph_SLOT);
  }
  return this._containerNode;
};

ProfileWidget.prototype.load = function(username) {
  return parsegraph_getUserProfile(username, this.onLoad, this);
};

ProfileWidget.prototype.save = function() {
  this._saveTimer.schedule();
};

ProfileWidget.prototype.onSave = function() {
  if (this._saving) {
    return;
  }
  const profile = this._innerNode._label.text();
  this._saving = parsegraph_setUserProfile(null, profile, this.onSaved, this);
};

ProfileWidget.prototype.onSaved = function(res, response) {
  this._saving = null;
};

ProfileWidget.prototype.setLoadListener = function(
    listener,
    listenerThisArg,
) {
  if (!listenerThisArg) {
    listenerThisArg = this;
  }
  this._listener = listener;
  this._listenerThisArg = listenerThisArg;
};

ProfileWidget.prototype.onLoad = function(success, response) {
  if (!success) {
    return;
  }

  const parentNode = this.node();

  // console.log(response);
  const inner = parentNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
  inner.setLabel(response, this._graph.glyphAtlas());
  inner.realLabel().setEditable(true);
  inner.setKeyListener(function() {
    this.save();
    return false;
  }, this);

  this._innerNode = inner;

  if (this._listener) {
    return this._listener.call(this._listenerThisArg, success, response, inner);
  }
};
