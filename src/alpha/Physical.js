// Physical version 1.4.130828
// physical is an orientation and a position
// as well as rotation and movement


// TODO change the rotation movement speeds from x,y,z to forward, backward,left,right, etc
// // really front/back up/down lateral(surely we don't want crippled things )
// // // this also requires rethinking the movement; because moveforward/backward won't cancel anymore
// TODO: scaling
// TODO: tilt
// TODO: Children
// TODO: acceleration


//-----------------------------------
//------------ USAGE ----------------
//-----------------------------------

// local p = Physical();

// p:SetPosition(x,y,z);
// p:ChangePosition(x,y,z); // adds to current global position
// p:Rotate( angle, x, y, z ) // rotates at its current position, using p's x,y,z axes

// glMultMatrix( p() ) // applying the above


//-----------------------------------
//--------- BETTER USAGE ------------
//-----------------------------------
// speeds only apply to functions taking an elapsed parameter

// p:SetRotationSpeeds( x, y, z ) // radians / second per second per axis
// SetRotationSpeed( speed ) // sets all axes the same
// p:SetSpeeds(x,y,z) // ( movement speeds ) units / second per axis

// p:YawLeft( elapsed ) // p:YawRight( elapsed )
// p:PitchUp( elapsed ) // p:PitchDown( elapsed )
// p:RollLeft( elapsed ) // p:RollRight( elapsed )

// instantly update your global position when you call these
// p:WarpForward( distance ) // p:WarpBackward( distance )
// p:WarpLeft( distance ) // p:WarpRight( distance )
// p:WarpUp( distance ) // p:WarpDown( distance )

// velocity is applied whenever you call p:ApplyVelocity() or p:GetMatrix()
// velocity will adjust your current position by the velocity;
// p:SetVelocity(x,y,z);

// a simpler way to use velocity is to use these:
// it will be automatically calculated using our set speeds;

// p:MoveForward( elapsed ) // p:MoveBackward( elapsed )
// p:MoveLeft( elapsed ) // p:MoveRight( elapsed )
// p:MoveUp( elapsed ) // p:MoveDown( elapsed )

// XXX: for some reason I have to inverse quaterions for physical
// not for the camera. I do not understand why.

alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE = 1;
alpha_PHYSICAL_SCALE_ROTATE_TRANSLATE = 2;
alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE = 3;

/**
 * @constructor
 */
function alpha_Physical(parent)
{
    this.modelMode = alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE;
    this.orientation = new alpha_Quaternion();
    this.position = new alpha_Vector();
    this.modelMatrix = new alpha_RMatrix4();
    this.viewMatrix = new alpha_RMatrix4();
    this.modelDirty = false; // whether or not the matrix needs to be updated;
    this.velocity = new alpha_Vector();
    this.rotationSpeed = new alpha_Vector(1, 1, 1);
    this.speed = new alpha_Vector(5, 5, 5);
    this.scale = new alpha_Vector(1, 1, 1);
    this.SetParent(parent);
}

alpha_Physical.prototype.toJSON = function()
{
    return {
        position:this.position.toJSON(),
        orientation:this.orientation.toJSON(),
    };
};

// Register the test suite.
alpha_Physical_Tests = new parsegraph_TestSuite("alpha_Physical");
parsegraph_AllTests.addTest(alpha_Physical_Tests);

alpha_Physical_Tests.addTest("alpha_Physical", function(resultDom) {
    var surface = new alpha_GLWidget();
    var orb = new alpha_Physical();
});

//-----------------------------------
//---------- Rotation ---------------
//-----------------------------------

alpha_Physical.prototype.SetOrientation = function()
{
    this.orientation.Set.apply(this.orientation, arguments);
    this.modelDirty = true;
};

/**
 * returns as Quaternion
 */
alpha_Physical.prototype.GetOrientation = function()
{
    return this.orientation;
};

/**
 * in radians / second
 */
