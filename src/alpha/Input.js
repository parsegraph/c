// Input Version 1.2.130825
// usage:
// local input = Input:New(glwidget)
// input:SetMouseSensitivityX( .05 ) // defaults to .05
// input:SetMouseSensitivityY( .05 ) // defaults to .05

// inside of a timing.every function
// Camera:MoveForward( input:W() * elapsed );
// Camera:YawLeft( input:LeftMouseButton() * input:MouseLeft() )
// some non-obvious buttons are:
// LeftMouseButton, RightMouseButton, MiddleMouseButton, SPACE, RETURN, SHIFT
// MouseUp, MouseDown, MouseLeft, MouseRight

// for a simple if statement do:
//       if input:Q() > 0 then
// do stuff because Q is down
//       end

// MouseWheelUp()
// returns 1 or more if you have scrolled up recently
// MouseWheelDegreesUp()
// returns the number of degrees the wheel has scrolled recently

// add this to your code to make a command only work once per button push
/* eslint-disable require-jsdoc, new-cap */
/*
        if elapsed == 0 then
                done = false;
                return

        end
        if done then return end;
        done = true;
*/

export function AlphaInput(surface, camera) {
  this.SetMouseSensitivityX(0.005);
  this.SetMouseSensitivityY(0.005);

  this.surface = surface;
  this.camera = camera;
  this.startX = 0;
  this.endX = 0;
  this.startY = 0;
  this.endY = 0;
  this.mouseWheelUp = 0;
  this.mouseWheelDown = 0;
  this.grabbed = null;
}

AlphaInput.prototype.onKeyup = function(event) {
  this[event.key.toLowerCase()] = null;
  return true;
};

