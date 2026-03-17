#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const pkgPath = path.join(__dirname, '..', 'package.json');
const lockPath = path.join(__dirname, '..', 'package-lock.json');

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

function readPkg() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function writePkg(pkg) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// 简单的版本号格式校验（允许 1.0.0、1.0.0-alpha 等）
function isValidVersion(s) {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test((s || '').trim());
}

function doRelease(version, tag) {
  console.log('\n  → 新版本：' + tag + '\n');
  console.log(SEP);
  console.log('  构建中…');
  console.log(SEP);
  run('npm run build');
  console.log('');
  console.log(SEP);
  console.log('  创建并推送标签 ' + tag + '…');
  console.log(SEP);
  run(`git tag ${tag}`);
  run(`git push origin ${tag}`);
  console.log('\n' + SEP);
  console.log('  ✓ Release 已触发：' + tag);
  console.log('    GitHub 将自动创建 Release 并上传构建产物。');
  console.log(SEP);
  promptNpmPublish(version);
}

function promptNpmPublish(version) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const isPreRelease = version.includes('-');
  const suggestedTag = (version.match(/-([a-zA-Z0-9]+)/) || [])[1] || 'alpha';

  console.log('');
  rl.question('  是否发布到 npm？ [Y/n]: ', (ans1) => {
    const go = (ans1 || '').trim().toLowerCase() !== 'n';
    if (!go) {
      console.log('\n  已跳过 npm 发布。\n');
      rl.close();
      return;
    }
    console.log('');
    console.log('  发布类型：');
    console.log('    1) 正式版  - npm publish');
    console.log('    2) 预发版  - npm publish --tag ' + suggestedTag + (isPreRelease ? '  [推荐]' : ''));
    console.log('');
    const def = isPreRelease ? '2' : '1';
    rl.question('  请选择 (1/2，直接回车为 ' + (isPreRelease ? '2' : '1') + '): ', (ans2) => {
      const choice = (ans2 || '').trim() || def;
      const cmd = choice === '2' ? 'npm publish --tag ' + suggestedTag : 'npm publish';
      console.log('\n  执行: ' + cmd + '\n');
      rl.close();
      try {
        run(cmd);
        console.log('\n  ✓ npm 发布完成。\n');
      } catch (err) {
        console.error('\n  ✗ npm 发布失败，可稍后手动执行: ' + cmd + '\n');
      }
    });
  });
}

function promptTagExists(currentVersion, tag) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('');
  console.log('  ✗ 标签 ' + tag + ' 已存在，该版本已发布过。');
  console.log('');
  console.log('  请选择升级方式：');
  console.log('    1) patch  - 修订号 +1（' + currentVersion + ' → 下一修订版）');
  console.log('    2) minor  - 次版本 +1（' + currentVersion + ' → 下一 minor）');
  console.log('    3) major  - 主版本 +1（' + currentVersion + ' → 下一 major）');
  console.log('    4) 自定义 - 手动输入版本号');
  console.log('    5) 退出');
  console.log('');

  rl.question('  请输入选项 (1-5): ', (answer) => {
    const choice = (answer || '').trim();
    rl.close();

    if (choice === '5' || choice === '') {
      console.log('\n  已取消。\n');
      process.exit(0);
    }

    let newVersion;
    if (choice === '1') {
      run('npm version patch --no-git-tag-version', { stdio: 'pipe' });
      newVersion = readPkg().version;
    } else if (choice === '2') {
      run('npm version minor --no-git-tag-version', { stdio: 'pipe' });
      newVersion = readPkg().version;
    } else if (choice === '3') {
      run('npm version major --no-git-tag-version', { stdio: 'pipe' });
      newVersion = readPkg().version;
    } else if (choice === '4') {
      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl2.question('  请输入版本号（如 0.1.0 或 1.0.0-beta）: ', (custom) => {
        rl2.close();
        const v = (custom || '').trim().replace(/^v/, '');
        if (!isValidVersion(v)) {
          console.error('\n  ✗ 版本号格式不正确，应为 x.y.z 或 x.y.z-label。\n');
          process.exit(1);
        }
        const pkg = readPkg();
        pkg.version = v;
        writePkg(pkg);
        if (fs.existsSync(lockPath)) {
          try {
            const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            lock.version = v;
            fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
          } catch (_) {}
        }
        newVersion = v;
        commitPushAndRelease(newVersion);
      });
      return;
    } else {
      console.error('\n  ✗ 无效选项，请输入 1-5。\n');
      process.exit(1);
    }
    commitPushAndRelease(newVersion);
  });
}

function commitPushAndRelease(newVersion) {
  const newTag = 'v' + newVersion;
  console.log('\n  ✓ 已更新为 ' + newTag);
  console.log('  提交并推送中…\n');
  run('git add package.json package-lock.json');
  run('git commit -m "chore: release ' + newTag + '"');
  run('git push origin main');
  doRelease(newVersion, newTag);
}

// ---------- 主流程 ----------

let pkg = readPkg();
let version = pkg.version;
let tag = 'v' + version;

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
console.log('  ✓ 远程：已与 origin/main 同步');

// 3. 检查标签是否已存在
try {
  execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
  promptTagExists(version, tag);
  return;
} catch (_) {}
console.log('  ✓ 标签：' + tag + ' 可用\n');

// 4. 构建并发布
doRelease(version, tag);
