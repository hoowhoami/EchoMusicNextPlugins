// QA-only real source geometry corpus. Never shipped in the plugin runtime.
import { buildTemperaBlocks } from '../../../plugins/folia-lyrics-skin/qml/styles/tempera/temperaBlocks.mjs';
import { resolveTemperaPalette } from '../../../plugins/folia-lyrics-skin/qml/styles/tempera/temperaPalette.mjs';
import {
  createSceneGraph,
  localMatrix,
  multiply,
} from '../../../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs';
WorkerScript.onMessage = function (message) {
  const input = JSON.parse(JSON.stringify(message));
  try {
    const pixi = createSceneGraph(),
      palette = resolveTemperaPalette(
        {
          primaryColor: '#f8f4e9',
          backgroundColor: '#181828',
          secondaryColor: '#dd9999',
          accentColor: '#66bbcc',
        },
        { colorMode: input.colorMode || 'duo' },
        ['#b14566', '#35618e', '#d3a437', '#5ea884'],
      );
    const blocks = buildTemperaBlocks(pixi, {
      kind: input.kind,
      width: input.width,
      height: input.height,
      palette,
      seed: input.seed || 137,
      flowAngle: -Math.PI * 0.5,
      showDecor: true,
      decor: {
        motif: 'hatch-twin',
        hatchAngle: 0.3,
        crossCount: 2,
        scribbleSeed: 31,
        fragments: [],
        watermark: null,
      },
    });
    blocks.updateTime(input.time, 0, 4, 3);
    const ops = [];
    function visit(node, matrix, alpha) {
      if (!node.visible) return;
      const world = multiply(matrix, localMatrix(node)),
        opacity = alpha * node.alpha;
      if (node.kind === 'graphics')
        ops.push({
          id:
            input.kind +
            '|' +
            input.colorMode +
            '|' +
            input.width +
            'x' +
            input.height +
            '|' +
            String(node.id),
          kind: 'graphics',
          matrix: world,
          alpha: opacity,
          paths: node.paths,
          revision: node.geometryRevision,
        });
      for (const child of node.children) visit(child, world, opacity);
    }
    visit(blocks.container, [1, 0, 0, 0, 1, 0], 1);
    WorkerScript.sendMessage({ key: input.key, ops });
  } catch (e) {
    WorkerScript.sendMessage({ key: input.key, error: String(e.message || e) });
  }
};