AlphaInput.prototype.onKeydown = function(event) {
  if (this.onKeyDown(event.key)) {
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  this[event.key.toLowerCase()] = 1;
  return true;
};

export function alphaGetButtonName(buttonIndex) {
  switch (event.button) {
    case 0:
      return 'LeftMouseButton';
    case 2:
      return 'RightMouseButton';
    case 1:
      return 'MiddleMouseButton';
  }
  return null;
}

AlphaInput.prototype.onMousedown = function(event) {
  let button;
  let x;
  let y;
  button = alpha_GetButtonName(event.button);
  x = event.x;
  y = event.y;
  this[button] = 1;

  // reset for a new drag
  this.startX = x;
  this.startY = y;
  this.endX = x;
  this.endY = y;
  return true;
};

AlphaInput.prototype.onMouseup = function(event) {
  let button;
  let x;
  let y;
  button = alpha_GetButtonName(event.button);
  x = event.clientX;
  y = event.clientY;
  this[button] = null;

  // new end point;
  this.endX = x;
  this.endY = y;
  return true;
};

AlphaInput.prototype.onMousemove = function(event) {
  let x;
  let y;
  x = event.x;
  y = event.y;
  this.endX = x;
  this.endY = y;
  return true;
};

AlphaInput.prototype.onWheel = function(event) {
  const wheel = event.spinY;
  if (wheel > 0) {
    this.mouseWheelUp = this.mouseWheelUp + wheel;
  } else {
    // keeping it positive!
    this.mouseWheelDown = this.mouseWheelDown - wheel;
  }
  return true;
};

AlphaInput.prototype.onKeyDown = function(...args) {
  if (this._keyDownListener) {
    return this._keyDownListener.apply(this._keyDownThisObject, args);
  }
  return false;
};

AlphaInput.prototype.SetOnKeyDown = function(listener, thisObject) {
  this._keyDownListener = listener;
  this._keyDownThisObject = thisObject;
};

AlphaInput.prototype.Get = function(key) {
  return this[key] ? 1 : 0;
};

AlphaInput.prototype.SetMouseSensitivityX = function(sensitivity) {
  this.mouseSensitivityX = sensitivity;
};

AlphaInput.prototype.GetMouseSensitivityX = function() {
  return this.mouseSensitivityX;
};

AlphaInput.prototype.SetMouseSensitivityY = function(sensitivity) {
  this.mouseSensitivityY = sensitivity;
};

AlphaInput.prototype.GetMouseSensitivityY = function() {
  return this.mouseSensitivityY;
};

// quick set both of them
AlphaInput.prototype.SetMouseSensitivity = function(sensitivity) {
  this.SetMouseSensitivityX(sensitivity);
  this.SetMouseSensitivityY(sensitivity);
};

AlphaInput.prototype.MouseLeft = function() {
  if (this.endX < this.startX) {
    const change = this.startX - this.endX;
    // console.log("mouse has moved right " + change);
    return change * this.GetMouseSensitivityX();
  }

  return 0;
};

AlphaInput.prototype.MouseRight = function() {
  if (this.endX > this.startX) {
    const change = this.endX - this.startX;
    // console.log("mouse has moved left " + change);
    return change * this.GetMouseSensitivityX();
  }

  return 0;
};

AlphaInput.prototype.MouseUp = function() {
  if (this.endY > this.startY) {
    const change = this.endY - this.startY;
    // console.log("mouse has moved down " + change);
    return change * this.GetMouseSensitivityY();
  }

  return 0;
};

AlphaInput.prototype.MouseDown = function() {
  if (this.endY < this.startY) {
    const change = this.endY - this.startY;
    // console.log("mouse has moved up " + change);
    return change * this.GetMouseSensitivityY();
  }

  return 0;
};

// mouse wheel data is stored in 1/8 of a degree
// this returns how many ticks of a mousewheel of standard resolution
// has been seen before an Input:Update()
AlphaInput.prototype.MouseWheelUp = function() {
  return this.mouseWheelUp / 120;
};

AlphaInput.prototype.MouseWheelDown = function() {
  return this.mouseWheelDown / 120;
};

AlphaInput.prototype.MouseWheelDegreesUp = function() {
  return this.mouseWheelUp / 8;
};

AlphaInput.prototype.MouseWheelDegreesDown = function() {
  return this.mouseWheelDown / 8;
};

/*
 * Sets the start to the end, and clears mousewheel totals.
 */
AlphaInput.prototype.Update = function(elapsed) {
  // console.log("Updating with elapsed: " + elapsed);
  if (this.Get('Shift') > 0) {
    elapsed = elapsed * 10;
  }

  if (this.Get('Shift') > 0) {
    elapsed = elapsed / 10;
  }

  // console.log("LeftMouseButton: " + this.Get("LeftMouseButton"));
  // console.log("MouseLeft: " + this.MouseLeft() * elapsed);
  // console.log("MouseLeft: " +
  //   (this.Get("LeftMouseButton") * this.MouseLeft() * elapsed));
  // console.log("LeftMouse: " + this.Get("LeftMouseButton"));
  // console.log("TurnLeft: " + this.MouseLeft() * elapsed);
  this.camera
      .GetParent()
      .TurnLeft(this.Get('LeftMouseButton') * this.MouseLeft() * elapsed);
  this.camera
      .GetParent()
      .TurnRight(this.Get('LeftMouseButton') * this.MouseRight() * elapsed);
  this.camera
      .GetParent()
      .PitchUp(-this.Get('LeftMouseButton') * this.MouseUp() * elapsed);
  this.camera
      .GetParent()
      .PitchDown(this.Get('LeftMouseButton') * this.MouseDown() * elapsed);
  this.camera.MoveForward(this.MouseWheelDegreesUp() * elapsed);
  this.camera.MoveBackward(this.MouseWheelDegreesDown() * elapsed);
  // this.camera.ZoomIn(this.Get("y"), elapsed);
  // this.camera.ZoomOut(this.Get("h"), elapsed);

  this.camera.GetParent().MoveForward(100 * this.Get('t') * elapsed);
  this.camera.GetParent().MoveBackward(100 * this.Get('g') * elapsed);
  this.camera.GetParent().MoveLeft(100 * this.Get('f') * elapsed);
  this.camera.GetParent().MoveRight(100 * this.Get('h') * elapsed);

  this.camera.GetParent().MoveForward(this.Get('w') * elapsed);
  this.camera.GetParent().MoveBackward(this.Get('s') * elapsed);
  this.camera.GetParent().MoveLeft(this.Get('a') * elapsed);
  this.camera.GetParent().MoveRight(this.Get('d') * elapsed);
  this.camera.GetParent().MoveUp(this.Get(' ') * elapsed);
  this.camera.GetParent().MoveDown(this.Get('Shift') * elapsed);

  this.camera.GetParent().YawLeft(this.Get('j') * elapsed);
  this.camera.GetParent().YawRight(this.Get('l') * elapsed);
  this.camera.GetParent().PitchUp(this.Get('k') * elapsed);
  this.camera.GetParent().PitchDown(this.Get('i') * elapsed);
  this.camera.GetParent().RollLeft(this.Get('u') * elapsed);
  this.camera.GetParent().RollRight(this.Get('o') * elapsed);

  if (this.Get('RightMouseButton') > 0) {
    if (!this._done) {
      this.camera.AlignParentToMy(false, true);
      this._done = true;
    }
  } else {
    this._done = false;
  }
  this.startX = this.endX;
  this.startY = this.endY;
  this.mouseWheelUp = 0;
  this.mouseWheelDown = 0;
};
