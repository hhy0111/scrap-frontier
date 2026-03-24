import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const readFile = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const writeFile = (relativePath, value) =>
  fs.writeFileSync(path.join(rootDir, relativePath), value, 'utf8');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAnswer = (content, label) => {
  const pattern = new RegExp(`${escapeRegExp(`- ${label}:`)}[\\s\\S]*?^- Answer:\\s*(.*)$`, 'm');
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? '';
};

const brandLegal = readFile('docs/release-inputs/01-brand-legal.md');

const appName = getAnswer(brandLegal, '최종 앱 이름');
const supportEmail = getAnswer(brandLegal, '지원 이메일');

if (!appName || !supportEmail) {
  console.error('Missing required answers in docs/release-inputs/01-brand-legal.md');
  console.error('- 최종 앱 이름');
  console.error('- 지원 이메일');
  process.exit(1);
}

const appMetaPath = 'src/app/appMeta.ts';
const appMeta = readFile(appMetaPath)
  .replace(/title: '.*?',/, `title: '${appName.replace(/'/g, "\\'")}',`)
  .replace(/supportEmail: '.*?'/, `supportEmail: '${supportEmail.replace(/'/g, "\\'")}'`);
writeFile(appMetaPath, appMeta);

const stringsPath = 'android/app/src/main/res/values/strings.xml';
const stringsXml = readFile(stringsPath)
  .replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${appName}</string>`)
  .replace(
    /<string name="title_activity_main">.*?<\/string>/,
    `<string name="title_activity_main">${appName}</string>`
  );
writeFile(stringsPath, stringsXml);

const privacyPolicyPath = 'public/privacy-policy.html';
let privacyPolicy = readFile(privacyPolicyPath);
privacyPolicy = privacyPolicy.replace(
  /<title>.*? Privacy Policy<\/title>/,
  `<title>${appName} Privacy Policy</title>`
);
privacyPolicy = privacyPolicy.replace(
  /<h1>.*? Privacy Policy<\/h1>/,
  `<h1>${appName} Privacy Policy</h1>`
);
privacyPolicy = privacyPolicy.replace(
  /mailto:[^"]+/,
  `mailto:${supportEmail}`
);
privacyPolicy = privacyPolicy.replace(
  />[^<@]+@[^<]+</,
  `>${supportEmail}<`
);
writeFile(privacyPolicyPath, privacyPolicy);

console.log('Synced release metadata:');
console.log(`- app name: ${appName}`);
console.log(`- support email: ${supportEmail}`);