alpha_Physical.prototype.SetRotationSpeeds = function()
{
    this.rotationSpeed.Set.apply(this.rotationSpeed, arguments);
};
alpha_Physical.prototype.SetRotationSpeed = alpha_Physical.prototype.SetRotationSpeeds;

alpha_Physical.prototype.GetRotationSpeeds = function()
{
    return this.rotationSpeed;
}

/**
 * rotates about the local axis
 */
alpha_Physical.prototype.Rotate = function(angle, x, y, z)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }
    var q = alpha_QuaternionFromAxisAndAngle(x, y, z, angle)
    this.orientation.Multiply(q);
    this.modelDirty = true;
};

alpha_Physical.prototype.RotateGlobal = function(angle, x, y, z)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }
    var q = alpha_QuaternionFromAxisAndAngle(x, y, z, angle);
    this.orientation.Set(q.Multiply(this.orientation));
    this.modelDirty = true;
};

/**
 * these rotations take place at the speeds set by rotationSpeed
 */
alpha_Physical.prototype.YawLeft = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[1];
    this.Rotate(angle, 0, 1, 0);
};

alpha_Physical.prototype.YawRight = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[1];
    this.Rotate(-angle, 0, 1, 0);
};

alpha_Physical.prototype.PitchUp = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[0];
    this.Rotate(angle, 1, 0, 0);
};

alpha_Physical.prototype.PitchDown = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[0];
    this.Rotate(-angle, 1, 0, 0);
};

alpha_Physical.prototype.RollLeft = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[2];
    this.Rotate(angle, 0, 0, 1);
};

alpha_Physical.prototype.RollRight = function(elapsed)
{
    var angle = elapsed * this.rotationSpeed[2];
    this.Rotate(-angle, 0, 0, 1);
};

//-------------------------------------
//------------ POSITION ---------------
//-------------------------------------

/**
 * send as x,y,z
 */
alpha_Physical.prototype.SetPosition = function()
{
    if(Number.isNaN(this.position[0])) {
        throw new Error("Position became NaN.");
    }
    this.position.Set.apply(this.position, arguments);
    this.modelDirty = true;
};

/**
 * return as Vector
 */
alpha_Physical.prototype.GetPosition = function()
{
    return this.position;
};

alpha_Physical.prototype.ChangePosition = function()
{
    if(Number.isNaN(this.position[0])) {
        throw new Error("Position became NaN!");
    }
    this.position.Add.apply(this.position, arguments);
    this.modelDirty = true;
};

//------------------------------------------
//-----------  MOVEMENT --------------------
//------------------------------------------
// movement is relative to the physical

/**
 * convertes the local x,y,z vector to the global position vector
 */
alpha_Physical.prototype.Warp = function()
{
    var x, y, z;
    if(arguments.length > 1) {
        x = arguments[0];
        y = arguments[1];
        z = arguments[2];
    }
    else {
        x = arguments[0][0];
        y = arguments[0][1];
        z = arguments[0][2];
    }
    if(x == 0 && y == 0 && z == 0) {
        return;
    }

    // Quaternions don't work correctly if they aren't normalized
    this.orientation.Normalize();

    // get our new position; if we started at 0,0,0
    var d = this.orientation.RotatedVector(x, y, z);

    // add it to our current position to get our new position
    this.ChangePosition(d);
};

// these movement commands MOVE the physical
// the physical's position is updated in the call
// use the Move commands for player-commanded movement
alpha_Physical.prototype.WarpForward = function(distance)
{
    this.Warp(0, 0, -distance);
};

alpha_Physical.prototype.WarpBackward = function(distance)
{
    this.Warp(0, 0, distance);
}

alpha_Physical.prototype.WarpLeft = function(distance)
{
    this.Warp(-distance, 0, 0);
};

alpha_Physical.prototype.WarpRight = function(distance)
{
    this.Warp(distance, 0, 0);
};

alpha_Physical.prototype.WarpUp = function(distance)
{
    this.Warp(0, distance, 0);
};

