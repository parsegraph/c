/* eslint-disable require-jsdoc */

export default function showFlowchartTemplate(world, belt) {
  const caret = new Caret('b');

  const clickChild = function() {
    // Spawn a reasonable child in an allowed direction.
    let child;

    let dirs;
    switch (this.type()) {
      case BLOCK:
        dirs = [
          FORWARD,
          DOWNWARD,
          UPWARD,
          BACKWARD,
          INWARD,
        ];
        break;
      case SLOT:
        if (
          this.parentDirection() &&
          this.parentDirection() != OUTWARD
        ) {
          dirs = [
            reverseNodeDirection(this.parentDirection()),
            FORWARD,
            BACKWARD,
            UPWARD,
            DOWNWARD,
            INWARD,
          ];
        } else {
          dirs = [
            FORWARD,
            BACKWARD,
            UPWARD,
            DOWNWARD,
            INWARD,
          ];
        }
        break;
      case BUD:
        dirs = [
          DOWNWARD,
          FORWARD,
          BACKWARD,
          UPWARD,
        ];
        break;
    }

    for (const i in dirs) {
      const dir = dirs[i];
      if (this.hasNode(dir)) {
        continue;
      }
      if (this.type() == BUD && dir == INWARD) {
        continue;
      }
      let t = BLOCK;
      switch (this.type()) {
        case BLOCK:
          t = dir == INWARD ? SLOT : BUD;
          break;
        case SLOT:
          t = dir == INWARD ? BLOCK : SLOT;
          break;
        case BUD:
          t = BLOCK;
          break;
      }
      child = this.spawnNode(dir, t);
      if (dir == INWARD) {
        child.setScale(SHRINK_SCALE);
      }
      break;
    }

    // Was a new child created?
    if (!child) {
      // Totally occupied; nothing can be done.
      this.setSelected(!this.isSelected());
    } else {
      // Set up the child.
      child.setClickListener(clickChild);
    }
    world.scheduleRepaint();
    belt.scheduleUpdate();
  };
  caret.onClick(clickChild);
  return caret.root();
}
