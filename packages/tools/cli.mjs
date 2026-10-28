#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { readJson } from './contract.mjs';
import { checkBindings, checkHost } from './contract.mjs';
import {
  buildPackage,
  buildPluginArchive,
  buildIndex,
  sourceIndex,
  validatePackage,
  prepareIndex,
} from './packages.mjs';

const usage = `echo-plugin build <source> [--out <directory>]
echo-plugin validate <built-package>
echo-plugin build-index [--root <repository>]
echo-plugin prepare-index [--root <repository>]
echo-plugin check-published [--root <repository>]
echo-plugin check-index [--root <repository>]
echo-plugin check-sdk [--host <executable>]
echo-plugin sdk-sync --host <executable>
echo-plugin test-host --host <executable> [--runtime-test <executable>] [--root <repository>]`;

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      host: { type: 'string' },
      out: { type: 'string' },
      root: { type: 'string' },
      'runtime-test': { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const [command, input, ...extra] = positionals;
  if (extra.length) throw new Error('Unexpected positional arguments');
  const root = path.resolve(values.root ?? '.');
  if (values.help) console.info(usage);
  else if (command === 'build' && input)
    console.info(
      (await buildPluginArchive(path.resolve(input), values.out ?? path.join(root, 'dist'))).file,
    );
  else if (command === 'validate' && input)
    console.info((await validatePackage(path.resolve(input))).id);
  else if (command === 'build-index')
    for (const destination of await buildIndex(root)) {
      const manifest = await readJson(path.join(destination, 'manifest.json'));
      console.info(path.join(root, 'dist', `${manifest.id}-${manifest.version}.echomod`));
    }
  else if (command === 'prepare-index' || command === 'check-published')
    console.info(await prepareIndex(root, command === 'check-published'));
  else if (command === 'check-index')
    console.info(`Validated ${(await sourceIndex(root)).length} source manifests`);
  else if (command === 'check-sdk') {
    if (values.host) await checkHost(path.resolve(values.host));
    else await checkBindings();
    console.info('SDK bindings match the Qt contract');
  } else if (command === 'sdk-sync' && values.host) {
    await checkHost(path.resolve(values.host), true);
    console.info('Synchronized actual Qt contract; review and commit the snapshot');
  } else if (command === 'test-host' && values.host) {
    const host = path.resolve(values.host);
    await checkHost(host);
    const directories = await buildIndex(root);
    const destinations = await Promise.all(
      directories.map(async (directory) => {
        const manifest = await readJson(path.join(directory, 'manifest.json'));
        return path.join(root, 'dist', `${manifest.id}-${manifest.version}.echomod`);
      }),
    );
    if (!destinations.length)
      throw new Error('Host acceptance requires at least one actual package');
    const logDirectory = path.join(root, 'build/host-smoke-logs');
    await mkdir(logDirectory, { recursive: true });
    const execute = promisify(execFile);
    const { stdout, stderr } = await execute(
      host,
      [
        '--smoke-test',
        '--log-dir',
        logDirectory,
        ...destinations.flatMap((destination) => ['--plugin-dir', destination]),
      ],
      {
        env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
        timeout: 20000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    console.info(stdout + stderr);
    if (values['runtime-test']) {
      const spectrum = destinations.find((destination) =>
        path.basename(destination).startsWith('spectrum-visualizer-'),
      );
      if (!spectrum)
        throw new Error('Runtime command acceptance requires the spectrum-visualizer package');
      const result = await execute(
        path.resolve(values['runtime-test']),
        [
          'builtAuthorPackageCommands',
          'hostNavigationRoutesHistoryCancellationAndAccount',
          'hostSettingsPersistenceSubscriptionsAndRevocation',
          'hostActionsDynamicAsyncAndLifecycle',
          'hostActionsProductionHoverBadgeAndBusy',
          'hostCoverFallbackPriorityErrorsThemeAndRetirement',
          'hostAccessAuthorizationCancellationAndDisable',
          'processAuthorizationOwnershipAndTreeRetirement',
          'processCancellationAccountAndContentGrant',
          'hostInterceptorsPriorityForwardOnceAndOrigin',
          'hostInterceptorsCancellationRetirementAndErrors',
          'hostInterceptorAuthorizationRevocationAndSessionIsolation',
          'hostTransportMocksRecoveryAndCancellation',
          'customWindowsRealEntryScopesAndRetirement',
          'tcpRealBinaryCancellationAndRevocation',
          'tcpHalfCloseReceivesResponseAfterFin',
          'localHttpRealRequestsChunkingAndErrors',
          'localWebSocketUpgradeBinaryPingAndLimits',
          'resourceAccountAndDisableDrainRealTransports',
        ],
        {
          env: {
            ...process.env,
            QT_QPA_PLATFORM: process.env.QT_QPA_PLATFORM || 'offscreen',
            ECHO_AUTHOR_PLUGIN_PACKAGE: spectrum,
          },
          timeout: 90000,
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      console.info(result.stdout + result.stderr);
    }
  } else throw new Error(usage);
} catch (error) {
  console.error(error.message);
  if (error.stdout || error.stderr) console.error((error.stdout ?? '') + (error.stderr ?? ''));
  process.exitCode = 1;
}
