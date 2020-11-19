// eslint-disable-next-line require-jsdoc
export default function authenticate(listener, listenerThisArg) {
  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }

  const xhr = new XMLHttpRequest();
  if (!listenerThisArg) {
    listenerThisArg = xhr;
  }
  xhr.open('POST', '/authenticate', true);
  // xhr.setRequestHeader("Accept", "application/json");
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    try {
      const loginResponse = JSON.parse(xhr.responseText);
      listener.call(listenerThisArg, xhr.status === 200, loginResponse);
    } catch (ex) {
      listener.call(listenerThisArg, ex);
    }
  };
  xhr.send();

  return xhr;
}
// eslint-disable-next-line require-jsdoc
export default function beginUserLogin(
    username,
    password,
    remember,
    listener,
    listenerThisArg,
) {
  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }

  const loginRequest = new XMLHttpRequest();
  if (!listenerThisArg) {
    listenerThisArg = loginRequest;
  }
  loginRequest.open('POST', '/user?command=beginUserLogin');
  loginRequest.setRequestHeader('Accept', 'application/json');
  loginRequest.setRequestHeader(
      'Content-Type',
      'application/x-www-form-urlencoded',
  );
  loginRequest.send(
      'username=' +
      username +
      '&password=' +
      password +
      '&remember=' +
      (!!remember ? '1' : '0'),
  );

  loginRequest.addEventListener('load', function() {
    try {
      const loginResponse = JSON.parse(loginRequest.responseText);
      listener.call(
          listenerThisArg,
          loginRequest.status === 200,
          loginResponse,
      );
    } catch (ex) {
      console.log(ex);
      listener.call(listenerThisArg, ex);
    }
  });

  return loginRequest;
}
// eslint-disable-next-line require-jsdoc
function endUserLogin(listener, listenerThisArg) {
  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }

  const xhr = new XMLHttpRequest();
  if (!listenerThisArg) {
    listenerThisArg = xhr;
  }
  xhr.open('POST', '/logout');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send();

  xhr.addEventListener('load', function() {
    try {
      if (xhr.status === 200) {
        const loginResponse = JSON.parse(xhr.responseText);
        listener.call(listenerThisArg, true, loginResponse);
      } else {
        listener.call(listenerThisArg, false, xhr.responseText);
      }
    } catch (ex) {
      listener.call(listenerThisArg, ex);
    }
  });

  return xhr;
}
// eslint-disable-next-line require-jsdoc
export default function createNewUser(
    username,
    password,
    listener,
    listenerThisArg,
) {
  const loginRequest = new XMLHttpRequest();
  loginRequest.open('POST', '/user?command=createNewUser');
  loginRequest.setRequestHeader('Accept', 'application/json');
  loginRequest.setRequestHeader(
      'Content-Type',
      'application/x-www-form-urlencoded',
  );
  loginRequest.send('username=' + username + '&password=' + password);

  if (!listener) {
    throw new Error('Refusing to fire without a non-null listener');
  }
  if (!listenerThisArg) {
    listenerThisArg = loginRequest;
  }

  loginRequest.addEventListener('load', function() {
    try {
      const loginResponse = JSON.parse(loginRequest.responseText);
      if (loginResponse.session_selector) {
        // Succeeded.
        listener.call(listenerThisArg, true, loginResponse);
      } else {
        listener.call(listenerThisArg, false, loginResponse);
      }
    } catch (ex) {
      listener.call(listenerThisArg, ex);
    }
  });

  return loginRequest;
}
// eslint-disable-next-line require-jsdoc
export default function passwordNode(listener, listenerThisArg) {
  const bbs = copyStyle(parsegraph_BLOCK);
  bbs.backgroundColor = new Color(1, 1, 1, 1);
  bbs.borderColor = new Color(0.5, 0.5, 0.5, 1);
  bbs.minWidth = BUD_RADIUS * 80;
  const node = new Node(parsegraph_BLOCK);
  node.setBlockStyle(bbs);

  const nbs = parsegraph_copyStyle(parsegraph_BUD);

  if (!listenerThisArg) {
    listenerThisArg = this;
  }

  let pos = 0;
  let pw = '';

  const inner = new Node(parsegraph_BLOCK);
  inner.setBlockStyle(nbs);
  let last = inner;

  node.setKeyListener(function(key) {
    if (listener && listener.call(listenerThisArg, key)) {
      return true;
    }
    switch (key) {
      case 'Escape':
      case 'Shift':
      case 'Control':
      case 'Tab':
      case 'ArrowUp':
      case 'ArrowDown':
        break;
      case 'ArrowLeft':
        pos = Math.max(pos - 1, 0);
        break;
      case 'ArrowRight':
        pos = Math.min(pos + 1, pw.length - 1);
        break;
      case 'Backspace':
        pw = pw.slice(0, pos - 1) + pw.slice(pos);
        pos = Math.max(pos - 1, 0);
        if (last === inner) {
          node.disconnectNode(parsegraph_INWARD);
        } else {
          const newLast = last.nodeAt(parsegraph_BACKWARD);
          newLast.disconnectNode(parsegraph_FORWARD);
          last = newLast;
        }
        break;
      case 'Delete':
        pw = pw.slice(0, pos) + pw.slice(pos + 1);
        if (last === inner) {
          node.disconnectNode(parsegraph_INWARD);
        } else {
          const newLast = last.nodeAt(parsegraph_BACKWARD);
          newLast.disconnectNode(parsegraph_FORWARD);
          last = newLast;
        }
        break;
      default:
        pw = pw.slice(0, pos) + key + pw.slice(pos);
        pos += key.length;
        if (last === inner && inner.isRoot()) {
          node.connectNode(parsegraph_INWARD, inner);
          node.setNodeAlignmentMode(
              parsegraph_INWARD,
              parsegraph_ALIGN_VERTICAL,
          );
        } else {
          last = last.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
          last.setBlockStyle(nbs);
        }
        break;
    }

    node.setValue(pw);
  }, this);

  return node;
}
// eslint-disable-next-line require-jsdoc
function LoginWidget(surface, graph) {
  this._graph = graph;
  this._surface = surface;

  this._loginListener = null;
  this._loginListenerThisArg = null;
  this._logoutListener = null;
  this._logoutListenerThisArg = null;

  this._loginForm = null;
  this._usernameField = null;
  this._passwordField = null;

  this._bbs = parsegraph_copyStyle(parsegraph_BLOCK);
  this._bbs.backgroundColor = new Color(1, 1, 0.5, 1);
  this._bbs.borderColor = new Color(0.5, 0.5, 0, 1);

  this._nbs = parsegraph_copyStyle(parsegraph_BLOCK);
  this._nbs.backgroundColor = new Color(1, 1, 1, 1);
  this._nbs.borderColor = new Color(0.5, 0.5, 0.5, 1);
  this._nbs.minWidth = BUD_RADIUS * 80;

  this._cbs = parsegraph_copyStyle(parsegraph_BUD);
  this._cbs.backgroundColor = new Color(1, 1, 1, 1);
  this._cbs.borderColor = new Color(0.5, 0.5, 0.5, 1);
  this._cbs.selectedBackgroundColor = this._cbs.backgroundColor;
  this._cbs.selectedBorderColor = this._cbs.borderColor;

  this._scbs = parsegraph_copyStyle(parsegraph_BUD);
  this._scbs.backgroundColor = new Color(0.3, 1, 0.3, 1);
  this._scbs.borderColor = new Color(0.5, 0.5, 0.5, 1);
  this._scbs.selectedBackgroundColor = this._scbs.backgroundColor;
  this._scbs.selectedBorderColor = this._scbs.borderColor;
}