alpha_Physical.prototype.WarpDown = function(distance)
{
    this.Warp(0, -distance, 0);
};

//------------------------------------------
//-----------  VELOCITY --------------------
//------------------------------------------

// speed is in units per second
alpha_Physical.prototype.SetSpeeds = function()
{
    this.speed.Set.apply(this.speed, arguments);

}

alpha_Physical.prototype.GetSpeeds = function()
{
    return this.speed;
};

/**
 * sets x,y,z and z speeds to the same thing
 */
alpha_Physical.prototype.SetSpeed = function(speed)
{
    return this.SetSpeeds(speed, speed, speed);
};

/**
 * set as x,y,z
 */
alpha_Physical.prototype.SetVelocity = function()
{
    this.velocity.Set.apply(this.velocity, arguments);
};

/**
 * return as vector
 */
alpha_Physical.prototype.GetVelocity = function()
{
    return this.velocity;
};

alpha_Physical.prototype.AddVelocity = function()
{
    this.velocity.Add.apply(this.velocity, arguments);
    this.modelDirty = true;
};

// Move commands adjust the velocity
// using the set speed
alpha_Physical.prototype.MoveForward = function(elapsed)
{
    var distance = elapsed * this.speed[2];
    this.AddVelocity(0, 0, -distance);
};

alpha_Physical.prototype.MoveBackward = function(elapsed)
{
    var distance = elapsed * this.speed[2];
    this.AddVelocity(0, 0, distance);
};

alpha_Physical.prototype.MoveLeft = function(elapsed)
{
    var distance = elapsed * this.speed[0];
    this.AddVelocity(-distance, 0,  0);
};

alpha_Physical.prototype.MoveRight = function(elapsed)
{
    var distance = elapsed * this.speed[0];
    this.AddVelocity(distance, 0, 0);
};

alpha_Physical.prototype.MoveUp = function(elapsed)
{
    var distance = elapsed * this.speed[1];
    this.AddVelocity(0, distance,  0);
};

alpha_Physical.prototype.MoveDown = function(elapsed)
{
    var distance = elapsed * this.speed[1];
    this.AddVelocity(0, -distance, 0);
};

// calculates our new position using our current velocity
// and then resets the velocity
alpha_Physical.prototype.ApplyVelocity = function()
{
    this.Warp(this.velocity);
    this.velocity.Set(0, 0, 0);
};

//------------------------------------------
//--------------  PARENTING ----------------
//------------------------------------------

// in order to be a good lineage:
// a camera must be reached
// // therefore it must not infinitely loop
alpha_Physical.prototype.IsGoodLineageFor = function(prospectiveChild)
{
    var parent = this.GetParent();

    // no parent = no lineage
    if(!parent) {
        return false;
    }
    else if(parent == prospectiveChild) {
        // the initator already has this physical as an ancestor
        // setting this as a parent would make an infinite loop
        return false;
        // note that we don't check self == prospectiveChild
        // that would throw an error if you tried to reparent to the same parent
        // it's assumed that if its a parent now, its still a good parent;
    }

    return parent.IsGoodLineageFor(prospectiveChild);
};

alpha_Physical.prototype.SetParent = function(parent)
{
    if(!parent) {
        throw new Error(" A Physical must have a parent. Set it to the camera for a default");
    }

    if(!parent.IsGoodLineageFor(this)) {
        throw new Error("Setting this is a parent would result in a lineage that never reaches the camera" );
    }
    this.parent = parent;
};

alpha_Physical.prototype.GetParent = function()
{
    return this.parent;
};

//------------------------------------------
//-----------  MODELVIEW MATRIX ------------
//------------------------------------------

alpha_Physical.prototype.SetScale = function()
{
    this.scale.Set.apply(this.scale, arguments);
    this.modelDirty = true;
};

alpha_Physical.prototype.GetScale = function()
{
    return this.scale;
};

