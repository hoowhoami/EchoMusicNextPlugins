// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import {
  drawSonnetHexagonalPrism,
  drawSonnetSolidCuboid,
  drawSonnetTrapezoidPrism,
  drawSonnetTriangularPrism,
  resolveSonnetHudRotationQuarterTurns,
  resolveSonnetGeoVariant,
  resolveSonnetMoleculeVariant,
} from './sonnetSpatialMgGeometry.mjs';
import {
  resolveSonnetIconEntryDelay,
  resolveSonnetIconEntryDuration,
  resolveSonnetIconEntryPhase,
} from './sonnetIcons.mjs';
import { drawAdditionalSonnetShotMg } from './sonnetAdditionalShotMg.mjs';
import { AnimatedGraphics } from './sonnetAnimatedGraphics.mjs';
import {
  drawSonnetBackgroundMgHud,
  resolveSonnetBackgroundMgVariant,
} from './sonnetBackgroundMgVariants.mjs';
import {
  buildSonnetBackgroundDecor,
  resolveSonnetBackgroundDecorVariant,
} from './sonnetBackgroundDecor.mjs';
import { buildSonnetFixedGeo, resolveSonnetFixedGeoVariant } from './sonnetFixedGeoVariants.mjs';
import { SONNET_THEMED_GEO_VARIANT_START } from './sonnetThemedShotMg.mjs';
import { resolveSonnetShotMgBleed } from './sonnetShotMgViewport.mjs';
const colorNumber = (pixi, color) => pixi.Color.shared.setValue(color).toNumber(),
  normalizeAudioLevel = (value) => Math.min(1, Math.max(0, value > 1 ? value / 255 : value)),
  buildSonnetShotMg = (pixi, kind, theme, width, height, seed, iconTextures) => {
    const { Container } = pixi,
      container = new Container(),
      primary = colorNumber(pixi, theme.primaryColor),
      secondary = colorNumber(pixi, theme.secondaryColor),
      radius = Math.min(width, height),
      bg = new AnimatedGraphics(pixi),
      hw = width / 2,
      hh = height / 2;
    drawSonnetBackgroundMgHud({
      target: bg,
      variant: resolveSonnetBackgroundMgVariant(seed),
      width,
      height,
      seed,
      primary,
      secondary,
    });
    let geo,
      fixedGeoParts = [],
      fixedGeoLayer;
    if (kind === 'type-impact' || kind === 'fragment-collage') {
      if (((geo = new AnimatedGraphics(pixi)), !geo)) throw new Error('Unreachable');
      const geoVariant = resolveSonnetGeoVariant(seed);
      if (geoVariant === 0) {
        (geo.circle(0, 0, radius * 0.6).stroke({ color: primary, width: 6, alpha: 0.8 }),
          geo.circle(0, 0, radius * 0.58).stroke({ color: primary, width: 2, alpha: 0.4 }));
        for (let i = 0; i < 32; i++) {
          const angle = (i / 32) * Math.PI * 2,
            r1 = radius * (0.3 + (i % 3) * 0.05),
            r2 = radius * 0.55;
          geo
            .moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1)
            .lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2)
            .stroke({ color: primary, width: 1, alpha: 0.2 + (i % 2) * 0.1 });
        }
      } else if (geoVariant === 1) {
        const r = radius * 0.7;
        (geo
          .moveTo(0, -r)
          .lineTo(r, 0)
          .lineTo(0, r)
          .lineTo(-r, 0)
          .lineTo(0, -r)
          .stroke({ color: primary, width: 6, alpha: 0.8 }),
          geo
            .moveTo(0, -r * 0.96)
            .lineTo(r * 0.96, 0)
            .lineTo(0, r * 0.96)
            .lineTo(-r * 0.96, 0)
            .lineTo(0, -r * 0.96)
            .stroke({ color: primary, width: 2, alpha: 0.4 }),
          geo
            .moveTo(0, -r * 0.4)
            .lineTo(r * 0.4, 0)
            .lineTo(0, r * 0.4)
            .lineTo(-r * 0.4, 0)
            .lineTo(0, -r * 0.4)
            .stroke({ color: primary, width: 1, alpha: 0.6 }),
          geo.moveTo(-r, 0).lineTo(r, 0).stroke({ color: primary, width: 1, alpha: 0.3 }),
          geo.moveTo(0, -r).lineTo(0, r).stroke({ color: primary, width: 1, alpha: 0.3 }));
      } else if (geoVariant === 2) {
        const drawHex = (x, y, r, w, a) => {
          geo.moveTo(x + r * Math.sin(0), y - r * Math.cos(0));
          for (let j = 1; j <= 6; j++)
            geo.lineTo(x + r * Math.sin((j * Math.PI) / 3), y - r * Math.cos((j * Math.PI) / 3));
          geo.stroke({ color: primary, width: w, alpha: a });
        };
        (drawHex(0, 0, radius * 0.6, 6, 0.8),
          drawHex(0, 0, radius * 0.57, 2, 0.4),
          drawHex(0, 0, radius * 0.25, 1, 0.5));
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3 - Math.PI / 6;
          geo
            .moveTo(Math.cos(angle) * radius * 0.25, Math.sin(angle) * radius * 0.25)
            .lineTo(Math.cos(angle) * radius * 0.57, Math.sin(angle) * radius * 0.57)
            .stroke({ color: primary, width: 2, alpha: 0.4 });
        }
      } else if (geoVariant === 3) {
        const molVariant = resolveSonnetMoleculeVariant(seed);
        if (molVariant === 0) {
          const hexR = radius * 0.22,
            drawBenzene = (cx, cy, scale, rotationOffset = 0) => {
              const r = hexR * scale;
              geo.moveTo(cx + r * Math.sin(rotationOffset), cy - r * Math.cos(rotationOffset));
              for (let j = 1; j <= 6; j++)
                geo.lineTo(
                  cx + r * Math.sin((j * Math.PI) / 3 + rotationOffset),
                  cy - r * Math.cos((j * Math.PI) / 3 + rotationOffset)
                );
              geo.stroke({ color: primary, width: 3, alpha: 0.8 });
              for (let j = 0; j < 6; j += 2) {
                const innerR = r * 0.82;
                geo
                  .moveTo(
                    cx + innerR * Math.sin((j * Math.PI) / 3 + rotationOffset),
                    cy - innerR * Math.cos((j * Math.PI) / 3 + rotationOffset)
                  )
                  .lineTo(
                    cx + innerR * Math.sin(((j + 1) * Math.PI) / 3 + rotationOffset),
                    cy - innerR * Math.cos(((j + 1) * Math.PI) / 3 + rotationOffset)
                  )
                  .stroke({ color: primary, width: 2, alpha: 0.5 });
              }
            },
            rMain = hexR * 1.2;
          drawBenzene(0, 0, 1.2);
          const dx = Math.sin(Math.PI / 3) * rMain * 2;
          drawBenzene(dx, 0, 1.2);
          const branchDist = Math.sin(Math.PI / 3) * rMain * 2;
          (drawBenzene(
            -Math.sin(Math.PI / 6) * branchDist,
            -Math.cos(Math.PI / 6) * branchDist,
            1.2
          ),
            geo
              .moveTo(0, rMain)
              .lineTo(0, rMain + radius * 0.2)
              .lineTo(radius * 0.15, rMain + radius * 0.35)
              .stroke({ color: primary, width: 2, alpha: 0.6 }));
        } else if (molVariant === 1) {
          const hexR = radius * 0.22;
          geo.moveTo(0, -hexR);
          for (let j = 1; j <= 6; j++)
            geo.lineTo(hexR * Math.sin((j * Math.PI) / 3), -hexR * Math.cos((j * Math.PI) / 3));
          (geo.stroke({ color: primary, width: 3, alpha: 0.8 }),
            geo
              .moveTo(hexR * 0.8 * Math.sin(Math.PI / 3), -hexR * 0.8 * Math.cos(Math.PI / 3))
              .lineTo(
                hexR * 0.8 * Math.sin((2 * Math.PI) / 3),
                -hexR * 0.8 * Math.cos((2 * Math.PI) / 3)
              )
              .stroke({ color: primary, width: 2, alpha: 0.5 }),
            geo
              .moveTo(
                hexR * 0.8 * Math.sin((4 * Math.PI) / 3),
                -hexR * 0.8 * Math.cos((4 * Math.PI) / 3)
              )
              .lineTo(
                hexR * 0.8 * Math.sin((5 * Math.PI) / 3),
                -hexR * 0.8 * Math.cos((5 * Math.PI) / 3)
              )
              .stroke({ color: primary, width: 2, alpha: 0.5 }));
          const px1 = (hexR * Math.sqrt(3)) / 2,
            py1 = -hexR / 2,
            px2 = (hexR * Math.sqrt(3)) / 2,
            py2 = hexR / 2,
            pentTopX = px1 + hexR * 0.8,
            pentTopY = py1 - hexR * 0.1,
            pentMidX = px1 + hexR * 1.2,
            pentMidY = 0,
            pentBotX = px2 + hexR * 0.8,
            pentBotY = py2 + hexR * 0.1;
          geo
            .moveTo(px1, py1)
            .lineTo(pentTopX, pentTopY)
            .lineTo(pentMidX, pentMidY)
            .lineTo(pentBotX, pentBotY)
            .lineTo(px2, py2)
            .stroke({ color: primary, width: 3, alpha: 0.8 });
          const drawBranch = (sx, sy, angle, len, node) => {
            const ex = sx + Math.cos(angle) * len,
              ey = sy + Math.sin(angle) * len;
            (geo.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: primary, width: 2, alpha: 0.6 }),
              node && geo.circle(ex, ey, 6).stroke({ color: primary, width: 2, alpha: 0.8 }));
          };
          (drawBranch(0, -hexR, -Math.PI / 2, radius * 0.15, !0),
            drawBranch((-hexR * Math.sqrt(3)) / 2, hexR / 2, Math.PI * 0.8, radius * 0.2, !0),
            drawBranch((-hexR * Math.sqrt(3)) / 2, -hexR / 2, -Math.PI * 0.8, radius * 0.15, !1),
            drawBranch(pentMidX, pentMidY, 0, radius * 0.18, !1),
            drawBranch(pentMidX + radius * 0.18, pentMidY, Math.PI / 4, radius * 0.1, !0));
        } else {
          const segLen = radius * 0.18,
            steps = 7,
            startX = -segLen * (steps / 2) * Math.cos(Math.PI / 6),
            pts = [];
          let cx = startX,
            cy = 0;
          pts.push({ x: cx, y: cy });
          for (let i = 0; i < steps; i++)
            ((cx += segLen * Math.cos(Math.PI / 6)),
              (cy = (i % 2 === 0 ? 1 : -1) * segLen * Math.sin(Math.PI / 6)),
              pts.push({ x: cx, y: cy }));
          geo.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i <= steps; i++) geo.lineTo(pts[i].x, pts[i].y);
          geo.stroke({ color: primary, width: 3, alpha: 0.8 });
          const nx = -Math.sin(Math.PI / 6) * 6,
            ny = Math.cos(Math.PI / 6) * 6;
          geo
            .moveTo(pts[1].x + nx, pts[1].y + ny)
            .lineTo(pts[2].x + nx, pts[2].y + ny)
            .stroke({ color: primary, width: 2, alpha: 0.5 });
          for (let i = 1; i < steps; i++) {
            const angle = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
              bx = pts[i].x,
              by = pts[i].y + Math.sin(angle) * segLen * 0.6;
            (geo
              .moveTo(pts[i].x, pts[i].y)
              .lineTo(bx, by)
              .stroke({ color: primary, width: 2, alpha: 0.5 }),
              i % 2 !== 0
                ? geo.circle(bx, by, 5).stroke({ color: primary, width: 2, alpha: 0.8 })
                : geo
                    .moveTo(bx, by)
                    .lineTo(bx + segLen * 0.5, by - segLen * 0.3)
                    .stroke({ color: primary, width: 2, alpha: 0.5 }));
          }
        }
      } else if (geoVariant === 4) {
        const ellR = radius * 0.7;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI) / 3,
            steps = 60;
          for (let j = 0; j <= steps; j++) {
            const t = (j * Math.PI * 2) / steps,
              ex = Math.cos(t) * ellR,
              ey = Math.sin(t) * ellR * 0.18,
              rx = ex * Math.cos(angle) - ey * Math.sin(angle),
              ry = ex * Math.sin(angle) + ey * Math.cos(angle);
            j === 0 ? geo.moveTo(rx, ry) : geo.lineTo(rx, ry);
          }
          geo.stroke({ color: primary, width: 1, alpha: 0.3 });
        }
        geo.circle(0, 0, radius * 0.05).fill({ color: primary, alpha: 0.8 });
      } else if (geoVariant === 5) {
        const planetR = radius * 0.25;
        (geo
          .circle(0, 0, planetR)
          .fill({ color: primary, alpha: 0.15 })
          .stroke({ color: primary, width: 2, alpha: 0.8 }),
          geo
            .moveTo(-planetR * 0.7, -planetR * 0.5)
            .quadraticCurveTo(0, -planetR * 0.2, planetR * 0.7, -planetR * 0.5)
            .stroke({ color: primary, width: 1, alpha: 0.4 }),
          geo
            .moveTo(-planetR * 0.9, 0)
            .quadraticCurveTo(0, planetR * 0.3, planetR * 0.9, 0)
            .stroke({ color: primary, width: 1, alpha: 0.4 }));
        const ringRx = radius * 0.6,
          ringRy = radius * 0.15,
          angle = Math.PI / 6,
          drawTiltedEllipse = (rx, ry, w, a, segments = 60) => {
            for (let j = 0; j <= segments; j++) {
              const t = (j * Math.PI * 2) / segments,
                ex = Math.cos(t) * rx,
                ey = Math.sin(t) * ry,
                rotX = ex * Math.cos(angle) - ey * Math.sin(angle),
                rotY = ex * Math.sin(angle) + ey * Math.cos(angle);
              j === 0 ? geo.moveTo(rotX, rotY) : geo.lineTo(rotX, rotY);
            }
            geo.stroke({ color: primary, width: w, alpha: a });
          };
        (drawTiltedEllipse(ringRx, ringRy, 4, 0.5),
          drawTiltedEllipse(ringRx * 1.1, ringRy * 1.15, 1, 0.3),
          drawTiltedEllipse(ringRx * 1.25, ringRy * 1.3, 2, 0.2),
          geo.circle(0, 0, radius * 0.7).stroke({ color: primary, width: 1, alpha: 0.2 }),
          geo
            .circle(Math.cos(Math.PI / 4) * radius * 0.7, Math.sin(Math.PI / 4) * radius * 0.7, 8)
            .fill({ color: primary, alpha: 0.6 }));
      } else if (geoVariant === 6) {
        const bleed = resolveSonnetShotMgBleed(width, height, radius),
          w = bleed.x * 1.08,
          h = radius * 0.8,
          baseY = radius * 0.2;
        geo
          .circle(0, baseY - h * 0.6, radius * 0.3)
          .stroke({ color: primary, width: 2, alpha: 0.4 });
        for (let i = 0; i < 5; i++)
          geo
            .moveTo(-bleed.x, baseY - h * 0.6 + i * 15)
            .lineTo(bleed.x, baseY - h * 0.6 + i * 15)
            .stroke({ color: primary, width: 1, alpha: 0.3 });
        const peaks = 7;
        for (let layer = 0; layer < 3; layer++) {
          const layerW = w * (1 + layer * 0.2),
            layerH = h * (0.5 + layer * 0.25);
          geo.moveTo(-layerW / 2, baseY);
          for (let i = 1; i < peaks; i++) {
            const px = -layerW / 2 + (layerW / peaks) * i,
              py = baseY - layerH * (0.3 + 0.7 * Math.abs(Math.sin(seed + layer * 11 + i * 7)));
            geo.lineTo(px, py);
          }
          (geo.lineTo(layerW / 2, baseY),
            geo.stroke({ color: primary, width: 3 - layer, alpha: 0.6 - layer * 0.15 }));
        }
        geo.moveTo(-w, baseY).lineTo(w, baseY).stroke({ color: primary, width: 4, alpha: 0.8 });
        for (let i = 0; i < 5; i++) {
          const gridY = baseY + Math.pow(i, 1.5) * 12;
          geo
            .moveTo(-w, gridY)
            .lineTo(w, gridY)
            .stroke({ color: primary, width: 1, alpha: 0.4 - i * 0.08 });
        }
        for (let i = -4; i <= 4; i++)
          geo
            .moveTo(i * radius * 0.2, baseY)
            .lineTo(i * bleed.x * 0.32, bleed.y)
            .stroke({ color: primary, width: 1, alpha: 0.3 });
      } else if (geoVariant === 7) {
        for (let i = 1; i <= 6; i++) {
          const r = radius * 0.15 * i;
          geo
            .circle(0, 0, r)
            .stroke({ color: primary, width: i % 2 === 0 ? 2 : 1, alpha: 0.2 + (i % 3) * 0.1 });
        }
        (geo
          .moveTo(-radius * 0.9, 0)
          .lineTo(radius * 0.9, 0)
          .stroke({ color: primary, width: 1, alpha: 0.4 }),
          geo
            .moveTo(0, -radius * 0.9)
            .lineTo(0, radius * 0.9)
            .stroke({ color: primary, width: 1, alpha: 0.4 }),
          geo.moveTo(0, 0),
          geo.arc(0, 0, radius * 0.75, 0, Math.PI / 4),
          geo.lineTo(0, 0),
          geo.fill({ color: primary, alpha: 0.1 }),
          geo.stroke({ color: primary, width: 2, alpha: 0.5 }));
        const rOuter = radius * 0.8;
        for (let i = 0; i < 72; i++) {
          const angle = (i / 72) * Math.PI * 2,
            len = i % 18 === 0 ? 20 : i % 6 === 0 ? 10 : 5;
          geo
            .moveTo(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter)
            .lineTo(Math.cos(angle) * (rOuter + len), Math.sin(angle) * (rOuter + len))
            .stroke({ color: primary, width: 1, alpha: 0.4 });
        }
        const lockAngle = ((seed % 360) * Math.PI) / 180,
          lockR = radius * 0.45,
          lx = Math.cos(lockAngle) * lockR,
          ly = Math.sin(lockAngle) * lockR;
        (geo.rect(lx - 15, ly - 15, 30, 30).stroke({ color: primary, width: 2, alpha: 0.8 }),
          geo
            .moveTo(lx, ly - 20)
            .lineTo(lx, ly + 20)
            .stroke({ color: primary, width: 1, alpha: 0.6 }),
          geo
            .moveTo(lx - 20, ly)
            .lineTo(lx + 20, ly)
            .stroke({ color: primary, width: 1, alpha: 0.6 }));
      } else if (geoVariant === 8) {
        const fw = radius * 0.85,
          fh = radius * 0.65,
          bracketSize = radius * 0.15,
          drawBracket = (cx, cy, sx, sy) => {
            (geo
              .moveTo(cx - sx * bracketSize, cy)
              .lineTo(cx, cy)
              .lineTo(cx, cy - sy * bracketSize)
              .stroke({ color: primary, width: 3, alpha: 0.7 }),
              geo
                .moveTo(cx - sx * bracketSize * 0.8, cy - sy * 8)
                .lineTo(cx - sx * 8, cy - sy * 8)
                .lineTo(cx - sx * 8, cy - sy * bracketSize * 0.8)
                .stroke({ color: primary, width: 1, alpha: 0.4 }));
          };
        (drawBracket(-fw, -fh, -1, -1),
          drawBracket(fw, -fh, 1, -1),
          drawBracket(-fw, fh, -1, 1),
          drawBracket(fw, fh, 1, 1));
        for (let i = -fw + 20; i < fw - 20; i += 20)
          (geo
            .moveTo(i, -fh)
            .lineTo(i, -fh - (i % 60 === 0 ? 12 : 6))
            .stroke({ color: primary, width: 1, alpha: 0.5 }),
            geo
              .moveTo(i, fh)
              .lineTo(i, fh + (i % 60 === 0 ? 12 : 6))
              .stroke({ color: primary, width: 1, alpha: 0.5 }));
        (geo.circle(0, 0, radius * 0.1).stroke({ color: primary, width: 2, alpha: 0.4 }),
          geo
            .moveTo(-radius * 0.15, 0)
            .lineTo(radius * 0.15, 0)
            .stroke({ color: primary, width: 1, alpha: 0.4 }),
          geo
            .moveTo(0, -radius * 0.15)
            .lineTo(0, radius * 0.15)
            .stroke({ color: primary, width: 1, alpha: 0.4 }),
          geo.rect(-fw, -fh + 20, 10, 40).fill({ color: primary, alpha: 0.5 }),
          geo.rect(-fw, -fh + 65, 10, 15).fill({ color: primary, alpha: 0.3 }),
          geo.rect(fw - 10, fh - 60, 10, 40).fill({ color: primary, alpha: 0.5 }));
      } else if (geoVariant === 9) {
        const drawCube = (cx, cy, size, alpha) => {
          const dy = size * 0.5,
            dx = size * 0.866;
          (geo
            .moveTo(cx, cy - size)
            .lineTo(cx + dx, cy - dy)
            .lineTo(cx, cy)
            .lineTo(cx - dx, cy - dy)
            .lineTo(cx, cy - size)
            .fill({ color: primary, alpha: alpha * 0.15 })
            .stroke({ color: primary, width: 2, alpha: alpha * 0.8 }),
            geo
              .moveTo(cx, cy)
              .lineTo(cx + dx, cy - dy)
              .lineTo(cx + dx, cy + size - dy)
              .lineTo(cx, cy + size)
              .lineTo(cx, cy)
              .fill({ color: primary, alpha: alpha * 0.3 })
              .stroke({ color: primary, width: 2, alpha: alpha * 0.8 }),
            geo
              .moveTo(cx, cy)
              .lineTo(cx - dx, cy - dy)
              .lineTo(cx - dx, cy + size - dy)
              .lineTo(cx, cy + size)
              .lineTo(cx, cy)
              .fill({ color: primary, alpha: alpha * 0.05 })
              .stroke({ color: primary, width: 2, alpha: alpha * 0.8 }));
        };
        (drawCube(0, 0, radius * 0.35, 0.8),
          drawCube(radius * 0.4, -radius * 0.15, radius * 0.2, 0.5),
          drawCube(-radius * 0.45, radius * 0.25, radius * 0.25, 0.6),
          drawCube(0, radius * 0.45, radius * 0.15, 0.4),
          geo
            .moveTo(0, 0)
            .lineTo(radius * 0.4, -radius * 0.15)
            .stroke({ color: primary, width: 1, alpha: 0.3 }),
          geo
            .moveTo(0, 0)
            .lineTo(-radius * 0.45, radius * 0.25)
            .stroke({ color: primary, width: 1, alpha: 0.3 }));
      } else if (geoVariant === 10) {
        (geo.circle(0, 0, radius * 0.75).stroke({ color: primary, width: 1, alpha: 0.2 }),
          geo.circle(0, 0, radius * 0.73).stroke({ color: primary, width: 2, alpha: 0.1 }));
        const nodes = [];
        for (let i = 0; i < 18; i++) {
          const r = radius * (0.1 + ((seed * 17 + i * 23) % 65) / 100),
            angle = (((seed * 11 + i * 37) % 360) * Math.PI) / 180;
          nodes.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        for (let i = 0; i < nodes.length; i++) {
          (geo.circle(nodes[i].x, nodes[i].y, 3).fill({ color: primary, alpha: 0.7 }),
            geo.circle(nodes[i].x, nodes[i].y, 6).stroke({ color: primary, width: 1, alpha: 0.3 }));
          for (let j = i + 1; j < nodes.length; j++) {
            const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            dist < radius * 0.45 &&
              geo
                .moveTo(nodes[i].x, nodes[i].y)
                .lineTo(nodes[j].x, nodes[j].y)
                .stroke({ color: primary, width: 1, alpha: 0.4 * (1 - dist / (radius * 0.45)) });
          }
        }
      } else if (geoVariant === 11) {
        const moonR = radius * 0.4;
        (geo.moveTo(0, -moonR),
          geo.arc(0, 0, moonR, -Math.PI / 2, Math.PI / 2, !1),
          geo.quadraticCurveTo(-moonR * 0.4, 0, 0, -moonR),
          geo.fill({ color: primary, alpha: 0.8 }),
          geo.circle(0, 0, moonR).stroke({ color: primary, width: 1, alpha: 0.3 }));
        const orbitR = radius * 0.65;
        geo.circle(0, 0, orbitR).stroke({ color: primary, width: 1, alpha: 0.2 });
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 2,
            mx = Math.cos(angle) * orbitR,
            my = Math.sin(angle) * orbitR;
          (geo.circle(mx, my, 8).stroke({ color: primary, width: 1, alpha: 0.5 }),
            i === 0 ||
              (i === 4
                ? geo.circle(mx, my, 6).fill({ color: primary, alpha: 0.8 })
                : geo
                    .moveTo(mx, my - 6)
                    .arc(mx, my, 6, -Math.PI / 2, Math.PI / 2, i > 4)
                    .lineTo(mx, my - 6)
                    .fill({ color: primary, alpha: 0.5 })));
        }
        const drawStar = (sx, sy, sr) => {
          geo
            .moveTo(sx, sy - sr)
            .lineTo(sx + sr * 0.2, sy - sr * 0.2)
            .lineTo(sx + sr, sy)
            .lineTo(sx + sr * 0.2, sy + sr * 0.2)
            .lineTo(sx, sy + sr)
            .lineTo(sx - sr * 0.2, sy + sr * 0.2)
            .lineTo(sx - sr, sy)
            .lineTo(sx - sr * 0.2, sy - sr * 0.2)
            .fill({ color: primary, alpha: 0.7 });
        };
        (drawStar(-radius * 0.4, -radius * 0.5, 12),
          drawStar(radius * 0.5, -radius * 0.3, 8),
          drawStar(-radius * 0.2, radius * 0.5, 15));
      } else if (geoVariant === 12) {
        const petalLen = radius * 0.5,
          drawPetal = (angle, length, width2, alpha) => {
            const endX = 0 + Math.cos(angle) * length,
              endY = 0 + Math.sin(angle) * length,
              ctrlDist = length * 0.5,
              lca = angle - width2,
              c1x = 0 + Math.cos(lca) * ctrlDist,
              c1y = 0 + Math.sin(lca) * ctrlDist,
              rca = angle + width2,
              c2x = 0 + Math.cos(rca) * ctrlDist,
              c2y = 0 + Math.sin(rca) * ctrlDist;
            (geo.moveTo(0, 0),
              geo.quadraticCurveTo(c1x, c1y, endX, endY),
              geo.quadraticCurveTo(c2x, c2y, 0, 0),
              geo.stroke({ color: primary, width: 1, alpha }),
              alpha > 0.5 && geo.fill({ color: primary, alpha: alpha * 0.2 }));
          };
        for (let layer = 0; layer < 4; layer++) {
          const petals = 8 + layer * 4,
            currentLen = petalLen * (1 - layer * 0.2),
            currentWidth = 0.3 - layer * 0.05,
            offset = layer * (Math.PI / petals);
          for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2 + offset;
            drawPetal(angle, currentLen, currentWidth, 0.8 - layer * 0.15);
          }
        }
        (geo.circle(0, 0, radius * 0.08).stroke({ color: primary, width: 2, alpha: 0.8 }),
          geo.circle(0, 0, radius * 0.03).fill({ color: primary, alpha: 0.9 }));
        const stemR = radius * 0.65;
        for (let i = 0; i < 3; i++) {
          const startAngle = (i / 3) * Math.PI * 2;
          (geo.moveTo(Math.cos(startAngle) * stemR, Math.sin(startAngle) * stemR),
            geo
              .bezierCurveTo(
                Math.cos(startAngle + 1) * stemR * 1.2,
                Math.sin(startAngle + 1) * stemR * 1.2,
                Math.cos(startAngle + 2) * stemR * 0.8,
                Math.sin(startAngle + 2) * stemR * 0.8,
                Math.cos(startAngle + 3) * stemR,
                Math.sin(startAngle + 3) * stemR
              )
              .stroke({ color: primary, width: 1, alpha: 0.4 }));
          const lx = Math.cos(startAngle + 1.5) * stemR * 1.05,
            ly = Math.sin(startAngle + 1.5) * stemR * 1.05;
          geo.circle(lx, ly, 4).fill({ color: primary, alpha: 0.6 });
        }
      } else if (geoVariant === 13) {
        const soflR = radius * 0.25,
          drawIntersectingCircle = (cx, cy, alpha) => {
            geo.circle(cx, cy, soflR).stroke({ color: primary, width: 1.5, alpha });
          };
        drawIntersectingCircle(0, 0, 0.35);
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2,
            cx = Math.cos(angle) * soflR,
            cy = Math.sin(angle) * soflR;
          drawIntersectingCircle(cx, cy, 0.2);
        }
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2,
            dist = i % 2 === 0 ? soflR * 2 : soflR * Math.sqrt(3),
            cx = Math.cos(angle) * dist,
            cy = Math.sin(angle) * dist;
          geo.circle(cx, cy, soflR).stroke({ color: secondary, width: 1, alpha: 0.1 });
        }
        (geo.circle(0, 0, soflR * 3).stroke({ color: primary, width: 1.5, alpha: 0.2 }),
          geo.circle(0, 0, soflR * 3.1).stroke({ color: secondary, width: 1, alpha: 0.08 }));
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          geo
            .moveTo(Math.cos(angle) * soflR * 0.5, Math.sin(angle) * soflR * 0.5)
            .lineTo(Math.cos(angle) * soflR * 3, Math.sin(angle) * soflR * 3)
            .stroke({ color: secondary, width: 1, alpha: 0.05 });
        }
      } else if (geoVariant === 14) {
        const direction = seed % 2 === 0 ? 1 : -1;
        (drawSonnetSolidCuboid(
          geo,
          radius * 0.18 * direction,
          radius * 0.03,
          radius * 0.62,
          radius * 0.7,
          radius * 0.22 * direction,
          -radius * 0.16,
          primary,
          0.34
        ),
          drawSonnetSolidCuboid(
            geo,
            -radius * 0.48 * direction,
            radius * 0.24,
            radius * 0.28,
            radius * 0.38,
            radius * 0.12 * direction,
            -radius * 0.09,
            primary,
            0.24
          ),
          drawSonnetSolidCuboid(
            geo,
            radius * 0.55 * direction,
            -radius * 0.3,
            radius * 0.2,
            radius * 0.26,
            radius * 0.09 * direction,
            -radius * 0.07,
            primary,
            0.2
          ));
      } else if (geoVariant === 15) {
        const direction = seed % 2 === 0 ? 1 : -1;
        (drawSonnetTriangularPrism(
          geo,
          -radius * 0.12 * direction,
          radius * 0.02,
          radius * 0.72,
          radius * 0.68,
          radius * 0.18 * direction,
          -radius * 0.13,
          primary,
          0.34
        ),
          drawSonnetTriangularPrism(
            geo,
            radius * 0.48 * direction,
            radius * 0.26,
            radius * 0.28,
            radius * 0.25,
            -radius * 0.08 * direction,
            -radius * 0.06,
            primary,
            0.22
          ),
          drawSonnetTriangularPrism(
            geo,
            -radius * 0.5 * direction,
            -radius * 0.3,
            radius * 0.2,
            radius * 0.18,
            radius * 0.06 * direction,
            -radius * 0.05,
            primary,
            0.18
          ));
      } else if (geoVariant === 16) {
        const direction = seed % 2 === 0 ? 1 : -1;
        (drawSonnetHexagonalPrism(
          geo,
          radius * 0.12 * direction,
          0,
          radius * 0.68,
          radius * 0.72,
          radius * 0.2 * direction,
          -radius * 0.14,
          primary,
          0.32
        ),
          drawSonnetHexagonalPrism(
            geo,
            -radius * 0.48 * direction,
            radius * 0.27,
            radius * 0.25,
            radius * 0.28,
            radius * 0.07 * direction,
            -radius * 0.05,
            primary,
            0.2
          ),
          drawSonnetHexagonalPrism(
            geo,
            radius * 0.52 * direction,
            -radius * 0.3,
            radius * 0.18,
            radius * 0.2,
            -radius * 0.06 * direction,
            -radius * 0.045,
            primary,
            0.17
          ));
      } else if (geoVariant === 17) {
        const direction = seed % 2 === 0 ? 1 : -1;
        (drawSonnetTrapezoidPrism(
          geo,
          radius * 0.12 * direction,
          radius * 0.04,
          radius * 0.3,
          radius * 0.68,
          radius * 0.62,
          radius * 0.18 * direction,
          -radius * 0.13,
          primary,
          0.34
        ),
          drawSonnetTrapezoidPrism(
            geo,
            -radius * 0.42 * direction,
            radius * 0.28,
            radius * 0.2,
            radius * 0.38,
            radius * 0.22,
            radius * 0.08 * direction,
            -radius * 0.06,
            primary,
            0.21
          ),
          drawSonnetTrapezoidPrism(
            geo,
            radius * 0.5 * direction,
            -radius * 0.3,
            radius * 0.2,
            radius * 0.12,
            radius * 0.22,
            -radius * 0.06 * direction,
            -radius * 0.05,
            primary,
            0.18
          ));
      } else
        drawAdditionalSonnetShotMg({
          target: geo,
          variant: geoVariant,
          radius,
          width,
          height,
          seed,
          primary,
          secondary,
        });
      ([6, 8, 9, 14, 15, 16, 17, 20, 22, 23].includes(geoVariant) ||
      geoVariant >= SONNET_THEMED_GEO_VARIANT_START
        ? geoVariant === 8 &&
          (geo.rotation = resolveSonnetHudRotationQuarterTurns(seed) * (Math.PI / 2))
        : (geo.rotation = ((seed * 13) % 360) * (Math.PI / 180)),
        container.addChild(geo.display),
        (fixedGeoLayer = new Container()),
        (fixedGeoParts = buildSonnetFixedGeo({
          pixi,
          layer: fixedGeoLayer,
          variant: resolveSonnetFixedGeoVariant(seed),
          radius,
          seed,
          primary,
          secondary,
        })),
        container.addChild(fixedGeoLayer));
    } else if (kind === 'editorial-column') {
      for (let i = 1; i <= 6; i++) {
        const x = -hw + width * (i / 7);
        bg.moveTo(x, -hh).lineTo(x, hh).stroke({ color: primary, width: 1, alpha: 0.15 });
      }
      for (let i = 1; i <= 4; i++) {
        const y = -hh + height * (i / 5);
        bg.moveTo(-hw, y).lineTo(hw, y).stroke({ color: primary, width: 1, alpha: 0.15 });
      }
      bg.rect(-hw + width * 0.2, -hh + height * 0.2, width * 0.6, height * 0.6).stroke({
        color: primary,
        width: 4,
        alpha: 0.5,
      });
    } else
      for (let i = 0; i < 5; i++) {
        const size = 10 + (seed % (i + 1)) * 5;
        bg.rect(
          -hw + width * (0.2 + ((seed * 11 + i) % 60) / 100),
          -hh + height * (0.2 + ((seed * 17 + i) % 60) / 100),
          size,
          size
        ).fill({ color: primary, alpha: 0.4 });
      }
    ((container.bg = bg),
      (container.bgLayer = bg.display),
      geo && ((container.geo = geo), (container.geoLayer = geo.display)),
      (container.fixedGeoParts = fixedGeoParts),
      (container.fixedGeoLayer = fixedGeoLayer),
      container.addChild(bg.display));
    const decor = buildSonnetBackgroundDecor({
        pixi,
        kind,
        width,
        height,
        seed,
        primary,
        secondary,
        iconTextures: Array.from(iconTextures.values()),
      }),
      particleLayer = decor.layer,
      iconAnimations = decor.iconAnimations;
    let smoothedIconAudio = 0;
    return (
      iconAnimations.forEach((icon, index) => {
        icon.entryPhase = resolveSonnetIconEntryPhase(index, iconAnimations.length);
      }),
      container.addChild(particleLayer),
      (container.particleLayer = particleLayer),
      (container.decorVariant = resolveSonnetBackgroundDecorVariant(seed)),
      (container.updateTime = (
        time,
        cues,
        startTime,
        endTime,
        audioBass = 0,
        audioPower = 0,
        audioVocal = 0
      ) => {
        let targetFinishTime = endTime;
        if (cues.length > 0) {
          const lastWordStart = cues[cues.length - 1].at;
          targetFinishTime = Math.max(lastWordStart, startTime + (endTime - startTime) * 0.95);
        } else targetFinishTime = startTime + (endTime - startTime) * 0.95;
        targetFinishTime = Math.min(endTime, targetFinishTime);
        const drawDuration = Math.max(1, targetFinishTime - startTime),
          rawProgress = Math.min(1, Math.max(0, (time - startTime) / drawDuration)),
          c = container;
        if ((c.geo && c.geo.update(rawProgress), c.bg && c.bg.update(rawProgress), c.fixedGeoParts))
          for (const part of c.fixedGeoParts) part.update(rawProgress);
        {
          const audioEnergy =
              normalizeAudioLevel(audioBass) * 0.34 +
              normalizeAudioLevel(audioVocal) * 0.52 +
              normalizeAudioLevel(audioPower) * 0.14,
            gatedEnergy = Math.max(0, (audioEnergy - 0.08) / 0.92),
            targetIconAudio = Math.min(1, Math.pow(gatedEnergy, 0.68) * 1.35),
            smoothing = targetIconAudio > smoothedIconAudio ? 0.34 : 0.16;
          smoothedIconAudio += (targetIconAudio - smoothedIconAudio) * smoothing;
        }
        const sceneDuration = Math.max(0.01, endTime - startTime);
        iconAnimations.forEach((icon) => {
          const entryDuration = resolveSonnetIconEntryDuration(
              sceneDuration,
              icon.preferredDuration
            ),
            entryDelay = resolveSonnetIconEntryDelay(icon.entryPhase, sceneDuration, entryDuration),
            entryProgress = Math.min(
              1,
              Math.max(0, (time - startTime - entryDelay) / entryDuration)
            ),
            entryEased = 1 - Math.pow(1 - entryProgress, 3),
            loopPulse = (Math.sin((time - startTime) * Math.PI * 0.7 + icon.phase) + 1) * 0.5,
            audioScale = 1 + smoothedIconAudio * 0.42,
            loopScale = 1 + loopPulse * 0.025,
            alphaLift = 0.72 + smoothedIconAudio * 0.38;
          ((icon.node.alpha = Math.min(
            1,
            icon.baseAlpha * entryEased * (alphaLift + loopPulse * 0.03)
          )),
            icon.node.scale.set(
              icon.baseScale * (0.72 + entryEased * 0.28) * audioScale * loopScale
            ));
        });
      }),
      container
    );
  };
export { buildSonnetShotMg };
