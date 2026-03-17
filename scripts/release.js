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

function quiet(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

// 0. 分支检查：当前应为 main
const branch = quiet('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(`Expected branch "main", current branch is "${branch}". Switch to main and push first.`);
  process.exit(1);
}

// 1. 未提交变更检查
const status = quiet('git status --porcelain');
if (status) {
  console.error('There are uncommitted changes. Commit and push before releasing.');
  process.exit(1);
}

// 2. 未推送提交检查（本地 main 与 origin/main 一致）
try {
  quiet('git rev-parse @{u}');
} catch (_) {
  console.error('Current branch has no upstream. Push to origin first.');
  process.exit(1);
}
const local = quiet('git rev-parse HEAD');
const remote = quiet('git rev-parse @{u}');
if (local !== remote) {
  console.error('Local main is ahead of origin/main. Push first.');
  process.exit(1);
}

// 3. 构建
console.log('Building...');
run('npm run build');

// 4. 检查是否已存在该 tag
try {
  execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
  console.error(`Tag ${tag} already exists. Bump version in package.json first.`);
  process.exit(1);
} catch (_) {}

// 5. 打 tag 并推送（触发 GitHub Release workflow）
console.log(`Creating and pushing tag ${tag}...`);
run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.log(`Done. Release workflow will run for ${tag}.`);
