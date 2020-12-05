/* eslint-disable require-jsdoc */

import Caret from '../graph/Caret';
import Node, {
  Direction,
  Type,
  reverseDirection,
} from '../graph/Node';
import {
	SHRINK_SCALE
} from '../graph/settings';

export default function showFlowchartTemplate(world, belt) {
  const caret = new Caret('b');

  const clickChild = function() {
    // Spawn a reasonable child in an allowed direction.
    let child;

    let dirs;
    switch (this.type()) {
      case Type.BLOCK:
        dirs = [
          Direction.FORWARD,
          Direction.DOWNWARD,
          Direction.UPWARD,
          Direction.BACKWARD,
          Direction.INWARD,
        ];
        break;
      case Type.SLOT:
        if (
          this.parentDirection() &&
          this.parentDirection() != Direction.OUTWARD
        ) {
          dirs = [
            reverseDirection(this.parentDirection()),
            Direction.FORWARD,
            Direction.BACKWARD,
            Direction.UPWARD,
            Direction.DOWNWARD,
            Direction.INWARD,
          ];
        } else {
          dirs = [
            Direction.FORWARD,
            Direction.BACKWARD,
            Direction.UPWARD,
            Direction.DOWNWARD,
            Direction.INWARD,
          ];
        }
        break;
      case Type.BUD:
        dirs = [
          Direction.DOWNWARD,
          Direction.FORWARD,
          Direction.BACKWARD,
          Direction.UPWARD,
        ];
        break;
    }

    for (const i in dirs) {
      const dir = dirs[i];
      if (this.hasNode(dir)) {
        continue;
      }
      if (this.type() == Type.BUD && dir == Direction.INWARD) {
        continue;
      }
      let t = Type.BLOCK;
      switch (this.type()) {
        case Type.BLOCK:
          t = dir == Direction.INWARD ? Type.SLOT : Type.BUD;
          break;
        case Type.SLOT:
          t = dir == Direction.INWARD ? Type.BLOCK : Type.SLOT;
          break;
        case Type.BUD:
          t = Type.BLOCK;
          break;
      }
      child = this.spawnNode(dir, t);
      if (dir == Direction.INWARD) {
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
