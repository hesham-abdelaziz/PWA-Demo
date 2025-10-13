#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

function bumpMinor(version) {
  if (typeof version !== 'string') {
    throw new Error(`Version must be a string, received ${typeof version}`);
  }

  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(.*)?$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  const patch = 0;
  const suffix = match[4] ?? '';

  return `${major}.${minor}.${patch}${suffix}`;
}

const packageJsonPath = path.join(rootDir, 'package.json');
const ngswConfigPath = path.join(rootDir, 'ngsw-config.json');

const pkg = readJson(packageJsonPath);
const ngswConfig = readJson(ngswConfigPath);

const newVersion = bumpMinor(pkg.version);

pkg.version = newVersion;

ngswConfig.appData = ngswConfig.appData ?? {};
ngswConfig.appData.version = newVersion;

writeJson(packageJsonPath, pkg);
writeJson(ngswConfigPath, ngswConfig);

console.log(`Version bumped to ${newVersion}`);
