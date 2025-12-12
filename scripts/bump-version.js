#!/usr/bin/env node

/**
 * Custom version bumping script for Expo projects
 * Updates package.json, app.json version, and increments Android versionCode
 */

const fs = require('fs');
const path = require('path');

// Get version type from command line (patch, minor, major)
const versionType = process.argv[2] || 'patch';

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Read app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Bump version based on type
switch (versionType) {
  case 'major':
    major += 1;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor += 1;
    patch = 0;
    break;
  case 'patch':
  default:
    patch += 1;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

// Update app.json
appJson.expo.version = newVersion;

// Increment Android versionCode
if (appJson.expo.android && appJson.expo.android.versionCode) {
  appJson.expo.android.versionCode += 1;
} else {
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = 1;
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
console.log(`✅ Android versionCode: ${appJson.expo.android.versionCode}`);
console.log(`\n📝 Updated files:`);
console.log(`   - package.json`);
console.log(`   - app.json`);

