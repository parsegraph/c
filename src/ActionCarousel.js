import Node from './graph/Node';
import {defaultFont} from './graph/settings';
import {Type} from './graph/Node';
// eslint-disable-next-line require-jsdoc
export default function ActionCarousel() {
  this._actions = [];
}

ActionCarousel.prototype.addAction = function(
    action,
    listener,
    listenerThisArg,
) {
  if (typeof action === 'string') {
    const label = action;
    action = new Node(Type.BLOCK);
    action.setLabel(label, defaultFont());
  }
  if (!listenerThisArg) {
    listenerThisArg = this;
  }
  this._actions.push([action, listener, listenerThisArg]);
};

ActionCarousel.prototype.install = function(node, nodeData) {
  node.setClickListener(function(viewport) {
    this.onClick(viewport, node, nodeData);
  }, this);
  return function() {
    node.setClickListener(null);
  };
};

ActionCarousel.prototype.onClick = function(
    viewport,
    node,
    nodeData,
) {
  // console.log("Creating carousel");
  const carousel = viewport.carousel();
  carousel.clearCarousel();
  carousel.moveCarousel(node.absoluteX(), node.absoluteY());
  carousel.showCarousel();

  for (const i in this._actions) {
    if (Object.prototype.hasOwnProperty.call(this._actions, i)) {
      const actionData = this._actions[i];
      carousel.addToCarousel(
          actionData[0],
          actionData[1],
          actionData[2],
          nodeData,
      );
    }
  }
  carousel.scheduleCarouselRepaint();
};
