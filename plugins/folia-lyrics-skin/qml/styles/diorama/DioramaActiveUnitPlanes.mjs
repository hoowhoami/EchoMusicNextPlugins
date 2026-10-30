// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import React from './react.mjs';
import * as THREE from './three.mjs';
import { UNSUNG_UNIT_OPACITY } from './dioramaSceneConstants.mjs';
const DioramaActiveUnitPlanes = ({ units, planes, primaryColor, accentColor }) =>
  /* @__PURE__ */ React.createElement(
    React.Fragment,
    null,
    units.map((placed, unitIndex) =>
      /* @__PURE__ */ React.createElement(
        'group',
        {
          key: unitIndex,
          ref: (el) => {
            planes.unitGroups[unitIndex] = el;
          },
        },
        /* @__PURE__ */ React.createElement(
          'mesh',
          {
            ref: (el) => {
              planes.glowMeshes[unitIndex] = el;
            },
            visible: !1,
            position: [placed.centerX, 0, -0.01],
            renderOrder: 17,
          },
          /* @__PURE__ */ React.createElement('planeGeometry', {
            args: [placed.width, placed.height],
          }),
          /* @__PURE__ */ React.createElement('meshBasicMaterial', {
            ref: (el) => {
              planes.glowMats[unitIndex] = el;
            },
            map: placed.raster.glowTexture,
            transparent: !0,
            opacity: 0,
            depthTest: !1,
            depthWrite: !1,
            blending: THREE.AdditiveBlending,
            color: accentColor,
          })
        ),
        /* @__PURE__ */ React.createElement(
          'mesh',
          {
            ref: (el) => {
              planes.soulMeshes[unitIndex] = el;
            },
            visible: !1,
            position: [placed.centerX, 0, -5e-3],
            renderOrder: 18,
          },
          /* @__PURE__ */ React.createElement('planeGeometry', {
            args: [placed.width, placed.height],
          }),
          /* @__PURE__ */ React.createElement('meshBasicMaterial', {
            ref: (el) => {
              planes.soulMats[unitIndex] = el;
            },
            map: placed.raster.baseTexture,
            transparent: !0,
            opacity: 0,
            depthTest: !1,
            depthWrite: !1,
            blending: THREE.AdditiveBlending,
            color: accentColor,
          })
        ),
        /* @__PURE__ */ React.createElement(
          'mesh',
          { position: [placed.centerX, 0, 0], renderOrder: 19 },
          /* @__PURE__ */ React.createElement('planeGeometry', {
            args: [placed.width, placed.height],
          }),
          /* @__PURE__ */ React.createElement('meshBasicMaterial', {
            ref: (el) => {
              planes.baseMats[unitIndex] = el;
            },
            map: placed.raster.baseTexture,
            transparent: !0,
            opacity: UNSUNG_UNIT_OPACITY,
            depthTest: !1,
            depthWrite: !1,
            color: primaryColor,
          })
        )
      )
    )
  );
export { DioramaActiveUnitPlanes };
