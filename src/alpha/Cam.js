// -- Camera Version 2.1.130827
// -- TODO: learn more about projectionMatrix;
// -- TODO: disengage properly -- disable engage ( requires reparent )
// -- raytracing
// -- TODO: figure out aiming for third person

function alpha_toRadians(inDegrees)
{
    return inDegrees * Math.PI / 180;
}
alpha_ToRadians = alpha_toRadians;

function alpha_toDegrees(inRadians)
{
    return inRadians * 180 / Math.PI;
}
alpha_ToDegrees = alpha_toDegrees;

// ----------------------------------------------
// ------------------- CAMERA  ------------------
// ----------------------------------------------
// -- camera is a special case of physical
// -- so special that I've opted to not "descend it"
// -- it is always following a physical
// -- and it passes information to and from physicals

// the function returned by Camera();
function alpha_Camera(surface)
{
    this.fovX = alpha_toRadians(60.1);
    this.fovY = 0;

    // zoomFactor = zoomSpeed ^ elapsed -- strange but yields a nice zoom
    this.zoomSpeed = 1;
    this.zoomFactor = 1;
    this.farDistance = 2500;
    this.nearDistance = 1; // with collision detection I may be able to increase this
    this.surface = surface;
    if(!this.surface) {
        throw new Error("surface must not be null");
    }

    // Dimensions of the surface's size.
    this.width = null;
    this.height = null;

    this.projectionDirty = true; // dirty until you call UpdateProjection();
    this.projectionMatrix = new alpha_Matrix();
    this.modelDirty = true;
    this.modelMatrix = new alpha_Matrix();
    this.viewMatrix = new alpha_Matrix();

    this.pitch = 0; // a check value
    this.rotationSpeed = [1, 1];
    this.maxRange = 50;
    this.speed = 5; // speed the camera changes range at
    this.orientation = new alpha_Quaternion();
    this.position = new alpha_Vector();
    this.offset = new alpha_Vector();
    this.reengage = null; // here for completeness sake, setting it to null does null

    // not using disengage because we are not engaged
    this.SetParent(this.GetInvisiblePhysical(this));
}

alpha_Camera_Tests = new parsegraph_TestSuite("alpha_Camera");
parsegraph_AllTests.addTest(alpha_Camera_Tests);

alpha_Camera_Tests.addTest("alpha_Camera", function(resultDom) {
    var surface = new parsegraph_Surface();
    var widget = new alpha_GLWidget(surface);
    var cam = new alpha_Camera(surface);

    //console.log(cam.GetModelMatrix().toString());
    cam.GetViewMatrix();
});

// ----------------------------------------------
// ------------ PROJECTION MATRIX ---------------
// ----------------------------------------------

// -- we set FOV in degrees
// -- we get in radians;
alpha_Camera.prototype.SetFovX = function(fovX)
{
    this.fovX = alpha_toRadians(fovX);
    this.projectionDirty = true;
}

alpha_Camera.prototype.SetFovY = function(fovY)
{
    this.fovY = alpha_toRadians(fovY);
    this.projectionDirty = true;
}

alpha_Camera.prototype.GetFovX = function()
{
    // autoadjust if fovX == 0
    var fovX = this.fovX;
    if(!fovX || fovX == 0) {
        var aspect = this.width / this.height;
        fovX = this.fovY * aspect;
    }

    return fovX;
}

alpha_Camera.prototype.GetFovY = function()
{
    var fovY = this.fovY;
    // autoadjust if fovY == 0
    if(!fovY || fovY == 0) {
        var aspect = this.width / this.height;
        fovY = this.fovX / aspect;
    }
    return fovY;
    // if you set them both to zero, you won't see anything. Working as expected.
}

// sets the fov
// unless you have a huge screen and sit very close I do not recommend
// width = width of the viewport
// distance = distance of eyes from viewport
// use the same units for both;
alpha_Camera.prototype.SetProperFOV = function(vpWidth, eyeDistance)
{
    var fovx = Math.atan((vpWidth * 0.5) / eyeDistance) * 2;
    this.SetFovY(0); // set this to autoadjust;
    this.SetFovX(alpha_toDegrees(fovx)); // and set this to the proper fov;
}

alpha_Camera.prototype.SetZoom = function(factor)
{
    if(factor < 1) {
        return false; // assholes
    }

    this.zoomFactor = factor;
    this.projectionDirty = true;
    return this.zoomFactor;
}

alpha_Camera.prototype.GetZoom = function()
{
    return this.zoomFactor;
}

alpha_Camera.prototype.SetZoomSpeed = function(speed)
{
    this.zoomSpeed = speed;
    return this.zoomSpeed;
}

