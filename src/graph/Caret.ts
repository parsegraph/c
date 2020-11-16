import Node, {
  Direction,
  Type,
  Fit,
  Alignment,
  PreferredAxis,
  AxisOverlap,
  DEFAULT_TYPE,
  readType,
  readDirection,
  readAlignment,
  reverseDirection,
  readAxisOverlap,
  isVerticalDirection,
  getDirectionAxis,
} from "./Node";
import { parsegraph_defaultFont, parsegraph_SHRINK_SCALE } from "./settings";
import {
  parsegraph_BLOCK_MATH_STYLE,
  parsegraph_SLOT_MATH_STYLE,
} from "./NodeStyle";
import parsegraph_TestSuite from "../TestSuite";
import {
  parsegraph_createException,
  parsegraph_NO_NODE_FOUND,
} from "./Exception";
import parsegraph_generateID from "../id";
import parsegraph_Font from "./Font";
import parsegraph_World from "./World";

export default class Caret {
  _nodeRoot: Node;
  _mathMode: boolean;
  _world: parsegraph_World;
  _nodes: Node[];
  _savedNodes: { [key: string]: Node };
  _font: parsegraph_Font;

  constructor(...args: any[]) {
    if (arguments.length === 0) {
      this._nodeRoot = new Node(DEFAULT_TYPE);
    } else if (args[0] instanceof Node) {
      this._nodeRoot = args[0];
    } else {
      this._nodeRoot = new Node(readType(args[0]));
    }

    this._mathMode = false;

    // Stack of nodes.
    this._nodes = [this._nodeRoot];

    // A mapping of nodes to their saved names.
    this._savedNodes = null;

    this._font = args.length > 1 ? args[1] : parsegraph_defaultFont();
    this._world = null;
  }

  clone(): Caret {
    return new Caret(this.node(), this.font());
  }

  setMathMode(mathMode: boolean): void {
    this._mathMode = mathMode;
    var curr = this.node();
    if (mathMode) {
      switch (curr.type()) {
        case Type.BLOCK:
          curr.setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
          break;
        case Type.SLOT:
          curr.setBlockStyle(parsegraph_SLOT_MATH_STYLE);
          break;
      }
    }
  }

  mathMode(): boolean {
    return this._mathMode;
  }

  setFont(font: parsegraph_Font): void {
    this._font = font;
  }

  font(): parsegraph_Font {
    if (!this._font) {
      throw new Error("Caret does not have a Font");
    }
    return this._font;
  }