// Authenticate an existing session (does not expose the session to JS)
LoginWidget.prototype.authenticate = function() {
  this.onAuthenticate.call(this, true, {username: ''});
  // parsegraph_later(function() {
  // this.onAuthenticate.call(this, true, {username:"dafrito"});
  // }, this);
  // parsegraph_authenticate(this.onAuthenticate, this);
  // if(localStorage.getItem("LoginWidget_remember")) {
  // parsegraph_authenticate(this.onAuthenticate, this);
  // }
};

// Log out.
LoginWidget.prototype.logout = function() {
  endUserLogin(this.onLogout, this);
};

LoginWidget.prototype.onLogout = function(res, result) {
  if (res === true) {
    if (this._logoutListener) {
      this._logoutListener.call(
          this._logoutListenerThisArg,
          true,
          result,
          this._containerNode,
      );
    }
    window.location.href = '/';
    this._containerNode.disconnectNode(parsegraph_DOWNWARD);
  } else if (res === false) {
    console.log('Logout failed: ' + result);
  } else {
    console.log('Exception occurred during logout:', ...args);
  }
};

// Log in.
LoginWidget.prototype.login = function() {
  // console.log(new Error("Logging in"));
  const username = this._usernameField._label.getText();
  const password = this._passwordField.value();
  parsegraph_beginUserLogin(
      username,
      password,
      this.isRemembering(),
      this.onLogin,
      this,
  );
};

