import { createIcuFoliaEngines } from '../../../plugins/folia-lyrics-skin/qml/shared/text/engines.mjs';
WorkerScript.onMessage = function (request) {
  WorkerScript.sendMessage({ words: createIcuFoliaEngines().cutChinese(request.text) });
};
