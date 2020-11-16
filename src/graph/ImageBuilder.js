function parsegraph_ImageBuilder(width, height) {
  this._renderTimer = new parsegraph_AnimationTimer();
  this._renderTimer.setListener(this.cycle, this);

  this._jobs = [];
  this._builders = [];
  this._window = new parsegraph_ImageWindow(width, height);
  this._window.setOnScheduleUpdate(this.scheduleUpdate, this);
  this._world = new parsegraph_World();
  this._viewport = new parsegraph_Viewport(this._window, this._world);
  this._window.addComponent(this._viewport.component());

  this.scheduleUpdate();
}

parsegraph_ImageBuilder.prototype.scheduleUpdate = function() {
  this._renderTimer.schedule();
};

parsegraph_ImageBuilder.prototype.window = function() {
  return this._window;
};

parsegraph_ImageBuilder.prototype.viewport = function() {
  return this._viewport;
};

parsegraph_ImageBuilder.prototype.world = function() {
  return this._world;
};

parsegraph_ImageBuilder.prototype.createImage = function(
    creatorFunc,
    creatorFuncThisArg,
    callbackFunc,
    callbackFuncThisArg,
) {
  this._jobs.push({
    creatorFunc: creatorFunc,
    creatorFuncThisArg: creatorFuncThisArg,
    callbackFunc: callbackFunc,
    callbackFuncThisArg: callbackFuncThisArg,
  });
};

parsegraph_ImageBuilder.prototype.queueJob = function(
    builderFunc,
    builderFuncThisArg,
) {
  const job = this._jobs[0];
  if (!job) {
    throw new Error(
        'ImageBuilder must have a scene in progress to queue a builder.',
    );
  }
  if (!job.builders) {
    job.builders = [];
  }
  job.builders.push([builderFunc, builderFuncThisArg]);
};

parsegraph_ImageBuilder.prototype.cycle = function() {
  const timeout = parsegraph_INTERVAL;
  const startTime = new Date();
  const timeLeft = function() {
    return timeout - parsegraph_elapsed(startTime);
  };
  const job = this._jobs[0];
  if (!job) {
    // console.log("No scenes to build.");
    return false;
  }
  if (!job.rootless && !job.root) {
    job.root = job.creatorFunc.call(job.creatorFuncThisArg);
    if (!job.root) {
      job.rootless = true;
    } else {
      this._viewport.showInCamera(job.root);
      this._world.plot(job.root);
      this._world.scheduleRepaint();
    }
    job.callbackFunc.call(job.callbackFuncThisArg, this._window.image());
  }
  if (job.builders) {
    for (let builder = job.builders[0]; builder; builder = job.builders[0]) {
      const callAgain = builder[0].call(builder[1], timeLeft());
      if (!callAgain) {
        // console.log("Finished with builder");
        job.builders.shift();
      }
      if (timeLeft() < 0) {
        this.scheduleUpdate();
        return;
      }
    }
  }
  let needsUpdate = job.builders && job.builders.length > 0;
  needsUpdate = this._window.paint(timeLeft()) || needsUpdate;
  needsUpdate = this._window.render(timeLeft()) || needsUpdate;
  if (needsUpdate) {
    this.scheduleUpdate();
    return;
  }
  // console.log("Completed render");
  this._jobs.shift();
  this._window.newImage();
  if (job.root) {
    this._world.removePlot(job.root);
  }
  this.scheduleUpdate();
};
