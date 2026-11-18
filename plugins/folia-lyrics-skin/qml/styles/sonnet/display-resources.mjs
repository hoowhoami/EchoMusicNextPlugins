// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const unloadPixiDisplayTree = (root) => {
    var _a, _b, _c, _d, _e;
    const stack = [...((_a = root.children) != null ? _a : [])];
    for (; stack.length > 0;) {
      const node = stack.pop();
      ((_b = node.children) != null && _b.length && stack.push(...node.children),
        (_d = (_c = node.context) == null ? void 0 : _c.unload) == null || _d.call(_c),
        (_e = node.unload) == null || _e.call(node));
    }
  },
  setPixiDisplayTreeVisibility = (root, visible) => {
    const wasVisible = root.visible !== !1;
    ((root.visible = visible), wasVisible && !visible && unloadPixiDisplayTree(root));
  },
  destroyPixiDisplayTree = (root) => {
    var _a, _b, _c;
    const order = [],
      stack = [root];
    for (; stack.length > 0;) {
      const node = stack.pop();
      (order.push(node), (_a = node.children) != null && _a.length && stack.push(...node.children));
    }
    for (let index = order.length - 1; index >= 0; index -= 1)
      (_c = (_b = order[index]).destroy) == null || _c.call(_b);
  },
  destroyPixiContainerChildren = (container) => {
    container.removeChildren().forEach(destroyPixiDisplayTree);
  };
export {
  destroyPixiContainerChildren,
  destroyPixiDisplayTree,
  setPixiDisplayTreeVisibility,
  unloadPixiDisplayTree,
};
