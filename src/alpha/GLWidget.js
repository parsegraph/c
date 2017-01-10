function alpha_GLWidget()
{
    this._backgroundColor = new alpha_Color(0, 47/255, 57/255);

    this._container = document.createElement("div");
    this._container.className = "alpha_GLWidget";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");
    if(this._gl == null) {
        this._gl = this._canvas.getContext("webgl");
        if(this._gl == null) {
            throw new Error("GL context is not supported");
        }
    }

    this._container.appendChild(this._canvas);

    this.camera = new alpha_Camera(this);

    this.input = new alpha_Input(this);
    this.input.SetMouseSensitivity(.4);

    this.camera.SetFovX(60);
    // this.camera.SetProperFOV(2,2);
    this.camera.SetNearDistance(.01);
    this.camera.SetFarDistance(150);
    this.camera.SetNearDistance(1);
    this.camera.SetPosition(0,0,0);
    this.camera.SetOffset(0,4,0);

//this.camera.PitchDown(40 * Math.PI / 180);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._done = false;

    // test version 1.0
    this.BlockTypes = new alpha_BlockTypes();
    alpha_standardBlockTypes(this.BlockTypes);
    alpha_CubeMan(this.BlockTypes);


    var cubeman = this.BlockTypes.Get("blank", "cubeman");

    this.testCluster = new alpha_Cluster(this);
    this.testCluster.AddBlock(cubeman, 0,5,0,1);
    this.testCluster.CalculateVertices();

    var stone = this.BlockTypes.Get("stone", "cube");
    var grass = this.BlockTypes.Get("grass", "cube");
    var dirt = this.BlockTypes.Get("dirt", "cube");

    this.platformCluster = new alpha_Cluster(this);
    this.worldCluster = new alpha_Cluster(this);

    this.playerCluster = new alpha_Cluster(this);

    for(var i = 0; i <= 2; ++i) {
        this.playerCluster.AddBlock(grass,0,i,0,1);
    }

    this.playerCluster.AddBlock(grass,-1,3,0,17); // left

    this.playerCluster.AddBlock(grass, 0,4,0, 13); // head

    this.playerCluster.AddBlock(grass, 1, 3, 0,9); // right
    this.playerCluster.CalculateVertices();

    var WORLD_SIZE = 15;
    for(var i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(var j = 1; j <= WORLD_SIZE * 2; ++j) {
            var r = alpha_random(0, 23);
            this.worldCluster.AddBlock(stone, i,-1,-j,r);
        }
    }

    for(var i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(var j = 0; j <= WORLD_SIZE * 2; ++j) {
            var r = alpha_random(0, 23);
            this.worldCluster.AddBlock(stone, i,-1,-30,r);
        }
    }
    this.worldCluster.CalculateVertices();

    // build a platform

    for(var i = -3; i <= 3; ++i) {
        for(var j = -4; j <= 4; ++j) {
            this.platformCluster.AddBlock(grass,j,0,-i,1);
        }
    }
    this.platformCluster.CalculateVertices();


    this.evPlatformCluster = new alpha_Cluster(this);
    for(var i = -2; i <= 2; ++i) {
        for(var j = 3; j <= 4; ++j) {
            this.evPlatformCluster.AddBlock(dirt, j, 1, i, 1);
        }
    }
    this.evPlatformCluster.CalculateVertices();




    this.orbit = new alpha_Physical(this.camera);
    this.orbit.SetPosition(0,0, 0);
    var elevator = new alpha_Physical(this.camera);
    elevator.SetPosition(0,5,0);


    this.camera.SetParent(this.camera);
    this.playerAPhysical = new alpha_Physical( this.camera );
    this.playerBPhysical = new alpha_Physical( this.camera );
    this.offsetPlatformPhysical = new alpha_Physical( this.camera );



    this.offsetPlatformPhysical.SetParent( this.camera );
    this.playerAPhysical.SetParent( this.offsetPlatformPhysical );
    this.playerBPhysical.SetParent( this.camera );

    this.camera.SetParent( this.playerBPhysical );

    this.playerAPhysical.SetPosition(10,1,0);



    this.playerBPhysical.SetPosition(0,0,-3);

    this.offsetPlatformPhysical.SetPosition(0,0,-25);
    this.offsetPlatformPhysical.YawLeft(0);
    this.offsetPlatformPhysical.RollRight(0);


    this.spherePhysical = new alpha_Physical(this.camera);
    this.spherePhysical.SetPosition(45,0,0);

    var radius = 8;
    this.sphereCluster = new alpha_Cluster(this);

    // first circle about the x-axis
    var rot = 0;
    for(var i=0; i < 24; ++i) {
        var q = alpha_QuaternionFromAxisAndAngle(1,0,0,rot * Math.PI / 180);
        rot += 15;
        var p = q.RotatedVector(0,0,-radius);
        this.sphereCluster.AddBlock(stone, p, 1);
    }

    rot = 0;
    for(var i=0; i < 24; ++i) {
        var q = alpha_QuaternionFromAxisAndAngle(0,1,0,rot * Math.PI / 180);
        rot += 15;

        var p = q.RotatedVector(0,0,-radius);
        this.sphereCluster.AddBlock(stone, p, 1);
    }

    this.sphereCluster.CalculateVertices();


    var spot = new alpha_Vector(0,15,35);
    this.swarm = [];
    for(var i = 0; i < 100; ++i) {
        this.swarm.push(new alpha_Physical(this.camera));
        var x = alpha_random(1, 30);
        var y = alpha_random(1, 30);
        var z = alpha_random(1, 30);
        this.swarm[i].SetPosition(spot.Added(x, y, z));

        var x = alpha_random(-100,100)/100;
        var y = alpha_random(-100,100)/100;
        var z = alpha_random(-100,100)/100;
        var w = alpha_random(-100,100)/100;
        var q = new alpha_Quaternion(x,y,z,w);
        q.Normalize();
        this.swarm[i].SetOrientation(q);
    }

    this.time = 0;
}; // alpha_GLWidget

