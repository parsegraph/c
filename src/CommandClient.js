parsegraph_safeParse = function (text) {
  if (text === undefined) {
    throw new Error("Text is undefined.");
  }
  try {
    return JSON.parse(text);
  } catch (ex) {
    return {
      status: "error",
      message:
        "Could not read server response due to error reading '" +
        text +
        "<br/>" +
        ex,
    };
  }
};

/**
 * Creates a callback that safely parses the XHR response
 * as a JSON object. If the XHR response does not properly
 * parse, then a new JSON object is given.
 */
parsegraph_safeParseCallback = function (callback, callbackThisArg) {
  return function (xhr) {
    if (callback != undefined) {
      callback.call(callbackThisArg, parsegraph_safeParse(xhr.responseText));
    }
  };
};

/*
 * Constructs a new client for the specified command server.
 */
function parsegraph_CommandClient(serverUrl) {
  this._serverUrl = serverUrl;
}

/**
 * Returns the URL for server requests.
 */
parsegraph_CommandClient.prototype.serverUrl = function () {
  return this._serverUrl;
};

parsegraph_CommandClient.prototype.setSession = function (response) {
  if (response.status != "ok") {
    throw new Error("Response must be valid, got: " + response);
  }

  this._selector = response.selector;
  this._token = response.token;
  this._username = response.username;
};

parsegraph_CommandClient.prototype.discardSession = function () {
  delete this._selector;
  delete this._token;
  delete this._username;
};

parsegraph_CommandClient.prototype.sessionSelector = function () {
  return this._selector;
};

parsegraph_CommandClient.prototype.sessionToken = function () {
  return this._token;
};

parsegraph_CommandClient.prototype.username = function () {
  return this._username;
};

parsegraph_CommandClient.prototype.setUsername = function (username) {
  this._username = username;
};

parsegraph_CommandClient.prototype.hasSession = function () {
  return this._selector !== undefined;
};

parsegraph_CommandClient.prototype.sendRawCommand = function (
  request,
  callback,
  callbackThisArg
) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      if (callback != undefined) {
        callback.call(callbackThisArg, xhr);
      }
    }
  };
  xhr.open("POST", this.serverUrl(), true);
  xhr.send(request);
  return xhr;
};

parsegraph_CommandClient.prototype.sendAnonymousCommand = function (
  commandName,
  parameters,
  requestBody,
  callback,
  callbackThisArg
) {
  var request = commandName + "\n";
  request += parameters + "\n";
  request += requestBody;
  return this.sendRawCommand(
    request,
    parsegraph_safeParseCallback(callback, callbackThisArg)
  );
};

parsegraph_CommandClient.prototype.sendCommand = function (
  commandName,
  parameters,
  requestBody,
  callback,
  callbackThisArg
) {
  if (!this.hasSession()) {
    throw new Error("No session available to send with command.");
  }
  var request = commandName + "\n";
  request += "selector=" + this._selector + "&token=" + this._token + "\n";
  request += parameters + "\n";
  request += requestBody;
  return this.sendRawCommand(
    request,
    parsegraph_safeParseCallback(callback, callbackThisArg)
  );
};
