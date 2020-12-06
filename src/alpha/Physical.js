/* eslint-disable require-jsdoc, max-len, new-cap */
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

import TestSuite from 'parsegraph-testsuite';

// -----------------------------------
// ------------ USAGE ----------------
// -----------------------------------

// local p = Physical();

// p:SetPosition(x,y,z);
// p:ChangePosition(x,y,z); // adds to current global position
// p:Rotate( angle, x, y, z ) // rotates at its current position, using p's x,y,z axes

// glMultMatrix( p() ) // applying the above

// -----------------------------------
// --------- BETTER USAGE ------------
// -----------------------------------
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

PHYSICAL_TRANSLATE_ROTATE_SCALE = 1;
PHYSICAL_SCALE_ROTATE_TRANSLATE = 2;
PHYSICAL_ROTATE_TRANSLATE_SCALE = 3;

export default function Physical(parent) {
  this.modelMode = PHYSICAL_TRANSLATE_ROTATE_SCALE;
  this.orientation = new Quaternion();
  this.position = new Vector();
  this.modelMatrix = new RMatrix4();
  this.viewMatrix = new RMatrix4();
  this.modelDirty = false; // whether or not the matrix needs to be updated;
  this.velocity = new Vector();
  this.rotationSpeed = new Vector(1, 1, 1);
  this.speed = new Vector(5, 5, 5);
  this.scale = new Vector(1, 1, 1);
  this.SetParent(parent);
}

Physical.prototype.toJSON = function() {
  return {
    position: this.position.toJSON(),
    orientation: this.orientation.toJSON(),
  };
};

// Register the test suite.
alphaPhysicalTests = new TestSuite('Physical');

alphaPhysicalTests.addTest('Physical', function(resultDom) {
  const surface = new GLWidget();
  const cam = new Camera(surface);
  const p = new Physical(cam);
});

// -----------------------------------
// ---------- Rotation ---------------
// -----------------------------------

Physical.prototype.SetOrientation = function(...args) {
  this.orientation.Set.apply(this.orientation, ...args);
  this.modelDirty = true;
};

/*
 * returns as Quaternion
 */
Physical.prototype.GetOrientation = function() {
  return this.orientation;
};

/*
 * in radians / second
 */
Physical.prototype.SetRotationSpeeds = function(...args) {
  this.rotationSpeed.Set.apply(this.rotationSpeed, ...args);
};
Physical.prototype.SetRotationSpeed =
  Physical.prototype.SetRotationSpeeds;

Physical.prototype.GetRotationSpeeds = function() {
  return this.rotationSpeed;
};

Physical.prototype.Rotate = function(angle, x, y, z) {
  // if you aren't rotating about an angle, then you aren't rotating
  if (angle == 0) {
    return;
  }
  const q = QuaternionFromAxisAndAngle(x, y, z, angle);
  this.orientation.Multiply(q);
  this.modelDirty = true;
};

Physical.prototype.RotateGlobal = function(angle, x, y, z) {
  // if you aren't rotating about an angle, then you aren't rotating
  if (angle == 0) {
    return;
  }
  const q = QuaternionFromAxisAndAngle(x, y, z, angle);
  this.orientation.Set(q.Multiply(this.orientation));
  this.modelDirty = true;
};

/*
 * these rotations take place at the speeds set by rotationSpeed
 */
Physical.prototype.YawLeft = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[1];
  this.Rotate(angle, 0, 1, 0);
};

Physical.prototype.YawRight = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[1];
  this.Rotate(-angle, 0, 1, 0);
};

Physical.prototype.PitchUp = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[0];
  this.Rotate(angle, 1, 0, 0);
};

Physical.prototype.PitchDown = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[0];
  this.Rotate(-angle, 1, 0, 0);
};

Physical.prototype.RollLeft = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[2];
  this.Rotate(angle, 0, 0, 1);
};

Physical.prototype.RollRight = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[2];
  this.Rotate(-angle, 0, 0, 1);
};

Physical.prototype.Turn = function(angle) {
  // if you aren't rotating about an angle, then you aren't rotating
  if (angle == 0) {
    return;
  }

  const q = new Quaternion();
  q.FromAxisAndAngle(0, 1, 0, angle);
  this.SetOrientation(q.Multiply(this.GetOrientation()));
};

Physical.prototype.TurnLeft = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[1];
  this.Turn(angle);
};

