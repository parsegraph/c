import parsegraph_TestSuite from '../TestSuite';
import parsegraph_Freezer from './Freezer';
import parsegraph_CameraBox from './CameraBox';
import Node, {
  resetNodesPainted,
  outputNodesPainted,
  Direction,
  Type,
} from './Node';
import Caret from './Caret';
import parsegraph_Rect from './Rect';
import parsegraph_Window from './Window';
import parsegraph_Camera from './Camera';

export default class World {
  _worldPaintingDirty: boolean;
  _worldRoots: Node[];
  _nodeUnderCursor: Node;
  _previousWorldPaintState: number;
  _freezer: parsegraph_Freezer;
  _cameraBox: parsegraph_CameraBox;

  constructor() {
    // World-rendered graphs.
    this._worldPaintingDirty = true;
    this._worldRoots = [];

    // The node currently under the cursor.
    this._nodeUnderCursor = null;

    this._previousWorldPaintState = null;
    this._freezer = new parsegraph_Freezer();
    this._cameraBox = new parsegraph_CameraBox();
  }

  freezer(): parsegraph_Freezer {
    return this._freezer;
  }

  contextChanged(isLost: boolean, window: parsegraph_Window): void {
    this._worldPaintingDirty = true;
    this._previousWorldPaintState = null;
    for (let i = 0; i < this._worldRoots.length; ++i) {
      const root: Node = this._worldRoots[i];
      root.contextChanged(isLost, window);
    }
    this._cameraBox.contextChanged(isLost, window);
  }

  plot(node: Node | Caret): void {
    if (!node) {
      throw new Error('Node must not be null');
    }
    if (node instanceof Caret) {
      // Passed a Caret.
      node = node.root();
    }
    if (!node.localPaintGroup()) {
      node.setPaintGroup(true);
    }
    this._worldRoots.push(node);
  }

  removePlot(plot: Node): Node {
    for (let i = 0; i < this._worldRoots.length; ++i) {
      if (this._worldRoots[i] === plot) {
        if (this._previousWorldPaintState) {
          this._previousWorldPaintState = null;
        }
        return this._worldRoots.splice(i, 1)[0];
      }
    }
    return null;
  }

  /**
   * Receives a mouseover event at the given coordinates, in world space.
   *
   * Returns true if this event processing requires a graph repaint.
   */
  mouseOver(x: number, y: number): number {
    if (!this.readyForInput()) {
      return 1;
    }

    const selectedNode: Node = this.nodeUnderCoords(x, y);
    if (this._nodeUnderCursor === selectedNode) {
      // The node under cursor is already the node under cursor, so don't
      // do anything.
      // console.log("Node was the same");
      return selectedNode ? 1 : 0;
    }

    if (this._nodeUnderCursor && this._nodeUnderCursor !== selectedNode) {
      // console.log("Node is changing, so repainting.");
      this._nodeUnderCursor.setSelected(false);
      this.scheduleRepaint();
    }

    this._nodeUnderCursor = selectedNode;
    if (!selectedNode) {
      // No node was actually found.
      // console.log("No node actually found.");
      return 0;
    }

    if (selectedNode.type() == Type.SLIDER) {
      // console.log("Selecting slider and repainting");
      selectedNode.setSelected(true);
      this.scheduleRepaint();
    } else if (selectedNode.hasClickListener() && !selectedNode.isSelected()) {
      // console.log("Selecting node and repainting");
      selectedNode.setSelected(true);
      this.scheduleRepaint();
    } else {
      return 0;
    }

    return 2;
  }

  boundingRect(outRect?: parsegraph_Rect): parsegraph_Rect {
    if (!outRect) {
      outRect = new parsegraph_Rect(0, 0, 0, 0);
    }
    this._worldRoots.forEach(function(plot) {
      plot.commitLayoutIteratively();

      // Get plot extent data.
      const nx: number = plot.absoluteX();
      const ny: number = plot.absoluteY();

      const boundingValues: [number, number, number] = [0, 0, 0];
      plot.extentsAt(Direction.FORWARD).boundingValues(boundingValues);
      let h: number = boundingValues[0];
      plot.extentsAt(Direction.DOWNWARD).boundingValues(boundingValues);
      let w: number = boundingValues[0];

      const be: number = nx - plot.extentOffsetAt(Direction.FORWARD);
      const ue: number = ny - plot.extentOffsetAt(Direction.DOWNWARD);
      const fe: number = be + w;
      const de: number = ue + h;

      // Get rect values.
      w = fe + be;
      h = de + ue;

      // Calculate center by averaging axis extremes.
      const cx: number = be + w / 2;
      const cy: number = ue + h / 2;

      // Get current bounding rect.
      const inx: number = outRect._x;
      const iny: number = outRect._y;
      const inw: number = outRect._width;
      const inh: number = outRect._height;

      let outw: number;
      let outh: number;
      let outx: number;
      let outy: number;

      if (!inw || !inh || !inx || !iny) {
        outw = w;
        outh = h;
        outx = cx;
        outy = cy;
      } else {
        // Combine rect extents.
        const hmin: number = Math.min(inx - inw / 2, cx - w / 2);
        const hmax: number = Math.max(inx + inw / 2, cx + w / 2);
        const vmin: number = Math.min(iny - inh / 2, cy - h / 2);
        const vmax: number = Math.max(iny + inh / 2, cy + h / 2);

        // Calculate width and center.
        outw = hmax - hmin;
        outh = vmax - vmin;
        outx = hmin + outw / 2;
        outy = vmin + outh / 2;
      }

      // Store results.
      outRect._x = outx;
      outRect._y = outy;
      outRect._width = outw;
      outRect._height = outh;
    });

    return outRect;
  }

