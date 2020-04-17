function parsegraph_TimingBelt()
{
    this._windows = [];

    this._idleJobs = [];
    this._renderTimer = new parsegraph_AnimationTimer();
    this._renderTimer.setListener(this.cycle, this);

    this._governor = parsegraph_GOVERNOR;
    this._burstIdle = parsegraph_BURST_IDLE;
    this._interval = parsegraph_INTERVAL;
    this._idleTimer = new parsegraph_TimeoutTimer();
    this._idleTimer.setDelay(parsegraph_INTERVAL);
    this._idleTimer.setListener(this.onIdleTimer, this);
    this._idleTimer.schedule();

    this._lastRender = null;
}

parsegraph_TimingBelt.prototype.onIdleTimer = function()
{
    this.idle(parsegraph_INTERVAL - parsegraph_IDLE_MARGIN);
};

parsegraph_TimingBelt.prototype.addWindow = function(window)
{
    this._windows.push(window);
    window.setOnScheduleUpdate(this.scheduleUpdate, this);
    this.scheduleUpdate();
};

parsegraph_TimingBelt.prototype.removeWindow = function(window)
{
    for(var i in this._windows) {
        if(this._windows[i] === window) {
            this._windows.splice(i, 1);
            window.setOnScheduleUpdate(null, null);
            return true;
        }
    }
    return false;
};

parsegraph_TimingBelt.prototype.setGovernor = function(governor)
{
    this._governor = governor;
};

parsegraph_TimingBelt.prototype.setBurstIdle = function(burstIdle)
{
    this._burstIdle = burstIdle;
};

parsegraph_TimingBelt.prototype.setInterval = function(interval)
{
    this._interval = interval;
};

parsegraph_TimingBelt.prototype.queueJob = function(jobFunc, jobFuncThisArg)
{
    this._idleJobs.push(new parsegraph_Method(jobFunc, jobFuncThisArg));
    this.scheduleUpdate();
};

parsegraph_TimingBelt.prototype.idle = function(interval)
{
    if(this._idleJobs.length === 0) {
        return;
    }
    var startTime = new Date();
    if(interval > 0 && parsegraph_elapsed(startTime) < interval
        && (!this._governor || !this._lastIdle || parsegraph_elapsed(this._lastIdle) > interval)
    ) {
        //console.log("Idle looping");
        do {
            //console.log("Idling");
            var job = this._idleJobs[0];
            try {
                var r = job.call(interval - parsegraph_elapsed(startTime));
            }
            catch(ex) {
                this._idleJobs.shift();
                throw ex;
            }
            if(r !== true) {
                this._idleJobs.shift();
            }
        } while(this._burstIdle && interval - parsegraph_elapsed(startTime) > 0 && this._idleJobs.length > 0);
        if(this._idleJobs.length > 0 && this._governor) {
            this._lastIdle = new Date();
        }
    }
    else if(this._idleJobs.length > 0) {
        if(parsegraph_elapsed(startTime) >= interval) {
            //console.log("Idle suppressed because there is no remaining time in the render loop.");
        }
        else if(this._governor && this._lastIdle && parsegraph_elapsed(this._lastIdle) > interval) {
            //console.log("Idle suppressed because the last idle was too recent.");
        }
    }
};

parsegraph_TimingBelt.prototype.cycle = function()
{
    console.log("Running timing belt");
    var startTime = new Date();

    // Update all input functions.
    var inputChangedScene = false;
    for(var i in this._windows) {
        var window = this._windows[i];
        inputChangedScene = window.handleEvent("tick", startTime) || inputChangedScene;
    }

    var interval = this._interval;
    var windowInterval = Math.max(0, (interval - parsegraph_elapsed(startTime))/this._windows.length);
    var needsUpdate = false;
    var windowOffset = Math.floor(Math.random() % this._windows.length);
    if(inputChangedScene) {
        //console.log("Render and paint");
        for(var i=0; i < this._windows.length; ++i) {
            var window = this._windows[(windowOffset + i)%this._windows.length];
            // Eagerly retrieve the GL context since this can take a while on first attempt.
            window.gl();
            if(parsegraph_elapsed(startTime) > interval) {
                needsUpdate = true;
                break;
            }
            needsUpdate = window.render() || needsUpdate;
            if(parsegraph_elapsed(startTime) > interval) {
                needsUpdate = true;
                break;
            }
            needsUpdate = window.paint(windowInterval) || needsUpdate;
        }
    }
    else {
        for(var i=0; i < this._windows.length; ++i) {
            var window = this._windows[(windowOffset + i)%this._windows.length];
            if(parsegraph_elapsed(startTime) > interval) {
                needsUpdate = true;
                break;
            }
            needsUpdate = window.paint(windowInterval) || needsUpdate;
            if(parsegraph_elapsed(startTime) > interval) {
                needsUpdate = true;
                break;
            }
            needsUpdate = window.render() || needsUpdate;
        }
    }

    // Run the idle function if possible.
    if(this._idleJobs.length > 0 && !needsUpdate) {
        this._idleTimer.schedule();
    }

    // Determine whether an additional cycle should automatically be scheduled.
    if(needsUpdate || inputChangedScene) {
        //console.log("Rescheduling render");
        this.scheduleUpdate();
    }
    this._lastRender = new Date();
    //console.log("Done rendering in " + parsegraph_elapsed(startTime, this._lastRender) + "ms");
};

parsegraph_TimingBelt.prototype.scheduleUpdate = function()
{
    //console.log("TimingBelt is scheduling update");
    this._renderTimer.schedule();
};
