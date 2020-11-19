const START_TIME = new Date();

// eslint-disable-next-line require-jsdoc
export function timediffMs(a, b) {
  return b.getTime() - a.getTime();
}
// eslint-disable-next-line require-jsdoc
export function elapsed(startTime, ct) {
  ct = ct || new Date();
  return ct.getTime() - startTime.getTime();
}
// eslint-disable-next-line require-jsdoc
export function later(cb, cbThisArg) {
  let t = setTimeout(function() {
    cb.call(cbThisArg);
  }, 0);
  return function() {
    if (t) {
      clearTimeout(t);
      t = null;
    }
  };
}
// eslint-disable-next-line require-jsdoc
export function timeout(name, timeoutMs, ...args) {
  if (args.length === 1) {
    if (typeof args[0] === 'number') {
      name = null;
      timeoutMs = args[0];
    } else {
      timeoutMs = TIMEOUT;
    }
  } else if (args.length === 0) {
    name = null;
    timeoutMs = TIMEOUT;
  }
  const startTime = getTimeInMillis();
  return function() {
    if (getTimeInMillis() - startTime <= timeoutMs) {
      // Not timed out yet.
      return;
    }

    // Report the timeout.
    if (name) {
      throw new Error(
          'Timeout \'' + name + '\' after ' + timeoutMs + 'msecs exceeded.',
      );
    }
    throw new Error('Timeout after ' + timeoutMs + 'msecs exceeded.');
  };
}

// eslint-disable-next-line require-jsdoc
export function AnimationTimer() {
  this.timerId = null;

  const that = this;
  this.fire = function() {
    that.timerId = null;
    if (that.listener) {
      try {
        return that.listener[0].apply(that.listener[1], ...args);
      } catch (ex) {
        console.log(ex);
        alert('Error during timer: ' + ex);
      }
    }
  };
}

AnimationTimer.prototype.schedule = function() {
  // Do nothing if the timer is already scheduled.
  if (this.timerId) {
    return false;
  }

  // console.log(new Error("Scheduling animation timer."));
  this.timerId = requestAnimationFrame(this.fire);
  return true;
};

AnimationTimer.prototype.setListener = function(listener, thisArg) {
  if (!listener) {
    this.listener = null;
    return;
  }

  this.listener = [listener, thisArg];
};

AnimationTimer.prototype.scheduled = function() {
  return !!this.timerId;
};
AnimationTimer.prototype.isScheduled = AnimationTimer.prototype.scheduled;

AnimationTimer.prototype.cancel = function() {
  if (!this.timerId) {
    return;
  }

  cancelAnimationFrame(this.timerId);
  this.timerId = null;
};

// eslint-disable-next-line require-jsdoc
export function TimeoutTimer() {
  this.delay = 0;

  this.timerId = null;

  /**
   * Forwards event arguments to the listener.
   */
  const that = this;
  this.fire = function() {
    that.timerId = null;
    if (that.listener) {
      return that.listener[0].apply(that.listener[1], ...args);
    }
  };
}

TimeoutTimer.prototype.setDelay = function(ms) {
  this.delay = ms;
};

TimeoutTimer.prototype.delay = function() {
  return this.delay;
};

TimeoutTimer.prototype.schedule = function() {
  if (this.timerId) {
    return;
  }

  this.timerId = window.setTimeout(this.fire, this.delay);
};

TimeoutTimer.prototype.setListener = function(listener, thisArg) {
  if (!listener) {
    this.listener = null;
    return;
  }
  if (!thisArg) {
    thisArg = this;
  }
  this.listener = [listener, thisArg];
};

TimeoutTimer.prototype.scheduled = function() {
  return !!this.timerId;
};
TimeoutTimer.prototype.isScheduled = TimeoutTimer.prototype.scheduled;

TimeoutTimer.prototype.cancel = function() {
  if (this.timerId) {
    window.clearTimeout(this.timerId);
    this.timerId = null;
  }
};

// eslint-disable-next-line require-jsdoc
export function IntervalTimer() {
  this.delay = 0;

  this.timerId = null;

  /**
   * Forwards event arguments to the listener.
   */
  const that = this;
  this.fire = function() {
    if (that.listener) {
      return that.listener[0].apply(that.listener[1], ...args);
    }
  };
}

/*
 * Sets the delay, in milliseconds.
 */
// eslint-disable-next-line require-jsdoc
IntervalTimer.prototype.setDelay = function(ms) {
  this.delay = ms;
};

/*
 * Gets the delay, in milliseconds.
 */
// eslint-disable-next-line require-jsdoc
IntervalTimer.prototype.delay = function() {
  return this.delay;
};

IntervalTimer.prototype.schedule = function() {
  if (this.timerId) {
    return;
  }

  this.timerId = window.setInterval(this.fire, this.delay);
};

IntervalTimer.prototype.scheduled = function() {
  return !!this.timerId;
};
IntervalTimer.prototype.isScheduled = IntervalTimer.prototype.scheduled;

IntervalTimer.prototype.setListener = function(listener, thisArg) {
  if (!listener) {
    this.listener = null;
    return;
  }
  if (!thisArg) {
    thisArg = this;
  }
  this.listener = [listener, thisArg];
};

IntervalTimer.prototype.cancel = function() {
  if (this.timerId) {
    window.clearInterval(this.timerId);
    this.timerId = null;
  }
};