  scheduleRepaint(): void {
    // console.log(new Error("Scheduling repaint"));
    this._worldPaintingDirty = true;
    this._previousWorldPaintState = null;
  }

  nodeUnderCursor(): Node {
    return this._nodeUnderCursor;
  }

  readyForInput(): boolean {
    // Test if there is a node under the given coordinates.
    for (let i: number = this._worldRoots.length - 1; i >= 0; --i) {
      const root: Node = this._worldRoots[i];
      if (root.needsCommit() || root.isDirty()) {
        return false;
      }
    }
    return true;
  }

  commitLayout(timeout?: number): boolean {
    let completed = true;
    for (let i: number = this._worldRoots.length - 1; i >= 0; --i) {
      if (this._worldRoots[i].commitLayoutIteratively(timeout)) {
        completed = false;
      }
    }
    return completed;
  }

  /**
   * Tests whether the given position, in world space, is within a node.
   */
  nodeUnderCoords(x: number, y: number): Node {
    // Test if there is a node under the given coordinates.
    for (let i: number = this._worldRoots.length - 1; i >= 0; --i) {
      const selectedNode: Node = this._worldRoots[i].nodeUnderCoords(x, y);
      if (selectedNode) {
        // Node located; no further search.
        return selectedNode;
      }
    }
    return null;
  }

  needsRepaint(): boolean {
    return this._worldPaintingDirty || this._cameraBox.needsRepaint();
  }

  paint(window: parsegraph_Window, timeout?: number): boolean {
    const gl = window.gl();
    if (gl.isContextLost()) {
      return false;
    }
    // console.log("Painting world, timeout=" + timeout);
    const t: number = new Date().getTime();
    const pastTime: Function = function() {
      return timeout !== undefined && new Date().getTime() - t > timeout;
    };
    const timeRemaining: Function = function() {
      if (timeout === undefined) {
        return timeout;
      }
      return Math.max(0, timeout - (new Date().getTime() - t));
    };

    if (this._worldPaintingDirty) {
      // console.log("World needs repaint");
      // Restore the last state.
      let i: number = 0;
      let savedState: number;
      if (this._previousWorldPaintState !== null) {
        savedState = this._previousWorldPaintState;
        this._previousWorldPaintState = null;
        i = savedState;
      } else {
        resetNodesPainted();
      }

      while (i < this._worldRoots.length) {
        if (pastTime()) {
          this._previousWorldPaintState = i;
          return true;
        }
        const plot: Node = this._worldRoots[i];
        if (!plot.localPaintGroup()) {
          throw new Error('World root must have a paint group');
        }
        const needsUpdate: boolean = plot.paint(window, timeRemaining());
        if (needsUpdate) {
          this._previousWorldPaintState = i;
          return true;
        }

        ++i;
      }
      // console.log("Done painting");
      this._worldPaintingDirty = false;
    } else {
      window.log('World does not need repaint');
    }

    if (!this._worldPaintingDirty) {
      outputNodesPainted();
    }

    this._cameraBox.paint(window);

    return false;
  }

  render(window: parsegraph_Window, camera: parsegraph_Camera): boolean {
    const gl = window.gl();
    if (gl.isContextLost()) {
      return false;
    }
    let needsUpdate: boolean = false;
    for (let i = 0; i < this._worldRoots.length; ++i) {
      needsUpdate =
        this._worldRoots[i].renderIteratively(window, camera) || needsUpdate;
    }
    this._cameraBox.render(window, camera);
    return needsUpdate;
  }
}

const parsegraph_World_Tests = new parsegraph_TestSuite('parsegraph_World');

parsegraph_World_Tests.addTest('parsegraph_World.plot', function() {
  const w = new World();

  let f = 0;
  try {
    f = 1;
    w.plot(null);
    f = 2;
  } catch (ex) {
    f = 3;
  }
  if (f != 3) {
    return 'parsegraph_plot must fail with null node';
  }
});

parsegraph_World_Tests.addTest('world.plot with caret', function() {
  const w = new World();
  const car = new Caret('b');
  let f = 0;
  try {
    f = 1;
    w.plot(car);
    f = 2;
  } catch (ex) {
    f = ex;
  }
  if (f != 2) {
    return 'parsegraph_plot must handle being passed a Caret: ' + f;
  }
});

parsegraph_World_Tests.addTest('boundingRect', function() {
  const w = new World();
  const car = new Caret('b');
  w.plot(car);
  const r = w.boundingRect();
  // console.log(r);
  if (isNaN(r.width())) {
    return 'Width must not be NaN';
  }
});
