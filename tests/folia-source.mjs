// Source-oracle tests use the same verified inputs as the production generators.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveFoliaReference } from '../scripts/folia-reference.mjs';

const reference = await resolveFoliaReference();
export const foliaPath = (relative = '') => path.join(reference, relative);
export const foliaURL = (relative = '') =>
  pathToFileURL(foliaPath(relative) + (relative ? '' : path.sep));
