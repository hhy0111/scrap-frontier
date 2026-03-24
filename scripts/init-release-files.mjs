import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const pairs = [
  ['android/release.properties.example', 'android/release.properties'],
  ['android/keystore.properties.example', 'android/keystore.properties']
];

for (const [templateRelativePath, targetRelativePath] of pairs) {
  const templatePath = path.join(rootDir, templateRelativePath);
  const targetPath = path.join(rootDir, targetRelativePath);

  if (fs.existsSync(targetPath)) {
    console.log(`Exists: ${targetRelativePath}`);
    continue;
  }

  fs.copyFileSync(templatePath, targetPath);
  console.log(`Created: ${targetRelativePath}`);
}
