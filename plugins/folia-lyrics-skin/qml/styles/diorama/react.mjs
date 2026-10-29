// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import { createEnvironment, withEnvironment, advanceEnvironment } from './environment.mjs';
let active = null,
  current = null;
const Fragment = '__fragment';
function createElement(type, props, ...children) {
  return { type, props: props || {}, children };
}
function slot(make) {
  if (!current) throw Error('Diorama hook outside component');
  const i = current.cursor++;
  return (i === current.hooks.length && current.hooks.push(make()), current.hooks[i]);
}
function equal(a, b) {
  return a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}
function useRef(value) {
  return slot(() => ({ current: value }));
}
function useMemo(run, deps) {
  const s = slot(() => ({ deps: null, value: null }));
  return (equal(s.deps, deps) || ((s.value = run()), (s.deps = deps)), s.value);
}
function useState(initial) {
  const runtime = active,
    s = slot(() => ({ value: typeof initial == 'function' ? initial() : initial }));
  return [
    s.value,
    (next) => {
      const value = typeof next == 'function' ? next(s.value) : next;
      Object.is(value, s.value) || ((s.value = value), (runtime.dirty = !0));
    },
  ];
}
function useEffect(run, deps) {
  const s = slot(() => ({ deps: null, cleanup: null }));
  equal(s.deps, deps) ||
    ((s.deps = deps),
    active.effects.push(() => {
      (s.cleanup && s.cleanup(), (s.cleanup = run()));
    }));
}
function useFrame(callback, priority = 0) {
  const s = slot(() => ({ frame: null, priority }));
  ((s.frame = callback), (s.priority = priority), active.frames.push(s));
}
function useThree(selector) {
  return selector(active.state);
}
const constructors = {
  group: THREE.Group,
  mesh: THREE.Mesh,
  points: THREE.Points,
  bufferGeometry: THREE.BufferGeometry,
  bufferAttribute: THREE.BufferAttribute,
  planeGeometry: THREE.PlaneGeometry,
  meshBasicMaterial: THREE.MeshBasicMaterial,
  pointsMaterial: THREE.PointsMaterial,
};
function nodes(value, out = []) {
  if (Array.isArray(value)) for (const child of value) nodes(child, out);
  else value != null && value !== !1 && value !== !0 && out.push(value);
  return out;
}
function property(object, name, value) {
  if (name === 'position' || name === 'scale') {
    Array.isArray(value)
      ? object[name].set(...value)
      : typeof value == 'number' && object[name].setScalar(value);
    return;
  }
  if (name === 'quaternion') {
    object.quaternion.set(...value);
    return;
  }
  if (name === 'color') {
    object.color.set(value);
    return;
  }
  object[name] = value;
}
function sameValue(a, b) {
  return Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => v === b[i])
    : a === b;
}
function release(runtime, entry) {
  if (entry) {
    for (const child of entry.children || []) release(runtime, child);
    if (entry.instance) for (const hook of entry.instance.hooks) hook.cleanup && hook.cleanup();
    (entry.props && typeof entry.props.ref == 'function'
      ? entry.props.ref(null)
      : entry.props && entry.props.ref && (entry.props.ref.current = null),
      entry.object && entry.object.parent && entry.object.parent.remove(entry.object),
      entry.owned && entry.object.dispose && entry.object.dispose());
  }
}
function reconcile(runtime, previous, element) {
  if (!element || !element.type) throw Error('Invalid Diorama scene element');
  const key = element.props.key === void 0 ? null : element.props.key;
  previous &&
    (previous.type !== element.type || previous.key !== key) &&
    (release(runtime, previous), (previous = null));
  const entry = previous || { type: element.type, key, children: [], props: {} };
  if (typeof element.type == 'function') {
    const old = current;
    ((current = entry.instance || (entry.instance = { hooks: [], cursor: 0 })),
      (current.cursor = 0));
    const result = element.type(Object.assign({}, element.props, { children: element.children }));
    return (
      (current = old),
      (entry.children = reconcileChildren(runtime, entry.children, nodes(result))),
      (entry.props = element.props),
      entry
    );
  }
  if (element.type !== Fragment) {
    const Constructor = constructors[element.type];
    if (!Constructor) throw Error('Unsupported original Diorama host node: ' + element.type);
    (entry.object &&
      !sameValue(entry.props.args, element.props.args) &&
      (entry.object.dispose && entry.object.dispose(), (entry.object = null)),
      entry.object ||
        ((entry.object = new Constructor(...(element.props.args || []))), (entry.owned = !0)));
    for (const name of Object.keys(element.props))
      !['ref', 'key', 'args', 'attach', 'children'].includes(name) &&
        !sameValue(entry.props[name], element.props[name]) &&
        property(entry.object, name, element.props[name]);
  }
  if (
    ((entry.children = reconcileChildren(runtime, entry.children, nodes(element.children))),
    entry.object)
  ) {
    const attach = (child) => {
      if (!child.object) {
        for (const nested of child.children) attach(nested);
        return;
      }
      const object = child.object;
      object.isObject3D
        ? object.parent !== entry.object && entry.object.add(object)
        : child.props.attach === 'attributes-position'
          ? entry.object.setAttribute('position', object)
          : object.isBufferGeometry
            ? (entry.object.geometry = object)
            : object.isMaterial && (entry.object.material = object);
    };
    for (const child of entry.children) attach(child);
    const ref = element.props.ref;
    typeof ref == 'function' ? ref(entry.object) : ref && (ref.current = entry.object);
  }
  return ((entry.props = element.props), entry);
}
function reconcileChildren(runtime, previous, elements) {
  const used = /* @__PURE__ */ new Set(),
    result = [];
  for (let i = 0; i < elements.length; i++) {
    const e = elements[i],
      key = e.props && e.props.key;
    let match = -1;
    (key !== void 0
      ? (match = previous.findIndex((v, n) => !used.has(n) && v.key === key && v.type === e.type))
      : previous[i] && !used.has(i) && previous[i].key === null && (match = i),
      match >= 0 && used.add(match),
      result.push(reconcile(runtime, match < 0 ? null : previous[match], e)));
  }
  for (let i = 0; i < previous.length; i++) used.has(i) || release(runtime, previous[i]);
  return result;
}
function createRoot() {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1e3);
  camera.position.set(0, 0.6, 9);
  const state = {
    camera,
    scene: new THREE.Scene(),
    clock: { elapsedTime: 0 },
    gl: {
      getDrawingBufferSize(out) {
        return out.set(state.width * state.resolution, state.height * state.resolution);
      },
    },
    width: 1,
    height: 1,
    resolution: 1,
  };
  return {
    state,
    environment: createEnvironment(),
    tree: [],
    frames: [],
    effects: [],
    dirty: !1,
    element: null,
  };
}
function render(root, element) {
  ((root.element = element),
    withEnvironment(root.environment, () => {
      let rounds = 0;
      do {
        if (++rounds > 8) throw Error('Diorama render stabilization exceeded');
        ((root.dirty = !1), (root.frames = []), (root.effects = []));
        const old = active;
        active = root;
        try {
          root.tree = reconcileChildren(root, root.tree, [element]);
        } finally {
          active = old;
        }
        const attach = (entry) => {
          if (entry.object && entry.object.isObject3D)
            entry.object.parent || root.state.scene.add(entry.object);
          else for (const child of entry.children) attach(child);
        };
        for (const entry of root.tree) attach(entry);
        for (const run of root.effects) run();
      } while (root.dirty);
    }));
}
function frame(root, delta, elapsed) {
  ((root.state.clock.elapsedTime = elapsed),
    advanceEnvironment(root.environment, elapsed * 1e3),
    root.dirty && render(root, root.element),
    withEnvironment(root.environment, () => {
      for (const callback of root.frames.slice().sort((a, b) => a.priority - b.priority))
        callback.frame(root.state, delta);
    }),
    root.state.camera.updateMatrixWorld(),
    root.state.scene.updateMatrixWorld());
}
function objects(root) {
  const result = [],
    visit = (entry) => {
      entry.object && entry.object.isObject3D && result.push(entry.object);
      for (const child of entry.children) visit(child);
    };
  for (const entry of root.tree) visit(entry);
  return result;
}
function destroy(root) {
  (withEnvironment(root.environment, () => {
    for (const entry of root.tree) release(root, entry);
  }),
    (root.tree = []),
    root.environment.raf.clear(),
    root.environment.timers.clear(),
    (root.frames = []),
    (root.element = null));
}
var stdin_default = { createElement, Fragment, useRef, useMemo, useEffect, useState };
export {
  Fragment,
  createElement,
  createRoot,
  stdin_default as default,
  destroy,
  frame,
  objects,
  render,
  useEffect,
  useFrame,
  useMemo,
  useRef,
  useState,
  useThree,
};
