import { configure } from '../../styles/pendolo/native-measure.mjs';
import { clearCache } from '../../styles/pendolo/pretext.mjs';
import { LayoutJob } from './layout-job.mjs';
let job = null,
  generation = -1;
WorkerScript.onMessage = function (message) {
  const request = JSON.parse(JSON.stringify(message));
  try {
    if (request.phase === 'layout') {
      generation = request.generation;
      job = new LayoutJob(request);
    } else if (request.generation !== generation || !job) return;
    else if (request.phase === 'measurements') job.accept(request.measurements);
    const result = job.step();
    WorkerScript.sendMessage(Object.assign({}, result, { generation }));
    if (result.phase === 'complete') {
      job = null;
      clearCache();
      configure({ pieces: [], widths: [] });
    }
  } catch (error) {
    job = null;
    WorkerScript.sendMessage({
      generation: request.generation,
      error: String(error.message || error),
    });
  }
};
