import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const androidDir = path.join(projectRoot, 'android');
const localPropertiesPath = path.join(androidDir, 'local.properties');

const readExistingLines = () => {
  if (!fs.existsSync(localPropertiesPath)) {
    return [];
  }

  return fs
    .readFileSync(localPropertiesPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith('sdk.dir='));
};

const resolveSdkDir = () => {
  const rawSdkDir = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? null;

  if (!rawSdkDir) {
    throw new Error(
      [
        'Android SDK location not found.',
        'Set ANDROID_SDK_ROOT or ANDROID_HOME, or create android/local.properties manually.',
        'Example:',
        '  sdk.dir=C\\\\:\\\\Users\\\\<you>\\\\AppData\\\\Local\\\\Android\\\\Sdk'
      ].join('\n')
    );
  }

  const resolvedSdkDir = path.resolve(rawSdkDir);

  if (!fs.existsSync(resolvedSdkDir)) {
    throw new Error(`Android SDK path does not exist: ${resolvedSdkDir}`);
  }

  return resolvedSdkDir;
};

const toGradlePath = (value) => value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

const main = () => {
  if (!fs.existsSync(androidDir)) {
    throw new Error(`Android directory not found: ${androidDir}`);
  }

  const sdkDir = resolveSdkDir();
  const nextLines = [`sdk.dir=${toGradlePath(sdkDir)}`, ...readExistingLines()];
  fs.writeFileSync(localPropertiesPath, `${nextLines.join('\n')}\n`, 'utf8');
  console.log(`Wrote Android SDK path to ${localPropertiesPath}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
