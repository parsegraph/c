// eslint-disable-next-line require-jsdoc
export default function JavaScriptWidget(graph) {
  this.graph = graph;
  this.caret = new Caret('b');
  this.caret.label('Program');
}

/*
 * Builds a child node in the given direcction. The caret is left at a position
 * where another child node could be spawned in that direction.
 *
 * Some children do not nest themselves, so they will consist of several nodes
 * in a given direction. This means that popping back to before the child was
 * created will not yield a place for a node to be spawned in that direction.
 * This is not as common as the child consisting of a single node, so it must
 * be the case to keep in mind when constructing trees.
 *
 *  | downward inDir
 *  +== forward spawnDir
 *  |
 *
 * I expect inDir to be either parsegraph_INWARD, parsegraph_FORWARD, or
 * parsegraph_DOWNWARD.
 */
JavaScriptWidget.prototype.buildChild = function(child, inDir) {
  inDir = parsegraph_readNodeDirection(inDir);
  const car = this.caret;
  switch (child.type) {
    case 'Identifier':
      // Identifiers are plain ol' slots.
      car.spawnMove(inDir, 's');
      car.label(child.name);
      break;
    case 'Literal':
      // Identifiers are plain ol' slots.
      car.spawnMove(inDir, 's');
      car.label(child.raw);
      break;
    case 'ExpressionStatement':
      /* Expression statements are drawn directly; make no visual
       * note of the nested statement.
       */
      this.buildChild(child.expression, inDir);
      break;
    case 'ReturnStatement':
      // Return statements have the keyword plus any value, in-order.
      car.spawnMove(inDir, 'b');
      car.label('return');
      if (child.argument) {
        this.buildChild(child.argument, inDir);
      }
      break;
    case 'BinaryExpression':
    case 'AssignmentExpression':
      this.buildChild(child.left, inDir);

      // Inward nodes, once inside, spawn forward.
      if (inDir === INWARD) {
        inDir = FORWARD;
      }
      car.spawnMove(inDir, 'bu');
      car.label(child.operator);
      this.buildChild(child.right, inDir);
      break;
    case 'MemberExpression':
      this.buildChild(child.object, inDir);

      // Inward nodes, once inside, spawn forward.
      if (inDir === INWARD) {
        inDir = FORWARD;
      }

      // Spawn the operator.
      car.spawnMove(inDir, 'bu');
      car.label('.');

      // Spawn the property name.
      this.buildChild(child.property, inDir);
      break;
    case 'UpdateExpression':
    case 'UnaryExpression':
      if (child.prefix) {
        // Spawn the prefix operator.
        car.spawnMove(inDir, 'bu');
        car.label(child.operator);

        // Inward nodes, once inside, spawn forward.
        if (inDir === INWARD) {
          inDir = FORWARD;
        }

        // Spawn the value.
        this.buildChild(child.argument, inDir);
      } else {
        // Spawn the value.
        this.buildChild(child.argument, inDir);

        // Inward nodes, once inside, spawn forward.
        if (inDir === INWARD) {
          inDir = FORWARD;
        }

        // Spawn the postfix operator.
        car.spawnMove(inDir, 'bu');
        car.label(child.operator);
      }
      break;
    case 'ThisExpression':
      car.spawnMove(inDir, 's');
      car.label('this');
      break;
    case 'BreakStatement':
      car.spawnMove(inDir, 'b');
      car.label('break');
      break;
    case 'EmptyStatement':
      car.spawnMove(inDir, 'bu');
      car.label(';');
      break;
    case 'WhileStatement':
      car.spawnMove(inDir, 'b');
      car.label('while');
      car.push();
      this.buildChild(child.test, 'f');
      car.pop();
      if (child.body) {
        car.spawnMove('d', 'bu');
        this.buildChild(child.body, 'f', 'f');
      }
      break;
    case 'BlockStatement':
      this.buildBody(child, inDir, parsegraph_turnRight(inDir));
      break;
    case 'ForStatement':
      car.spawnMove(inDir, 'b');
      car.label('for');

      car.push();
      car.pull('f');
      car.align('f', 'c');
      car.spawnMove('f', 'bu');

      car.push();
      this.buildChild(child.init, 'f');
      car.pop();
      car.pull('f');

      car.spawnMove('d', 'bu');

      car.push();
      this.buildChild(child.test, 'f');
      car.pop();

      car.spawnMove('d', 'bu');
      this.buildChild(child.update, 'f');
      car.pop();

      this.buildBody(child.body, parsegraph_DOWNWARD, parsegraph_DOWNWARD);
      break;
    /*    case 'ArrayExpression':
        car.spawnMove(inDir, 'b');

        for(var i = 0; i < child.elements.length; ++i) {
            var elem = child.elements[i];
            if(i === 0) {
                car.spawnMove('i', 'bu');
                car.shrink();
                this.buildChild(elem, 'd');
            }
            else {
                car.spawnMove('f', 'bu');
                this.buildChild(elem, 'd');
            }
        }

        break;
    case 'ThrowStatement':
        car.spawnMove(inDir, 'b');
        car.label('throw');
        if(inDir === parsegraph_INWARD) {
            inDir = parsegraph_FORWARD;
        }
        this.buildChild(child.argument, inDir);
        break;
*/
    case 'CallExpression':
      car.spawnMove(inDir, 'b');
      car.push();
      this.buildChild(child.callee, 'i');
      car.pop();
      if (inDir === INWARD) {
        inDir = FORWARD;
      }

      // Arguments
      car.pull(inDir);
      car.spawnMove(inDir, 'b');
      for (let i = 0; i < child.arguments.length; ++i) {
        const arg = child.arguments[i];
        if (i === 0) {
          car.shrink();
          this.buildChild(arg, 'i');
        } else {
          this.buildChild(arg, 'f');
        }
        if (i < child.arguments.length - 1) {
          car.spawnMove('f', 'bu');
          car.label(',');
        }
      }
      break;
    /*
    case 'NewExpression':
        car.spawnMove(inDir, 'b');
        car.label('new');
        this.buildChild(child.callee, 'i');

        if(inDir === INWARD) {
            inDir = FORWARD;
        }

        // Arguments
        car.pull(inDir);
        car.spawnMove(inDir, 'b');
        for(var i = 0; i < child.arguments.length; ++i) {
            var arg = child.arguments[i];
            if(i === 0) {
                car.spawnMove('i', 'bu');
                car.shrink();
                this.buildChild(arg, 'd');
            }
            else {
                car.spawnMove('f', 'bu');
                this.buildChild(arg, 'd');
            }
        }

        break;
*/
    case 'IfStatement':
      car.spawnMove(inDir, 'b');
      car.label('if');
      car.push();
      car.pull(inDir);
      this.buildChild(child.test, 'i');
      car.pop();

      inDir = parsegraph_alternateNodeDirection(inDir);
      car.spawnMove(inDir, 'bu');
      car.shrink();
      car.label('then');

      car.push();
      inDir = parsegraph_alternateNodeDirection(inDir);
      car.pull(inDir);
      if (parsegraph_isVerticalNodeDirection(inDir)) {
        car.align(inDir, 'center');
      }
      this.buildChild(child.consequent, inDir);
      car.pop();

      if (child.alternate) {
        if (inDir === DOWNWARD) {
          car.spawnMove('f', 'bu');
        } else {
          car.spawnMove('d', 'bu');
        }
        car.label('else');
        if (parsegraph_isVerticalNodeDirection(inDir)) {
          car.align(inDir, 'center');
        }
        this.buildChild(child.alternate, inDir);
      }

      break;
    case 'VariableDeclaration':
      car.spawnMove(inDir, 'b');
      car.label(child.kind);
      for (let i = 0; i < child.declarations.length; ++i) {
        const decl = child.declarations[i];
        car.push();
        switch (decl.type) {
          case 'VariableDeclarator':
            this.buildChild(decl.id, 'i');
            break;
          default:
            throw new Error('NYI');
        }
        car.pop();

        if (decl.init) {
          car.push();
          car.spawnMove('f', 'bu');
          car.label('=');
          this.buildChild(decl.init, 'f');
          car.pop();
        }
      }
      break;
    case 'FunctionExpression':
    case 'FunctionDeclaration':
      car.spawnMove(inDir, 'b');
      car.label('function');
      car.push();

      // Name
      if (child.id) {
        car.push();
        this.buildChild(child.id, 'i');
        car.pop();
      }

      // Parameters.
      car.pull(inDir);
      car.spawnMove(inDir, 'b');
      for (let i = 0; i < child.params; ++i) {
        car.spawnMove(inDir, 's');
      }
      car.pop();

      // Body.
      this.buildBody(child.body, parsegraph_DOWNWARD, parsegraph_DOWNWARD);
      car.shrink(parsegraph_DOWNWARD);
      break;
    default:
      car.spawnMove(inDir, 'b');
      car.label(child.type);
      break;
  }
};