alpha_GLWidget.prototype.Tick = function(elapsed)
{
    this.time += elapsed;

    if(this.input.Get("SHIFT") > 0) {
        elapsed = elapsed * 10;
    }

    if(this.input.Get("SHIFT") > 0) {
        elapsed = elapsed / 10;
    }

    //console.log("LeftMouseButton: " + this.input.Get("LeftMouseButton"));
    //console.log("MouseLeft: " + this.input.MouseLeft());
    this.camera.TurnLeft(
        this.input.Get("LeftMouseButton") * this.input.MouseLeft() * elapsed
    );
    this.camera.TurnRight(
        this.input.Get("LeftMouseButton") * this.input.MouseRight() * elapsed
    );
    this.camera.PitchUp(
        this.input.Get("LeftMouseButton") * this.input.MouseUp() * elapsed
    );
    this.camera.PitchDown(
        this.input.Get("LeftMouseButton") * this.input.MouseDown() * elapsed
    );
    this.camera.MoveForward(this.input.MouseWheelDegreesUp() * elapsed);
    this.camera.MoveBackward(this.input.MouseWheelDegreesDown() * elapsed);
    this.camera.ZoomIn(this.input.Get("Y"), elapsed);
    this.camera.ZoomOut(this.input.Get("H"), elapsed);



    this.camera.GetParent().MoveForward( this.input.Get("W") * elapsed );
    this.camera.GetParent().MoveBackward( this.input.Get("S") * elapsed );
    this.camera.GetParent().MoveLeft( this.input.Get("A") * elapsed );
    this.camera.GetParent().MoveRight( this.input.Get("D") * elapsed );
    this.camera.GetParent().MoveUp( this.input.Get("SPACE") * elapsed );
    this.camera.GetParent().MoveDown( this.input.Get("SHIFT") * elapsed );


    this.camera.GetParent().YawLeft( this.input.Get("J") * elapsed );
    this.camera.GetParent().YawRight( this.input.Get("L") * elapsed );
    this.camera.GetParent().PitchUp( this.input.Get("K") * elapsed );
    this.camera.GetParent().PitchDown( this.input.Get("I") * elapsed );
    this.camera.GetParent().RollLeft( this.input.Get("U") * elapsed );
    this.camera.GetParent().RollRight(this.input.Get("O") * elapsed );


    if(this.input.Get("RightMouseButton") > 0) {
        if(!this._done) {
            this.camera.AlignParentToMy(false, true);
            this._done = true;
        }
    }
    else {
        this._done = false;
    }

    var ymin;
    for(var i = 0; i < this.swarm.length; ++i) {
        var v = this.swarm[i];
        if(this.time < 6) {
            v.MoveForward(elapsed);
            v.YawRight(2 * Math.PI / 180);
        }
        else {
            v.PitchDown(1 * Math.PI / 180);
            v.YawRight(2 * Math.PI / 180);
            var y = v.GetPosition()[1];
            v.ChangePosition(0, -.2 ,0);
        }
    }

    this.orbit.Rotate(-.01, 0, 1, 0);
    this.offsetPlatformPhysical.MoveLeft( elapsed );
    this.offsetPlatformPhysical.YawLeft(.1 * Math.PI / 180);
    // print(this.offsetPlatformPhysical.position);

    this.printOnce(this.input.Get("RETURN"));
    this.input.Update();
    //console.log("Cam: " + this.camera.orientation);
};

alpha_GLWidget.prototype.setBackground = function()
{
    if(arguments.length > 1) {
        var c = new alpha_Color();
        c.Set.apply(c, arguments);
        return this.setBackground(c);
    }
    this._backgroundColor = arguments[0];

    // Make it simple to change the background color; do not require a
    // separate call to scheduleRepaint.
    this.scheduleRepaint();
};

/**
 * Retrieves the current background color.
 */
alpha_GLWidget.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

alpha_GLWidget.prototype.camera = function()
{
    return this._camera;
};

alpha_GLWidget.prototype.canvas = function()
{
    return this._canvas;
};

