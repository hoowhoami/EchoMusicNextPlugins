import type { PluginManifest, PluginPlatform } from 'echo:plugin-sdk';

const supported: PluginPlatform[] = ['windows', 'macos', 'linux'];
const requirements: PluginManifest['requires'] = {
  hostVersion: '>=0.1.0',
  sdkVersion: '>=1.0.0',
  features: ['manifest.platforms'],
  platforms: supported,
};
const universal: PluginManifest['requires'] = {
  hostVersion: '>=0.1.0',
  sdkVersion: '>=1.0.0',
  features: ['lifecycle'],
};
// @ts-expect-error Platform identifiers are canonical lowercase values.
const wrongCase: PluginPlatform = 'Windows';
// @ts-expect-error Unsupported platforms cannot be declared.
const unknown: PluginPlatform = 'android';
// @ts-expect-error The field is a list, not an individual platform.
const wrongShape: PluginManifest['requires']['platforms'] = 'windows';
void [requirements, universal, wrongCase, unknown, wrongShape];
