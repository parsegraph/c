export default function addUserCommands(client) {
  // Start a new login.
  client.beginUserLogin = function(
      username,
      password,
      callback,
      callbackThisArg,
  ) {
    return client.sendAnonymousCommand(
        'Begin user login.',
        'username=' + username + '&password=' + password,
        '',
        callback,
        callbackThisArg,
    );
  };

  // Request a change of password.
  client.changeUserPassword = function(
      username,
      password,
      callback,
      callbackThisArg,
  ) {
    return client.sendCommand(
        'Change user password.',
        'username=' + username + '&password=' + password,
        '',
        callback,
        callbackThisArg,
    );
  };

  // Create a new user.
  client.createUser = function(username, password, callback, callbackThisArg) {
    return client.sendAnonymousCommand(
        'Create user.',
        'username=' + username + '&password=' + password,
        '',
        callback,
        callbackThisArg,
    );
  };

  // Request an end to the specified user login.
  client.endUserLogin = function(selector, token, callback, callbackThisArg) {
    return client.sendCommand(
        'End user login.',
        'selector=' + selector + '&token=' + token,
        '',
        callback,
        callbackThisArg,
    );
  };

  // Renew a user login, extending its lifetime.
  client.renewUserLogin = function(
      selector,
      token,
      callback,
      callbackThisArg,
  ) {
    return client.sendCommand(
        'Renew user login.',
        'selector=' + selector + '&token=' + token,
        '',
        callback,
        callbackThisArg,
    );
  };

  client.getUserProfile = function(username, callback, callbackThisArg) {
    return client.sendCommand(
        'Get user profile.',
        'username=' + username,
        '',
        callback,
        callbackThisArg,
    );
  };

  client.updateUserProfile = function(
      username,
      profile,
      callback,
      callbackThisArg,
  ) {
    return client.sendCommand(
        'Update user profile.',
        'username=' + username,
        JSON.stringify(profile),
        callback,
        callbackThisArg,
    );
  };
}