alpha_GLWidget.prototype.gl = function()
{
    return this._gl;
};

/**
 * Returns the container for this scene.
 */
alpha_GLWidget.prototype.container = function()
{
    return this._container;
};

alpha_GLWidget.prototype.connect = function(eventName, callback, thisArg)
{
    var widget = this;
    switch(eventName) {
    case "keyPressed": {
        return parsegraph_addEventListener(document, "keydown", function(event) {
            callback.call(thisArg, event.key);
        });
        break;
    }
    case "keyReleased": {
        return parsegraph_addEventListener(this.canvas(), "keyup", function(event) {
            callback.call(thisArg, event.key);
        });
        break;
    }
    case "mousePressed": {
        return parsegraph_addEventListener(this.canvas(), "mousedown", function(event) {
            callback.call(thisArg, event.button, event.clientX, event.clientY);
        });
        break;
    }
    case "mouseReleased": {
        return [
            parsegraph_addEventListener(this.canvas(), "mouseup", function(event) {
                callback.call(thisArg, event.button, event.clientX, event.clientY);
            }),
            parsegraph_addEventListener(this.canvas(), "mouseout", function(event) {
                callback.call(thisArg, event.button, event.clientX, event.clientY);
            })
        ];
        break;
    }
    case "mouseMoved": {
        return parsegraph_addEventListener(this.canvas(), "mousemove", function(event) {
            callback.call(thisArg, event.clientX, event.clientY);
        });
        break;
    }
    case "mouseWheelMoved": {
        var onWheel = function(event) {
            event.preventDefault();
            var wheel = normalizeWheel(event);
            callback.call(thisArg, wheel);
        };
        parsegraph_addEventListener(widget.canvas(), "DOMMouseScroll", onWheel, false);
        parsegraph_addEventListener(widget.canvas(), "mousewheel", onWheel, false);
        break;
    }
    default: {
        throw new Error("Unhandled eventName: " + eventName);
    }
    }
};

/**
 * Schedules a repaint. Painting causes the scene to be rebuilt.
 */
alpha_GLWidget.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

alpha_GLWidget.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
};

/**
 * Schedules a render. Rendering draws the scene.
 *
 * Rendering will cause repainting if needed.
 */
alpha_GLWidget.prototype.scheduleRender = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    if(this._pendingRender != null) {
        return;
    }
    var widget = this;
    this._pendingRender = requestAnimationFrame(function() {
        widget._pendingRender = null;
        if(widget._needsRepaint) {
            widget.paint();
            widget._needsRepaint = false;
        }

        widget.render();
    });
};

alpha_GLWidget.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};

alpha_GLWidget.prototype.printOnce = function(bind)
{
    if(bind == 0) {
        this._done = false;
        return
    }
    if(this._done) {
        return;
    }
    this._done = true;

    this.playerAPhysical.SetScale(2,2,2);

    // print(player)

    // print(alpha_MatrixFromQuaternionAtVector(playerB.orientation, playerB.position ));

    // print( playerB.GetPosition() )
    // print( translation )
    // print( player.Multiplied(rotation.Inverse()) ); -- works;
    // print( player.Multiplied((cam.Multiplied(player)).Inverse()).Multiplied(rotation.Inverse()) );

    // print( rotation * translation * (cam * player):Inverse() )
    // print( player * cam )
};

/**
 * Fill memory buffers to prepare for rendering.
 */
alpha_GLWidget.prototype.paint = function()
{
};

/**
 * Render painted memory buffers.
 */
alpha_GLWidget.prototype.render = function()
{
    var projection = this.camera.UpdateProjection();

    this._gl.clearColor(
        0, 0, 0, 0
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    // local fullcam = boat:Inverse() * player:Inverse() * Bplayer:Inverse() * cam:Inverse()



    this._gl.enable(this._gl.DEPTH_TEST);


    //console.log("camera.viewMatrix:\n" + this.camera.GetViewMatrix());
    //console.log("viewMatrix * projection:\n" + viewMatrix.toString());
    var viewMatrix = projection.Multiplied(this.camera.GetViewMatrix());
    this.worldCluster.Draw(viewMatrix);


    for(var i = 0; i < this.swarm.length; ++i) {
        var v = this.swarm[i];
        this.testCluster.Draw(v.GetViewMatrix().Multiplied(projection));
    }

    var platformMatrix = this.offsetPlatformPhysical.GetViewMatrix().Multiplied(projection);
    this.platformCluster.Draw(platformMatrix);
    this.evPlatformCluster.Draw(platformMatrix);


    this.playerCluster.Draw(this.playerAPhysical.GetViewMatrix().Multiplied(projection));


    this.testCluster.Draw(this.playerBPhysical.GetViewMatrix().Multiplied(projection));

    this.sphereCluster.Draw(this.spherePhysical.GetViewMatrix().Multiplied(projection));


    if(typeof(this.afterRender) == "function") {
        this.afterRender();
    }
};

var alpha_startTime = new Date();
function alpha_GetTime()
{
    return new Date().getTime() - alpha_startTime.getTime();
};

