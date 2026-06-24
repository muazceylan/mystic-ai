const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const exportDir = path.join(__dirname, '../ios/build/ipa');
const archiveInfoPlist = path.join(__dirname, '../ios/build/AstroGuru.xcarchive/Info.plist');

function readArchiveValue(key) {
  return execFileSync('/usr/libexec/PlistBuddy', [
    '-c',
    `Print :ApplicationProperties:${key}`,
    archiveInfoPlist,
  ], { encoding: 'utf8' }).trim();
}

function sanitize(value) {
  return String(value).replace(/[^0-9A-Za-z._-]/g, '-');
}

if (!fs.existsSync(archiveInfoPlist)) {
  console.error(`ERROR: Archive Info.plist bulunamadı: ${archiveInfoPlist}`);
  process.exit(1);
}

if (!fs.existsSync(exportDir)) {
  console.error(`ERROR: IPA export klasörü bulunamadı: ${exportDir}`);
  process.exit(1);
}

const versionName = readArchiveValue('CFBundleShortVersionString');
const buildNumber = readArchiveValue('CFBundleVersion');
const sourceIpa = path.join(exportDir, 'AstroGuru.ipa');

if (!fs.existsSync(sourceIpa)) {
  console.error(`ERROR: Export edilen IPA bulunamadı: ${sourceIpa}`);
  process.exit(1);
}

const versionedIpa = path.join(exportDir, `astroguru-${sanitize(versionName)}-${sanitize(buildNumber)}.ipa`);
fs.copyFileSync(sourceIpa, versionedIpa);

console.log(`IPA ready: ${versionedIpa}`);
