import parsegraph_Window from "./Window";
import parsegraph_World from "./World";
import parsegraph_TimingBelt from "./TimingBelt";
import parsegraph_Viewport from "./Viewport";

/**
 * Show a basic graph given a parsegraph_Node.
 */
export default function parsegraph_showGraph(rootNode) {
  var window = new parsegraph_Window();
  var world = new parsegraph_World();

  var belt = new parsegraph_TimingBelt();
  belt.addWindow(window);

  var viewport = new parsegraph_Viewport(window, world);
  window.addComponent(viewport.component());

  world.plot(rootNode);
  viewport.showInCamera(rootNode);

  return window.container();
}
