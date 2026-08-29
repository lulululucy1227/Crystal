import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PermissionDeniedError, authorizeOperation } from '../tools/bridge_permission_gate.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const allowedRelative = '.agent-state/permission-gate-test-allowed.tmp';
const allowedPath = path.join(repoRoot, allowedRelative);
const deniedPath = path.join(repoRoot, '.agent-state', 'permission-gate-test-denied.tmp');

const grant = {
  permission_mode: 'SAFE_WRITE',
  allowed_operations: ['create', 'modify', 'delete'],
  allow_write: [allowedRelative]
};

function expectDenied(callback) {
  assert.throws(callback, (error) => error instanceof PermissionDeniedError && error.code === 'PERMISSION_DENIED');
}

test('default deny rejects missing or incomplete grants before a filesystem write', () => {
  assert.equal(fs.existsSync(deniedPath), false);
  expectDenied(() => authorizeOperation({ repoRoot, grant: null, operation: 'create', targetPath: deniedPath }));
  expectDenied(() => authorizeOperation({ repoRoot, grant: { permission_mode: 'SAFE_WRITE', allowed_operations: ['create'] }, operation: 'create', targetPath: deniedPath }));
  assert.equal(fs.existsSync(deniedPath), false);
});

test('exact path matching rejects prefix and repo-root escapes before a write', () => {
  expectDenied(() => authorizeOperation({ repoRoot, grant, operation: 'create', targetPath: `${allowedRelative}-malicious` }));
  expectDenied(() => authorizeOperation({ repoRoot, grant, operation: 'create', targetPath: '..\\outside.txt' }));
  expectDenied(() => authorizeOperation({ repoRoot, grant, operation: 'create', targetPath: path.resolve(repoRoot, '..', 'outside.txt') }));
  assert.equal(fs.existsSync(deniedPath), false);
});

test('allowlisted create modify and delete are checked before each filesystem operation', () => {
  assert.equal(fs.existsSync(allowedPath), false, 'test artifact must not pre-exist');

  const create = authorizeOperation({ repoRoot, grant, operation: 'create', targetPath: allowedRelative });
  assert.equal(create.decision, 'ALLOW');
  fs.writeFileSync(create.targetPath, 'created by bridge permission gate test\n', 'utf8');

  const modify = authorizeOperation({ repoRoot, grant, operation: 'modify', targetPath: allowedPath });
  fs.appendFileSync(modify.targetPath, 'modified after explicit authorization\n', 'utf8');
  assert.match(fs.readFileSync(allowedPath, 'utf8'), /modified after explicit authorization/);

  const remove = authorizeOperation({ repoRoot, grant, operation: 'delete', targetPath: allowedRelative });
  fs.unlinkSync(remove.targetPath);
  assert.equal(fs.existsSync(allowedPath), false);
});

function hashFile(target) {
  return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
}

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function assertDeniedBeforeWrite(operation, targetPath) {
  let writeApiInvoked = false;
  expectDenied(() => {
    const decision = authorizeOperation({ repoRoot, grant, operation, targetPath });
    writeApiInvoked = true;
    fs.writeFileSync(decision.targetPath, 'this write must never happen\n', 'utf8');
  });
  assert.equal(writeApiInvoked, false, 'denial must occur before the write API is called');
}

test('critical, escaped, and prefix-lookalike targets are denied before write APIs', () => {
  const readmePath = path.join(repoRoot, 'README.md');
  const databasePath = path.join(repoRoot, 'data', 'crystal-design.sqlite');
  const escapePath = path.resolve(repoRoot, '..', 'bridge-permission-escape-test.txt');
  const prefixPath = `${allowedPath}.lookalike`;
  const readmeHash = hashFile(readmePath);
  const databaseHash = hashFile(databasePath);
  for (const targetPath of [readmePath, databasePath, escapePath, prefixPath]) {
    assertDeniedBeforeWrite('modify', targetPath);
  }
  assert.equal(hashFile(readmePath), readmeHash);
  assert.equal(hashFile(databasePath), databaseHash);
  assert.equal(lstatOrNull(escapePath), null);
  assert.equal(lstatOrNull(prefixPath), null);
});

test('Windows separators, dot segments, and case normalize to the exact allowlisted path', () => {
  assert.equal(lstatOrNull(allowedPath), null);
  for (const targetPath of [
    '.\\.agent-state\\permission-gate-test-allowed.tmp',
    '.\\.agent-state\\.\\permission-gate-test-allowed.tmp',
    '.\\.AGENT-STATE\\permission-gate-test-allowed.tmp'
  ]) {
    assert.equal(authorizeOperation({ repoRoot, grant, operation: 'create', targetPath }).decision, 'ALLOW');
  }
  assert.equal(lstatOrNull(allowedPath), null);
});

function assertExternalLinkDenied(t, linkType) {
  assert.equal(lstatOrNull(allowedPath), null);
  const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'crystal-gate-'));
  const externalTarget = path.join(externalDirectory, 'outside.txt');
  fs.writeFileSync(externalTarget, 'external fixture\n', 'utf8');
  try {
    try {
      fs.symlinkSync(linkType === 'junction' ? externalDirectory : externalTarget, allowedPath, linkType);
    } catch (error) {
      if (error && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip(`${linkType} creation is unavailable in this Windows environment`);
        return;
      }
      throw error;
    }
    assertDeniedBeforeWrite('create', allowedRelative);
    assert.equal(fs.readFileSync(externalTarget, 'utf8'), 'external fixture\n');
  } finally {
    if (lstatOrNull(allowedPath)) fs.unlinkSync(allowedPath);
    fs.rmSync(externalDirectory, { recursive: true, force: true });
  }
}

test('an allowlisted-looking file symlink to system temp is denied before write', (t) => {
  assertExternalLinkDenied(t, 'file');
});

test('an allowlisted-looking junction to system temp is denied before write', (t) => {
  assertExternalLinkDenied(t, 'junction');
});
