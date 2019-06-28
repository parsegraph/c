parsegraph_START_TIME = new Date();

function parsegraph_timediffMs(a, b)
{
    return b.getTime() - a.getTime();
}

function parsegraph_elapsed(startTime)
{
    return (new Date()).getTime() - startTime.getTime();
}

function parsegraph_later(cb, cbThisArg)
{
    var t = setTimeout(function() {
        cb.call(cbThisArg);
    }, 0);
    return function() {
        if(t) {
            clearTimeout(t);
            t = null;
        }
    };
}

function parsegraph_timeout(name, timeoutMs)
{
    if(arguments.length === 1) {
        if(typeof arguments[0] === "number") {
            name = null;
            timeoutMs = arguments[0];
        }
        else {
            timeoutMs = parsegraph_TIMEOUT;
        }
    }
    else if(arguments.length === 0) {
        name = null;
        timeoutMs = parsegraph_TIMEOUT;
    }
    var startTime = parsegraph_getTimeInMillis();
    return function() {
        if(parsegraph_getTimeInMillis() - startTime <= timeoutMs) {
            // Not timed out yet.
            return;
        }

        // Report the timeout.
        if(name) {
            throw new Error("Timeout '" + name + "' after " + timeoutMs + "msecs exceeded.");
        }
        throw new Error("Timeout after " + timeoutMs + "msecs exceeded.");
    };
}

function parsegraph_AnimationTimer()
{
    this.timerId = null;

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

parsegraph_TimeoutTimer.prototype.setDelay = function(ms)
{
    this.delay = ms;
};

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
parsegraph_IntervalTimer.prototype.setDelay = function(ms)
{
    this.delay = ms;
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
