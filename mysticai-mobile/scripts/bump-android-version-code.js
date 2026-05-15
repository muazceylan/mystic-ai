const fs = require('fs');
const path = require('path');

const buildGradle = path.join(__dirname, '../android/app/build.gradle');
const content = fs.readFileSync(buildGradle, 'utf8');

const match = content.match(/versionCode\s+(\d+)/);
if (!match) {
  console.error('ERROR: versionCode bulunamadı — android/app/build.gradle kontrol et');
  process.exit(1);
}

const current = parseInt(match[1], 10);
const next = current + 1;
const updated = content.replace(/versionCode\s+\d+/, `versionCode ${next}`);

fs.writeFileSync(buildGradle, updated, 'utf8');
console.log(`versionCode: ${current} → ${next}`);