  node(): Node {
    if (this._nodes.length === 0) {
      throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    return this._nodes[this._nodes.length - 1];
  }

  has(inDirection: Direction | string): boolean {
    inDirection = readDirection(inDirection);
    return this.node().hasNode(inDirection);
  }

  spawn(
    inDirection: Direction | string,
    newType: Type | string,
    newAlignmentMode?: Alignment | string
  ): Node {
    // Interpret the given direction and type for ease-of-use.
    inDirection = readDirection(inDirection);
    newType = readType(newType);

    // Spawn a node in the given direction.
    const created: Node = this.node().spawnNode(inDirection, newType);

    // Use the given alignment mode.
    if (newAlignmentMode !== undefined) {
      newAlignmentMode = readAlignment(newAlignmentMode);
      this.align(inDirection, newAlignmentMode);
      if (newAlignmentMode !== Alignment.NONE) {
        this.node().setNodeFit(Fit.EXACT);
      }
    }

    if (this._mathMode) {
      switch (newType) {
        case Type.BLOCK:
          created.setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
          break;
        case Type.SLOT:
          created.setBlockStyle(parsegraph_SLOT_MATH_STYLE);
          break;
      }
    }

    return created;
  }

  connect(inDirection: Direction | string, node: Node): Node {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    this.node().connectNode(inDirection, node);

    return node;
  }

  disconnect(inDirection?: Direction | string): Node {
    if (arguments.length > 0) {
      // Interpret the given direction for ease-of-use.
      inDirection = readDirection(inDirection);
      return this.node().disconnectNode(inDirection);
    }

    if (this.node().isRoot()) {
      return this.node();
    }

    return this.node()
      .parentNode()
      .disconnectNode(reverseDirection(this.node().parentDirection()));
  }

  crease(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: Node;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    // Create a new paint group for the connection.
    if (!node.localPaintGroup()) {
      node.setPaintGroup(true);
    }
  }

  setWorld(world: parsegraph_World): void {
    this._world = world;
  }

  freeze(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);
    let node: Node;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }
    if (!this._world) {
      throw new Error("Caret must have a world in order to freeze nodes");
    }
    node.freeze(this._world.freezer());
  }

  thaw(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);
    let node: Node;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }
    node.thaw();
  }

  uncrease(inDirection?: Direction | string) {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: Node;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    // Remove the paint group.
    node.setPaintGroup(false);
  }

  isCreased(inDirection?: Direction | string): boolean {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: Node;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    return !!node.localPaintGroup();
  }

  creased(inDirection?: Direction | string): boolean {
    return this.isCreased(inDirection);
  }

  erase(inDirection: Direction | string): void {
    inDirection = readDirection(inDirection);
    this.node().eraseNode(inDirection);
  }

  onClick(clickListener: Function, thisArg?: object): void {
    this.node().setClickListener(clickListener, thisArg);
  }

  onChange(changeListener: Function, thisArg?: object): void {
    this.node().setChangeListener(changeListener, thisArg);
  }

  onKey(keyListener: Function, thisArg?: object): void {
    this.node().setKeyListener(keyListener, thisArg);
  }

  move(toDirection: Direction | string): void {
    toDirection = readDirection(toDirection);
    let dest: Node = this.node().nodeAt(toDirection);
    if (!dest) {
      throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes[this._nodes.length - 1] = dest;
  }

  push(): void {
    this._nodes.push(this.node());
  }

  save(id?: string): string {
    if (id === undefined) {
      id = parsegraph_generateID();
    }
    if (!this._savedNodes) {
      this._savedNodes = {};
    }
    this._savedNodes[id] = this.node();
    return id;
  }

  clearSave(id: string): void {
    if (!this._savedNodes) {
      return;
    }
    if (id === undefined) {
      id = "";
    }
    delete this._savedNodes[id];
  }

  restore(id: string): void {
    if (!this._savedNodes) {
      throw new Error(
        "No saved nodes were found for the provided ID '" + id + "'"
      );
    }
    let loadedNode: Node = this._savedNodes[id];
    if (loadedNode == null) {
      throw new Error("No node found for the provided ID '" + id + "'");
    }
    this._nodes[this._nodes.length - 1] = loadedNode;
  }

  moveTo(id: string): void {
    this.restore(id);
  }

  moveToRoot(): void {
    this._nodes[this._nodes.length - 1] = this._nodeRoot;
  }

  pop(): void {
    if (this._nodes.length <= 1) {
      throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes.pop();
  }

  spawnMove(
    inDirection: Direction | string,
    newType: Type | string,
    newAlignmentMode?: Alignment | string
  ): Node {
    const created: Node = this.spawn(inDirection, newType, newAlignmentMode);
    this.move(inDirection);
    return created;
  }

  replace(...args: any[]): void {
    // Retrieve the arguments.
    let node: Node = this.node();
    let withType: Type;
    if (args.length > 1) {
      node = node.nodeAt(readDirection(args[0]));
      withType = args[1];
    } else {
      withType = args[0];
    }

    // Set the node type.
    withType = readType(withType);
    node.setType(withType);
    if (this._mathMode) {
      switch (withType) {
        case Type.BLOCK:
          this.node().setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
          break;
        case Type.SLOT:
          this.node().setBlockStyle(parsegraph_SLOT_MATH_STYLE);
          break;
      }
    }
  }

  at(inDirection: Direction | string): Type {
    inDirection = readDirection(inDirection);
    if (this.node().hasNode(inDirection)) {
      return this.node().nodeAt(inDirection).type();
    }
  }

  align(
    inDirection: Direction | string,
    newAlignmentMode: Alignment | string
  ): void {
    // Interpret the arguments.
    inDirection = readDirection(inDirection);
    newAlignmentMode = readAlignment(newAlignmentMode);

    this.node().setNodeAlignmentMode(inDirection, newAlignmentMode);
    if (newAlignmentMode != Alignment.NONE) {
      this.node().setNodeFit(Fit.EXACT);
    }
  }

  overlapAxis(...args: any[]): void {
    if (args.length === 0) {
      this.node().setAxisOverlap(AxisOverlap.ALLOWED);
      return;
    }
    if (args.length === 1) {
      this.node().setAxisOverlap(readAxisOverlap(args[0]));
      return;
    }
    let inDirection: Direction = readDirection(args[0]);
    let newAxisOverlap: AxisOverlap = readAxisOverlap(args[1]);
    this.node().setAxisOverlap(inDirection, newAxisOverlap);
  }

  axisOverlap(...args: any[]): void {
    return this.overlapAxis(...args);
  }

  pull(given: Direction | string): void {
    given = readDirection(given);
    if (
      this.node().isRoot() ||
      this.node().parentDirection() === Direction.OUTWARD
    ) {
      if (isVerticalDirection(given)) {
        this.node().setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        this.node().setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
      return;
    }
    if (
      getDirectionAxis(given) ===
      getDirectionAxis(this.node().parentDirection())
    ) {
      //console.log(namePreferredAxis(PreferredAxis.PARENT));
      this.node().setLayoutPreference(PreferredAxis.PARENT);
    } else {
      //console.log(namePreferredAxis(PreferredAxis.PERPENDICULAR);
      this.node().setLayoutPreference(PreferredAxis.PERPENDICULAR);
    }
  }

  shrink(inDirection?: Direction | string): void {
    let node: Node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    if (node) {
      node.setScale(parsegraph_SHRINK_SCALE);
    }
  }

  grow(inDirection?: Direction | string): void {
    let node: Node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    if (node) {
      node.setScale(1.0);
    }
  }

  fitExact(inDirection?: Direction | string): void {
    let node: Node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    node.setNodeFit(Fit.EXACT);
  }

  fitLoose(inDirection?: Direction | string): void {
    let node: Node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    node.setNodeFit(Fit.LOOSE);
  }

  fitNaive(inDirection?: Direction | string): void {
    let node: Node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    node.setNodeFit(Fit.NAIVE);
  }

  label(...args: any[]) {
    var node, text, font;
    switch (args.length) {
      case 0:
        return this.node().label();
      case 1:
        node = this.node();
        text = args[0];
        font = this.font();
        break;
      case 2:
        if (typeof args[1] === "object") {
          node = this.node();
          text = args[0];
          font = args[1];
        } else {
          node = this.node();
          node = node.nodeAt(readDirection(args[0]));
          text = args[1];
          font = this.font();
          //console.log(typeof arguments[0]);
          //console.log(typeof arguments[1]);
        }
        break;
      case 3:
        node = this.node();
        node = node.nodeAt(readDirection(args[0]));
        text = arguments[1];
        font = arguments[2];
        break;
    }
    node.setLabel(text, font);
  }

  select(inDirection?: Direction | string): void {
    var node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    node.setSelected(true);
  }

  selected(inDirection?: Direction | string): boolean {
    var node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    return node.isSelected();
  }

  deselect(inDirection?: Direction | string): void {
    var node = this.node();
    if (arguments.length > 0) {
      node = node.nodeAt(readDirection(inDirection));
    }
    node.setSelected(false);
  }

  /**
   * Returns the initially provided node.
   */
  root(): Node {
    return this._nodeRoot;
  }
}

const Caret_Tests = new parsegraph_TestSuite("parsegraph.Caret");
Caret_Tests.addTest("new Caret", function () {
  var car = new Caret("s");
  var n = new Node(Type.BLOCK);
  car = new Caret(n);
  car = new Caret();
  if (car.node().type() !== DEFAULT_TYPE) {
    console.log(DEFAULT_TYPE);
    return car.node().type() + " is not the default.";
  }
});

Caret_Tests.addTest("Caret.onKey", function () {
  var car = new Caret();
  car.onKey(function () {
    console.log("Key pressed");
  });
});
