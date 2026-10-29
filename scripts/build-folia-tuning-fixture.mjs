import { resolveFoliaReference } from './folia-reference.mjs';
// Independent snapshots of original typed defaults, not copies of plugin descriptors.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const reference = await resolveFoliaReference(process.argv[2]);
const sourceCommit = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const source = 'src/types.ts',
  text = await readFile(path.join(reference, source), 'utf8');
const code = (await transform(text, { loader: 'ts', format: 'esm', target: 'es2016' })).code;
const original = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);
const output = 'tests/fixtures/tuning/source-defaults.json';
const snapshot = {
  sourceCommit,
  source,
  sha256: createHash('sha256').update(text).digest('hex'),
  license: 'AGPL-3.0-only',
  tempera: original.DEFAULT_TEMPERA_TUNING,
  lumiere: original.DEFAULT_LUMIERE_TUNING,
  sonnet: original.DEFAULT_SONNET_TUNING,
  nomand: original.DEFAULT_NOMAND_BACKGROUND_TUNING,
  monet: original.DEFAULT_MONET_BACKGROUND_TUNING,
  diorama: original.DEFAULT_DIORAMA_TUNING,
};
await writeFile(
  output,
  await format(JSON.stringify(snapshot), { ...(await resolveConfig(output)), parser: 'json' }),
);