/*
 * Builds each child node of a given AST node, creating the first bud in the
 * inDir, and then spawning each subsequent bud in the spawnDir direction.
 * If spawnDir === FORWARD, then the child graph will be downward
 * and centered. If spawnDir === DOWNWARD, then the child graph
 * will be forward and narrow.
 */
JavaScriptWidget.prototype.buildBody = function(
    ast,
    inDir,
    spawnDir,
) {
  if (ast.body.length === 0) {
    return;
  }

  const car = this.caret;
  car.push();

  if (ast.body.length === 1) {
    car.pull(spawnDir);
    this.buildChild(ast.body[0], spawnDir);
    car.pop();
    return;
  }

  car.spawn(inDir, 'bu');
  if (spawnDir === FORWARD) {
    car.align(inDir, 'center');
  }
  car.move(inDir);
  for (let i = 0; i < ast.body.length; ++i) {
    if (i > 0) {
      car.spawnMove(spawnDir, 'bu');
    }

    const realSpawnDir = parsegraph_alternateNodeDirection(spawnDir);
    car.pull(realSpawnDir);
    car.push();
    this.buildChild(ast.body[i], realSpawnDir);
    car.pop();
  }
  car.pop();
};

JavaScriptWidget.prototype.load = function(url) {
  const that = this;
  // eslint-disable-next-line require-jsdoc
  function buildTree() {
    if (!esprima) {
      throw new Error('Esprima must be included.');
    }
    const ast = esprima.parse(this.responseText);

    const car = that.caret;
    car.moveToRoot();
    car.erase('f');
    car.erase('d');

    car.label(url);
    car.spawnMove('i', 's');
    car.label(ast.sourceType);
    car.move('o');

    that.buildBody(ast, DOWNWARD, FORWARD);

    that.graph.scheduleRepaint();
  }
  const oReq = new XMLHttpRequest();
  oReq.addEventListener('load', buildTree);
  oReq.open('GET', url);
  oReq.send();
};