// Create new user.
LoginWidget.prototype.createNewUser = function() {
  const username = this._usernameField._label.getText();
  const password = this._passwordField.value();
  parsegraph_createNewUser(username, password, this.onLogin, this);
};

LoginWidget.prototype.setLoginListener = function(
    listener,
    listenerThisArg,
) {
  if (!listenerThisArg) {
    listenerThisArg = this;
  }
  this._loginListener = listener;
  this._loginListenerThisArg = listenerThisArg;
};

LoginWidget.prototype.setLogoutListener = function(
    listener,
    listenerThisArg,
) {
  if (!listenerThisArg) {
    listenerThisArg = this;
  }
  this._logoutListener = listener;
  this._logoutListenerThisArg = listenerThisArg;
};

LoginWidget.prototype.onLogin = function(res, userLogin) {
  console.log(new Error('onLogin'), res, userLogin);
  let resNode;
  if (res === true) {
    this._loginForm = null;

    this._containerNode.disconnectNode(parsegraph_INWARD);
    resNode = this.loggedInForm();
    resNode.setLabel(userLogin.username, this._graph.font());
    this._containerNode.connectNode(parsegraph_INWARD, resNode);
    this._graph.input().setFocusedNode(null);
    this._graph.scheduleRepaint();

    /* if(localStorage.getItem("parsegraph_LoginWidget_remember") !== null) {
            localStorage.setItem("parsegraph_LoginWidget_remember",
            userLogin.username);
        }*/

    if (this._loginListener) {
      return this._loginListener.call(
          this._loginListenerThisArg,
          res,
          userLogin,
          this._containerNode,
      );
    }
  } else if (res === false) {
    this._containerNode.disconnectNode(parsegraph_DOWNWARD);
    resNode = new Node(parsegraph_BLOCK);
    resNode.setLabel(userLogin.result, this._graph.font());
    this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
    this._graph.input().setFocusedNode(null);
    this._graph.scheduleRepaint();
  } else {
    // Exception.
    console.log('Login response', res);
    this._containerNode.disconnectNode(parsegraph_DOWNWARD);
    resNode = new Node(parsegraph_BLOCK);
    resNode.setLabel(
        'An exception occurred during processing and was logged.',
        this._graph.font(),
    );
    this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
    this._graph.scheduleRepaint();
  }
};

