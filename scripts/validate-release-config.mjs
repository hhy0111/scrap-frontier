import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const sampleAdMobAppId = 'ca-app-pub-3940256099942544~3347511713';
const unresolvedEmailNeedle = 'users.noreply.github.com';

const releaseDocPaths = [
  'docs/release-inputs/01-brand-legal.md',
  'docs/release-inputs/02-monetization-ids.md',
  'docs/release-inputs/03-android-release.md',
  'docs/release-inputs/04-store-listing.md',
  'docs/release-inputs/05-launch-ops.md'
];

const releaseConfigKeys = [
  'SCRAP_VERSION_CODE',
  'SCRAP_VERSION_NAME',
  'SCRAP_COMMERCE_MODE_RELEASE',
  'SCRAP_COMMERCE_PURCHASES_ENABLED_RELEASE',
  'SCRAP_COMMERCE_REWARDED_ENABLED_RELEASE',
  'SCRAP_ADMOB_APP_ID_RELEASE',
  'SCRAP_STARTER_PACK_PRODUCT_ID_RELEASE',
  'SCRAP_COMMANDER_PACK_PRODUCT_ID_RELEASE',
  'SCRAP_MONTHLY_PASS_PRODUCT_ID_RELEASE',
  'SCRAP_SALVAGE_DROP_AD_UNIT_ID_RELEASE',
  'SCRAP_SCOUT_PING_AD_UNIT_ID_RELEASE',
  'SCRAP_OFFLINE_OVERDRIVE_AD_UNIT_ID_RELEASE',
  'SCRAP_BASE_LOBBY_BANNER_AD_UNIT_ID_RELEASE'
];

const keystoreKeys = [
  'storeFile',
  'storePassword',
  'keyAlias',
  'keyPassword'
];

const keystoreEnvKeys = {
  storeFile: 'SCRAP_RELEASE_STORE_FILE',
  storePassword: 'SCRAP_RELEASE_STORE_PASSWORD',
  keyAlias: 'SCRAP_RELEASE_KEY_ALIAS',
  keyPassword: 'SCRAP_RELEASE_KEY_PASSWORD'
};

const failures = [];
const warnings = [];
const unansweredCounts = new Map();

const loadProperties = (relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  const values = new Map();

  if (!fs.existsSync(filePath)) {
    return { exists: false, values };
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values.set(key, value);
  }

  return { exists: true, values };
};

const getConfigValue = (map, envKey) => {
  const fileValue = map.get(envKey);
  if (typeof fileValue === 'string' && fileValue.length > 0) {
    return fileValue;
  }

  const envValue = process.env[envKey];
  return typeof envValue === 'string' ? envValue.trim() : '';
};

for (const relativePath of releaseDocPaths) {
  const filePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(filePath)) {
    failures.push(`Missing release input document: ${relativePath}`);
    continue;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*-\s*Answer:\s*(.*)$/);
    if (!match) {
      return;
    }

    if (match[1].trim().length === 0) {
      unansweredCounts.set(relativePath, (unansweredCounts.get(relativePath) ?? 0) + 1);
    }
  });
}

for (const [relativePath, count] of unansweredCounts.entries()) {
  failures.push(`Unanswered release inputs in ${relativePath}: ${count}`);
}

const releaseProperties = loadProperties('android/release.properties');
if (!releaseProperties.exists) {
  failures.push('Missing android/release.properties');
}

for (const key of releaseConfigKeys) {
  const value = getConfigValue(releaseProperties.values, key);
  if (!value) {
    failures.push(`Missing release config value: ${key}`);
  }
}

const releaseMode = getConfigValue(releaseProperties.values, 'SCRAP_COMMERCE_MODE_RELEASE');
if (releaseMode && releaseMode !== 'play-services') {
  warnings.push(`SCRAP_COMMERCE_MODE_RELEASE is "${releaseMode}", expected "play-services" for production`);
}

const releaseAdMobAppId = getConfigValue(releaseProperties.values, 'SCRAP_ADMOB_APP_ID_RELEASE');
if (releaseAdMobAppId === sampleAdMobAppId) {
  failures.push('SCRAP_ADMOB_APP_ID_RELEASE is still the Google sample App ID');
}

const keystoreProperties = loadProperties('android/keystore.properties');
if (!keystoreProperties.exists) {
  failures.push('Missing android/keystore.properties');
}

for (const key of keystoreKeys) {
  const value =
    keystoreProperties.values.get(key)?.trim() ||
    process.env[keystoreEnvKeys[key]]?.trim() ||
    '';
  if (!value || value === 'replace_me') {
    failures.push(`Missing keystore value: ${key}`);
  }
}

const storeFileValue =
  keystoreProperties.values.get('storeFile')?.trim() ||
  process.env[keystoreEnvKeys.storeFile]?.trim() ||
  '';
if (storeFileValue) {
  const storeFilePath = path.isAbsolute(storeFileValue)
    ? storeFileValue
    : path.join(rootDir, 'android', storeFileValue);
  if (!fs.existsSync(storeFilePath)) {
    failures.push(`Keystore file does not exist: ${storeFileValue}`);
  }
}

const appMetaPath = path.join(rootDir, 'src/app/appMeta.ts');
if (fs.existsSync(appMetaPath)) {
  const appMeta = fs.readFileSync(appMetaPath, 'utf8');
  if (appMeta.includes(unresolvedEmailNeedle)) {
    failures.push('src/app/appMeta.ts still uses the temporary noreply support email');
  }
}

const privacyPolicyPath = path.join(rootDir, 'public/privacy-policy.html');
if (fs.existsSync(privacyPolicyPath)) {
  const privacyPolicy = fs.readFileSync(privacyPolicyPath, 'utf8');
  if (privacyPolicy.includes(unresolvedEmailNeedle)) {
    failures.push('public/privacy-policy.html still uses the temporary noreply contact email');
  }
}

if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
  console.log('');
}

if (failures.length > 0) {
  console.error('Release validation failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Release validation passed.');
}
