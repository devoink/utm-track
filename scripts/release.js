#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// 1. 构建
console.log('Building...');
run('npm run build');

// 2. 检查是否已存在该 tag
try {
  execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
  console.error(`Tag ${tag} already exists. Bump version in package.json first.`);
  process.exit(1);
} catch (_) {}

// 3. 打 tag 并推送（触发 GitHub Release workflow）
console.log(`Creating and pushing tag ${tag}...`);
run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.log(`Done. Release workflow will run for ${tag}.`);
