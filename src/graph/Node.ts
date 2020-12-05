import {
  createException,
  BAD_NODE_DIRECTION,
  BAD_LAYOUT_PREFERENCE,
  BAD_AXIS,
  BAD_LAYOUT_STATE,
  NODE_IS_ROOT,
  BAD_NODE_ALIGNMENT,
  BAD_AXIS_OVERLAP,
  BAD_NODE_TYPE,
  BAD_NODE_FIT,
  CANNOT_AFFECT_PARENT,
  NO_NODE_FOUND,
} from './Exception';
import {elapsed} from '../timing';

import {
  RIGHT_TO_LEFT,
  NATURAL_VIEWPORT_SCALE,
  CACHE_ACTIVATION_SCALE,
  INTERVAL,
  defaultFont,
} from './settings.js';

import style, {
  BUD_LEAF_SEPARATION,
  LINE_THICKNESS,
  BUD_TO_BUD_VERTICAL_SEPARATION,
} from './NodeStyle.js';

import {
  matrixIdentity3x3,
  makeScale3x3I,
  makeTranslation3x3I,
  matrixMultiply3x3I,
} from '../gl';

import Rect from './Rect';
import Size from './Size';
import Extent from './Extent';
import Label from './Label';
import Viewport from './Viewport';
import Window from './Window';
import NodePainter from './NodePainter';
import Camera from './Camera';
import Color from './Color';
import Freezer from './Freezer';
import Font from './Font';
/* eslint-disable require-jsdoc */

// ////////////////////////////////////////////////////////////////////////////
//
// Direction and Axis
//
// ////////////////////////////////////////////////////////////////////////////

// Node Direction
export enum Direction {
  NULL = -1,
  INWARD,
  OUTWARD,
  DOWNWARD,
  UPWARD,
  BACKWARD,
  FORWARD,
}
export const NUM_DIRECTIONS = 6;

export enum Axis {
  NULL = 6,
  HORIZONTAL,
  VERTICAL,
}

export const HORIZONTAL_ORDER: Direction[] = [
  Direction.BACKWARD,
  Direction.FORWARD,
  Direction.DOWNWARD,
  Direction.UPWARD,
  Direction.INWARD,
  Direction.OUTWARD,
];

export const VERTICAL_ORDER: Direction[] = [
  Direction.DOWNWARD,
  Direction.UPWARD,
  Direction.BACKWARD,
  Direction.FORWARD,
  Direction.INWARD,
  Direction.OUTWARD,
];

export function readDirection(given: string | Direction): Direction {
  if (typeof given === 'number') {
    return given;
  }
  if (typeof given === 'string') {
    switch (given.charAt(0)) {
      case 'f':
      case 'F':
        return Direction.FORWARD;
      case 'b':
      case 'B':
        return Direction.BACKWARD;
      case 'u':
      case 'U':
        return Direction.UPWARD;
      case 'd':
      case 'D':
        return Direction.DOWNWARD;
      case 'i':
      case 'I':
        return Direction.INWARD;
      case 'o':
      case 'O':
        return Direction.OUTWARD;
    }
  }

  return Direction.NULL;
}

export function nameDirection(given: Direction): string {
  switch (given) {
    case Direction.NULL:
      return 'NULL';
    case Direction.FORWARD:
      return 'FORWARD';
    case Direction.BACKWARD:
      return 'BACKWARD';
    case Direction.DOWNWARD:
      return 'DOWNWARD';
    case Direction.UPWARD:
      return 'UPWARD';
    case Direction.INWARD:
      return 'INWARD';
    case Direction.OUTWARD:
      return 'OUTWARD';
  }
  throw createException(BAD_NODE_DIRECTION, given);
}
export const isDirection = nameDirection;

export function reverseDirection(given: Direction): Direction {
  switch (given) {
    case Direction.NULL:
      return Direction.NULL;
    case Direction.FORWARD:
      return Direction.BACKWARD;
    case Direction.BACKWARD:
      return Direction.FORWARD;
    case Direction.DOWNWARD:
      return Direction.UPWARD;
    case Direction.UPWARD:
      return Direction.DOWNWARD;
    case Direction.INWARD:
      return Direction.OUTWARD;
    case Direction.OUTWARD:
      return Direction.INWARD;
  }
  throw createException(BAD_NODE_DIRECTION, given);
}

export function turnLeft(given: Direction): Direction {
  switch (given) {
    case Direction.FORWARD:
      return Direction.UPWARD;
    case Direction.BACKWARD:
      return Direction.DOWNWARD;
    case Direction.DOWNWARD:
      return Direction.FORWARD;
    case Direction.UPWARD:
      return Direction.BACKWARD;
    default:
      throw createException(BAD_NODE_DIRECTION, given);
  }
}

export function turnRight(given: Direction): Direction {
  return reverseDirection(turnLeft(given));
}

export function turnPositive(direction: Direction): Direction {
  return getPositiveDirection(getPerpendicularAxis(direction));
}

export function turnNegative(direction: Direction): Direction {
  return reverseDirection(turnPositive(direction));
}

export function isCardinalDirection(given: Direction): boolean {
  switch (given) {
    case Direction.NULL:
    case Direction.INWARD:
    case Direction.OUTWARD:
      return false;
    case Direction.UPWARD:
    case Direction.DOWNWARD:
    case Direction.BACKWARD:
    case Direction.FORWARD:
      return true;
  }
  throw createException(BAD_NODE_DIRECTION, given);
}

export function nameAxis(given: Axis): string {
  switch (given) {
    case Axis.NULL:
      return 'NULL';
    case Axis.VERTICAL:
      return 'VERTICAL';
    case Axis.HORIZONTAL:
      return 'HORIZONTAL';
  }
}

export function getDirectionAxis(given: Direction): Axis {
  switch (given) {
    case Direction.FORWARD:
    case Direction.BACKWARD:
      return Axis.HORIZONTAL;
    case Direction.DOWNWARD:
    case Direction.UPWARD:
      return Axis.VERTICAL;
    case Direction.INWARD:
    case Direction.OUTWARD:
    case Direction.NULL:
      return Axis.NULL;
  }
  throw createException(BAD_NODE_DIRECTION, given);
}

export function isVerticalDirection(given: Direction): boolean {
  return getDirectionAxis(given) === Axis.VERTICAL;
}

export function isHorizontalDirection(given: Direction): boolean {
  return getDirectionAxis(given) === Axis.HORIZONTAL;
}

export function getPerpendicularAxis(axisOrDirection: Direction | Axis): Axis {
  switch (axisOrDirection) {
    case Axis.HORIZONTAL:
      return Axis.VERTICAL;
    case Axis.VERTICAL:
      return Axis.HORIZONTAL;
    case Axis.NULL:
      return Axis.NULL;
    default:
      // Assume it's a direction.
      return getPerpendicularAxis(getDirectionAxis(axisOrDirection));
  }
  throw createException(BAD_AXIS, axisOrDirection);
}

export function getPositiveDirection(given: Axis) {
  switch (given) {
    case Axis.HORIZONTAL:
      return Direction.FORWARD;
    case Axis.VERTICAL:
      return Direction.DOWNWARD;
    case Axis.NULL:
      throw createException(BAD_AXIS, given);
  }
  throw createException(BAD_AXIS, given);
}

export function forEachCardinalDirection(func: Function, thisArg?: object) {
  func.call(thisArg, Direction.DOWNWARD);
  func.call(thisArg, Direction.UPWARD);
  func.call(thisArg, Direction.FORWARD);
  func.call(thisArg, Direction.BACKWARD);
}

export function getNegativeDirection(given: Axis): Direction {
  return reverseDirection(getPositiveDirection(given));
}

export function isPositiveDirection(given: Direction): boolean {
  const positiveDirection = getPositiveDirection(getDirectionAxis(given));
  return given === positiveDirection;
}

export function isNegativeDirection(given: Direction): boolean {
  return isPositiveDirection(reverseDirection(given));
}

export function directionSign(given: Direction): number {
  return isPositiveDirection(given) ? 1 : -1;
}

export function alternateDirection(given: Direction): Direction {
  switch (given) {
    case Direction.DOWNWARD:
    case Direction.INWARD:
      return Direction.FORWARD;
    case Direction.FORWARD:
      return Direction.DOWNWARD;
    default:
      throw createException(BAD_NODE_DIRECTION);
  }
}

// ////////////////////////////////////////////////////////////////////////////
//
// Alignment
//
// ////////////////////////////////////////////////////////////////////////////

export enum Alignment {
  NULL = 0,
  NONE,
  NEGATIVE,
  CENTER,
  POSITIVE,
  // Used to align inward nodes.
  INWARD_HORIZONTAL,
  INWARD_VERTICAL,
}

export function nameAlignment(given: Alignment): string {
  switch (given) {
    case Alignment.NULL:
      return 'NULL';
    case Alignment.NONE:
      return 'NONE';
    case Alignment.NEGATIVE:
      return 'NEGATIVE';
    case Alignment.CENTER:
      return 'CENTER';
    case Alignment.POSITIVE:
      return 'POSITIVE';
    case Alignment.INWARD_HORIZONTAL:
      return 'HORIZONTAL';
    case Alignment.INWARD_VERTICAL:
      return 'VERTICAL';
  }
  throw createException(BAD_NODE_ALIGNMENT, given);
}

