const fs = require('fs');
const path = require('path');

const pbxproj = path.join(__dirname, '../ios/AstroGuru.xcodeproj/project.pbxproj');
const content = fs.readFileSync(pbxproj, 'utf8');

const match = content.match(/CURRENT_PROJECT_VERSION = (\d+);/);
if (!match) {
  console.error('ERROR: CURRENT_PROJECT_VERSION bulunamadı — ios/AstroGuru.xcodeproj/project.pbxproj kontrol et');
  process.exit(1);
}

const current = parseInt(match[1], 10);
const next = current + 1;
const updated = content.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${next};`);

fs.writeFileSync(pbxproj, updated, 'utf8');
console.log(`CURRENT_PROJECT_VERSION: ${current} → ${next}`);