LoginWidget.prototype.loggedInForm = function() {
  if (this._loggedInForm) {
    return this._loggedInForm;
  }

  const car = new Caret(parsegraph_BLOCK);
  // eslint-disable-next-line require-jsdoc
  function toggleFullScreen() {
    const doc = window.document;
    const docEl = this._surface._canvas;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    const cancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;

    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      requestFullScreen.call(docEl);
    } else {
      cancelFullScreen.call(doc);
    }
  }

  car.root().setClickListener(function() {
    const node = car.root();
    const carousel = this.graph().carousel();
    carousel.clearCarousel();
    carousel.moveCarousel(node.absoluteX(), node.absoluteY());
    carousel.showCarousel();

    // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
    let actionNode = new Node(parsegraph_BLOCK);
    actionNode.setLabel('Leave', this.font());
    carousel.addToCarousel(actionNode, this.leave, this);
    actionNode = new Node(parsegraph_BLOCK);
    actionNode.setLabel('Log out', this.font());
    carousel.addToCarousel(actionNode, this.logout, this);

    actionNode = new Node(parsegraph_BLOCK);
    actionNode.setLabel('Fullscreen', this.font());
    carousel.addToCarousel(
        actionNode,
        function() {
          toggleFullScreen.call(this);
        },
        this,
    );
    this.graph().carousel().scheduleCarouselRepaint();
  }, this);

  this._loggedInForm = car.root();

  return this._loggedInForm;
};

LoginWidget.prototype.leave = function() {
  window.location = '/';
};

LoginWidget.prototype.graph = function() {
  return this._graph;
};

LoginWidget.prototype.onAuthenticate = function(res, userLogin) {
  let resNode;
  if (res === true) {
    this._containerNode.disconnectNode(parsegraph_INWARD);
    resNode = this.loggedInForm();
    resNode.setLabel(userLogin.username, this._graph.font());
    this._containerNode.connectNode(parsegraph_INWARD, resNode);
    this._graph.input().setFocusedNode(null);
    this._graph.scheduleRepaint();

    /* if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            localStorage.setItem("parsegraph_LoginWidget_remember",
            userLogin.username);
        }*/
    if (this._loginListener) {
      return this._loginListener.call(
          this._loginListenerThisArg,
          res,
          userLogin,
          this._containerNode,
      );
    }
  } else if (res === false) {
    // localStorage.removeItem("LoginWidget_remember");
    this._containerNode.disconnectNode(parsegraph_DOWNWARD);
    resNode = new Node(parsegraph_BLOCK);
    resNode.setLabel(userLogin.result, this._graph.font());
    this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
    this._graph.scheduleRepaint();
  } else {
    // localStorage.removeItem("LoginWidget_remember");
    // Exception.
    console.log(res);
    this._containerNode.disconnectNode(parsegraph_DOWNWARD);
    resNode = new Node(parsegraph_BLOCK);
    resNode.setLabel(
        'An exception occurred during processing and was logged.',
        this._graph.font(),
    );
    this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
    this._graph.scheduleRepaint();
  }
};

LoginWidget.prototype.font = function() {
  return parsegraph_defaultFont();
};

LoginWidget.prototype.setTitle = function(title) {
  this._title = title;
};

LoginWidget.prototype.title = function() {
  return this._title;
};

LoginWidget.prototype.root = function() {
  if (!this._root) {
    const car = new Caret(parsegraph_SLOT);
    car.label(this.title());
    this._containerNode = car.root();
    this._containerNode.setIgnoreMouse(true);
    // if(localStorage.getItem("LoginWidget_remember")) {
    this._containerNode.connectNode(parsegraph_INWARD, this.authenticateForm());
    this._containerNode.setNodeAlignmentMode(
        parsegraph_INWARD,
        parsegraph_ALIGN_VERTICAL,
    );
    // }
    // else {
    // this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
    // this._containerNode.setNodeAlignmentMode(parsegraph_INWARD,
    //       parsegraph_ALIGN_VERTICAL);
    // }
    this._root = car.root();
  }
  return this._root;
};

