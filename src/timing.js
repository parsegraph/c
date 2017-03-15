function parsegraph_AnimationTimer()
{
    this.timerId = null;

    /**
     * Forwards event arguments to the listener.
     */
    var that = this;
    this.fire = function() {
        that.timerId = null;
        if(that.listener) {
            return that.listener[0].apply(that.listener[1], arguments);
        }
    };
};

parsegraph_AnimationTimer.prototype.schedule = function()
{
    // Do nothing if the timer is already scheduled.
    if(this.timerId) {
        return;
    }

    //console.log(new Error("Scheduling animation timer."));
    this.timerId = requestAnimationFrame(this.fire);
};

parsegraph_AnimationTimer.prototype.setListener = function(listener, thisArg)
{
    if(!listener) {
        this.listener = null;
        return;
    }

    this.listener = [listener, thisArg];
};

parsegraph_AnimationTimer.prototype.cancel = function()
{
    if(!this.timerId) {
        return;
    }

    cancelAnimationFrame(this.timerId);
    this.timerId = null;
};

function parsegraph_TimeoutTimer()
{
    this.delay = 0;

    this.timerId = null;

    /**
     * Forwards event arguments to the listener.
     */
    var that = this;
    this.fire = function() {
        that.timerId = null;
        if(that.listener) {
            return that.listener[0].apply(that.listener[1], arguments);
        }
    };
};

/**
 * Sets the delay, in milliseconds.
 */
parsegraph_TimeoutTimer.prototype.setDelay = function()
{
    this.delay = arguments[0];
};

/**
 * Gets the delay, in milliseconds.
 */
parsegraph_TimeoutTimer.prototype.delay = function()
{
    return this.delay;
};

parsegraph_TimeoutTimer.prototype.schedule = function()
{
    if(this.timerId) {
        return;
    }

    this.timerId = window.setTimeout(this.fire, this.delay);
};

parsegraph_TimeoutTimer.prototype.setListener = function(listener, thisArg)
{
    if(!listener) {
        this.listener = null;
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    this.listener = [listener, thisArg];
};

parsegraph_TimeoutTimer.prototype.cancel = function()
{
    if(this.timerId) {
        window.clearTimeout(this.timerId);
        this.timerId = null;
    }
};

function parsegraph_IntervalTimer()
{
    this.delay = 0;

    this.timerId = null;

    /**
     * Forwards event arguments to the listener.
     */
    var that = this;
    this.fire = function() {
        if(that.listener) {
            return that.listener[0].apply(that.listener[1], arguments);
        }
    };
};

/**
 * Sets the delay, in milliseconds.
 */
parsegraph_IntervalTimer.prototype.setDelay = function()
{
    this.delay = arguments[0];
};

/**
 * Gets the delay, in milliseconds.
 */
parsegraph_IntervalTimer.prototype.delay = function()
{
    return this.delay;
};

parsegraph_IntervalTimer.prototype.schedule = function()
{
    if(this.timerId) {
        return;
    }

    this.timerId = window.setInterval(this.fire, this.delay);
};

parsegraph_IntervalTimer.prototype.setListener = function(listener, thisArg)
{
    if(!listener) {
        this.listener = null;
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    this.listener = [listener, thisArg];
};

parsegraph_IntervalTimer.prototype.cancel = function()
{
    if(this.timerId) {
        window.clearInterval(this.timerId);
        this.timerId = null;
    }
};