// combine our position and orientation into a matrix;
alpha_Physical.prototype.GetModelMatrix = function()
{
    var x, y, z;
    x = this.velocity[0];
    y = this.velocity[1];
    z = this.velocity[2];
    if(x != 0 || y != 0 || z != 0) {
        this.ApplyVelocity();
    }

    // if w == 1 then a 4d vector is a position
    // if w == 0 then a 4d vector is a direction
    if(this.modelDirty) {
        // this.modelMatrix = rotation * translation;
        // this.modelMatrix.FromQuaternionAtVector(self.orientation, self.position);
        var m = this.modelMatrix;
        // this.modelMatrix = rotate * translate * identity
        m.Identity();

        switch(this.modelMode) {
        case alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE:
            m.Translate(this.position);
            m.Rotate(this.orientation);
            m.Scale(this.scale);
            break;
        case alpha_PHYSICAL_SCALE_ROTATE_TRANSLATE:
            m.Scale(this.scale);
            m.Rotate(this.orientation);
            m.Translate(this.position);
            break;
        case alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE:
            m.Rotate(this.orientation);
            m.Translate(this.position);
            m.Scale(this.scale);
            break;
        }

        this.modelDirty = false;

    }

    return this.modelMatrix;
}

// when fully returned it looks like this
// A -> B -> CAM -> A -> B
// Mults as A * B * (CAM * A * B):Inverse()

// in order for this to work properly make sure that the camera's
// GetViewMatrix() is called before any physicals
// otherwise the physical's will be outdated
// this is to prevent having to retrace the camera's lineage more than once

// this would be a good thing to do for any matrix that has many descendants
// say a ship with lots of npcs / players on it

// but this would require a proper ordering of physicals
// which isn't feasible atm
// physicals would need to know who is the child of who.
// something like:
/*
	camera:CalculateViewMatrix();
	while SomePhysicalsNotCalculated do
		for all physicalsNotCalculated do
			if parentPhysicalCalculated then
				physical:CalculateViewMatrix()
			end
		end
	end	
*/

// a more feasible method would be to
// to have a bunch of children known by the physical
// then we simply chain down the list starting at the camera;
// this is a far better solution.
/*
	function CalculateViewMatrices()
		self:CalculateViewMatrix(); -- for myself
		for each child in children do
			child:CalculateViewMatrices() -- for my children
		end
	end
*/
// it starts with a simple camera:CalculateViewMatrices();
// I will return to this.

alpha_Physical.prototype.GetViewMatrix = function()
{
    // if this was just called then we need to set who sent it
    var requestor;
    if(arguments.length == 0) {
        requestor = this;
    }
    else {
        requestor = arguments[0];
    }

    if(this.parent && this.parent != requestor) {
        this.viewMatrix = this.GetModelMatrix().Multiplied(this.parent.GetViewMatrix(requestor));
        return this.viewMatrix;
    }
    else {
        return this.GetModelMatrix().Inverse();
    }
};

alpha_Physical.prototype.GetWorldPositionByViewMatrix = function()
{
    return new alpha_RMatrix4([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        this.position[0], this.position[1], this.position[2], 1
    ]).Multiply(this.GetViewMatrix().Inverse());
};

// legacy code; left in case I try this again
// it does not work correctly, in all cases
alpha_Physical.prototype.GetWorldPosition = function(requestor)
{
    var parent = this.parent;
    if(parent && parent != requestor) {
        var rot = parent.GetWorldOrientation(requestor);
        var pos = rot.RotatedVector(this.position);
        return pos.Add(parent.GetWorldPosition(requestor));
    };
    return this.position;
};

// legacy code; left in case I try this again
// it DOES work
alpha_Physical.prototype.GetWorldOrientation = function(requestor)
{
    var parent = this.parent;
    if(parent && parent != requestor) {
        return parent.GetWorldOrientation(requestor).Multiplied(this.orientation);
    }
    return self.orientation;
};

