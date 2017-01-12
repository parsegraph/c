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
//	if input:Q() > 0 then
		// do stuff because Q is down
//	end

// MouseWheelUp() // returns 1 or more if you have scrolled up recently
// MouseWheelDegreesUp() // returns the number of degrees the wheel has scrolled recently

// add this to your code to make a command only work once per button push
/*
	if elapsed == 0 then
		done = false;
		return
	
	end
	if done then return end;
	done = true;
*/

function alpha_Input(glwidget)
{
    this.SetMouseSensitivityX(.005);
    this.SetMouseSensitivityY(.005);

    this.glwidget = glwidget;
    this.startX = 0;
    this.endX = 0;
    this.startY = 0;
    this.endY = 0;
    this.mouseWheelUp = 0;
    this.mouseWheelDown = 0;
    this.grabbed = null;

    glwidget.connect("keyPressed", function(keyName) {
        this[keyName] = 1;
    }, this);

    glwidget.connect("keyReleased", function(keyName) {
        this[keyName] = null;
    }, this);

    glwidget.connect("mousePressed", function(button, x,y) {
        button = this.GetButtonName(button);
        this[button] = 1;

        // reset for a new drag
        this.startX = x;
        this.startY = y;
        this.endX = x;
        this.endY = y;
    }, this);

    glwidget.connect("mouseReleased", function(button, x,y) {
        button = this.GetButtonName(button);
        this[button] = null;
        // new end point;
        this.endX = x;
        this.endY = y;
    }, this);

    glwidget.connect("mouseMoved", function( x, y) {
        this.endX = x;
        this.endY = y;
    }, this);

    glwidget.connect("mouseWheelMoved", function(delta) {
        if(delta > 0) {
            this.mouseWheelUp = this.mouseWheelUp + delta;
        }
        else if(delta < 0) {
            // keeping it positive!
            this.mouseWheelDown = this.mouseWheelDown - delta;
        }
        else {
            // I have no idea how I got here
        }
    }, this);
};

alpha_Input.prototype.Get = function(key)
{
    return this[key] ? 1 : 0;
};

alpha_Input.prototype.GetButtonName = function(button)
{
    if(button == 0) {
        return "LeftMouseButton";
    }
    if(button == 2) {
        return "RightMouseButton";
    }
    if(button == 1) {
        return "MiddleMouseButton";
    }
    return button;
};

alpha_Input.prototype.SetMouseSensitivityX = function(sensitivity)
{
    this.mouseSensitivityX = sensitivity;
};

alpha_Input.prototype.GetMouseSensitivityX = function(sensitivity)
{
    return this.mouseSensitivityX;
};

alpha_Input.prototype.SetMouseSensitivityY = function(sensitivity)
{
    this.mouseSensitivityY = sensitivity;
};

alpha_Input.prototype.GetMouseSensitivityY = function(sensitivity)
{
    return this.mouseSensitivityY;
};

// quick set both of them
alpha_Input.prototype.SetMouseSensitivity = function(sensitivity)
{
    this.SetMouseSensitivityX(sensitivity);
    this.SetMouseSensitivityY(sensitivity);
};

alpha_Input.prototype.MouseLeft = function()
{
    if(this.endX < this.startX) {
        var change = this.startX - this.endX;
        console.log("mouse has moved right " + change);
        return change * this.GetMouseSensitivityX();
    }

    return 0;
};

alpha_Input.prototype.MouseRight = function()
{
    if(this.endX > this.startX) {
        var change = this.endX - this.startX;
        console.log("mouse has moved left " + change);
        return change * this.GetMouseSensitivityX();
    }

    return 0;
};

alpha_Input.prototype.MouseUp = function()
{
    if(this.endY < this.startY) {
        var change = this.endY - this.startY;
        console.log("mouse has moved down " + change);
        return change * this.GetMouseSensitivityY();
    }

    return 0;
};

alpha_Input.prototype.MouseDown = function()
{
    if(this.endY > this.startY) {
        var change = this.endY - this.startY;
        console.log("mouse has moved up " + change);
        return change * this.GetMouseSensitivityY();
    }

    return 0;
};

// mouse wheel data is stored in 1/8 of a degree
// this returns how many ticks of a mousewheel of standard resolution
// has been seen before an Input:Update()
alpha_Input.prototype.MouseWheelUp = function(degrees)
{
    return this.mouseWheelUp / 120;
};

alpha_Input.prototype.MouseWheelDown = function()
{
    return this.mouseWheelDown / 120;
};

alpha_Input.prototype.MouseWheelDegreesUp = function()
{
    return this.mouseWheelUp / 8;
};

alpha_Input.prototype.MouseWheelDegreesDown = function()
{
    return this.mouseWheelDown / 8;
};

alpha_Input.prototype.Update = function()
{
    this.startX = this.endX;
    this.startY = this.endY;
    this.mouseWheelUp = 0;
    this.mouseWheelDown = 0;
};

alpha_Input.prototype.GrabMouse = function(bind)
{
    if(bind == 0) {
        return;
    };
    var glwidget = this.glwidget;
    if(glwidget.mouseTracking) {
        return;
    }
    glwidget.GrabMouse();
    glwidget.SetCursor("none");
    glwidget.mouseTracking = true;
    // store where the cursor was grabbed
    this.grabbed = Rainback_GetGlobalCursorPosition();
};

alpha_Input.prototype.ReleaseMouse = function(bind)
{
    if(bind == 0) {
        return;
    }
    var glwidget = this.glwidget;
    if(!glwidget.mouseTracking) {
        return;
    }

    glwidget.ReleaseMouse();
    glwidget.mouseTracking = false;
    glwidget.SetCursor("arrow");

    Rainback_SetGlobalCursorPosition(this.grabbed);
};