alpha_Camera.prototype.ZoomIn = function(bind, elapsed)
{
    if(!bind || bind <= 0) {
        return false;
    }
    else if(bind > 1) {
        bind = 1;
    }

    var zoom = this.zoomFactor + Math.pow(this.zoomSpeed, bind * elapsed);
    if(zoom < 1) {
        zoom = 1;
    }
    return this.SetZoom(zoom);
}

alpha_Camera.prototype.ZoomOut = function(bind, elapsed)
{
    if(!bind || !elapsed) {
        return false;
    }

    if(bind <= 0) {
        return false;
    }
    else if(bind > 1) {
        bind = 1;
    }

    var zoom = this.zoomFactor - Math.pow(this.zoomSpeed, bind * elapsed);
    if(zoom < 1) {
        zoom = 1;
    }
    return this.SetZoom(zoom);
}

alpha_Camera.prototype.CancelZoom = function()
{
    return this.SetZoom(1);
}

// continues to zoom until the zoom is reached;
// broken until I am less tired
alpha_Camera.prototype.ZoomUntil = function(zoom, bind, elapsed)
{
    if(!zoom || !bind || !elapsed) {
        return false;
    }
    if(bind <= 0) {
        return false;
    }

    var factor = this.zoomFactor;
    if(zoom > factor) {
        // need to increase zoom;
        if(this.ZoomIn(1, elapsed) > factor) {
            // oops we overshot
            this.SetZoom(factor);
        }
    }
    if(zoom < factor) {
        // XXX
    }
}

// anything further than this is clipped
alpha_Camera.prototype.SetFarDistance = function(distance)
{
    this.farDistance = distance;
    this.projectionDirty = true;
}

alpha_Camera.prototype.GetFarDistance = function()
{
    return this.farDistance;
}

// anything nearer than this is clipped
alpha_Camera.prototype.SetNearDistance = function(distance)
{
    this.nearDistance = distance;
    this.projectionDirty = true;
}

alpha_Camera.prototype.GetNearDistance = function()
{
    return this.nearDistance;
}

alpha_Camera.prototype.UpdateProjection = function()
{
    // http://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.surface.container().clientWidth;
    var displayHeight = this.surface.container().clientHeight;

    if(displayWidth == 0 || displayHeight == 0) {
        //console.log("No projection available.");
        return;
    }

    // Check if the canvas is not the same size.
    if(
        this.surface.canvas().width != displayWidth
        || this.surface.canvas().height != displayHeight
    ) {
        // Make the canvas the same size
        this.surface.canvas().width = displayWidth;
        this.surface.canvas().height = displayHeight;

        // Set the viewport to match
        this.surface.gl().viewport(
            0, 0, this.surface.canvas().width, this.surface.canvas().height
        );
    }

    this.width = this.surface.canvas().width;
    this.height = this.surface.canvas().height;

    this.projectionMatrix.Set(makePerspective(
        this.GetFovX() / this.zoomFactor,
        this.width / this.height,
        this.nearDistance,
        this.farDistance
    ));
    this.projectionDirty = false;
    return this.projectionMatrix;
};

// -------------------------------------
// ------------ Rotation ---------------
// -------------------------------------

alpha_Camera.prototype.SetOrientation = function()
{
    this.orientation.Set.apply(this.orientation, arguments);
    this.modelDirty = true;
}

// returns as Quaternion
alpha_Camera.prototype.GetOrientation = function()
{
    return this.orientation;
}

// in radians / second
alpha_Camera.prototype.SetRotationSpeeds = function(x, y)
{
    var rSpeed = this.rotationSpeed;
    rSpeed[0] = x;
    rSpeed[1] = y;
}

alpha_Camera.prototype.GetRotationSpeeds = function()
{
    var rSpeed = this.rotationSpeed;
    return rSpeed;
}

alpha_Camera.prototype.SetRotationSpeed = function(speed)
{
    var rSpeed = this.rotationSpeed;
    rSpeed[0] = speed;
    rSpeed[1] = speed;
}

alpha_Camera.prototype.Pitch = function(angle)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }

    // preventing tons of tiny adjustments
    var pi_2 = Math.PI / 2;
    if(this.pitch >= pi_2 && angle > 0) {
        return false;
    }
    if(this.pitch <= -pi_2 && angle < 0) {
        return false;
    }

    var pitch = this.pitch + angle;

    if(pitch < -pi_2) {
        // reduce the angle so that it makes pitch == -pi;
        angle = -pi_2 - this.pitch;
        pitch = -pi_2;
    }

    if(pitch > pi_2) {
        // reduce the angle so that it makes pitch == pi;
        angle = pi_2 - this.pitch;
        pitch = pi_2;
    }

    this.pitch = pitch;
    // now rotate by that angle about the x axis;
    var q = new alpha_Quaternion();
    q.FromAxisAndAngle(1, 0, 0, angle);
    this.SetOrientation(this.orientation.Multiplied(q));
}