export function readAlignment(given: string | Alignment): Alignment {
  if (typeof given === 'number') {
    return given;
  }
  if (typeof given === 'string') {
    given = given.toLowerCase();
    switch (given) {
      case 'none':
      case 'no':
        return Alignment.NONE;
      case 'negative':
      case 'neg':
      case 'n':
        return Alignment.NEGATIVE;
      case 'positive':
      case 'pos':
      case 'p':
        return Alignment.POSITIVE;
      case 'center':
      case 'c':
        return Alignment.CENTER;
      case 'vertical':
      case 'v':
        return Alignment.INWARD_VERTICAL;
      case 'horizontal':
      case 'h':
        return Alignment.INWARD_HORIZONTAL;
    }
  }

  return Alignment.NULL;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Axis Overlap
//
// ////////////////////////////////////////////////////////////////////////////

export enum AxisOverlap {
  NULL = 18,
  ALLOWED,
  PREVENTED,
  DEFAULT,
}

export function nameAxisOverlap(given: AxisOverlap): string {
  switch (given) {
    case AxisOverlap.NULL:
      return 'NULL';
    case AxisOverlap.ALLOWED:
      return 'ALLOWED';
    case AxisOverlap.PREVENTED:
      return 'PREVENTED';
    case AxisOverlap.DEFAULT:
      return 'DEFAULT';
  }
  throw createException(BAD_AXIS_OVERLAP);
}

export function readAxisOverlap(given: string): AxisOverlap {
  if (typeof given === 'number') {
    return given;
  }
  if (typeof given === 'string') {
    given = given.toLowerCase();
    switch (given) {
      case 'a':
      case 'allow':
        return AxisOverlap.ALLOWED;
      case 'p':
      case 'prevent':
        return AxisOverlap.PREVENTED;
      case 'd':
      case 'def':
      case 'default':
        return AxisOverlap.DEFAULT;
    }
  }
  return AxisOverlap.NULL;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Node Types
//
// ////////////////////////////////////////////////////////////////////////////

export enum Type {
  NULL = 9,
  BUD,
  SLOT,
  BLOCK,
  SLIDER,
  SCENE,
}

export const DEFAULT_TYPE: Type = Type.BLOCK;

export function nameType(given: Type): string {
  switch (given) {
    case Type.NULL:
      return 'NULL';
    case Type.SLOT:
      return 'SLOT';
    case Type.BLOCK:
      return 'BLOCK';
    case Type.BUD:
      return 'BUD';
    case Type.SLIDER:
      return 'SLIDER';
    case Type.SCENE:
      return 'SCENE';
  }
  throw createException(BAD_NODE_TYPE, given);
}

export function readType(given: string | Type): Type {
  if (typeof given === 'object') {
    return given;
  }
  if (typeof given === 'number') {
    return given;
  }
  if (typeof given === 'string') {
    given = given.toLowerCase().substring(0, 3);

    switch (given) {
      // 'b' is ambiguous, but blocks are more common, so assume that.
      case 'b':
      case 'bl':
      case 'blo':
        return Type.BLOCK;
      case 'u':
      case 'bu':
      case 'bud':
        return Type.BUD;
      case 's':
      case 'sl':
      case 'slo':
        return Type.SLOT;
      case 'sli':
        return Type.SLIDER;
      case 'sc':
      case 'sce':
        return Type.SCENE;
    }
  }
  return Type.NULL;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Node Fit
//
// ////////////////////////////////////////////////////////////////////////////

export enum Fit {
  NULL = 14,
  EXACT,
  LOOSE,
  NAIVE,
}

export function nameFit(given: Fit): string {
  switch (given) {
    case Fit.NULL:
      return 'NULL';
    case Fit.EXACT:
      return 'EXACT';
    case Fit.LOOSE:
      return 'LOOSE';
    case Fit.NAIVE:
      return 'NAIVE';
  }
  throw createException(BAD_NODE_FIT);
}

export function readFit(given: string): Fit {
  if (typeof given === 'number') {
    return given;
  }
  given = given.toLowerCase();
  switch (given) {
    case 'e':
    case 'exact':
      return Fit.EXACT;
    case 'l':
    case 'loose':
      return Fit.LOOSE;
    case 'n':
    case 'naive':
      return Fit.NAIVE;
  }
  return Fit.NULL;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Preferred Axis
//
// ////////////////////////////////////////////////////////////////////////////

export enum PreferredAxis {
  NULL = 0,
  PARENT,
  PERPENDICULAR,
  HORIZONTAL,
  VERTICAL,
}

export function namePreferredAxis(given: PreferredAxis): string {
  switch (given) {
    case PreferredAxis.NULL:
      return 'NULL';
    case PreferredAxis.PARENT:
      return 'PARENT';
    case PreferredAxis.PERPENDICULAR:
      return 'PERPENDICULAR';
    case PreferredAxis.HORIZONTAL:
      return 'HORIZONTAL';
    case PreferredAxis.VERTICAL:
      return 'VERTICAL';
  }
  throw createException(BAD_LAYOUT_PREFERENCE, given);
}

export function readPreferredAxis(given: string | number): PreferredAxis {
  if (typeof given === 'number') {
    return given;
  }
  given = given.toLowerCase();
  switch (given) {
    case 'pa':
    case 'par':
    case 'parent':
      return PreferredAxis.PARENT;
    case 'pe':
    case 'perp':
    case 'perpendicular':
      return PreferredAxis.PERPENDICULAR;
    case 'v':
    case 'vert':
    case 'vertical':
      return PreferredAxis.VERTICAL;
    case 'h':
    case 'horz':
    case 'horizontal':
      return PreferredAxis.HORIZONTAL;
  }
  return PreferredAxis.NULL;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Layout State
//
// ////////////////////////////////////////////////////////////////////////////

export enum LayoutState {
  NULL = 0,
  NEEDS_COMMIT,
  COMMITTED,
  IN_COMMIT,
}

export function nameLayoutState(given: LayoutState): string {
  switch (given) {
    case LayoutState.NULL:
      return 'NULL';
    case LayoutState.NEEDS_COMMIT:
      return 'NEEDS_COMMIT';
    case LayoutState.COMMITTED:
      return 'COMMITTED';
    case LayoutState.IN_COMMIT:
      return 'IN_COMMIT';
  }
  throw createException(BAD_LAYOUT_STATE, given);
}

// ////////////////////////////////////////////////////////////////////////////
//
// Rendering Metrics
//
// ////////////////////////////////////////////////////////////////////////////

let NODES_PAINTED: number = 0;
let PAINT_START: Date = null;

export function countNodePainted(): void {
  ++NODES_PAINTED;
}

export function resetNodesPainted(): void {
  PAINT_START = new Date();
  NODES_PAINTED = 0;
}

export function outputNodesPainted(): void {
  if (NODES_PAINTED == 0) {
    return;
  }
  if (PAINT_START) {
    const paintDuration: number = elapsed(PAINT_START);
    // console.log("Painted " +
    //   NODES_PAINTED +
    //   " nodes over " +
    //   (paintDuration/1000) +
    //   "s. (" +
    //   (NODES_PAINTED/(paintDuration/1000)) +
    //   " nodes/sec)");
  }
  resetNodesPainted();
}

// ////////////////////////////////////////////////////////////////////////////
//
// Tab Usability
//
// ////////////////////////////////////////////////////////////////////////////

export function chainTab(
    a: Node,
    b: Node,
    swappedOut?: Node[],
): void {
  a.ensureExtended();
  b.ensureExtended();
  if (swappedOut) {
    swappedOut[0] = a ? a._extended.nextTabNode : null;
    swappedOut[1] = b ? b._extended.prevTabNode : null;
  }
  // console.log(a, b);
  if (a) {
    a._extended.nextTabNode = b;
  }
  if (b) {
    b._extended.prevTabNode = a;
  }
}

export function chainAllTabs(...args): void {
  if (args.length < 2) {
    return;
  }
  const firstNode: Node = args[0];
  const lastNode: Node = args[args.length - 1];

  for (let i = 0; i <= args.length - 2; ++i) {
    chainTab(args[i], args[i + 1]);
  }
  chainTab(lastNode, firstNode);
}

// ////////////////////////////////////////////////////////////////////////////
//
// Node
//
// ////////////////////////////////////////////////////////////////////////////

class NeighborData {
  owner: Node;
  direction: Direction;
  alignmentMode: Alignment;
  allowAxisOverlap: AxisOverlap;
  alignmentOffset: number;
  separation: number;
  lineLength: number;
  xPos: number;
  yPos: number;
  node: Node;

  constructor(owner: Node, dir: Direction) {
    this.owner = owner;
    this.direction = dir;
    this.alignmentMode = Alignment.NULL;
    this.allowAxisOverlap = AxisOverlap.DEFAULT;
    this.alignmentOffset = 0;
    this.separation = 0;
    this.lineLength = 0;
    this.xPos = null;
    this.yPos = null;
    this.node = null;
  }
}

class ExtendedNode {
  ignoresMouse: boolean;
  keyListener: Function;
  keyListenerThisArg: object;
  clickListener: Function;
  clickListenerThisArg: object;
  changeListener: Function;
  changeListenerThisArg: object;
  prevTabNode: Node;
  nextTabNode: Node;
  value: any;
  selected: boolean;
  isPaintGroup: boolean;
  dirty: boolean;
  windowPainter: { [key: number]: NodePainter };
  windowPaintGroup: { [key: number]: Node };
  commitLayoutFunc: Function;
  scene: any;
  cache: any;

  constructor() {
    this.ignoresMouse = true;
    this.keyListener = null;
    this.keyListenerThisArg = null;
    this.clickListener = null;
    this.clickListenerThisArg = null;
    this.changeListener = null;
    this.changeListenerThisArg = null;
    this.prevTabNode = null;
    this.nextTabNode = null;
    this.value = null;
    this.selected = false;

    this.isPaintGroup = false;
    this.dirty = true;
    this.windowPainter = {};
    this.windowPaintGroup = {};
    this.commitLayoutFunc = null;
    this.scene = null;
  }
}

class CommitLayoutData {
  bodySize: Size;
  lineBounds: Size;
  bv: [number, number, number];
  firstSize: Size;
  secondSize: Size;
  needsPosition: boolean;

  constructor() {
    this.bodySize = new Size();
    this.lineBounds = new Size();
    this.bv = [null, null, null];
    this.firstSize = new Size();
    this.secondSize = new Size();
    this.needsPosition = false;
  }
}

class NodeRenderData {
  bounds: Rect;
  scaleMat: Float32Array;
  transMat: Float32Array;
  worldMat: Float32Array;

  constructor() {
    this.bounds = new Rect(0, 0, 0, 0);
    this.scaleMat = matrixIdentity3x3();
    this.transMat = matrixIdentity3x3();
    this.worldMat = matrixIdentity3x3();
  }
}

let nodeCount: number = 0;

const renderTimes: number[] = [];
const renderData: NodeRenderData = new NodeRenderData();
let CACHED_RENDERS: number = 0;
let IMMEDIATE_RENDERS: number = 0;
export default class Node {
  _id: number;
  _type: Type;
  _style: style;
  _rightToLeft: boolean;
  _scale: number;
  _extents: Extent[];
  _neighbors: NeighborData[];
  _parentNeighbor: NeighborData;
  _nodeFit: Fit;
  _layoutState: LayoutState;
  _absoluteVersion: number;
  _absoluteDirty: boolean;
  _absoluteXPos: number;
  _absoluteYPos: number;
  _absoluteScale: number;
  _hasGroupPos: boolean;
  _groupXPos: number;
  _groupYPos: number;
  _groupScale: number;
  _layoutPrev: Node;
  _layoutNext: Node;
  _currentPaintGroup: Node;
  _paintGroupNext: Node;
  _paintGroupPrev: Node;
  _extended: ExtendedNode;
  _label: Label;
  _layoutPreference: PreferredAxis;

  constructor(newType: Type, fromNode?: Node, parentDirection?: Direction) {
    this._id = nodeCount++;

    // Appearance
    this._type = newType;
    this._style = style(this._type);
    this._rightToLeft = RIGHT_TO_LEFT;
    this._scale = 1.0;

    // Layout
    this._extents = [
      new Extent(),
      new Extent(),
      new Extent(),
      new Extent(),
    ];
    this._neighbors = [];
    for (let i = 0; i < NUM_DIRECTIONS; ++i) {
      this._neighbors.push(null);
    }
    this._parentNeighbor = null;

    this._nodeFit = Fit.LOOSE;
    this._layoutState = LayoutState.NEEDS_COMMIT;
    this._absoluteVersion = 0;
    this._absoluteDirty = true;
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;
    this._hasGroupPos = false;
    this._groupXPos = NaN;
    this._groupYPos = NaN;
    this._groupScale = NaN;
    this._layoutPrev = this;
    this._layoutNext = this;

    // Paint groups.
    this._currentPaintGroup = null;
    this._paintGroupNext = this;
    this._paintGroupPrev = this;

    // Internal data.
    this._extended = null;
    this._label = null;

    // Check if a parent node was provided.
    if (fromNode != null) {
      // A parent node was provided; this node is a child.
      fromNode.connectNode(parentDirection, this);
      this._layoutPreference = PreferredAxis.PERPENDICULAR;
    } else {
      // No parent was provided; this node is a root.
      this._layoutPreference = PreferredAxis.HORIZONTAL;
    }
  }

  neighborAt(dir: Direction): NeighborData {
    return this._neighbors[dir];
  }

  ensureNeighbor(inDirection: Direction): NeighborData {
    if (!this.neighborAt(inDirection)) {
      this._neighbors[inDirection] = new NeighborData(this, inDirection);
    }
    return this.neighborAt(inDirection);
  }

  root(): Node {
    let p: Node = this;
    while (!p.isRoot()) {
      p = p.parentNode();
    }
    return p;
  }

  toString(): string {
    return '[Node ' + this._id + ']';
  }

  x(): number {
    if (this.isRoot()) {
      return 0;
    }
    return this._parentNeighbor.xPos;
  }

  y(): number {
    if (this.isRoot()) {
      return 0;
    }
    return this._parentNeighbor.yPos;
  }

  scale(): number {
    return this._scale;
  }

  setScale(scale): scale {
    this._scale = scale;
    this.layoutWasChanged(Direction.INWARD);
  }

  setRightToLeft(val: boolean): void {
    this._rightToLeft = !!val;
    this.layoutWasChanged(Direction.INWARD);
  }

  rightToLeft(): boolean {
    return this._rightToLeft;
  }

  commitAbsolutePos(): void {
    if (
      !this._absoluteDirty &&
      !this.isRoot() &&
      this._absoluteVersion ===
        this.parentNode().findPaintGroup()._absoluteVersion
    ) {
      // console.log(this +
      //   " does not need an absolute version update, so just return.");
      return;
    }
    // console.log(this + " needs an absolute version update");
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;

    // Retrieve a stack of nodes to determine the absolute position.
    let node = this;
    const nodeList = [];
    let parentScale = 1.0;
    let scale = 1.0;
    let neededVersion;
    if (!this.isRoot()) {
      neededVersion = this.parentNode().findPaintGroup()._absoluteVersion;
    }
    while (true) {
      if (node.isRoot()) {
        this._absoluteXPos = 0;
        this._absoluteYPos = 0;
        break;
      }

      const par = node.nodeParent();
      if (!par._absoluteDirty && par._absoluteVersion === neededVersion) {
        // Just use the parent's absolute position to start.
        this._absoluteXPos = par._absoluteXPos;
        this._absoluteYPos = par._absoluteYPos;
        scale = par._absoluteScale * node.scale();
        parentScale = par._absoluteScale;
        break;
      }

      nodeList.push(reverseDirection(node.parentDirection()));
      node = node.nodeParent();
    }

    // nodeList contains [
    //     directionToThis,
    //     directionToParent,
    //     ...,
    //     directionFromRoot
    //   ];
    for (let i = nodeList.length - 1; i >= 0; --i) {
      const directionToChild = nodeList[i];

      this._absoluteXPos += node.x() * parentScale;
      this._absoluteYPos += node.y() * parentScale;

      parentScale = scale;
      if (node._absoluteDirty) {
        node._absoluteXPos = this._absoluteXPos;
        node._absoluteYPos = this._absoluteYPos;
        node._absoluteScale = scale;
        node._absoluteDirty = false;
        if (!node.isRoot()) {
          node._absoluteVersion = node
              .parentNode()
              .findPaintGroup()._absoluteVersion;
        }
      }
      scale *= node.scaleAt(directionToChild);
      node = node.nodeAt(directionToChild);
    }

    // console.log(this +
    //   " has absolute pos " + this._absoluteXPos + ", " + this._absoluteYPos);
    this._absoluteXPos += node.x() * parentScale;
    this._absoluteYPos += node.y() * parentScale;
    this._absoluteScale = scale;
    this._absoluteDirty = false;
    if (!this.isRoot()) {
      this._absoluteVersion =
              this.parentNode().findPaintGroup()._absoluteVersion;
    }
  }

  needsCommit(): boolean {
    return this._layoutState === LayoutState.NEEDS_COMMIT;
  }

  needsPosition(): boolean {
    return this.needsCommit() || !this._hasGroupPos;
  }

  absoluteX(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteXPos;
  }

  absoluteY(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteYPos;
  }

  absoluteScale(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteScale;
  }

  commitGroupPos(): void {
    if (this._hasGroupPos) {
      // console.log(this + " does not need a position update.");
      return;
    }

    // Retrieve a stack of nodes to determine the group position.
    let node = this;
    const nodeList = [];
    let parentScale = 1.0;
    let scale = 1.0;
    while (true) {
      if (node.isRoot() || node.localPaintGroup()) {
        this._groupXPos = 0;
        this._groupYPos = 0;
        break;
      }

      const par = node.nodeParent();
      if (par._groupXPos !== null) {
        // Just use the parent's position to start.
        this._groupXPos = par._groupXPos;
        this._groupYPos = par._groupYPos;
        scale = par._groupScale * node.scale();
        parentScale = par._groupScale;
        break;
      }

      nodeList.push(reverseDirection(node.parentDirection()));
      node = node.nodeParent();
    }

    // nodeList contains [
    //     directionToThis,
    //     directionToParent,
    //     ...,
    //     directionFromGroupParent
    //   ];
    for (let i = nodeList.length - 1; i >= 0; --i) {
      const directionToChild = nodeList[i];

      if (i !== nodeList.length - 1) {
        this._groupXPos += node.x() * parentScale;
        this._groupYPos += node.y() * parentScale;
      }

      parentScale = scale;
      scale *= node.scaleAt(directionToChild);
      node = node.nodeAt(directionToChild);
    }
    // console.log("Assigning scale for " + this + " to " + scale);
    this._groupScale = scale;

    if (!this.localPaintGroup()) {
      this._groupXPos += node.x() * parentScale;
      this._groupYPos += node.y() * parentScale;
    }

    this._hasGroupPos = true;
  }

  groupX(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    if (this._groupXPos === null || isNaN(this._groupXPos)) {
      throw new Error('Group X position must not be ' + this._groupXPos);
    }
    return this._groupXPos;
  }

  groupY(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    return this._groupYPos;
  }

  groupScale(): number {
    if (this.findPaintGroup().needsPosition()) {
      this.commitLayoutIteratively();
    }
    return this._groupScale;
  }

  setPosAt(inDirection: Direction, x: number, y: number): void {
    this._neighbors[inDirection].xPos = x;
    this._neighbors[inDirection].yPos = y;
  }

  removeFromLayout(inDirection: Direction): void {
    const disconnected: Node = this.nodeAt(inDirection);
    if (!disconnected) {
      return;
    }
    const layoutBefore: Node = this.findEarlierLayoutSibling(inDirection);
    const earliestDisc: Node = disconnected.findLayoutHead(disconnected);

    if (layoutBefore) {
      Node.connectLayout(layoutBefore, disconnected._layoutNext);
    } else {
      Node.connectLayout(earliestDisc._layoutPrev, disconnected._layoutNext);
    }
    Node.connectLayout(disconnected, earliestDisc);
  }

  insertIntoLayout(inDirection: Direction): void {
    const node: Node = this.nodeAt(inDirection);
    if (!node) {
      return;
    }

    const nodeHead: Node = node.findLayoutHead();

    const layoutAfter: Node = this.findLaterLayoutSibling(inDirection);
    const layoutBefore: Node = this.findEarlierLayoutSibling(inDirection);

    const nodeTail: Node = node;
    // console.log(this + ".connectNode(" + nameDirection(inDirection) +
    //   ", " + node + ") layoutBefore=" +
    //   layoutBefore + " layoutAfter=" +
    //   layoutAfter + " nodeHead=" + nodeHead);

    if (layoutBefore) {
      Node.connectLayout(layoutBefore, nodeHead);
    } else if (layoutAfter) {
      Node.connectLayout(layoutAfter.findLayoutHead()._layoutPrev, nodeHead);
    } else {
      Node.connectLayout(this._layoutPrev, nodeHead);
    }

    if (layoutAfter) {
      Node.connectLayout(nodeTail, layoutAfter.findLayoutHead());
    } else {
      Node.connectLayout(nodeTail, this);
    }
  }

  setPaintGroup(paintGroup: boolean): void {
    paintGroup = !!paintGroup;
    if (this.localPaintGroup() === paintGroup) {
      return;
    }
    this.ensureExtended();

    if (paintGroup) {
      // console.log(this + " is becoming a paint group.");
      this._extended.isPaintGroup = true;

      if (this.isRoot()) {
        // Do nothing; this node was already an implied paint group.
      } else {
        this.parentNode().removeFromLayout(
            reverseDirection(this.parentDirection()),
        );
        const paintGroupFirst = this.findFirstPaintGroup();
        // console.log("First paint group of " +
        //   this +
        //   " is " +
        //   paintGroupFirst);
        const parentsPaintGroup = this.parentNode().findPaintGroup();
        // console.log("Parent paint group of " +
        //   this +
        //   " is " +
        //   parentsPaintGroup);

        Node.connectPaintGroup(
            parentsPaintGroup._paintGroupPrev,
            paintGroupFirst,
        );
        Node.connectPaintGroup(this, parentsPaintGroup);
      }

      this.layoutChanged();
      for (let n = this._layoutNext; n !== this; n = n._layoutNext) {
        n._currentPaintGroup = this;
      }
      return;
    }

    this.thaw();
    this._extended.isPaintGroup = false;

    // console.log(this + " is no longer a paint group.");
    if (!this.isRoot()) {
      const paintGroupLast = this.findLastPaintGroup();
      this.parentNode().insertIntoLayout(
          reverseDirection(this.parentDirection()),
      );

      // Remove the paint group's entry in the parent.
      // console.log("Node " + this +
      //   " is not a root, so adding paint groups.");
      if (paintGroupLast !== this) {
        Node.connectPaintGroup(paintGroupLast, this._paintGroupNext);
      } else {
        Node.connectPaintGroup(this._paintGroupPrev, this._paintGroupNext);
      }
      this._paintGroupNext = this;
      this._paintGroupPrev = this;

      const pg = this.parentNode().findPaintGroup();
      for (let n = pg._layoutNext; n !== pg; n = n._layoutNext) {
        n._currentPaintGroup = pg;
      }
    } else {
      // Retain the paint groups for this implied paint group.
    }

    this.layoutChanged();
  }

  findFirstPaintGroup(): Node {
    let candidate: Node = this._layoutNext;
    while (candidate !== this) {
      if (candidate.localPaintGroup()) {
        break;
      }
      candidate = candidate._layoutNext;
    }
    return candidate;
  }

  findLastPaintGroup(): Node {
    let candidate: Node = this._layoutPrev;
    while (candidate !== this) {
      if (candidate.localPaintGroup()) {
        break;
      }
      candidate = candidate._layoutPrev;
    }
    return candidate;
  }

  ensureExtended(): ExtendedNode {
    if (!this._extended) {
      // console.log(new Error("Extending"));
      this._extended = new ExtendedNode();
    }
    return this._extended;
  }

  markDirty(): void {
    // console.log(this + " marked dirty");
    this.ensureExtended();
    this._extended.dirty = true;
    this._extended.commitLayoutFunc = null;
    for (const wid in this._extended.windowPaintGroup) {
      if (Object.prototype.hasOwnProperty.call(
          this.extended.windowPaintGroup,
          wid)) {
        this._extended.windowPaintGroup[wid] = null;
      }
    }
  }

  isDirty(): boolean {
    return this._extended && this._extended.dirty;
  }

  painter(window: Window): NodePainter {
    this.ensureExtended();
    if (!window) {
      throw new Error(
          'A window must be provided for a NodePainter to be selected',
      );
    }
    return this._extended.windowPainter[window.id()];
  }

  findPaintGroup(): Node {
    if (!this._currentPaintGroup) {
      let node: Node = this;
      while (!node.isRoot()) {
        if (node.localPaintGroup()) {
          break;
        }
        if (node._currentPaintGroup) {
          this._currentPaintGroup = node._currentPaintGroup;
          return this._currentPaintGroup;
        }
        node = node.parentNode();
      }
      this._currentPaintGroup = node;
    } else {
      // console.log("Returning cached paint group " +
      //   this._currentPaintGroup._id +
      //   " for node " +
      //   this._id);
    }
    return this._currentPaintGroup;
  }

  localPaintGroup(): boolean {
    return !!this._extended && !!this._extended.isPaintGroup;
  }

  backdropColor(): Color {
    let node: Node = this;
    if (node.isSelected()) {
      return node.blockStyle().backgroundColor;
    }
    return node.blockStyle().selectedBackgroundColor;
    while (true) {
      if (node.isRoot()) {
        return BACKGROUND_COLOR;
      }
      if (node.parentDirection() === OUTWARD) {
        if (node.isSelected()) {
          return node.parentNode().blockStyle().backgroundColor;
        }
        return node.parentNode().blockStyle().selectedBackgroundColor;
      }
      node = node.parentNode();
    }
    throw new Error('Unreachable');
  }

  setClickListener(listener: Function, thisArg?: object): void {
    if (!listener) {
      if (this._extended) {
        this._extended.clickListener = null;
        this._extended.clickListenerThisArg = null;
      }
      return;
    }
    if (!thisArg) {
      thisArg = this;
    }
    this.ensureExtended();
    this._extended.clickListener = listener;
    this._extended.clickListenerThisArg = thisArg;
    // console.log("Set click listener for node " + this._id);
  }

  setChangeListener(listener: Function, thisArg?: object): void {
    if (!listener) {
      if (this._extended) {
        this._extended.changeListener = null;
        this._extended.changeListenerThisArg = null;
      }
      return;
    }
    if (!thisArg) {
      thisArg = this;
    }
    this.ensureExtended();
    this._extended.changeListener = listener;
    this._extended.changeListenerThisArg = thisArg;
    // console.log("Set change listener for node " + this._id);
  }

  isClickable(): boolean {
    const hasLabel =
      this._label && !isNaN(this._label._x) && this._label.editable();
    return (
      this.type() === Type.SLIDER ||
      this.hasClickListener() ||
      !this.ignoresMouse() ||
      hasLabel
    );
  }

  setIgnoreMouse(value: boolean): void {
    if (!value && !this._extended) {
      return;
    }
    this.ensureExtended();
    this._extended.ignoresMouse = value;
  }

  ignoresMouse(): boolean {
    if (!this._extended) {
      return true;
    }
    return this._extended.ignoresMouse;
  }

  hasClickListener(): boolean {
    return this._extended && this._extended.clickListener != null;
  }

  hasChangeListener(): boolean {
    return this._extended && this._extended.changeListener != null;
  }

  valueChanged(...args): any {
    // Invoke the listener.
    if (!this.hasChangeListener()) {
      return;
    }
    return this._extended.changeListener.apply(
        this._extended.changeListenerThisArg,
        ...args,
    );
  }

  click(viewport: Viewport): any {
    // Invoke the click listener.
    if (!this.hasClickListener()) {
      return;
    }
    return this._extended.clickListener.call(
        this._extended.clickListenerThisArg,
        viewport,
    );
  }

  setKeyListener(listener: Function, thisArg?: object): void {
    if (!listener) {
      if (this._extended) {
        this._extended.keyListener = null;
        this._extended.keyListenerThisArg = null;
      }
      return;
    }
    if (!thisArg) {
      thisArg = this;
    }
    if (!this._extended) {
      this._extended = new ExtendedNode();
    }
    this._extended.keyListener = listener;
    this._extended.keyListenerThisArg = thisArg;
  }

  hasKeyListener(): boolean {
    return this._extended && this._extended.keyListener != null;
  }

  key(...args): any {
    // Invoke the key listener.
    if (!this.hasKeyListener()) {
      return;
    }
    return this._extended.keyListener.apply(
        this._extended.keyListenerThisArg,
        ...args,
    );
  }

  nodeFit(): Fit {
    return this._nodeFit;
  }

  setNodeFit(nodeFit: Fit): void {
    this._nodeFit = nodeFit;
    this.layoutWasChanged(Direction.INWARD);
  }

  isRoot(): boolean {
    return !this._parentNeighbor;
  }

  parentDirection(): Direction {
    if (this.isRoot()) {
      return Direction.NULL;
    }
    return reverseDirection(this._parentNeighbor.direction);
  }

  nodeParent(): Node {
    if (this.isRoot()) {
      throw createException(NODE_IS_ROOT);
    }
    return this._parentNeighbor.owner;
  }

  parentNode(): Node {
    return this.nodeParent();
  }

  parent(): Node {
    return this.nodeParent();
  }

  hasNode(atDirection: Direction): boolean {
    if (atDirection == Direction.NULL) {
      return false;
    }
    if (this._neighbors[atDirection] && this._neighbors[atDirection].node) {
      return true;
    }
    return !this.isRoot() && this.parentDirection() === atDirection;
  }

  hasNodes(axis: Axis): [Direction, Direction] {
    if (axis === Axis.NULL) {
      throw createException(BAD_AXIS, axis);
    }

    const result: [Direction, Direction] = [Direction.NULL, Direction.NULL];

    if (this.hasNode(getNegativeDirection(axis))) {
      result[0] = getNegativeDirection(axis);
    }
    if (this.hasNode(getPositiveDirection(axis))) {
      result[1] = getPositiveDirection(axis);
    }

    return result;
  }

  hasChildAt(direction: Direction): boolean {
    return this.hasNode(direction) && this.parentDirection() !== direction;
  }

  hasChild(direction: Direction): boolean {
    return this.hasChildAt(direction);
  }

  hasAnyNodes(): boolean {
    return (
      this.hasChildAt(Direction.DOWNWARD) ||
      this.hasChildAt(Direction.UPWARD) ||
      this.hasChildAt(Direction.FORWARD) ||
      this.hasChildAt(Direction.BACKWARD) ||
      this.hasChildAt(Direction.INWARD)
    );
  }

  dumpPaintGroups(): Node[] {
    const pgs: Node[] = [];
    let pg: Node = this;
    do {
      pg = pg._paintGroupNext;
      pgs.push(pg);
    } while (pg !== this);
    return pgs;
  }

  nodeAt(atDirection: Direction): Node {
    const n: NeighborData = this._neighbors[atDirection];
    if (!n) {
      if (this._parentNeighbor && this.parentDirection() === atDirection) {
        return this._parentNeighbor.owner;
      }
      return null;
    }
    return n.node;
  }

  spawnNode(spawnDirection: Direction, newType: Type): Node {
    const created = this.connectNode(spawnDirection, new Node(newType));
    created.setLayoutPreference(PreferredAxis.PERPENDICULAR);

    // Use the node fitting of the parent.
    created.setNodeFit(this.nodeFit());

    return created;
  }

  static connectLayout = function(a: Node, b: Node): void {
    // console.log("connecting " +  a._id + " to " + b._id);
    a._layoutNext = b;
    b._layoutPrev = a;
  };

  static connectPaintGroup = function(a: Node, b: Node): void {
    a._paintGroupNext = b;
    b._paintGroupPrev = a;
    // console.log("Connecting paint groups " + a + " to " + b);
  };

  connectNode(inDirection: Direction, node: Node): Node {
    // console.log("Connecting " + node + " to " + this + " in the " +
    //   nameDirection(inDirection) + " direction.");

    // Ensure the node can be connected in the given direction.
    if (inDirection == Direction.OUTWARD) {
      throw new Error(
          'By rule, nodes cannot be spawned in the outward direction.',
      );
    }
    if (inDirection == Direction.NULL) {
      throw new Error('Nodes cannot be spawned in the null node direction.');
    }
    if (inDirection == this.parentDirection()) {
      throw new Error(
          'Cannot connect a node in the parent\'s direction (' +
          nameDirection(inDirection) +
          ')',
      );
    }
    if (this.hasNode(inDirection)) {
      throw new Error(
          'Cannot connect a node in the already occupied ' +
          nameDirection(inDirection) +
          ' direction.',
      );
    }
    if (this.type() == Type.SLIDER) {
      throw new Error('Sliders cannot have child nodes.');
    }
    if (this.type() == Type.SCENE && inDirection == Direction.INWARD) {
      throw new Error('Scenes cannot have inward nodes.');
    }
    if (node.parentDirection() !== Direction.NULL) {
      throw new Error('Node to connect must not have a parent.');
    }
    if (node.hasNode(reverseDirection(inDirection))) {
      throw new Error(
          'Node to connect must not have a node in the connecting direction.',
      );
    }

    // Connect the node.
    const neighbor = this.ensureNeighbor(inDirection);
    neighbor.node = node;
    node.assignParent(this, inDirection);

    // Allow alignments to be set before children are spawned.
    if (neighbor.alignmentMode == Alignment.NULL) {
      neighbor.alignmentMode = Alignment.NONE;
    }

    if (node.localPaintGroup()) {
      const pg = this.findPaintGroup();
      const paintGroupLast = pg._paintGroupPrev;
      const nodeFirst = node._paintGroupNext;
      Node.connectPaintGroup(paintGroupLast, nodeFirst);
      Node.connectPaintGroup(node, pg);
    } else {
      this.insertIntoLayout(inDirection);
      if (node._paintGroupNext !== node) {
        const pg = this.findPaintGroup();
        const paintGroupLast = pg._paintGroupPrev;
        const nodeFirst = node._paintGroupNext;
        const nodeLast = node._paintGroupPrev;
        Node.connectPaintGroup(paintGroupLast, nodeFirst);
        Node.connectPaintGroup(nodeLast, pg);
        node._paintGroupPrev = node;
        node._paintGroupNext = node;
      }
    }

    this.layoutWasChanged(inDirection);

    return node;
  }

  disconnectNode(inDirection?: Direction): Node {
    if (arguments.length === 0) {
      if (this.isRoot()) {
        throw new Error('Cannot disconnect a root node.');
      }
      return this.parentNode().disconnectNode(
          reverseDirection(this.parentDirection()),
      );
    }
    if (!this.hasNode(inDirection)) {
      return;
    }
    // Disconnect the node.
    const neighbor = this._neighbors[inDirection];
    const disconnected = neighbor.node;

    if (!disconnected.localPaintGroup()) {
      this.removeFromLayout(inDirection);
    }
    const paintGroupFirst = disconnected.findFirstPaintGroup();
    Node.connectPaintGroup(
        paintGroupFirst._paintGroupPrev,
        disconnected._paintGroupNext,
    );
    Node.connectPaintGroup(disconnected, paintGroupFirst);

    neighbor.node = null;
    disconnected.assignParent(null);

    if (disconnected._layoutPreference === PreferredAxis.PARENT) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected._layoutPreference = PreferredAxis.VERTICAL;
      } else {
        disconnected._layoutPreference = PreferredAxis.HORIZONTAL;
      }
    } else if (disconnected._layoutPreference === PreferredAxis.PERPENDICULAR) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected._layoutPreference = PreferredAxis.HORIZONTAL;
      } else {
        disconnected._layoutPreference = PreferredAxis.VERTICAL;
      }
    }

    this.layoutWasChanged(inDirection);

    return disconnected;
  }

  eraseNode(givenDirection: Direction): void {
    if (!this.hasNode(givenDirection)) {
      return;
    }
    if (!this.isRoot() && givenDirection == this.parentDirection()) {
      throw createException(CANNOT_AFFECT_PARENT);
    }
    this.disconnectNode(givenDirection);
  }

  findEarlierLayoutSibling(inDirection: Direction): Node {
    let layoutBefore;
    const dirs = this.layoutOrder();
    let pastDir = false;
    for (let i = dirs.length - 1; i >= 0; --i) {
      const dir = dirs[i];
      if (dir === inDirection) {
        pastDir = true;
        continue;
      }
      if (!pastDir) {
        continue;
      }
      if (dir === this.parentDirection()) {
        continue;
      }
      if (this.hasNode(dir)) {
        const candidate = this.nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutBefore = candidate;
          break;
        }
      }
    }
    return layoutBefore;
  }

  findLaterLayoutSibling(inDirection: Direction): Node {
    let layoutAfter;
    const dirs = this.layoutOrder();
    let pastDir = false;
    for (let i = 0; i < dirs.length; ++i) {
      const dir = dirs[i];
      // console.log(nameDirection(dir) + " pastDir=" + pastDir);
      if (dir === inDirection) {
        pastDir = true;
        continue;
      }
      if (!pastDir) {
        continue;
      }
      if (dir === this.parentDirection()) {
        continue;
      }
      if (this.hasNode(dir)) {
        const candidate = this.nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutAfter = candidate;
          break;
        }
      }
    }
    return layoutAfter;
  }

  findLayoutHead(excludeThisNode?: Node): Node {
    let deeplyLinked = this;
    let foundOne;
    while (true) {
      foundOne = false;
      const dirs = deeplyLinked.layoutOrder();
      for (let i = 0; i < dirs.length; ++i) {
        const dir = dirs[i];
        const candidate = deeplyLinked.nodeAt(dir);
        if (
          candidate &&
          candidate != excludeThisNode &&
          deeplyLinked.parentDirection() !== dir &&
          !candidate.localPaintGroup()
        ) {
          deeplyLinked = candidate;
          foundOne = true;
          break;
        }
      }
      if (!foundOne) {
        break;
      }
    }
    return deeplyLinked;
  }

  eachChild(visitor: Function, visitorThisArg?: object): void {
    const dirs = this.layoutOrder();
    for (let i = 0; i < dirs.length; ++i) {
      const dir = dirs[i];
      if (!this.isRoot() && dir === this.parentDirection()) {
        continue;
      }
      const node = this.nodeAt(dir);
      if (node) {
        visitor.call(visitorThisArg, node, dir);
      }
    }
  }

  scaleAt(direction: Direction): number {
    return this.nodeAt(direction).scale();
  }

  lineLengthAt(direction: Direction): number {
    if (!this.hasNode(direction)) {
      return 0;
    }
    return this._neighbors[direction].lineLength;
  }

  extentsAt(atDirection: Direction): Extent {
    if (atDirection === Direction.NULL) {
      throw createException(BAD_NODE_DIRECTION);
    }
    return this._extents[atDirection - Direction.DOWNWARD];
  }

  extentOffsetAt(atDirection: Direction): number {
    return this.extentsAt(atDirection).offset();
  }

  setExtentOffsetAt(atDirection: Direction, offset: number): void {
    this.extentsAt(atDirection).setOffset(offset);
  }

  extentSize(outPos?: Size): Size {
    if (!outPos) {
      outPos = new Size();
    }

    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    outPos.setHeight(this.extentsAt(Direction.FORWARD).boundingValues()[0]);

    // The vertical extents have length in the vertical direction.
    outPos.setWidth(this.extentsAt(Direction.DOWNWARD).boundingValues()[0]);

    // console.log("Extent Size = " + outPos.width() + " " + outPos.height());

    return outPos;
  }

  setLayoutPreference(given: PreferredAxis): void {
    const b =
      this.parentDirection() === Direction.BACKWARD ?
        null :
        this.nodeAt(Direction.BACKWARD);
    const f =
      this.parentDirection() === Direction.FORWARD ?
        null :
        this.nodeAt(Direction.FORWARD);
    const u =
      this.parentDirection() === Direction.UPWARD ?
        null :
        this.nodeAt(Direction.UPWARD);
    const d =
      this.parentDirection() === Direction.DOWNWARD ?
        null :
        this.nodeAt(Direction.DOWNWARD);
    let firstHorz = b || f;
    if (firstHorz) {
      firstHorz = firstHorz.findLayoutHead();
    }
    const lastHorz = f || b;
    let firstVert = d || u;
    if (firstVert) {
      firstVert = firstVert.findLayoutHead();
    }
    const lastVert = u || d;

    const horzToVert = function() {
      // console.log("horzToVert exec");
      if (!firstHorz || !firstVert) {
        return;
      }
      const aa = firstHorz._layoutPrev;
      const dd = lastVert._layoutNext;
      Node.connectLayout(aa, firstVert);
      Node.connectLayout(lastHorz, dd);
      Node.connectLayout(lastVert, firstHorz);
    };
    const vertToHorz = function() {
      // console.log("vertToHorz exec");
      if (!firstHorz || !firstVert) {
        return;
      }
      const aa = firstHorz._layoutPrev;
      const dd = lastVert._layoutNext;
      // console.log("aa=" + aa._id);
      // console.log("dd=" + dd._id);
      // console.log("firstHorz=" + firstHorz._id);
      // console.log("lastVert=" + lastVert._id);
      // console.log("lastHorz=" + lastHorz._id);
      // console.log("firstVert=" + firstVert._id);
      Node.connectLayout(aa, firstHorz);
      Node.connectLayout(lastVert, dd);
      Node.connectLayout(lastHorz, firstVert);
    };
    if (this.isRoot()) {
      if (
        given !== PreferredAxis.VERTICAL &&
        given !== PreferredAxis.HORIZONTAL
      ) {
        throw new Error(
            'Unallowed layout preference: ' +
            nameLayoutPreference(given),
        );
      }
      if (this._layoutPreference === given) {
        return;
      }
      if (given === PreferredAxis.VERTICAL) {
        // PREFER_HORIZONTAL_AXIS -> PREFER_VERTICAL_AXIS
        horzToVert.call(this);
      } else {
        // PREFER_VERTICAL_AXIS -> PREFER_HORIZONTAL_AXIS
        vertToHorz.call(this);
      }
      this._layoutPreference = given;
      return;
    }

    const curCanon = this.canonicalLayoutPreference();
    this._layoutPreference = given;
    const newCanon = this.canonicalLayoutPreference();
    if (curCanon === newCanon) {
      return;
    }

    const paxis = getDirectionAxis(this.parentDirection());
    if (curCanon === PreferredAxis.PARENT) {
      if (paxis === Axis.HORIZONTAL) {
        horzToVert.call(this);
      } else {
        vertToHorz.call(this);
      }
    } else {
      if (paxis === Axis.VERTICAL) {
        vertToHorz.call(this);
      } else {
        horzToVert.call(this);
      }
    }

    this.layoutWasChanged(Direction.INWARD);
  }

  showNodeInCamera(cam: Camera): void {
    this.commitLayoutIteratively();
    const bodySize = this.absoluteSize();

    const bodyRect = new Rect(
        this.absoluteX(),
        this.absoluteY(),
        bodySize[0],
        bodySize[1],
    );
    // if(cam.ContainsAll(bodyRect)) {
    // return;
    // }

    const nodeScale = this.absoluteScale();

    const camScale = cam.scale();
    const screenWidth = cam.width();
    const screenHeight = cam.height();

    let scaleAdjustment;
    const widthIsBigger =
      screenWidth / (bodySize[0] * nodeScale) <
      screenHeight / (bodySize[1] * nodeScale);
    if (widthIsBigger) {
      scaleAdjustment = screenWidth / (bodySize[0] * nodeScale);
    } else {
      scaleAdjustment = screenHeight / (bodySize[1] * nodeScale);
    }
    if (scaleAdjustment > camScale) {
      scaleAdjustment = camScale;
    } else {
      cam.setScale(scaleAdjustment);
    }

    const ax = this.absoluteX();
    const ay = this.absoluteY();
    cam.setOrigin(
        -ax + screenWidth / (scaleAdjustment * 2),
        -ay + screenHeight / (scaleAdjustment * 2),
    );
  }

  showInCamera(cam: Camera, onlyScaleIfNecessary: boolean): void {
    // console.log("Showing node in camera");
    this.commitLayoutIteratively();
    const bodySize = this.extentSize();
    const nodeScale = this.absoluteScale();
    const camScale = cam.scale();
    const screenWidth = cam.width();
    const screenHeight = cam.height();
    if (Number.isNaN(screenWidth) || Number.isNaN(screenHeight)) {
      throw new Error(
          'Camera size must be set before a node can be shown in it.',
      );
    }

    // Adjust camera scale.
    let scaleAdjustment;
    const widthIsBigger =
      screenWidth / bodySize[0] < screenHeight / bodySize[1];
    if (widthIsBigger) {
      scaleAdjustment = screenWidth / bodySize[0];
    } else {
      scaleAdjustment = screenHeight / bodySize[1];
    }
    const scaleMaxed = scaleAdjustment > NATURAL_VIEWPORT_SCALE;
    if (scaleMaxed) {
      scaleAdjustment = NATURAL_VIEWPORT_SCALE;
    }
    if (onlyScaleIfNecessary && scaleAdjustment / nodeScale > camScale) {
      scaleAdjustment = camScale;
    } else {
      cam.setScale(scaleAdjustment / nodeScale);
    }

    // Get node extents.
    let x;
    let y;
    const bv = [null, null, null];
    this.extentsAt(Direction.BACKWARD).boundingValues(bv);
    x = bv[2] * nodeScale;
    this.extentsAt(Direction.UPWARD).boundingValues(bv);
    y = bv[2] * nodeScale;

    if (widthIsBigger || scaleMaxed) {
      y += screenHeight / (cam.scale() * 2) - (nodeScale * bodySize[1]) / 2;
    }
    if (!widthIsBigger || scaleMaxed) {
      x += screenWidth / (cam.scale() * 2) - (nodeScale * bodySize[0]) / 2;
    }

    // Move camera into position.
    const ax = this.absoluteX();
    const ay = this.absoluteY();
    cam.setOrigin(x - ax, y - ay);
  }

  setNodeAlignmentMode(
      inDirection: Direction | Alignment,
      newAlignmentMode?: Aligment, ...args
  ): void {
    if (args.length === 1) {
      return this.parentNode().setNodeAlignmentMode(
          reverseDirection(this.parentDirection()),
          args[0],
      );
    }
    this.ensureNeighbor(inDirection).alignmentMode = newAlignmentMode;
    // console.log(nameNodeAlignment(newAlignmentMode));
    this.layoutWasChanged(inDirection);
  }

  nodeAlignmentMode(inDirection: Direction): Alignment {
    if (this._neighbors[inDirection]) {
      return this._neighbors[inDirection].alignmentMode;
    }
    return Alignment.NULL;
  }

  setAxisOverlap(
      inDirection: Direction | AxisOverlap,
      newAxisOverlap?: AxisOverlap, ...args
  ): void {
    if (args.length === 1) {
      return this.parentNode().setAxisOverlap(
          reverseDirection(this.parentDirection()),
          args[0],
      );
    }
    this.ensureNeighbor(inDirection).allowAxisOverlap = newAxisOverlap;
    this.layoutWasChanged(inDirection);
  }

  axisOverlap(inDirection?: Direction): AxisOverlap {
    if (inDirection === undefined) {
      return this.parentNode().axisOverlap(
          reverseDirection(this.parentDirection()),
      );
    }
    if (this._neighbors[inDirection]) {
      return this._neighbors[inDirection].allowAxisOverlap;
    }
    return AxisOverlap.NULL;
  }

  type(): Type {
    return this._type;
  }

  setType(newType: Type): void {
    this._type = newType;
    this._style = style(this._type);
    this.layoutWasChanged(Direction.INWARD);
  }

  value(): any {
    return this._extended && this._extended.value;
  }

  setValue(newValue: any, report?: boolean): void {
    this.ensureExtended();
    // console.log("Setting value to ", newValue);
    if (this._extended.value === newValue) {
      return;
    }
    this._extended.value = newValue;
    if (arguments.length === 1 || report) {
      this.valueChanged();
    }
  }

  scene(): Scene {
    return this._extended && this._extended.scene;
  }

  setScene(scene: Scene): void {
    this.ensureExtended().scene = scene;
    this.layoutWasChanged(Direction.INWARD);
  }

  typeAt(direction: Direction): Type {
    if (!this.hasNode(direction)) {
      return Type.NULL;
    }
    return this.nodeAt(direction).type();
  }

  label(): string {
    if (!this._label) {
      return null;
    }
    return this._label.text();
  }

  glyphCount(counts: object, pagesPerTexture: number): number {
    if (!this._label) {
      return 0;
    }
    return this._label.glyphCount(counts, pagesPerTexture);
  }

  realLabel(): Label {
    return this._label;
  }

  setLabel(text: string, font: Font): void {
    if (!font) {
      font = defaultFont();
    }
    if (!this._label) {
      this._label = new Label(font);
    }
    this._label.setText(text);
    this.layoutWasChanged();
  }

  blockStyle(): any {
    return this._style;
  }

  setBlockStyle(style: object): void {
    if (this._style == style) {
      // Ignore idempotent style changes.
      return;
    }
    this._style = style;
    this.layoutWasChanged(Direction.INWARD);
  }

  isSelectedAt(direction: Direction): boolean {
    if (!this.hasNode(direction)) {
      return false;
    }
    return this.nodeAt(direction).isSelected();
  }

  sizeIn(direction: Direction, bodySize?: Size): number {
    const rv = this.size(bodySize);
    if (isVerticalDirection(direction)) {
      return rv.height() / 2;
    } else {
      return rv.width() / 2;
    }
  }

  borderThickness(): number {
    return this.blockStyle().borderThickness;
  }

  size(bodySize?: Size): Size {
    bodySize = this.sizeWithoutPadding(bodySize);
    bodySize[0] += 2 * this.horizontalPadding() + 2 * this.borderThickness();
    bodySize[1] += 2 * this.verticalPadding() + 2 * this.borderThickness();
    // console.log("Calculated " + nameNodeType(this.type()) +
    //   " node size of (" + bodySize[0] + ", " + bodySize[1] + ")");
    return bodySize;
  }

  absoluteSize(bodySize?: Size): Size {
    return this.size(bodySize).scaled(this.absoluteScale());
  }

  groupSize(bodySize?: Size): Size {
    bodySize = this.size(bodySize);
    bodySize.scale(this.groupScale());
    return bodySize;
  }

  assignParent(fromNode?: Node, parentDirection?: Direction): void {
    if (arguments.length === 0 || !fromNode) {
      // Clearing the parent.
      this._parentNeighbor = null;
      return;
    }
    this._parentNeighbor = fromNode.neighborAt(parentDirection);
    if (!this._parentNeighbor) {
      throw new Error('Parent neighbor must be found when being assigned.');
    }
  }

  isSelected(): boolean {
    return this._extended && this._extended.selected;
  }

  setSelected(selected: boolean): void {
    // console.log(new Error("setSelected(" + selected + ")"));
    this.ensureExtended().selected = selected;
  }

  horizontalPadding(): number {
    return this.blockStyle().horizontalPadding;
  }

  verticalPadding(): number {
    return this.blockStyle().verticalPadding;
  }

  verticalSeparation(direction: Direction): number {
    if (this.type() == Type.BUD && this.typeAt(direction) == Type.BUD) {
      return (
        this.blockStyle().verticalSeparation +
        BUD_TO_BUD_VERTICAL_SEPARATION
      );
    }
    return this.blockStyle().verticalSeparation;
  }

  horizontalSeparation(direction: Direction): number {
    const style = this.blockStyle();

    if (
      this.hasNode(direction) &&
      this.nodeAt(direction).type() == Type.BUD &&
      !this.nodeAt(direction).hasAnyNodes()
    ) {
      return BUD_LEAF_SEPARATION * style.horizontalSeparation;
    }
    return style.horizontalSeparation;
  }

  inNodeBody(
      x: number,
      y: number,
      userScale: number,
      bodySize?: Size,
  ): boolean {
    const s = this.size(bodySize);
    const ax = this.absoluteX();
    const ay = this.absoluteY();
    const aScale = this.absoluteScale();
    if (x < userScale * ax - (userScale * aScale * s.width()) / 2) {
      // console.log("Given coords are outside this node's body.
      //   (Horizontal minimum exceeds X-coord)");
      return false;
    }
    if (x > userScale * ax + (userScale * aScale * s.width()) / 2) {
      // console.log("Given coords are outside this node's body.
      //   (X-coord exceeds horizontal maximum)");
      return false;
    }
    if (y < userScale * ay - (userScale * aScale * s.height()) / 2) {
      // console.log("Given coords are outside this node's body.
      //   (Vertical minimum exceeds Y-coord)");
      return false;
    }
    if (y > userScale * ay + (userScale * aScale * s.height()) / 2) {
      // console.log("Given coords are outside this node's body.
      //   (Y-coord exceeds vertical maximum)");
      return false;
    }
    // console.log("Within node body" + this);
    return true;
  }

  inNodeExtents(
      x: number,
      y: number,
      userScale: number,
      extentSize?: Size,
  ): boolean {
    const ax = this.absoluteX();
    const ay = this.absoluteY();
    const aScale = this.absoluteScale();
    extentSize = this.extentSize(extentSize);

    // console.log("Checking node extent of size (" + extentSize[0] + ", " +
    //   extentSize[1] + ") at absolute X, Y origin of " + ax + ", " + ay");
    if (aScale != 1) {
      // console.log("Node absolute scale is " + aScale);
    }
    if (userScale != 1) {
      // console.log("User scale is " + userScale);
    }
    // console.log("Position to test is (" + x + ", " + y + ")");

    // this.dump();
    const forwardMin =
      userScale * ax -
      userScale * aScale * this.extentOffsetAt(Direction.DOWNWARD);
    if (x < forwardMin) {
      // console.log("Test X value of " + x +
      //   " is behind horizontal node minimum of " + forwardMin + ".");
      return false;
    }
    const forwardMax =
      userScale * ax -
      userScale * aScale * this.extentOffsetAt(Direction.DOWNWARD) +
      userScale * aScale * extentSize.width();
    // console.log("ForwardMax = " + forwardMax + " = ax=" +
    //   this.absoluteX() + " - offset=" + this.extentOffsetAt(DOWNWARD) +
    //   " + width=" + extentSize.width());
    if (x > forwardMax) {
      // console.log("Test X value of " + x +
      //   " is ahead of horizontal node maximum of " + forwardMax + ".");
      return false;
    }
    const vertMin =
      userScale * ay -
      userScale * aScale * this.extentOffsetAt(Direction.FORWARD);
    if (y < vertMin) {
      // console.log("Test Y value of " + y +
      //   " is above node vertical minimum of " + vertMin + ".");
      return false;
    }
    const vertMax =
      userScale * ay -
      userScale * aScale * this.extentOffsetAt(Direction.FORWARD) +
      userScale * aScale * extentSize.height();
    if (y > vertMax) {
      // console.log("Test Y value of " + y +
      //   " is beneath node vertical maximum of " + vertMax + ".");
      return false;
    }
    // console.log("Test value is in within node extent.");
    return true;
  }

  nodeUnderCoords(x: number, y: number, userScale?: number): Node {
    // console.log("nodeUnderCoords: " + x + ", " + y)
    if (userScale === undefined) {
      userScale = 1;
    }

    const extentSize: Size = new Size();
    const candidates: Node[] = [this];

    const addCandidate = function(node: Node, direction: Direction) {
      if (direction !== undefined) {
        if (!node.hasChildAt(direction)) {
          return;
        }
        node = node.nodeAt(direction);
      }
      if (node == null) {
        return;
      }
      candidates.push(node);
    };

    const FORCE_SELECT_PRIOR = null;
    while (candidates.length > 0) {
      const candidate = candidates[candidates.length - 1];
      // console.log("Checking node " +
      //   candidate._id + " = " + candidate.label());

      if (candidate === FORCE_SELECT_PRIOR) {
        candidates.pop();
        return candidates.pop();
      }

      if (candidate.inNodeBody(x, y, userScale, extentSize)) {
        // console.log("Click is in node body");
        if (candidate.hasNode(Direction.INWARD)) {
          if (
            candidate
                .nodeAt(Direction.INWARD)
                .inNodeExtents(x, y, userScale, extentSize)
          ) {
            // console.log("Testing inward node");
            candidates.push(FORCE_SELECT_PRIOR);
            candidates.push(candidate.nodeAt(Direction.INWARD));
            continue;
          } else {
            // console.log("Click not in inward extents");
          }
        }

        // Found the node.
        // console.log("Mouse under node " + candidate._id);
        return candidate;
      }
      // Not within this node, so remove it as a candidate.
      candidates.pop();

      // Test if the click is within any child.
      if (!candidate.inNodeExtents(x, y, userScale, extentSize)) {
        // Nope, so continue the search.
        // console.log("Click is not in node extents.");
        continue;
      }
      // console.log("Click is in node extent");

      // It is potentially within some child, so search the children.
      if (
        Math.abs(y - userScale * candidate.absoluteY()) >
        Math.abs(x - userScale * candidate.absoluteX())
      ) {
        // Y extent is greater than X extent.
        if (userScale * candidate.absoluteX() > x) {
          addCandidate(candidate, Direction.BACKWARD);
          addCandidate(candidate, Direction.FORWARD);
        } else {
          addCandidate(candidate, Direction.FORWARD);
          addCandidate(candidate, Direction.BACKWARD);
        }
        if (userScale * candidate.absoluteY() > y) {
          addCandidate(candidate, Direction.UPWARD);
          addCandidate(candidate, Direction.DOWNWARD);
        } else {
          addCandidate(candidate, Direction.DOWNWARD);
          addCandidate(candidate, Direction.UPWARD);
        }
      } else {
        // X extent is greater than Y extent.
        if (userScale * candidate.absoluteY() > y) {
          addCandidate(candidate, Direction.UPWARD);
          addCandidate(candidate, Direction.DOWNWARD);
        } else {
          addCandidate(candidate, Direction.DOWNWARD);
          addCandidate(candidate, Direction.UPWARD);
        }
        if (userScale * candidate.absoluteX() > x) {
          addCandidate(candidate, Direction.BACKWARD);
          addCandidate(candidate, Direction.FORWARD);
        } else {
          addCandidate(candidate, Direction.FORWARD);
          addCandidate(candidate, Direction.BACKWARD);
        }
      }
    }

    // console.log("Found nothing.");
    return null;
  }

  sizeWithoutPadding(bodySize?: Size): Size {
    // Find the size of this node's drawing area.
    const style = this.blockStyle();
    if (this._label && !this._label.isEmpty()) {
      if (!bodySize) {
        // console.log(new Error("Creating size"));
        bodySize = new Size();
      }
      const scaling = style.fontSize / this._label.font().fontSize();
      bodySize[0] = this._label.width() * scaling;
      bodySize[1] = this._label.height() * scaling;
      if (isNaN(bodySize[0]) || isNaN(bodySize[1])) {
        throw new Error('Label returned a NaN size.');
      }
    } else if (!bodySize) {
      // console.log(new Error("Creating size"));
      bodySize = new Size(style.minWidth, style.minHeight);
    } else {
      bodySize[0] = style.minWidth;
      bodySize[1] = style.minHeight;
    }
    if (this.hasNode(Direction.INWARD)) {
      const nestedNode = this.nodeAt(Direction.INWARD);
      const nestedSize = nestedNode.extentSize();
      const scale = nestedNode.scale();

      if (
        this.nodeAlignmentMode(Direction.INWARD) == Alignment.INWARD_VERTICAL
      ) {
        // Align vertical.
        bodySize.setWidth(
            Math.max(bodySize.width(), scale * nestedSize.width()),
        );

        if (this.label()) {
          // Allow for the content's size.
          bodySize.setHeight(
              Math.max(
                  style.minHeight,
                  bodySize.height() +
                this.verticalPadding() +
                scale * nestedSize.height(),
              ),
          );
        } else {
          bodySize.setHeight(
              Math.max(
                  bodySize.height(),
                  scale * nestedSize.height() + 2 * this.verticalPadding(),
              ),
          );
        }
      } else {
        // Align horizontal.
        if (this.label()) {
          // Allow for the content's size.
          bodySize.setWidth(
              bodySize.width() +
              this.horizontalPadding() +
              scale * nestedSize.width(),
          );
        } else {
          bodySize.setWidth(
              Math.max(bodySize.width(), scale * nestedSize.width()),
          );
        }

        bodySize.setHeight(
            Math.max(
                bodySize.height(),
                scale * nestedSize.height() + 2 * this.verticalPadding(),
            ),
        );
      }
    }

    // Buds appear circular
    if (this.type() == Type.BUD) {
      const aspect = bodySize.width() / bodySize.height();
      if (aspect < 2 && aspect > 1 / 2) {
        bodySize.setWidth(Math.max(bodySize.width(), bodySize.height()));
        bodySize.setHeight(bodySize.width());
      }
    }

    bodySize[0] = Math.max(style.minWidth, bodySize[0]);
    bodySize[1] = Math.max(style.minHeight, bodySize[1]);
    return bodySize;
  }

  static findConsecutiveLength = function(node: Node, inDirection: Direction) {
    // Exclude some directions that cannot be calculated.
    if (!isCardinalDirection(inDirection)) {
      throw createException(BAD_NODE_DIRECTION);
    }

    const directionAxis: Axis = getDirectionAxis(inDirection);
    if (directionAxis === Axis.NULL) {
      // This should be impossible.
      throw createException(BAD_NODE_DIRECTION);
    }

    // Calculate the length, starting from the center of this node.
    let total: number = 0;
    let scale: number = 1.0;

    // Iterate in the given direction.
    if (node.hasNode(inDirection)) {
      total += node.separationAt(inDirection);

      scale *= node.scaleAt(inDirection);
      let thisNode: Node = node.nodeAt(inDirection);
      let nextNode: Node = thisNode.nodeAt(inDirection);
      while (nextNode !== null) {
        total += thisNode.separationAt(inDirection) * scale;
        scale *= thisNode.scaleAt(inDirection);

        thisNode = nextNode;
        nextNode = nextNode.nodeAt(inDirection);
      }
    }

    return total;
  };

  commitLayout(cld: CommitLayoutData): boolean {
    // Do nothing if this node already has a layout committed.
    if (this._layoutState === LayoutState.COMMITTED) {
      return false;
    }

    // Check for invalid layout states.
    if (this._layoutState === LayoutState.NULL) {
      throw createException(BAD_LAYOUT_STATE);
    }

    // Do not allow overlapping layout commits.
    if (this._layoutState === LayoutState.IN_COMMIT) {
      throw createException(BAD_LAYOUT_STATE);
    }

    // Begin the layout.
    this._layoutState = LayoutState.IN_COMMIT;

    if (this._nodeFit === Fit.NAIVE && (this.isRoot() || this.x() !== null)) {
      this._layoutState = LayoutState.COMMITTED;
      return;
    }

    const initExtent = function(
        inDirection: Direction,
        length: number,
        size: number,
        offset: number,
    ) {
      const extent = extentsAt(inDirection);
      extent.clear();
      extent.appendLS(length, size);
      setExtentOffsetAt(inDirection, offset);
      // console.log(new Error("OFFSET = " + offset));
    };

    let bodySize: Size;
    let lineBounds: Size;
    let bv: [number, number, number];
    let firstSize: Size;
    let secondSize: Size;
    if (cld) {
      bodySize = cld.bodySize;
      lineBounds = cld.lineBounds;
      bv = cld.bv;
      firstSize = cld.firstSize;
      secondSize = cld.secondSize;
    } else {
      lineBounds = new Size();
      bv = [null, null, null];
      firstSize = new Size();
      secondSize = new Size();
    }
    bodySize = this.size(bodySize);

    // This node's horizontal bottom, used with downward nodes.
    initExtent.call(
        this,
        Direction.DOWNWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2,
    );

    // This node's horizontal top, used with upward nodes.
    initExtent.call(
        this,
        Direction.UPWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2,
    );

    // This node's vertical back, used with backward nodes.
    initExtent.call(
        this,
        Direction.BACKWARD,
        // Length:
        bodySize.height(),
        // Size:
        bodySize.width() / 2,
        // Offset to body center:
        bodySize.height() / 2,
    );

    // This node's vertical front, used with forward nodes.
    initExtent.call(
        this,
        Direction.FORWARD,
        // Length:
        bodySize.height(),
        // Size:
        bodySize.width() / 2,
        // Offset to body center:
        bodySize.height() / 2,
    );

    /*
     * Returns the offset of the child's center in the given direction from
     * this node's center.
     *
     * This offset is in a direction perpendicular to the given direction
     * and is positive to indicate a negative offset.
     *
     * The result is in this node's space.
     */
    const getAlignment = function(childDirection: Direction): number {
      // Calculate the alignment adjustment for both nodes.
      const child = nodeAt(childDirection);
      const axis = getPerpendicularAxis(getDirectionAxis(childDirection));

      let rv;

      const alignmentMode = nodeAlignmentMode(childDirection);
      switch (alignmentMode) {
        case Alignment.NULL:
          throw createException(BAD_NODE_ALIGNMENT);
        case Alignment.NONE:
          // Unaligned nodes have no alignment offset.
          rv = 0;
          break;
        case Alignment.NEGATIVE:
          rv = Node.findConsecutiveLength(child, getNegativeDirection(axis));
          break;
        case Alignment.CENTER: {
          const negativeLength: number = Node.findConsecutiveLength(
              child,
              getNegativeDirection(axis),
          );

          const positiveLength: number = Node.findConsecutiveLength(
              child,
              getPositiveDirection(axis),
          );

          const halfLength: number = (negativeLength + positiveLength) / 2;

          if (negativeLength > positiveLength) {
            // The child's negative neighbors extend
            // more than their positive neighbors.
            rv = negativeLength - halfLength;
          } else if (negativeLength < positiveLength) {
            rv = -(positiveLength - halfLength);
          } else {
            rv = 0;
          }
          break;
        }
        case Alignment.POSITIVE:
          rv = -Node.findConsecutiveLength(child, getPositiveDirection(axis));
          break;
      }
      // console.log("Found alignment of " + rv);
      return rv * scaleAt(childDirection);
    };

    /*
     * Positions a child.
     *
     * The alignment is positive in the positive direction.
     *
     * The separation is positive in the direction of the child.
     *
     * These values should in this node's space.
     *
     * The child's position is in this node's space.
     */
    const positionChild = function(
        childDirection: Direction,
        alignment: Alignment,
        separation: number,
    ): void {
      // Validate arguments.
      if (separation < 0) {
        throw new Error('separation must always be positive.');
      }
      if (!isCardinalDirection(childDirection)) {
        throw createException(BAD_NODE_DIRECTION);
      }
      const child: Node = nodeAt(childDirection);
      const reversedDirection: Direction = reverseDirection(childDirection);

      // Save alignment parameters.
      _neighbors[childDirection].alignmentOffset = alignment;
      // console.log("Alignment = " + alignment);
      _neighbors[childDirection].separation = separation;

      // Determine the line length.
      let lineLength: number;
      let extentSize: number;
      if (nodeAlignmentMode(childDirection) === Alignment.NONE) {
        child.size(firstSize);
        if (isVerticalDirection(childDirection)) {
          extentSize = firstSize.height() / 2;
        } else {
          extentSize = firstSize.width() / 2;
        }
      } else {
        extentSize = child
            .extentsAt(reversedDirection)
            .sizeAt(
                _neighbors[childDirection].node.extentOffsetAt(
                    reversedDirection,
                ) -
              alignment / scaleAt(childDirection),
            );
      }
      lineLength = separation - scaleAt(childDirection) * extentSize;
      _neighbors[childDirection].lineLength = lineLength;
      // console.log(
      //   "Line length: " + lineLength + ",
      //   separation: " + separation + ",
      //   extentSize: " + extentSize);

      // Set the position.
      const dirSign = directionSign(childDirection);
      if (isVerticalDirection(childDirection)) {
        // The child is positioned vertically.
        setPosAt(childDirection, alignment, dirSign * separation);
      } else {
        setPosAt(childDirection, dirSign * separation, alignment);
      }
      /* console.log(
                nameDirection(childDirection) + " " +
                nameType(child.type()) + "'s position set to (" +
                this._neighbors[childDirection].xPos + ", " +
                this._neighbors[childDirection].yPos + ")"
            );*/
    };

    /*
     * Merge this node's extents in the given direction with the
     * child's extents.
     *
     * alignment is the offset of the child from this node.
     * Positive values indicate presence in the positive
     * direction. (i.e. forward or upward).
     *
     * separation is the distance from the center of this node to the center
     * of the node in the specified direction.
     */
    const combineExtents = function(
        childDirection: Direction,
        alignment: Alignment,
        separation: number,
    ): void {
      const child: Node = nodeAt(childDirection);

      // Combine an extent.
      // lengthAdjustment and sizeAdjustment are in this node's space.
      const combineExtent = function(
          direction: Direction,
          lengthAdjustment: number,
          sizeAdjustment: number,
      ): void {
        /* console.log(
                    "combineExtent(" +
                    nameDirection(direction) + ", " +
                    lengthAdjustment + ", " +
                    sizeAdjustment + ")"
                );*/
        // Calculate the new offset to this node's center.
        const lengthOffset =
          extentOffsetAt(direction) +
          lengthAdjustment -
          scaleAt(childDirection) * child.extentOffsetAt(direction);

        // Combine the two extents in the given direction.
        /* console.log("Combining " + nameDirection(direction) + ", " );
                console.log("Child: " + nameLayoutState(child._layoutState));
                console.log("Length offset: " + lengthOffset);
                console.log("Size adjustment: " + sizeAdjustment);
                console.log("ExtentOffset : " +
                  _neighbors[direction].extentOffset);
                console.log("Scaled child ExtentOffset : " +
                (scaleAt(childDirection) * child.extentOffsetAt(direction))); */
        const e: Extent = extentsAt(direction);
        const scale: number = scaleAt(childDirection);
        if (nodeFit() == Fit.LOOSE) {
          e.combineExtentAndSimplify(
              child.extentsAt(direction),
              lengthOffset,
              sizeAdjustment,
              scale,
              bv,
          );
        } else {
          e.combineExtent(
              child.extentsAt(direction),
              lengthOffset,
              sizeAdjustment,
              scale,
          );
        }

        // Adjust the length offset to remain positive.
        if (lengthOffset < 0) {
          // console.log("Adjusting negative extent offset.");
          setExtentOffsetAt(
              direction,
              extentOffsetAt(direction) + Math.abs(lengthOffset),
          );
        }

        /* console.log(
                    "New "
                    + nameDirection(direction)
                    + " extent offset = "
                    + this.extentOffsetAt(direction)
                );
                this.extentsAt(direction).forEach(function(l, s, i) {
                    console.log(i + ". length=" + l + ", size=" + s);
                });*/

        // Assert the extent offset is positive.
        if (extentOffsetAt(direction) < 0) {
          throw new Error('Extent offset must not be negative.');
        }
      };

      switch (childDirection) {
        case Direction.DOWNWARD:
          // Downward child.
          combineExtent.call(Direction.DOWNWARD, alignment, separation);
          combineExtent.call(Direction.UPWARD, alignment, -separation);

          combineExtent.call(Direction.FORWARD, separation, alignment);
          combineExtent.call(Direction.BACKWARD, separation, -alignment);
          break;
        case Direction.UPWARD:
          // Upward child.
          combineExtent.call(Direction.DOWNWARD, alignment, -separation);
          combineExtent.call(Direction.UPWARD, alignment, separation);

          combineExtent.call(Direction.FORWARD, -separation, alignment);
          combineExtent.call(Direction.BACKWARD, -separation, -alignment);
          break;
        case Direction.FORWARD:
          // Forward child.
          combineExtent.call(Direction.DOWNWARD, separation, alignment);
          combineExtent.call(Direction.UPWARD, separation, -alignment);

          combineExtent.call(Direction.FORWARD, alignment, separation);
          combineExtent.call(Direction.BACKWARD, alignment, -separation);
          break;
        case Direction.BACKWARD:
          // Backward child.
          combineExtent.call(Direction.DOWNWARD, -separation, alignment);
          combineExtent.call(Direction.UPWARD, -separation, -alignment);

          combineExtent.call(Direction.FORWARD, alignment, -separation);
          combineExtent.call(Direction.BACKWARD, alignment, separation);
          break;
        default:
          throw createException(BAD_NODE_DIRECTION);
      }
    };

    // Layout a single node in the given direction.
    const layoutSingle = function(
        direction: Direction,
        allowAxisOverlap: boolean,
    ): boolean {
      if (!hasNode(direction)) {
        return;
      }

      switch (axisOverlap(direction)) {
        case AxisOverlap.PREVENTED:
          allowAxisOverlap = false;
          break;
        case AxisOverlap.ALLOWED:
          allowAxisOverlap = true;
          break;
      }

      /* console.log(
                "Laying out single " + nameDirection(direction) + " child, "
                + (allowAxisOverlap ? "with " : "without ") + "axis overlap."
            );*/

      // Get the alignment for the children.
      const alignment: number = getAlignment.call(direction);
      // console.log("Calculated alignment of " + alignment + ".");

      const child: Node = nodeAt(direction);
      const reversed: Direction = reverseDirection(direction);
      const childExtent: Extent = child.extentsAt(reversed);

      if (child._layoutState !== LayoutState.COMMITTED) {
        _layoutState = LayoutState.NEEDS_COMMIT;
        // console.log(Node.getLayoutNodes(child.findPaintGroup()));
        // console.log(namePreferredAxis(child._layoutPreference));
        // console.log("Child's paint group is dirty: " +
        //   child.findPaintGroup().isDirty());
        // console.log(nameDirection(direction) + " Child " +
        //   nameType(child.type()) + " " + (child._id) +
        //   " does not have a committed layout.
        //   Child's layout state is " +
        //   nameLayoutState(child._layoutState), child);
        return true;
      }

      // Separate the child from this node.

      let separationFromChild: number = extentsAt(direction).separation(
          childExtent,
          extentOffsetAt(direction) +
          alignment -
          scaleAt(direction) * child.extentOffsetAt(reversed),
          allowAxisOverlap,
          scaleAt(direction),
          LINE_THICKNESS / 2,
      );
      // console.log("Calculated unpadded separation of " +
      //   separationFromChild + ".");

      // Add padding and ensure the child is not separated less than
      // it would be if the node was not offset by alignment.
      child.size(firstSize);
      if (getDirectionAxis(direction) == Axis.VERTICAL) {
        separationFromChild = Math.max(
            separationFromChild,
            scaleAt(direction) * (firstSize.height() / 2) +
            bodySize.height() / 2,
        );
        separationFromChild +=
          verticalSeparation(direction) * scaleAt(direction);
      } else {
        separationFromChild = Math.max(
            separationFromChild,
            scaleAt(direction) * (firstSize.width() / 2) +
            bodySize.width() / 2,
        );
        separationFromChild +=
          horizontalSeparation(direction) * scaleAt(direction);
      }
      // console.log("Calculated padded separation of " +
      //   separationFromChild + ".");

      // Set the node's position.
      positionChild.call(direction, alignment, separationFromChild);

      // Combine the extents of the child and this node.
      combineExtents.call(direction, alignment, separationFromChild);
    };

    // Layout a pair of nodes in the given directions.
    const layoutAxis = function(
        firstDirection: Direction,
        secondDirection: Direction,
        allowAxisOverlap: boolean,
    ): boolean {
      if (
        firstDirection === secondDirection &&
        firstDirection != Direction.NULL
      ) {
        throw createException(BAD_NODE_DIRECTION);
      }
      // Change the node direction to null if there is no node in that
      // direction.
      if (!hasNode(firstDirection)) {
        firstDirection = Direction.NULL;
      }
      if (!hasNode(secondDirection)) {
        secondDirection = Direction.NULL;
      }

      // Return if there are no directions.
      if (
        firstDirection == Direction.NULL &&
        secondDirection == Direction.NULL
      ) {
        return;
      }

      // Test if this node has a first-axis child in only one direction.
      if (
        firstDirection == Direction.NULL ||
        secondDirection == Direction.NULL
      ) {
        // Find the direction of the only first-axis child.
        let firstAxisDirection: Direction;
        if (firstDirection != Direction.NULL) {
          firstAxisDirection = firstDirection;
        } else {
          // It must be the second direction.
          firstAxisDirection = secondDirection;
        }

        // Layout that node.
        if (layoutSingle.call(firstAxisDirection, allowAxisOverlap)) {
          _layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }
        return;
      }

      /* console.log(
                "Laying out " +
                nameDirection(firstDirection) + " and " +
                nameDirection(secondDirection) + " children."
            );*/

      // This node has first-axis children in both directions.
      const firstNode: Node = nodeAt(firstDirection);
      const secondNode: Node = nodeAt(secondDirection);

      // Get the alignments for the children.
      const firstNodeAlignment: number = getAlignment.call(
          firstDirection,
      );
      const secondNodeAlignment: number = getAlignment.call(
          secondDirection,
      );
      // console.log("First alignment: " + firstNodeAlignment);
      // console.log("Second alignment: " + secondNodeAlignment);

      let separationBetweenChildren: number = firstNode
          .extentsAt(secondDirection)
          .separation(
              secondNode.extentsAt(firstDirection),
              (scaleAt(secondDirection) / scaleAt(firstDirection)) *
            (secondNodeAlignment - secondNode.extentOffsetAt(firstDirection)) -
            (firstNodeAlignment - firstNode.extentOffsetAt(secondDirection)),
              true,
              scaleAt(secondDirection) / scaleAt(firstDirection),
              0,
          );
      separationBetweenChildren *= scaleAt(firstDirection);

      // console.log("Separation between children="
      //   + separationBetweenChildren);

      /*
            var firstExtent = this.extentsAt(firstDirection);
            console.log(
                "This " +
                nameDirection(firstDirection) +
                " extent (offset to center=" +
                this.extentOffsetAt(firstDirection) +
                ")"
            );
            firstExtent.forEach(
                function(length, size, i) {
                    console.log(i + ". l=" + length + ", s=" + size);
                }
            );

            console.log(
                nameDirection(firstDirection) +
                " " + nameType(this.nodeAt(firstDirection).type()) +
                "'s " + nameDirection(secondDirection) +
                " extent (offset to center=" +
                this.nodeAt(firstDirection).extentOffsetAt(secondDirection) +
                ")"
            );
            this.nodeAt(firstDirection).extentsAt(secondDirection).forEach(
                function(length, size, i) {
                    console.log(i + ". l=" + length + ", s=" + size);
                }
            );

            console.log(
                "FirstNodeAlignment=" + firstNodeAlignment
            );
            console.log(
                "firstDirection extentOffset=" +
                    this.extentOffsetAt(firstDirection)
            );
            console.log(
                "firstNode.extentOffsetAt(secondDirection)=" +
                firstNode.extentOffsetAt(secondDirection)
            );*/

      let firstAxisOverlap: boolean = allowAxisOverlap;
      switch (nodeAt(firstDirection).axisOverlap()) {
        case AxisOverlap.PREVENTED:
          firstAxisOverlap = false;
          break;
        case AxisOverlap.ALLOWED:
          firstAxisOverlap = true;
          break;
      }
      let secondAxisOverlap: boolean = allowAxisOverlap;
      switch (nodeAt(secondDirection).axisOverlap()) {
        case AxisOverlap.PREVENTED:
          secondAxisOverlap = false;
          break;
        case AxisOverlap.ALLOWED:
          secondAxisOverlap = true;
          break;
      }

      // Allow some overlap if we have both first-axis sides, but
      // nothing ahead on the second axis.
      let separationFromFirst: number = extentsAt(
          firstDirection,
      ).separation(
          firstNode.extentsAt(secondDirection),
          extentOffsetAt(firstDirection) +
          firstNodeAlignment -
          scaleAt(firstDirection) *
            firstNode.extentOffsetAt(secondDirection),
          firstAxisOverlap,
          scaleAt(firstDirection),
          LINE_THICKNESS / 2,
      );

      let separationFromSecond: number = extentsAt(
          secondDirection,
      ).separation(
          secondNode.extentsAt(firstDirection),
          extentOffsetAt(secondDirection) +
          secondNodeAlignment -
          scaleAt(secondDirection) *
            secondNode.extentOffsetAt(firstDirection),
          secondAxisOverlap,
          scaleAt(secondDirection),
          LINE_THICKNESS / 2,
      );

      /* console.log(
                "Separation from this " + nameType(this.type()) + " to " +
                nameDirection(firstDirection) + " " +
                nameType(this.nodeAt(firstDirection).type()) + "=" +
                separationFromFirst
            );
            console.log(
                "Separation from this " + nameType(this.type()) + " to " +
                nameDirection(secondDirection) + " " +
                nameType(this.nodeAt(secondDirection).type()) + "=" +
                separationFromSecond
            );*/

      // TODO Handle occlusion of the second axis if we have a parent or
      // if we have a second-axis child. Doesn't this code need to ensure
      // the second-axis child is not trapped inside too small a space?

      if (
        separationBetweenChildren >=
        separationFromFirst + separationFromSecond
      ) {
        // The separation between the children is greater than the
        // separation between each child and this node.

        // Center them as much as possible.
        separationFromFirst = Math.max(
            separationFromFirst,
            separationBetweenChildren / 2,
        );
        separationFromSecond = Math.max(
            separationFromSecond,
            separationBetweenChildren / 2,
        );
      } else {
        // separationBetweenChildren
        //    < separationFromFirst + separationFromSecond
        // The separation between children is less than what this node
        // needs to separate each child from itself, so do nothing to
        // the separation values.
      }

      firstNode.size(firstSize);
      secondNode.size(secondSize);
      if (getDirectionAxis(firstDirection) === Axis.VERTICAL) {
        separationFromFirst = Math.max(
            separationFromFirst,
            scaleAt(firstDirection) * (firstSize.height() / 2) +
            bodySize.height() / 2,
        );
        separationFromFirst +=
          verticalSeparation(firstDirection) *
          scaleAt(firstDirection);

        separationFromSecond = Math.max(
            separationFromSecond,
            scaleAt(secondDirection) * (secondSize.height() / 2) +
            bodySize.height() / 2,
        );
        separationFromSecond +=
          verticalSeparation(secondDirection) *
          scaleAt(secondDirection);
      } else {
        separationFromFirst = Math.max(
            separationFromFirst,
            scaleAt(firstDirection) * (firstSize.width() / 2) +
            bodySize.width() / 2,
        );
        separationFromFirst +=
          horizontalSeparation(firstDirection) *
          scaleAt(firstDirection);

        separationFromSecond = Math.max(
            separationFromSecond,
            scaleAt(secondDirection) * (secondSize.width() / 2) +
            bodySize.width() / 2,
        );
        separationFromSecond +=
          horizontalSeparation(secondDirection) *
          scaleAt(secondDirection);
      }

      // Set the positions of the nodes.
      positionChild.call(
          firstDirection,
          firstNodeAlignment,
          separationFromFirst,
      );
      positionChild.call(
          secondDirection,
          secondNodeAlignment,
          separationFromSecond,
      );

      // Combine their extents.
      combineExtents.call(
          firstDirection,
          firstNodeAlignment,
          separationFromFirst,
      );
      combineExtents.call(
          secondDirection,
          secondNodeAlignment,
          separationFromSecond,
      );
    };

    if (
      this.isRoot() ||
      this.parentDirection() === Direction.INWARD ||
      this.parentDirection() === Direction.OUTWARD
    ) {
      if (
        this._layoutPreference === PreferredAxis.HORIZONTAL ||
        this._layoutPreference == PreferredAxis.PERPENDICULAR
      ) {
        // Root-like, so just lay out both axes.
        if (
          layoutAxis.call(
              this,
              Direction.BACKWARD,
              Direction.FORWARD,
              !this.hasNode(Direction.UPWARD) &&
                      !this.hasNode(Direction.DOWNWARD),
          )
        ) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }

        // This node is root-like, so it lays out the second-axis children in
        // the same method as the first axis.
        if (layoutAxis.call(this, Direction.UPWARD, Direction.DOWNWARD, true)) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }
      } else {
        // Root-like, so just lay out both axes.
        if (
          layoutAxis.call(
              this,
              Direction.UPWARD,
              Direction.DOWNWARD,
              !this.hasNode(Direction.BACKWARD) &&
              !this.hasNode(Direction.FORWARD),
          )
        ) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }

        // This node is root-like, so it lays out the second-axis children in
        // the same method as the first axis.
        if (
          layoutAxis.call(this, Direction.BACKWARD, Direction.FORWARD, true)
        ) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }
      }
    } else {
      // Layout based upon the axis preference.
      if (this.canonicalLayoutPreference() == PreferredAxis.PERPENDICULAR) {
        const firstAxis: Axis = getPerpendicularAxis(this.parentDirection());

        // Check for nodes perpendicular to parent's direction
        const hasFirstAxisNodes: [Direction, Direction] = this.hasNodes(
            firstAxis,
        );
        const oppositeFromParent: Direction = reverseDirection(
            this.parentDirection(),
        );
        if (
          layoutAxis.call(
              this,
              hasFirstAxisNodes[0],
              hasFirstAxisNodes[1],
              false,
          )
        ) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }

        // Layout this node's second-axis child, if that child exists.
        if (this.hasNode(oppositeFromParent)) {
          // Layout the second-axis child.
          if (layoutSingle.call(this, oppositeFromParent, true)) {
            this._layoutState = LayoutState.NEEDS_COMMIT;
            return true;
          }
        }
      } else {
        // Layout this node's second-axis child, if that child exists.
        const oppositeFromParent: Direction = reverseDirection(
            this.parentDirection(),
        );

        // Check for nodes perpendicular to parent's direction
        const perpendicularNodes: [Direction, Direction] = this.hasNodes(
            getPerpendicularAxis(this.parentDirection()),
        );

        if (this.hasNode(oppositeFromParent)) {
          // Layout the second-axis child.
          if (
            layoutSingle.call(
                this,
                oppositeFromParent,
                // perpendicularNodes[0] !== Direction.NULL ||
                //   perpendicularNodes[1] !== Direction.NULL
                true,
            )
          ) {
            this._layoutState = LayoutState.NEEDS_COMMIT;
            return true;
          }
        }

        if (
          layoutAxis.call(
              this,
              perpendicularNodes[0],
              perpendicularNodes[1],
              true,
          )
        ) {
          this._layoutState = LayoutState.NEEDS_COMMIT;
          return true;
        }
      }
    }

    const addLineBounds = function(given: Direction) {
      if (!hasChild(given)) {
        return;
      }

      const perpAxis: Axis = getPerpendicularAxis(given);
      const dirSign: number = directionSign(given);

      let positiveOffset: number = extentOffsetAt(
          getPositiveDirection(perpAxis),
      );
      let negativeOffset: number = extentOffsetAt(
          getNegativeDirection(perpAxis),
      );

      if (dirSign < 0) {
        const lineSize: number = sizeIn(given, lineBounds);
        positiveOffset -= lineSize + lineLengthAt(given);
        negativeOffset -= lineSize + lineLengthAt(given);
      }

      if (nodeFit() == Fit.EXACT) {
        // Append the line-shaped bound.
        let lineSize: number;
        if (perpAxis === Axis.VERTICAL) {
          lineSize = bodySize.height() / 2;
        } else {
          lineSize = bodySize.width() / 2;
        }
        // lineSize = this.scaleAt(given) * LINE_THICKNESS / 2;
        extentsAt(getPositiveDirection(perpAxis)).combineBound(
            positiveOffset,
            lineLengthAt(given),
            lineSize,
        );
        extentsAt(getNegativeDirection(perpAxis)).combineBound(
            negativeOffset,
            lineLengthAt(given),
            lineSize,
        );
      }
    };

    // Set our extents, combined with non-point neighbors.
    forEachCardinalDirection(addLineBounds, this);

    if (this.hasNode(Direction.INWARD)) {
      const nestedNode: Node = this.nodeAt(Direction.INWARD);
      if (nestedNode._layoutState !== LayoutState.COMMITTED) {
        this._layoutState = LayoutState.NEEDS_COMMIT;
        return true;
      }
      const nestedSize: Size = nestedNode.extentSize(firstSize);
      if (
        this.nodeAlignmentMode(Direction.INWARD) === Alignment.INWARD_VERTICAL
      ) {
        this.setPosAt(
            Direction.INWARD,
            nestedNode.scale() *
            (nestedNode.extentOffsetAt(Direction.DOWNWARD) -
              nestedSize.width() / 2),
            bodySize.height() / 2 -
            this.verticalPadding() -
            this.borderThickness() +
            nestedNode.scale() *
              (-nestedSize.height() +
                nestedNode.extentOffsetAt(Direction.FORWARD)),
        );
      } else {
        // console.log(this.horizontalPadding(), this.borderThickness());
        this.setPosAt(
            Direction.INWARD,
            bodySize.width() / 2 -
            this.horizontalPadding() -
            this.borderThickness() +
            nestedNode.scale() *
              (-nestedSize.width() +
                nestedNode.extentOffsetAt(Direction.DOWNWARD)),
            nestedNode.scale() *
            (nestedNode.extentOffsetAt(Direction.FORWARD) -
              nestedSize.height() / 2),
        );
      }
    }

    this._layoutState = LayoutState.COMMITTED;

    // Needed a commit, so return true.
    return true;
  }

  commitLayoutIteratively(timeout?: number): Function {
    if (!this.isRoot()) {
      return this.root().commitLayoutIteratively(timeout);
    }

    let layoutPhase = 1;
    const rootPaintGroup: Node = this;
    let paintGroup: Node = null;
    let root: Node = null;
    let node: Node = null;
    const cld: CommitLayoutData = new CommitLayoutData();

    // Traverse the graph depth-first, committing each node's layout in turn.
    const commitLayoutLoop: Function = function(timeout: number): Function {
      if (timeout <= 0) {
        return commitLayoutLoop;
      }
      const startTime: Date = new Date();
      let i: number = 0;
      const pastTime = function(val?: any) {
        ++i;
        if (i % 10 === 0) {
          const ct = new Date();
          const el = elapsed(startTime, ct);
          if (el > 4 * 1000) {
            console.log(val);
          }
          if (el > 5 * 1000) {
            throw new Error('Commit Layout is taking too long');
          }
          if (timeout !== undefined && el > timeout) {
            return true;
          }
        }
        return false;
      };
      // Commit layout for all nodes.
      while (layoutPhase === 1) {
        if (paintGroup === null) {
          // console.log("Beginning new commit layout phase 1");
          paintGroup = rootPaintGroup._paintGroupNext;
          root = paintGroup;
          node = root;
        } else {
          // console.log("Continuing commit layout phase 1");
        }
        if (pastTime(node._id)) {
          // console.log("Ran out of time between groups during
          //   phase 1 (Commit layout, timeout=" + timeout +")");
          return commitLayoutLoop;
        }
        if (root.needsCommit()) {
          cld.needsPosition = true;
          do {
            // Loop back to the first node, from the root.
            node = node._layoutNext;
            if (node.needsCommit()) {
              node.commitLayout(cld);
              if (node.needsCommit()) {
                // Node had a child that needed a commit, so reset the layout.
                // console.log("Resetting layout");
                paintGroup = null;
                return commitLayoutLoop;
              }
              node._currentPaintGroup = paintGroup;
            }
            if (pastTime(node._id)) {
              // console.log("Ran out of time mid-group during
              //   phase 1 (Commit layout)");
              return commitLayoutLoop;
            }
          } while (node !== root);
        } else {
          cld.needsPosition = cld.needsPosition || root.needsPosition();
        }
        if (paintGroup === rootPaintGroup) {
          // console.log("Commit layout phase 1 done");
          ++layoutPhase;
          paintGroup = null;
          break;
        }
        paintGroup = paintGroup._paintGroupNext;
        root = paintGroup;
        node = root;
      }
      // Calculate position.
      while (cld.needsPosition && layoutPhase === 2) {
        // console.log("Now in layout phase 2");
        if (paintGroup === null) {
          // console.log("Beginning layout phase 2");
          paintGroup = rootPaintGroup;
          root = paintGroup;
          node = root;
        } else {
          // console.log("Continuing layout phase 2");
        }
        // console.log("Processing position for ", paintGroup);
        if (pastTime(paintGroup._id)) {
          // console.log("Ran out of time between groups during
          //   phase 2 (Commit group position). Next node is ", paintGroup);
          return commitLayoutLoop;
        }
        if (paintGroup.needsPosition() || node) {
          // console.log(paintGroup + " needs a position update");
          if (!node) {
            node = paintGroup;
          }
          do {
            // Loop from the root to the last node.
            node._absoluteDirty = true;
            node._hasGroupPos = false;
            node.commitGroupPos();
            node = node._layoutPrev;
            if (pastTime(node._id)) {
              // console.log("Ran out of time mid-group during
              //   phase 2 (Commit group position). Next node is ", node);
              paintGroup._hasGroupPos = false;
              return commitLayoutLoop;
            }
          } while (node !== root);
        } else {
          // console.log(paintGroup + " does not need a position update.");
        }
        ++paintGroup._absoluteVersion;
        paintGroup._absoluteDirty = true;
        paintGroup.commitAbsolutePos();
        paintGroup = paintGroup._paintGroupPrev;
        if (paintGroup === rootPaintGroup) {
          // console.log("Commit layout phase 2 done");
          ++layoutPhase;
          break;
        }
        root = paintGroup;
        node = null;
      }
      cld.needsPosition = false;
      return null;
    };

    return commitLayoutLoop(timeout);
  }

  separationAt(inDirection: Direction): number {
    // Exclude some directions that cannot be calculated.
    if (!isCardinalDirection(inDirection)) {
      throw createException(BAD_NODE_DIRECTION);
    }

    // If the given direction is the parent's direction, use
    // their measurement instead.
    if (!this.isRoot() && inDirection == this.parentDirection()) {
      return this.nodeParent().separationAt(reverseDirection(inDirection));
    }

    if (!this.hasNode(inDirection)) {
      throw createException(NO_NODE_FOUND);
    }

    return this._neighbors[inDirection].separation;
  }

  layoutWasChanged(changeDirection?: Direction): void {
    // console.log("layoutWasChanged(" +
    //   (changeDirection != null ? nameDirection(
    //     changeDirection) : "null") +")")
    // Disallow null change directions.
    if (arguments.length === 0 || changeDirection === undefined) {
      changeDirection = Direction.INWARD;
    }
    if (changeDirection == Direction.NULL) {
      throw createException(BAD_NODE_DIRECTION);
    }

    let node: Node = this;
    while (node !== null) {
      // console.log("Node " + node + " has layout changed");
      const oldLayoutState = node._layoutState;

      // Set the needs layout flag.
      node._layoutState = LayoutState.NEEDS_COMMIT;
      node._hasGroupPos = false;
      node._currentPaintGroup = null;

      node.findPaintGroup().markDirty();

      if (node.isRoot()) {
        break;
      } else if (oldLayoutState === LayoutState.COMMITTED) {
        // Notify our parent, if we were previously committed.
        node = node.nodeParent();
        changeDirection = reverseDirection(node.parentDirection());
      } else {
        break;
      }
    }

    if (this._extended && this._extended.cache) {
      this._extended.cache.invalidate();
    }
  }

  layoutHasChanged(changeDirection?: Direction): void {
    return this.layoutWasChanged(changeDirection);
  }

  layoutChanged(changeDirection?: Direction): void {
    return this.layoutWasChanged(changeDirection);
  }

  freeze(freezer: Freezer): void {
    if (!this.localPaintGroup()) {
      throw new Error('A node must be a paint group in order to be frozen.');
    }
    this.ensureExtended().cache = freezer.cache(this);
  }

  isFrozen(): boolean {
    return this._extended && this._extended.cache;
  }

  thaw(): void {
    if (!this.localPaintGroup()) {
      throw new Error('A node must be a paint group in order to be thawed.');
    }
    if (this.ensureExtended().cache) {
      this.ensureExtended().cache.invalidate();
      this.ensureExtended().cache = null;
    }
  }

  layoutOrder(): Direction[] {
    if (this.isRoot()) {
      if (
        this._layoutPreference === PreferredAxis.HORIZONTAL ||
        this._layoutPreference === PreferredAxis.PERPENDICULAR
      ) {
        return HORIZONTAL_ORDER;
      }
      return VERTICAL_ORDER;
    }
    if (this.canonicalLayoutPreference() === PreferredAxis.PERPENDICULAR) {
      // console.log("PREFER PERP");
      if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
        return VERTICAL_ORDER;
      }
      return HORIZONTAL_ORDER;
    }
    // console.log("PREFER PARALLEL TO PARENT: " +
    //   namePreferredAxis(this._layoutPreference));
    // Parallel preference.
    if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
      return HORIZONTAL_ORDER;
    }
    return VERTICAL_ORDER;
  }

  canonicalLayoutPreference(): PreferredAxis {
    // Root nodes do not have a canonical layout preference.
    if (this.isRoot()) {
      throw createException(NODE_IS_ROOT);
    }

    // Convert the layout preference to either preferring the parent or
    // the perpendicular axis.
    let canonicalPref: PreferredAxis = this._layoutPreference;
    switch (this._layoutPreference) {
      case PreferredAxis.HORIZONTAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.VERTICAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.VERTICAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.PERPENDICULAR:
      case PreferredAxis.PARENT:
        canonicalPref = this._layoutPreference;
        break;
      case PreferredAxis.NULL:
        throw createException(BAD_LAYOUT_PREFERENCE);
    }
    return canonicalPref;
  }

  destroy(): void {
    if (!this.isRoot()) {
      this.disconnectNode();
    }
    this._neighbors.forEach(function(neighbor: NeighborData): void {
      // Clear all children.
      neighbor.node = null;
    }, this);
    this._layoutState = LayoutState.NULL;
    this._scale = 1.0;
  }

  dumpExtentBoundingRect(): void {
    // extent.boundingValues() returns [totalLength, minSize, maxSize]
    const backwardOffset: number = this.extentOffsetAt(Direction.BACKWARD);
    this.extentsAt(Direction.BACKWARD).dump(
        'Backward extent (center at ' + backwardOffset + ')',
    );

    const forwardOffset: number = this.extentOffsetAt(Direction.FORWARD);
    this.extentsAt(Direction.FORWARD).dump(
        'Forward extent (center at ' + forwardOffset + ')',
    );

    const downwardOffset: number = this.extentOffsetAt(Direction.DOWNWARD);
    this.extentsAt(Direction.DOWNWARD).dump(
        'Downward extent (center at ' + downwardOffset + ')',
    );

    const upwardOffset: number = this.extentOffsetAt(Direction.UPWARD);
    this.extentsAt(Direction.UPWARD).dump(
        'Upward extent (center at ' + upwardOffset + ')',
    );

    /*
        let backwardValues:[number, number, number] =
          this.extentsAt(Direction.BACKWARD).boundingValues();
        let forwardValues:[number, number, number] =
          this.extentsAt(Direction.FORWARD).boundingValues();
        let downwardValues:[number, number, number] =
          this.extentsAt(Direction.DOWNWARD).boundingValues();
        let upwardValues:[number, number, number] =
          this.extentsAt(Direction.UPWARD).boundingValues();
        log("Backward values: " + backwardValues);
        log("Forward values: " + forwardValues);
        log("Upward values: " + upwardValues);
        log("Downward values: " + downwardValues);
        */
  }

  contextChanged(isLost: boolean, window: Window): void {
    if (!this.localPaintGroup()) {
      return;
    }
    let node: Node = this;
    do {
      node.markDirty();
      for (const wid: string in node._extended.windowPainter) {
        const painter: NodePainter = node._extended.windowPainter[wid];
        if (window.id() == parseInt(wid)) {
          painter.contextChanged(isLost);
        }
      }
      node = node._paintGroupNext;
    } while (node !== this);
  }

  paint(window: Window, timeout: number): boolean {
    if (!this.localPaintGroup()) {
      throw new Error('A node must be a paint group in order to be painted');
    }
    if (!this.isDirty()) {
      // window.log(this + " is not dirty");
      return false;
    } else {
      // window.log(this + " is dirty");
    }
    if (window.gl().isContextLost()) {
      return false;
    }
    if (timeout <= 0) {
      window.log('Paint timeout=' + timeout);
      return true;
    }

    const t: number = new Date().getTime();
    const pastTime: Function = function(): boolean {
      const isPast: boolean =
        timeout !== undefined && new Date().getTime() - t > timeout;
      if (isPast) {
        // console.log("Past time: timeout=" +
        //   timeout + ", elapsed="+(new Date().getTime() - t));
      }
      return isPast;
    };

    // Load saved state.
    const wid: number = window.id();
    let savedPaintGroup: Node = this._extended.windowPaintGroup[wid];

    let cont: Function;
    if (this._extended.commitLayoutFunc) {
      // console.log("Continuing commit layout in progress");
      cont = this._extended.commitLayoutFunc(timeout);
    } else if (!savedPaintGroup) {
      // console.log("Starting new commit layout");
      cont = this.commitLayoutIteratively(timeout);
    }

    if (cont) {
      // window.log(this + " Timed out during commitLayout");
      this._extended.commitLayoutFunc = cont;
      return true;
    } else {
      // window.log(this + " Committed all layout");
      this._extended.commitLayoutFunc = null;
      this._extended.windowPaintGroup[wid] = this;
      savedPaintGroup = this;
    }

    // Continue painting.
    while (true) {
      if (pastTime()) {
        this._extended.dirty = true;
        // window.log("Ran out of time during painting
        //   (timeout=" + timeout + "). is " + savedPaintGroup);
        return true;
      }

      const paintGroup: Node = savedPaintGroup;
      let painter: NodePainter = paintGroup._extended.windowPainter[wid];
      if (paintGroup.isDirty() || !painter) {
        // Paint and render nodes marked for the current group.
        // console.log("Painting " + paintGroup);
        if (!painter) {
          painter = new NodePainter(window);
          paintGroup._extended.windowPainter[wid] = painter;
        }
        const counts: { [key: string]: number } = {};
        let node: Node = paintGroup;
        do {
          // console.log("Counting node " + node);
          painter.countNode(node, counts);
          node = node._layoutPrev;
        } while (node !== paintGroup);
        // console.log("Glyphs: " + counts.numGlyphs);
        painter.initBlockBuffer(counts);
        node = paintGroup;
        do {
          painter.drawNode(node);
          node = node._layoutPrev;
          countNodePainted();
        } while (node !== paintGroup);
        if (paintGroup.isFrozen()) {
          paintGroup.ensureExtended().cache.paint(window);
        }
      }
      paintGroup._extended.dirty = false;
      this._extended.windowPaintGroup[wid] = paintGroup._paintGroupNext;
      savedPaintGroup = this._extended.windowPaintGroup[wid];
      if (this._extended.windowPaintGroup[wid] === this) {
        break;
      }
    }

    this._extended.windowPaintGroup[wid] = null;
    // window.log("Completed node painting");
    return false;
  }

  renderIteratively(
      window: Window,
      camera: Camera,
  ): boolean {
    CACHED_RENDERS = 0;
    IMMEDIATE_RENDERS = 0;
    const start: Date = new Date();
    // console.log("Rendering iteratively");
    let paintGroup: Node = this;
    let dirtyRenders: number = 0;
    // let nodesRendered:number = 0;
    let heaviestPaintGroup: Node = null;
    let mostRenders: number = 0;

    do {
      if (!paintGroup.localPaintGroup() && !paintGroup.isRoot()) {
        throw new Error(
            'Paint group chain must not refer to a non-paint group',
        );
      }
      // console.log("Rendering node " + paintGroup);
      const painter: NodePainter = paintGroup.painter(window);
      if (!paintGroup.render(window, camera, renderData)) {
        ++dirtyRenders;
      } else if (painter._consecutiveRenders > 1) {
        mostRenders = Math.max(painter._consecutiveRenders, mostRenders);
        if (heaviestPaintGroup === null) {
          heaviestPaintGroup = paintGroup;
        } else if (
          painter.weight() > heaviestPaintGroup.painter(window).weight()
        ) {
          heaviestPaintGroup = paintGroup;
        }
      }
      paintGroup = paintGroup._paintGroupPrev;
      // ++nodesRendered;
    } while (paintGroup !== this);
    // console.log(nodesRendered +
    //   " paint groups rendered " +
    //   (dirtyRenders > 0 ? "(" +
    //   dirtyRenders +
    //   " dirty)" : ""));

    const renderTime: number = elapsed(start);
    if (renderTimes.length === 11) {
      renderTimes.splice(Math.floor(Math.random() * 11), 1);
    }
    if (mostRenders > 1) {
      renderTimes.push(renderTime);
      renderTimes.sort(function(a, b) {
        return a - b;
      });
      const meanRenderTime = renderTimes[Math.floor(renderTimes.length / 2)];
      if (meanRenderTime > INTERVAL / 2) {
        /* console.log("Freezing heaviest node " +
         *   heaviestPaintGroup + " (weight=" +
         *   heaviestPaintGroup.painter(window).weight() + ") because
         *   rendering took " + meanRenderTime +
         *   "ms (most renders = " + mostRenders + ")");
                let str:string = "[";
                for(var i = 0; i < renderTimes.length; ++i) {
                    if(i > 0) {
                        str += ", ";
                    }
                    str += renderTimes[i];
                }
                str += "]";
                console.log(str);*/
      }
    }
    return dirtyRenders > 0;
  }

  getHeaviestNode(window: Window): Node {
    let node: Node = this;
    let heaviest: number = 0;
    let heaviestNode: Node = this;
    do {
      if (node._extended) {
        const painter: NodePainter = node._extended.windowPainter[window.id()];
        if (painter) {
          const nodeWeight: number = painter.weight();
          if (heaviest < nodeWeight) {
            heaviestNode = node;
            heaviest = nodeWeight;
          }
        }
      }
      node = node._paintGroupNext;
    } while (node !== this);
    return heaviestNode;
  }

  renderOffscreen(
      window: Window,
      renderWorld: number[],
      renderScale: number[],
      forceSimple: boolean,
  ): boolean {
    if (!this.localPaintGroup()) {
      throw new Error('Cannot render a node that is not a paint group');
    }
    const painter: NodePainter = this._extended.windowPainter[window.id()];
    if (!painter) {
      return false;
    }
    painter.render(renderWorld, renderScale, forceSimple);
  }

  render(
      window: Window,
      camera: Camera,
      renderData: NodeRenderData,
  ): boolean {
    // console.log("RENDERING THE NODE");
    if (!this.localPaintGroup()) {
      throw new Error('Cannot render a node that is not a paint group');
    }
    const painter: NodePainter = this._extended.windowPainter[window.id()];
    if (!painter) {
      // window.log("Node has no painter for " + window.id());
      return false;
    }
    if (this._absoluteXPos === null) {
      // window.log("Node has no absolute pos");
      return false;
    }

    if (!renderData) {
      renderData = new NodeRenderData();
    }

    // Do not render paint groups that cannot be seen.
    const s: Rect = painter.bounds().clone(renderData.bounds);
    s.scale(this.scale());
    s.translate(this._absoluteXPos, this._absoluteYPos);
    if (camera && !camera.containsAny(s)) {
      // window.log("Out of bounds: " + this);
      return !this._absoluteDirty;
    }

    const world: number[] = camera.project();
    makeScale3x3I(renderData.scaleMat, this._absoluteScale);
    makeTranslation3x3I(
        renderData.transMat,
        this._absoluteXPos,
        this._absoluteYPos,
    );
    matrixMultiply3x3I(
        renderData.worldMat,
        renderData.scaleMat,
        renderData.transMat,
    );
    const renderWorld: number[] = matrixMultiply3x3I(
        renderData.worldMat,
        renderData.worldMat,
        world,
    );
    const renderScale: number =
      this._absoluteScale * (camera ? camera.scale() : 1);

    // console.log("Rendering paint group: " +
    //   this.absoluteX() + " " + this.absoluteY() +
    //   " " + this.absoluteScale());
    if (
      this._extended.cache &&
      renderScale < CACHE_ACTIVATION_SCALE
    ) {
      window.log('Rendering ' + this + ' from cache.');
      const cleanRender = this._extended.cache.render(
          window,
          renderWorld,
          renderData,
          CACHED_RENDERS === 0,
      );
      if (IMMEDIATE_RENDERS > 0) {
        // console.log("Immediately rendered " +IMMEDIATE_RENDERS + " times");
        IMMEDIATE_RENDERS = 0;
      }
      ++CACHED_RENDERS;
      return cleanRender && !this._absoluteDirty;
    }
    if (CACHED_RENDERS > 0) {
      // console.log("Rendered from cache " + CACHED_RENDERS + " times");
      CACHED_RENDERS = 0;
    }
    ++IMMEDIATE_RENDERS;

    // console.log("Rendering " + this + " in scene.");
    // console.log(this.absoluteX(), this.absoluteY());
    window.overlay().resetTransform();
    window
        .overlay()
        .scale(
            camera.scale() * this.absoluteScale(),
            camera.scale() * this.absoluteScale(),
        );
    window
        .overlay()
        .translate(camera.x() + this.absoluteX(),
            camera.y() + this.absoluteY());
    painter.render(renderWorld, renderScale);

    if (this._absoluteDirty) {
      // window.log("Node was rendered with dirty absolute position.");
    }
    return !this.isDirty() && !this._absoluteDirty;
  }
}

export function labeledBud(label: string, font?: Font): Node {
  const node: Node = new Node(Type.BUD);
  node.setLabel(label, font);
  return node;
}

export function labeledSlot(label: string, font?: Font): Node {
  const node: Node = new Node(Type.SLOT);
  node.setLabel(label, font);
  return node;
}

export function labeledBlock(label: string, font?: Font): Node {
  const node: Node = new Node(Type.BLOCK);
  node.setLabel(label, font);
  return node;
}
