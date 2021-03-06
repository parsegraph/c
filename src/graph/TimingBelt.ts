import {AnimationTimer, TimeoutTimer, elapsed} from '../timing';

import {Method} from '../function';

import Window from './Window';

import {
  GOVERNOR,
  BURST_IDLE,
  INTERVAL,
  IDLE_MARGIN,
} from './settings';
/* eslint-disable require-jsdoc */

export default class TimingBelt {
  _window:Window[];

  _idleJobs:Method[];
  _renderTimer:AnimationTimer;
  _governor:boolean;
  _bursIdle:boolean;
  _interval:number;
  _idleTimer:TimeoutTimer;
  _lastRender:Date;

  constructor() {
    this._windows = [];

    this._idleJobs = [];
    this._renderTimer = new AnimationTimer();
    this._renderTimer.setListener(this.cycle, this);

    this._governor = GOVERNOR;
    this._burstIdle = BURST_IDLE;
    this._interval = INTERVAL;
    this._idleTimer = new TimeoutTimer();
    this._idleTimer.setDelay(INTERVAL);
    this._idleTimer.setListener(this.onIdleTimer, this);
    this._idleTimer.schedule();

    this._lastRender = null;
  }

onIdleTimer() {
  this.idle(INTERVAL - IDLE_MARGIN);
};

addWindow(window) {
  this._windows.push(window);
  window.setOnScheduleUpdate(this.scheduleUpdate, this);
  this.scheduleUpdate();
};

removeWindow(window) {
  for (const i in this._windows) {
    if (this._windows[i] === window) {
      this._windows.splice(i, 1);
      window.setOnScheduleUpdate(null, null);
      return true;
    }
  }
  return false;
};

setGovernor(governor) {
  this._governor = governor;
};

setBurstIdle(burstIdle) {
  this._burstIdle = burstIdle;
};

setInterval(interval) {
  this._interval = interval;
};

queueJob(jobFunc, jobFuncThisArg) {
  this._idleJobs.push(new Method(jobFunc, jobFuncThisArg));
  this.scheduleUpdate();
};

idle(interval) {
  if (this._idleJobs.length === 0) {
    // ("Nothing to idle");
    return;
  }
  const startTime = new Date();
  if (
    interval > 0 &&
    elapsed(startTime) < interval &&
    (!this._governor || !this._lastIdle || elapsed(this._lastIdle) > interval)
  ) {
    // alert("Idle looping");
    do {
      // log("Idling");
      const job = this._idleJobs[0];
      let r;
      try {
        r = job.call(interval - elapsed(startTime));
      } catch (ex) {
        this._idleJobs.shift();
        this.scheduleUpdate();
        alert('Idle threw: ' + ex);
        throw ex;
      }
      if (r !== true) {
        // alert("Idle complete");
        this._idleJobs.shift();
      } else {
        this.scheduleUpdate();
      }
    } while (
      this._burstIdle &&
      interval - elapsed(startTime) > 0 &&
      this._idleJobs.length > 0
    );
    if (this._idleJobs.length > 0 && this._governor) {
      this._lastIdle = new Date();
    }
  } else if (this._idleJobs.length > 0) {
    if (elapsed(startTime) >= interval) {
      alert(
          'Idle suppressed because there is no' +
          ' remaining time in the render loop.',
      );
    } else if (
      this._governor &&
      this._lastIdle &&
      elapsed(this._lastIdle) > interval
    ) {
      alert('Idle suppressed because the last idle was too recent.');
    }
  }
};

doCycle() {
  const startTime = new Date();

  // Update all input functions.
  let inputChangedScene = false;
  let window;
  for (let i = 0; i < this._windows.length; ++i) {
    window = this._windows[i];
    window.clearLog();
    inputChangedScene =
      window.handleEvent('tick', startTime) || inputChangedScene;
    window.log('Running timing belt. inputchangedscene=' + inputChangedScene);
  }

  const interval = this._interval;
  const windowInterval = Math.max(
      0,
      (interval - elapsed(startTime)) / this._windows.length,
  );
  let needsUpdate = false;
  const windowOffset = Math.floor(Math.random() % this._windows.length);
  if (inputChangedScene) {
    // console.log("Render and paint");
    for (let i = 0; i < this._windows.length; ++i) {
      window = this._windows[(windowOffset + i) % this._windows.length];
      // Eagerly retrieve the GL context since this
      // can take a while on first attempt.
      window.gl();
      if (elapsed(startTime) > interval) {
        window.log('Timeout');
        needsUpdate = true;
        break;
      }
      needsUpdate = window.render() || needsUpdate;
      if (elapsed(startTime) > interval) {
        window.log('Timeout');
        needsUpdate = true;
        break;
      }
      needsUpdate = window.paint(windowInterval) || needsUpdate;
      window.log('NeedsUpdate=' + needsUpdate);
    }
  } else {
    window.log('Paint and render');
    for (let i = 0; i < this._windows.length; ++i) {
      window = this._windows[(windowOffset + i) % this._windows.length];
      if (elapsed(startTime) > interval) {
        window.log('Timeout');
        needsUpdate = true;
        break;
      }
      needsUpdate = window.paint(windowInterval) || needsUpdate;
      if (elapsed(startTime) > interval) {
        window.log('Timeout');
        needsUpdate = true;
        break;
      }
      needsUpdate = window.render() || needsUpdate;
      window.log('NeedsUpdate=' + needsUpdate);
    }
  }

  // Run the idle function if possible.
  if (this._idleJobs.length > 0 && !needsUpdate) {
    this._idleTimer.schedule();
  } else {
    window.log('Can\'t idle: ' + this._idleJobs.length + ', ' + needsUpdate);
  }

  // Determine whether an additional cycle should automatically be scheduled.
  if (needsUpdate || inputChangedScene) {
    this.scheduleUpdate();
  }
  this._lastRender = new Date();
  window.log(
      'Done rendering in ' + elapsed(startTime, this._lastRender) + 'ms',
  );
};

cycle() {
  const startTime = new Date();

  // Update all input functions.
  const inputChangedScene = false;
  for (let i = 0; i < this._windows.length; ++i) {
    const window = this._windows[i];
    window.clearLog();
  }

  try {
    this.doCycle();
  } finally {
    for (let i = 0; i < this._windows.length; ++i) {
      const window = this._windows[i];
      window.finalizeLog();
    }
  }
};

scheduleUpdate() {
  // console.log("TimingBelt is scheduling update");
  return this._renderTimer.schedule();
};

}