Physical.prototype.TurnRight = function(elapsed) {
  const angle = elapsed * this.rotationSpeed[1];
  this.Turn(-angle);
};

// -------------------------------------
// ------------ POSITION ---------------
// -------------------------------------

/*
 * send as x,y,z
 */
Physical.prototype.SetPosition = function(...args) {
  if (Number.isNaN(this.position[0])) {
    throw new Error('Position became NaN.');
  }
  this.position.Set.apply(this.position, ...args);
  this.modelDirty = true;
};

/*
 * return as Vector
 */
Physical.prototype.GetPosition = function() {
  return this.position;
};

Physical.prototype.ChangePosition = function(...args) {
  if (Number.isNaN(this.position[0])) {
    throw new Error('Position became NaN!');
  }
  this.position.Add.apply(this.position, ...args);
  this.modelDirty = true;
};

// ------------------------------------------
// -----------  MOVEMENT --------------------
// ------------------------------------------
// movement is relative to the physical

/*
 * convertes the local x,y,z vector to the global position vector
 */
Physical.prototype.Warp = function(...args) {
  let x;
  let y;
  let z;
  if (args.length > 1) {
    x = args[0];
    y = args[1];
    z = args[2];
  } else {
    x = args[0][0];
    y = args[0][1];
    z = args[0][2];
  }
  if (x == 0 && y == 0 && z == 0) {
    return;
  }

  // Quaternions don't work correctly if they aren't normalized
  this.orientation.Normalize();

  // get our new position; if we started at 0,0,0
  const d = this.orientation.RotatedVector(x, y, z);

  // add it to our current position to get our new position
  // console.log("Warping vec" + d);
  this.ChangePosition(d);
};

// these movement commands MOVE the physical
// the physical's position is updated in the call
// use the Move commands for player-commanded movement
Physical.prototype.WarpForward = function(distance) {
  this.Warp(0, 0, -distance);
};

Physical.prototype.WarpBackward = function(distance) {
  this.Warp(0, 0, distance);
};

Physical.prototype.WarpLeft = function(distance) {
  this.Warp(-distance, 0, 0);
};

Physical.prototype.WarpRight = function(distance) {
  this.Warp(distance, 0, 0);
};

Physical.prototype.WarpUp = function(distance) {
  this.Warp(0, distance, 0);
};

Physical.prototype.WarpDown = function(distance) {
  this.Warp(0, -distance, 0);
};

// ------------------------------------------
// -----------  VELOCITY --------------------
// ------------------------------------------

// speed is in units per second
Physical.prototype.SetSpeeds = function(...args) {
  this.speed.Set.apply(this.speed, ...args);
};

Physical.prototype.GetSpeeds = function() {
  return this.speed;
};

Physical.prototype.SetSpeed = function(speed) {
  return this.SetSpeeds(speed, speed, speed);
};

Physical.prototype.SetVelocity = function(...args) {
  this.velocity.Set.apply(this.velocity, ...args);
};

Physical.prototype.GetVelocity = function() {
  return this.velocity;
};

Physical.prototype.AddVelocity = function(...args) {
  this.velocity.Add.apply(this.velocity, ...args);
  this.modelDirty = true;
};

// Move commands adjust the velocity
// using the set speed
Physical.prototype.MoveForward = function(elapsed) {
  const distance = elapsed * this.speed[2];
  this.AddVelocity(0, 0, -distance);
};

Physical.prototype.MoveBackward = function(elapsed) {
  const distance = elapsed * this.speed[2];
  this.AddVelocity(0, 0, distance);
};

Physical.prototype.MoveLeft = function(elapsed) {
  const distance = elapsed * this.speed[0];
  this.AddVelocity(-distance, 0, 0);
};

Physical.prototype.MoveRight = function(elapsed) {
  const distance = elapsed * this.speed[0];
  this.AddVelocity(distance, 0, 0);
};

Physical.prototype.MoveUp = function(elapsed) {
  const distance = elapsed * this.speed[1];
  this.AddVelocity(0, distance, 0);
};

Physical.prototype.MoveDown = function(elapsed) {
  const distance = elapsed * this.speed[1];
  this.AddVelocity(0, -distance, 0);
};

// calculates our new position using our current velocity
// and then resets the velocity
Physical.prototype.ApplyVelocity = function() {
  this.Warp(this.velocity);
  this.velocity.Set(0, 0, 0);
};