alpha_Camera.prototype.Turn = function(angle)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }

    var q = new alpha_Quaternion();
    q.FromAxisAndAngle(0, 1, 0, angle);
    this.SetOrientation(q.Multiply(this.GetOrientation()));
}

// these rotations take place at the speeds set by rotationSpeed
alpha_Camera.prototype.TurnLeft = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[1];
    this.Turn(angle);
}

alpha_Camera.prototype.TurnRight = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[1];
    this.Turn(-angle);
}

alpha_Camera.prototype.PitchUp = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[0];
    this.Pitch(angle);
}

alpha_Camera.prototype.PitchDown = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[0];
    this.Pitch(-angle);
}

// set which axis you want to align to
alpha_Camera.prototype.AlignParentToMy = function(x, y)
{
    var q = new alpha_Quaternion();
    if(x == 0) {
        x = false;
    }
    if(y == 0) {
        y = false;
    }
    var pitch = this.pitch;
    // no matter what, when we leave here there will be no pitch;
    this.pitch = 0;

    var parent = this.GetParent();
    // if we want to match yaw only
    if(y && !x) {
        // find the quaternion of our pitch; inverted.
        q.FromAxisAndAngle(1, 0, 0, -pitch);
        // our yaw in player space
        q = parent.GetOrientation().Multiplied(this.GetOrientation()).Multiplied(q);
        // set the parent to the new quaternion
        parent.SetOrientation(q);
        // set the camera to default identity
        // these makes the camera not move
        this.SetOrientation(0, 0, 0, 1);
        // set our pitch back to where it was
        this.Pitch(pitch);
    }
    // if we want to match pitch only
    // no idea why you would want to do this
    else if(x && !y) {
        // the quaternion of our pitch
        q.FromAxisAndAngle(1, 0, 0, pitch);
        // our pitch in parent space;
        q = parent.GetOrientation().Multiplied(q);
        parent.SetOrientation(q);
        this.SetOrientation(0, 0, 0, 1);

        // not bothering to set our yaw back to where it was because
        // this option shouldn't be used
        // it's bizarre

        // match pitch and yaw with the camera
    }
    else {
        // camera's orientation in parent space
        q = parent.GetOrientation().Multiplied(this.GetOrientation());
        parent.SetOrientation(q);
        this.SetOrientation(0, 0, 0, 1);
    }
}

// -------------------------------------
// ------------ POSITION ---------------
// -------------------------------------

// send as x,y,z or vector
alpha_Camera.prototype.SetPosition = function(x, y, z)
{
    if(y == undefined) {
        y = x[1];
        z = x[2];
        x = x[0];
    }
    this.position.Set(x, y, z);
    this.modelDirty = true;
    return this.position;
}

alpha_Camera.prototype.SetRange = function(range)
{
    return this.SetPosition(0, 0, range);
}

// return as Vector
alpha_Camera.prototype.GetPosition = function()
{
    return this.position;
}

alpha_Camera.prototype.ChangePosition = function(x, y, z)
{
    if(y == undefined) {
        y = x[1];
        z = x[2];
        x = x[0];
    }
    this.SetPosition(this.position.Added(x, y, z));
}

// offset from the physical
alpha_Camera.prototype.SetOffset = function(x, y, z)
{
    if(y == undefined) {
        y = x[1];
        z = x[2];
        x = x[0];
    }
    this.offset.Set(x, y, z);
    this.modelDirty = true;
}

// return as Vector
alpha_Camera.prototype.GetOffset = function()
{
    return this.offset;
}

alpha_Camera.prototype.ChangeOffset = function(x, y, z)
{
    if(y == undefined) {
        y = x[1];
        z = x[2];
        x = x[0];
    }
    this.SetOffset(this.offset.Added(x, y, z));
}

// ------------------------------------------
// -----------  MOVEMENT --------------------
// ------------------------------------------

alpha_Camera.prototype.SetMaxRange = function(maxRange)
{
    this.maxRange = maxRange;
    return this.maxRange;
}

alpha_Camera.prototype.GetMaxRange = function()
{
    return this.maxRange;
}

// camera movement is easy; it can only move in and out
alpha_Camera.prototype.Warp = function(distance)
{
    var z = this.position[2];

    // preventing tons of tiny adjustments
    if(z <= 0 && distance < 0) {
        return;
    }
    if(z >= this.maxRange && distance > 0) {
        return;
    }

    // add it to our current position to get our new position
    var cz = z + distance;
    if(cz < 0) {
        distance = -z;
    }
    if(cz > this.maxRange) {
        distance = this.maxRange - z;
    }

    this.ChangePosition(0, 0, distance);
}