LoginWidget.prototype.authenticateForm = function() {
  if (this._authenticateForm) {
    return this._authenticateForm;
  }

  const car = new Caret(parsegraph_BLOCK);
  car.setFont(this.font());
  const remembered = '1'; // localStorage.getItem("LoginWidget_remember");
  if (remembered !== '1' && remembered !== '0') {
    car.label(remembered);
  } else {
    car.label('Authenticate');
  }
  car.node().setKeyListener(this.authenticate, this);
  car.node().setClickListener(this.authenticate, this);
  this._authenticateForm = car.root();

  return this._authenticateForm;
};

LoginWidget.prototype.loginForm = function() {
  if (this._loginForm) {
    return this._loginForm;
  }

  const nbs = parsegraph_copyStyle(parsegraph_BLOCK);
  nbs.backgroundColor = new Color(1, 1, 1, 1);
  nbs.borderColor = new Color(0.5, 0.5, 0.5, 1);
  nbs.minWidth = BUD_RADIUS * 80;

  const car = new Caret(parsegraph_BUD);

  this._loginForm = car.root();
  car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
  car.label('Username');
  car.node().setClickListener(function() {
    this.graph().input().setFocusedNode(this._usernameField);
    return true;
  }, this);
  car.move(parsegraph_FORWARD);
  car.pull('b');
  this._usernameField = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
  const tf = car.node();
  tf.setClickListener = function() {
    const l = tf.label();
    alert(l);
  };
  car.node().setBlockStyle(nbs);
  car.label('');
  car.node()._label.setEditable(true);
  car.move(parsegraph_BACKWARD);

  car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
  car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
  car.label('Password');
  car.move(parsegraph_FORWARD);
  const graph = this._graph;
  this._passwordField = car.connect(
      parsegraph_FORWARD,
      parsegraph_passwordNode(function(key) {
        if (
          key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown'
        ) {
          return false;
        }
        graph.scheduleRepaint();
        if (key === 'Enter') {
          this.login();
          return true;
        }
      }, this),
  );

  car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
  car.push();

  this._rememberCheck = car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
  car.node().setBlockStyle(this._cbs);

  car.node().setClickListener(this.toggleRemember, this);
  car.node().setKeyListener(function(key) {
    if (key === 'Enter' || key === ' ') {
      this.toggleRemember();
    }
  }, this);

  car.pull(parsegraph_FORWARD);
  car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
  car.label('Remember log in');
  car.node().setClickListener(this.toggleRemember, this);
  car.pop();

  car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
  this._leaveButton = car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
  car.node().setBlockStyle(this._bbs);
  car.label('Leave');
  car.node().setClickListener(this.leave, this);
  car.node().setKeyListener(this.leave, this);
  car.move('f');

  this._loginButton = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
  car.node().setBlockStyle(this._bbs);
  car.label('Log in');
  car.node().setClickListener(this.login, this);
  car.node().setKeyListener(this.login, this);

  this._createUserButton = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
  car.node().setBlockStyle(this._bbs);
  car.label('Create user');
  car.node().setClickListener(this.createNewUser, this);
  car.node().setKeyListener(this.createNewUser, this);

  parsegraph_chainAllTabs(
      this._usernameField,
      this._passwordField,
      this._rememberCheck,
      this._loginButton,
      this._createUserButton,
  );

  return this._loginForm;
};

LoginWidget.prototype.isRemembering = function() {
  return this._rememberCheck.blockStyle() === this._scbs;
};

LoginWidget.prototype.toggleRemember = function() {
  this._rememberCheck.setBlockStyle(
    this.isRemembering() ? this._cbs : this._scbs,
  );
  if (this.isRemembering()) {
    // localStorage.setItem("LoginWidget_remember", "1");
  } else {
    // localStorage.removeItem("LoginWidget_remember");
  }
  this._graph.scheduleRepaint();
};