// ------------------------------------------
// --------------  PARENTING ----------------
// ------------------------------------------

// in order to be a good lineage:
// a camera must be reached
// // therefore it must not infinitely loop
Physical.prototype.IsGoodLineageFor = function(prospectiveChild) {
  const parent = this.GetParent();

  // no parent = no lineage
  if (!parent) {
    return false;
  } else if (parent == prospectiveChild) {
    // the initator already has this physical as an ancestor
    // setting this as a parent would make an infinite loop
    return false;
    // note that we don't check self == prospectiveChild
    // that would throw an error if you tried to reparent to the same parent
    // it's assumed that if its a parent now, its still a good parent;
  }

  return parent.IsGoodLineageFor(prospectiveChild);
};

Physical.prototype.SetParent = function(parent) {
  if (!parent) {
    throw new Error(
        'A Physical must have a parent. Set it to the camera for a default',
    );
  }

  if (!parent.IsGoodLineageFor(this)) {
    throw new Error(
        'Setting this is a parent would result in a lineage that never reaches the camera',
    );
  }
  this.parent = parent;
};

Physical.prototype.GetParent = function() {
  return this.parent;
};

// ------------------------------------------
// -----------  MODELVIEW MATRIX ------------
// ------------------------------------------

Physical.prototype.SetScale = function(...args) {
  this.scale.Set.apply(this.scale, ...args);
  this.modelDirty = true;
};

Physical.prototype.GetScale = function() {
  return this.scale;
};

// combine our position and orientation into a matrix;
Physical.prototype.GetModelMatrix = function() {
  let x;
  let y;
  let z;
  x = this.velocity[0];
  y = this.velocity[1];
  z = this.velocity[2];
  if (x != 0 || y != 0 || z != 0) {
    this.ApplyVelocity();
  }

  // if w == 1 then a 4d vector is a position
  // if w == 0 then a 4d vector is a direction
  if (this.modelDirty) {
    // this.modelMatrix = rotation * translation;
    // this.modelMatrix.FromQuaternionAtVector(self.orientation, self.position);
    const m = this.modelMatrix;
    // this.modelMatrix = rotate * translate * identity
    m.Identity();

    switch (this.modelMode) {
      case PHYSICAL_TRANSLATE_ROTATE_SCALE:
        m.Translate(this.position);
        m.Rotate(this.orientation);
        m.Scale(this.scale);
        break;
      case PHYSICAL_SCALE_ROTATE_TRANSLATE:
        m.Scale(this.scale);
        m.Rotate(this.orientation);
        m.Translate(this.position);
        break;
      case PHYSICAL_ROTATE_TRANSLATE_SCALE:
        m.Rotate(this.orientation);
        m.Translate(this.position);
        m.Scale(this.scale);
        break;
      default:
        throw new Error(
            'Model mode must be an expected value: ' + this.modelMode,
        );
    }

    this.modelDirty = false;
  }

  return this.modelMatrix;
};

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

Physical.prototype.GetViewMatrix = function(...args) {
  // if this was just called then we need to set who sent it
  let requestor;
  if (args.length == 0) {
    requestor = this;
  } else {
    requestor = args[0];
  }

  if (this.parent && this.parent != requestor) {
    this.viewMatrix = this.GetModelMatrix().Multiplied(
        this.parent.GetViewMatrix(requestor),
    );
    return this.viewMatrix;
  } else {
    return this.GetModelMatrix().Inverse();
  }
};

Physical.prototype.GetWorldPositionByViewMatrix = function() {
  return new RMatrix4([
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    this.position[0],
    this.position[1],
    this.position[2],
    1,
  ]).Multiply(this.GetViewMatrix().Inverse());
};

// legacy code; left in case I try this again
// it does not work correctly, in all cases
Physical.prototype.GetWorldPosition = function(requestor) {
  const parent = this.parent;
  if (parent && parent != requestor) {
    const rot = parent.GetWorldOrientation(requestor);
    const pos = rot.RotatedVector(this.position);
    return pos.Add(parent.GetWorldPosition(requestor));
  }
  return this.position;
};

// legacy code; left in case I try this again
// it DOES work
Physical.prototype.GetWorldOrientation = function(requestor) {
  const parent = this.parent;
  if (parent && parent != requestor) {
    return parent.GetWorldOrientation(requestor).Multiplied(this.orientation);
  }
  return self.orientation;
};