alpha_Camera.prototype.WarpIn = function(distance)
{
    this.Warp(-distance);
}

alpha_Camera.prototype.WarpOut = function(distance)
{
	this.Warp(distance);
}
// alias for end-user use

// ------------------------------------------
// --------------- VELOCITY -----------------
// ------------------------------------------

// -- since we can only move in one direction
// -- there isn't any velocity
// -- these are the commands needed for expected movement
alpha_Camera.prototype.SetSpeed = function(speed)
{
    this.speed = speed;
}

alpha_Camera.prototype.GetSpeed = function()
{
    return this.speed;
}

alpha_Camera.prototype.MoveForward = function(elapsed)
{
    var distance = elapsed * this.speed;
    this.Warp(-distance);
}

alpha_Camera.prototype.MoveBackward = function(elapsed)
{
    var distance = elapsed * this.speed;
    this.Warp(distance);
}

// ------------------------------------------
// --------------  PARENTING ----------------
// ------------------------------------------

// CAMERAS MAKE THE BEST PARENTS
alpha_Camera.prototype.IsGoodLineageFor = function(prospectiveChild)
{
    return true;
}

alpha_Camera.prototype.GetInvisiblePhysical = function(parent)
{
    var position;
    var orientation;

    if(this.parent) {
        var currentParent = this.GetParent();
        position = currentParent.GetPosition();
        orientation = currentParent.GetOrientation();
    }
    else {
        // this shouldn't happen outside of construction;
        position = this.position;
        orientation = this.orientation;
    }

    var p = new alpha_Physical(this);
    p.SetPosition(position);
    p.SetOrientation(orientation);
    p.SetParent(parent);
    return p;
}

// enables free floating
alpha_Camera.prototype.Disengage = function()
{
    if(!this.freefloating) {
        this.reengage = this.parent;
        this.SetParent(this.GetInvisiblePhysical(this));
        this.freefloating = true;
    }
}

// sends it back to its previous physical
alpha_Camera.prototype.Engage = function()
{
    if(this.freefloating) {
        //this.parent.Destroy(); // get rid of the invisible fucker
        // if called from setparent reengage is already updated
        // just set this bool so we don't go in an infinite loop
        // been there, it sucks  -- GOD
        this.freefloating = false;
        this.SetParent(this.reengage);
        this.reengage = this.parent;
    }
}

alpha_Camera.prototype.SetParent = function(parent)
{
    // setting the camera to itself sets it to an invisble physical
    if(this == parent) {
        this.Disengage();
        return;
    }

    // drunken me says this works
    // lets see if he is as stupid as I suspect;
    if(this.freefloating) {
        this.reengage = parent;
        this.Engage();
        return;
    }
    else {
        this.reengage = this.parent; // who we reengage to;
    }

    this.parent = parent;
}

alpha_Camera.prototype.GetParent = function()
{
    return this.parent;
}

// ----------------------------------------------
// ------------- MODELVIEW MATRIX ---------------
// ----------------------------------------------

// -- combine position, offset and orientation into a matrix;
alpha_Camera.prototype.GetModelMatrix = function()
{
    if(this.modelDirty) {
        var p = this.position;
        var o = this.offset;
        var r = this.orientation;
        this.modelMatrix.FromVectorAroundQuaternionAtVector(p, r, o); // oh yea;
        this.modelDirty = false;
    }
    return this.modelMatrix;
}

// it chains backwards until it finds a parent of itself;
// sees as
// C -> A -> B -> C
// Stops:----^
// Mults as (C * A * B):Inverse()
alpha_Camera.prototype.GetViewMatrix = function(requestor)
{
    var parent = this.parent;
    if(requestor) {
        // the camera is always loaded first(properly)
        // therefore if something other than the camera asks for camera info
        // simply give it to them.
        return this.viewMatrix;
    }
    else {
        requestor = this;
    }

    if(parent && parent != requestor) {
        var ancestors = parent.GetViewMatrix(requestor);
        //console.log("this.modelMatrix:\n" + this.GetModelMatrix());
        //console.log("parent.viewMatrix:\n" + ancestors.toString());
        //console.log("modelMatrix * ancestors:\n" + this.GetModelMatrix().Multiplied(ancestors));
        this.viewMatrix = this.GetModelMatrix().Multiplied(ancestors).Inverse();
        //console.log("this.viewMatrix:\n" + this.viewMatrix.toString());
        return this.viewMatrix;
    }
    else {
        // you could also do a dummy identity matrix as the ancestor
        // but why do extra math?
        return this.GetModelMatrix().Inverse();
    }
};
