// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
const unloadPixiDisplayTree = (root) => {
  var _a, _b, _c, _d, _e;
  const stack = [...((_a = root.children) != null ? _a : [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if ((_b = node.children) == null ? void 0 : _b.length) stack.push(...node.children);
    (_d = (_c = node.context) == null ? void 0 : _c.unload) == null ? void 0 : _d.call(_c);
    (_e = node.unload) == null ? void 0 : _e.call(node);
  }
};
const setPixiDisplayTreeVisibility = (root, visible) => {
  const wasVisible = root.visible !== false;
  root.visible = visible;
  if (wasVisible && !visible) unloadPixiDisplayTree(root);
};
const destroyPixiDisplayTree = (root) => {
  var _a, _b, _c;
  const order = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    order.push(node);
    if ((_a = node.children) == null ? void 0 : _a.length) stack.push(...node.children);
  }
  for (let index = order.length - 1; index >= 0; index -= 1)
    (_c = (_b = order[index]).destroy) == null ? void 0 : _c.call(_b);
};
const destroyPixiContainerChildren = (container) => {
  container.removeChildren().forEach(destroyPixiDisplayTree);
};
export {
  destroyPixiContainerChildren,
  destroyPixiDisplayTree,
  setPixiDisplayTreeVisibility,
  unloadPixiDisplayTree,
};
