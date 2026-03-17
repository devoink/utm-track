#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

const SEP = '────────────────────────────────────────';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function quiet(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function fail(msg) {
  console.error('\n  ✗ ' + msg + '\n');
  process.exit(1);
}

console.log('\n' + SEP);
console.log('  发布 Release：' + tag);
console.log(SEP + '\n');

// 0. 分支检查
const branch = quiet('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  fail('当前分支是 "' + branch + '"，请先切换到 main 并推送后再发布。');
}
console.log('  ✓ 分支：main');

// 1. 未提交变更检查
const status = quiet('git status --porcelain');
if (status) {
  fail('存在未提交的变更，请先提交并推送后再发布。');
}
console.log('  ✓ 工作区：已全部提交');

// 2. 未推送提交检查
try {
  quiet('git rev-parse @{u}');
} catch (_) {
  fail('当前分支未设置上游，请先推送到 origin。');
}
const local = quiet('git rev-parse HEAD');
const remote = quiet('git rev-parse @{u}');
if (local !== remote) {
  fail('本地 main 领先于 origin/main，请先执行 git push 后再发布。');
}
console.log('  ✓ 远程：已与 origin/main 同步\n');

// 3. 构建
console.log(SEP);
console.log('  构建中…');
console.log(SEP);
run('npm run build');
console.log('');

// 4. 检查是否已存在该 tag
try {
  execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
  fail('标签 ' + tag + ' 已存在，请先在 package.json 中升级版本号。');
} catch (_) {}
console.log('  ✓ 标签 ' + tag + ' 可用\n');

// 5. 打 tag 并推送
console.log(SEP);
console.log('  创建并推送标签 ' + tag + '…');
console.log(SEP);
run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.log('\n' + SEP);
console.log('  ✓ Release 已触发：' + tag);
console.log('    GitHub 将自动创建 Release 并上传构建产物。');
console.log(SEP);
console.log('\n  如需发布到 npm，请执行：\n');
console.log('    npm publish\n');
console.log('  （预发版可加标签，例如：npm publish --tag alpha）\n');
